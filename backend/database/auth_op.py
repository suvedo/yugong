from sqlalchemy import text
import traceback
from typing import Tuple
from datetime import datetime, timedelta, timezone
import random
import json

from utils.log_util import logger
from database.db_engine import engine

auth_code_cache_key_prefix = "auth_code-"

def insert_auth_code(request_id: str, to_mail: str, code: str) -> bool:
    try:
        cache_key = auth_code_cache_key_prefix + to_mail
        cache_value = {"code": code}
        cache_expires_at = datetime.now(timezone.utc) + timedelta(minutes=10)
        
        sql = """
            INSERT INTO cache (key, value, expires_at) 
            VALUES (:key, :value, :expires_at)
            ON CONFLICT (key) 
            DO UPDATE SET 
                value = EXCLUDED.value,
                expires_at = EXCLUDED.expires_at
        """
        with engine.begin() as conn:
            conn.execute(text(sql), {"key": cache_key, "value": json.dumps(cache_value, ensure_ascii=False), "expires_at": cache_expires_at})

        logger.info(f"request_id:{request_id}, to_mail:{to_mail}, code:{code}, send code success")
        return True
    except:
        logger.error(f"request_id:{request_id}, to_mail:{to_mail}, send code exception:{traceback.format_exc()}")
        return False

def verify(request_id: str, to_mail: str, code: str) -> bool:
    try:
        cache_key = auth_code_cache_key_prefix + to_mail
        sql = "SELECT value, expires_at FROM cache WHERE key = :key"
        with engine.begin() as conn:
            result = conn.execute(text(sql), {"key": cache_key})
            if result.rowcount == 0:
                logger.info(f"request_id:{request_id}, to_mail:{to_mail}, code:{code}, verify code not found")
                return False

            for i, row in enumerate(result):
                mapping = row._mapping
                cache_value = mapping.get("value")
                cache_expires_at = mapping.get("expires_at")
                if cache_value and cache_expires_at:
                    # cache_value = json.loads(cache_value, ensure_ascii=False)
                    if cache_value.get("code") == code and cache_expires_at > datetime.now(timezone.utc):
                        logger.info(f"request_id:{request_id}, to_mail:{to_mail}, code:{code}, verify code success")
                        return True
                
            logger.info(f"request_id:{request_id}, to_mail:{to_mail}, code:{code}, verify code not correct or expired")
            return False

    except:
        logger.error(f"request_id:{request_id}, to_mail:{to_mail}, verify code exception:{traceback.format_exc()}")
        return False