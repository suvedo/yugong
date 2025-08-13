import json
from sqlalchemy import text
import traceback
from typing import Tuple

from utils.log_util import logger
import config
from database.db_engine import engine


def a2a_server_url_exists(request_id: str, a2a_server_url: str) -> bool:
    sql = "SELECT COUNT(*) FROM a2a_server WHERE a2a_server_url = :a2a_server_url"
    try:
        with engine.begin() as conn:
            result = conn.execute(text(sql), {"a2a_server_url": a2a_server_url})
            count = result.scalar() or 0
            if count > 0:
                logger.info(f"request_id:{request_id}, agent with a2a_server_url '{a2a_server_url}' already exists")
                return True
            else:
                return False
    except:
        logger.error(f"request_id:{request_id}, check a2a_server_url failed: {traceback.format_exc()}")
        return False
        

def name_provider_org_exists(request_id: str, name: str, provider_org: str) -> bool:
    sql = "SELECT COUNT(*) FROM a2a_server WHERE name = :name AND provider_org = :provider_org"
    try:
        with engine.begin() as conn:
            result = conn.execute(text(sql), {"name": name, "provider_org": provider_org})
            count = result.scalar() or 0
            if count > 0:
                logger.info(f"request_id:{request_id}, agent with name '{name}' and provider_org '{provider_org}' already exists")
                return True
            else:
                return False
    except:
        logger.error(f"request_id:{request_id}, check name_provider_org failed: {traceback.format_exc()}")
        return False


def insert(request_id: str,
            user_id: str,
            a2a_server_url: str,
            name: str,
            agent_server_url: str,
            provider_org: str,
            provider_url: str,
            version: str,
            agent_card_json_str: str,
            semantic_json_embedding: list[float],
            semantic_json_str: str) -> int:
    """
    1. 检查是否已存在相同name和provider_org的记录
    2. 如果不存在，则执行插入
    3. 如果存在，则返回False防止重复注册
    4. 所有操作在同一个数据库事务中执行，保证数据一致性
    return:
        0: 插入成功
        -1: 插入失败
    """
    
    try:
        with engine.begin() as conn:
            sql = ("INSERT INTO a2a_server "
                        "(user_id, a2a_server_url, name, agent_server_url, provider_org, provider_url, name_provider_org, version, agent_card_json_str, semantic_json_embedding, semantic_json_str) "
                        "VALUES (:user_id, :a2a_server_url, :name, :agent_server_url, :provider_org, :provider_url, :name_provider_org, :version, :agent_card_json_str, :semantic_json_embedding, :semantic_json_str)"
                )
            result = conn.execute(
                text(sql),
                {
                    "user_id": user_id, 
                    "a2a_server_url": a2a_server_url, 
                    "name": name,
                    "agent_server_url": agent_server_url,
                    "provider_org": provider_org,
                    "provider_url": provider_url,
                    "name_provider_org": f"{name}|{provider_org}" if provider_org else name,
                    "version": version,
                    "agent_card_json_str": agent_card_json_str,
                    "semantic_json_embedding": semantic_json_embedding,
                    "semantic_json_str": semantic_json_str
                }
            )
            logger.info(f"request_id:{request_id}, a2a server database insert result: {result.rowcount}")

        return 0
    except:
        logger.error(f"request_id:{request_id}, a2a server database insert failed: {traceback.format_exc()}")

    return -1


def query(request_id: str, 
            name: str = "", 
            url: str  = "", 
            provider_org: str = "",
            query_embedding: str | None = None
        ) -> list[Tuple[str, str]]:
    agent_card_list = []

    sql1 = f"SELECT a2a_server_url, agent_card_json_str FROM a2a_server"
    where_conditions = []
    if name:
        where_conditions.append(f"name=\"{name}\"")
    if url:
        where_conditions.append(f"url=\"{url}\"")
    if provider_org:
        where_conditions.append(f"provider_org=\"{provider_org}\"")
    
    try:
        with engine.begin() as conn:
            # 精确匹配
            if len(where_conditions) > 0:
                sql1 += " where " + " and ".join(where_conditions)
                result = conn.execute(
                    text(sql1)
                )
                logger.info(f"request_id:{request_id}, query a2a server result1: {result.rowcount}")

                for i, row in enumerate(result):
                    mapping = row._mapping
                    a2a_server_url      = mapping.get("a2a_server_url")
                    agent_card_json_str = mapping.get("agent_card_json_str")
                    if a2a_server_url and agent_card_json_str:
                        agent_card_list.append((a2a_server_url, agent_card_json_str))
                
                if len(agent_card_list) >= config.A2A_SERVER_RETRIEVE_NUM:
                    logger.info(f"request_id:{request_id}, len(agent_card_list) >= config.A2A_SERVER_RETRIEVE_NUM({config.A2A_SERVER_RETRIEVE_NUM})")
                    return agent_card_list[:config.A2A_SERVER_RETRIEVE_NUM]

                if not query_embedding:
                    logger.info(f"request_id:{request_id}, no query embedding provided")
                    return agent_card_list

            # 向量检索
            #sql2 = "SELECT agent_card_json_str FROM a2a_server ORDER BY semantic_json_embedding <=> :query_embedding LIMIT :retrieve_num;"
            sql2 = ("SELECT a2a_server_url, agent_card_json_str, "
                    "semantic_json_embedding <=> :query_embedding AS distance "
                    "FROM a2a_server "
                    "WHERE semantic_json_embedding <=> :query_embedding < :distance_threshold "
                    "ORDER BY distance "
                    "LIMIT :retrieve_num;")
            result = conn.execute(
                text(sql2),
                {"query_embedding": query_embedding, 
                "distance_threshold": config.A2A_SERVER_RETRIEVE_COSIN_THRES,
                "retrieve_num": config.A2A_SERVER_RETRIEVE_NUM - len(agent_card_list)}
            )

            for i, row in enumerate(result):
                mapping = row._mapping
                a2a_server_url      = mapping.get("a2a_server_url")
                agent_card_json_str = mapping.get("agent_card_json_str")
                if a2a_server_url and agent_card_json_str:
                    agent_card_list.append((a2a_server_url, agent_card_json_str))

            logger.info(f"request_id:{request_id}, retrieved {len(agent_card_list)} agents")

            return agent_card_list
    except:
        logger.error(f"request_id:{request_id}, query a2a server database: {traceback.format_exc()}")

    return []


def get_latest_registered(request_id: str) -> list[str]:
    agent_card_list = []

    sql1 = f"SELECT agent_card_json_str FROM a2a_server ORDER BY created_at DESC LIMIT 9"
    
    try:
        with engine.begin() as conn:
            result = conn.execute(text(sql1))
            logger.info(f"request_id:{request_id}, query latest registered a2a server result: {result.rowcount}")

            for i, row in enumerate(result):
                mapping = row._mapping
                agent_card_json_str = mapping.get("agent_card_json_str")
                if agent_card_json_str:
                    agent_card_list.append(agent_card_json_str)

            logger.info(f"request_id:{request_id}, retrieved {len(agent_card_list)} latest registered agents")

            return agent_card_list
    except:
        logger.error(f"request_id:{request_id}, query latest registered a2a server database: {traceback.format_exc()}")

    return []


def get_latest_registered_by_user(request_id: str, user_id: str) -> list[str]:
    agent_card_list: list[str] = []
    if not user_id:
        return agent_card_list

    sql = "SELECT agent_card_json_str FROM a2a_server WHERE user_id = :user_id ORDER BY created_at DESC"

    try:
        with engine.begin() as conn:
            result = conn.execute(text(sql), {"user_id": user_id})
            logger.info(f"request_id:{request_id}, query latest registered by user result: {result.rowcount}")

            for i, row in enumerate(result):
                mapping = row._mapping
                agent_card_json_str = mapping.get("agent_card_json_str")
                if agent_card_json_str:
                    agent_card_list.append(agent_card_json_str)

            logger.info(f"request_id:{request_id}, retrieved {len(agent_card_list)} latest registered agents by user:{user_id}")
            return agent_card_list
    except:
        logger.error(f"request_id:{request_id}, user_id:{user_id}, query latest registered by user database: {traceback.format_exc()}")

    return []


# 基于向量检索出agent
def vector_retrieve(request_id: str, query_vec: str) -> list[str]:
    agent_card_list = []

    sql = "SELECT agent_card_json_str FROM a2a_server ORDER BY semantic_json_embedding <=> :query_vec LIMIT :retrieve_num;"
    try:
        with engine.begin() as conn:
            result = conn.execute(
                text(sql),
                {"query_vec": query_vec, "retrieve_num": config.AGENT_VEC_RETRIEVE_NUM}
            )

            for i, row in enumerate(result):
                mapping = row._mapping
                agent_card_json_str = mapping.get("agent_card_json_str")
                if agent_card_json_str:
                    agent_card_list.append(agent_card_json_str)
            
        logger.info(f"request_id:{request_id}, vector_retrieve results length: {len(agent_card_list)}")

        return agent_card_list
    except:
        logger.error(f"request_id:{request_id}, vector retrieve from a2a server database failed:{traceback.format_exc()}")

    return []


def select_agent_card_url(request_id: str, name: str, org_name: str) -> list[str]:
    sql = "SELECT a2a_server_url FROM a2a_server WHERE name = :name AND provider_org = :provider_org"

    a2a_server_url_list = []
    try:
        with engine.begin() as conn:
            result = conn.execute(text(sql), {"name": name, "provider_org": org_name})
            for i, row in enumerate(result):
                mapping = row._mapping
                a2a_server_url = mapping.get("a2a_server_url")
                if a2a_server_url:
                    a2a_server_url_list.append(a2a_server_url)

        logger.info(f"request_id:{request_id}, select_agent_card_url results: {a2a_server_url_list}")
        return a2a_server_url_list
    except:
        logger.error(f"request_id:{request_id}, select_agent_card_url failed:{traceback.format_exc()}")

    return a2a_server_url_list

def select_agent_name_org_by_prefix(request_id: str, prefix: str, num: int) -> list[str]:
    sql = f"SELECT name_provider_org FROM a2a_server WHERE name_provider_org LIKE '{prefix}%' LIMIT {num}"

    agent_name_org_list = []
    try:
        with engine.begin() as conn:
            # result = conn.execute(text(sql), {"prefix": prefix, "num": num})
            result = conn.execute(text(sql))
            for i, row in enumerate(result):
                mapping = row._mapping 
                name_provider_org = mapping.get("name_provider_org")
                if name_provider_org:
                    agent_name_org_list.append(name_provider_org)

        # logger.info(f"request_id:{request_id}, select_agent_name_org_by_prefix results: {agent_name_org_list}")
        return agent_name_org_list
    except:
        logger.error(f"request_id:{request_id}, select_agent_name_org_by_prefix failed:{traceback.format_exc()}")

    return []


def select_agent_name_org_by_similarity(request_id: str, search_str: str, num: int) -> list[str]:
    if not search_str.strip():
        return []

    sql = f"SELECT name_provider_org, similarity(name_provider_org, '{search_str}') AS score " \
            f"FROM a2a_server where similarity(name_provider_org, '{search_str}') > 0.05 " \
            f"ORDER BY score DESC LIMIT {num}"

    agent_name_org_list = []
    try:
        with engine.begin() as conn:
            result = conn.execute(text(sql), {"search_str": search_str, "num": num})
            for i, row in enumerate(result):
                mapping = row._mapping
                name_provider_org = mapping.get("name_provider_org")
                if name_provider_org:
                    agent_name_org_list.append(name_provider_org)

        logger.info(f"request_id:{request_id}, select_agent_name_org_by_similarity results: {agent_name_org_list}")
        return agent_name_org_list
    except:
        logger.error(f"request_id:{request_id}, select_agent_name_org_by_similarity failed:{traceback.format_exc()}")

    return []