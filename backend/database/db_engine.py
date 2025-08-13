import os, json
import urllib.parse
from sqlalchemy import create_engine
from sqlalchemy.ext.asyncio import create_async_engine

import config

def parse_db_uri(uri: str) -> str:
    """
    解析和验证数据库连接字符串
    支持 SSL 模式和连接超时参数
    """
    if not uri:
        raise ValueError("数据库连接字符串不能为空")
    
    # 检查是否包含查询参数
    if '?' in uri:
        base_uri, query_string = uri.split('?', 1)
        # 解析查询参数
        params = urllib.parse.parse_qs(query_string)
        
        # 验证和清理参数
        valid_params = {}
        for key, values in params.items():
            if key in ['sslmode', 'connect_timeout', 'application_name', 'client_encoding']:
                valid_params[key] = values[0] if values else ''
        
        # 重新构建查询字符串
        if valid_params:
            clean_query = urllib.parse.urlencode(valid_params)
            return f"{base_uri}?{clean_query}"
        else:
            return base_uri
    else:
        return uri

if config.USE_WHICH_DB == 'NEON':
    DB_URI = os.getenv('NEON_CONN_STR')
elif config.USE_WHICH_DB == 'ALIYUN':
    DB_URI = os.getenv('ALIYUN_POSTGRESQL_CONN_STR')
else:
    raise ValueError("未设置 USE_WHICH_DB 环境变量")

if not DB_URI:
    raise ValueError("未设置 DB_URI 环境变量")

# 解析和清理数据库连接字符串
DB_URI = parse_db_uri(DB_URI)

# 创建同步引擎，添加连接参数
engine = create_engine(
    DB_URI, 
    pool_size=10,
    max_overflow=20,
    pool_pre_ping=True,
    pool_recycle=1800,   # 回收闲置连接，避免长连接被服务端断开
    pool_timeout=10,     # 获取连接超时
    connect_args={
        "connect_timeout": 10,  # 连接超时 10 秒
        "application_name": "yugong-backend"
    }
)

# 异步数据库连接（暂时使用同步引擎包装）
# 注意：需要安装 asyncpg 才能使用真正的异步连接
# pip install asyncpg
async_engine = None

def get_async_engine():
    """获取异步数据库引擎（延迟初始化）"""
    global async_engine
    if async_engine is None:
        try:
            # 尝试使用 asyncpg
            from sqlalchemy.ext.asyncio import create_async_engine
            
            # 为异步引擎创建专门的 URI，移除不支持的参数
            if DB_URI.startswith('postgresql://'):
                async_uri = DB_URI.replace('postgresql://', 'postgresql+asyncpg://', 1)
            elif DB_URI.startswith('postgres://'):
                async_uri = DB_URI.replace('postgres://', 'postgresql+asyncpg://', 1)
            else:
                raise ValueError(f"不支持的数据库 URI 格式: {DB_URI}")
            
            # 移除 asyncpg 不支持的参数
            if '?' in async_uri:
                base_uri, query_string = async_uri.split('?', 1)
                params = urllib.parse.parse_qs(query_string)
                
                # 只保留 asyncpg 支持的参数
                valid_params = {}
                for key, values in params.items():
                    if key in ['sslmode', 'application_name', 'client_encoding']:
                        valid_params[key] = values[0] if values else ''
                
                if valid_params:
                    clean_query = urllib.parse.urlencode(valid_params)
                    async_uri = f"{base_uri}?{clean_query}"
                else:
                    async_uri = base_uri
            
            # asyncpg 不支持 connect_timeout 参数，使用不同的连接参数
            async_engine = create_async_engine(
                async_uri,
                echo=False,
                pool_size=10,
                max_overflow=20,
                pool_pre_ping=True,
                pool_recycle=1800,
                pool_timeout=10,
                connect_args={
                    "server_settings": {
                        "application_name": "yugong-backend"
                    }
                }
            )
        except ImportError:
            # 如果没有 asyncpg，使用同步引擎
            print("警告: asyncpg 未安装，将使用同步数据库连接")
            async_engine = engine
    return async_engine