import json
from sqlalchemy import text
import traceback

from utils.log_util import logger
import config
from database.db_engine import engine


# 向neon数据库中插入一条数据
def insert(agent_id, agent_meta_data_vec, agent_meta_data):
    sql = "INSERT INTO agents (agent_id, agent_meta_data_vec, agent_meta_data) VALUES (:agent_id, :agent_meta_data_vec, :agent_meta_data)"
    try:
        with engine.begin() as conn:
            result = conn.execute(
                text(sql),
                {"agent_id": agent_id, "agent_meta_data_vec": agent_meta_data_vec, "agent_meta_data": agent_meta_data}
            )
            logger.info(f"insert result: {result.rowcount}, agent_id:{agent_id}")
    except:
        logger.error(f"insert agent data failed, agent_id:{agent_id}")

# 基于向量检索出agent
def vector_retrieve(query_vec):
    ret_agents = []

    sql = "SELECT agent_id, agent_meta_data FROM agents ORDER BY agent_meta_data_vec <=> :query_vec LIMIT :retrieve_num;"
    try:
        with engine.begin() as conn:
            result = conn.execute(
                text(sql),
                {"query_vec": query_vec, "retrieve_num": config.AGENT_VEC_RETRIEVE_NUM}
            )

            for i, row in enumerate(result):
                mapping = row._mapping
                agent_id = mapping.get("agent_id")
                agent_meta_data = mapping.get("agent_meta_data")

                if agent_id is None or agent_meta_data is None:
                    logger.warning(f"retrieved agent_id or agent_meta_data is None")
                    continue

                logger.info(f"{i+1}th retrieved agent_id is {agent_id}")
                ret_agents.append(json.loads(agent_meta_data))

        logger.info(f"vector_retrieve results length: {len(ret_agents)}")

        return ret_agents
    except Exception as e:
        logger.error(f"insert agent data failed:{traceback.format_exc()}")



# if __name__ == "__main__":
#     insert()

