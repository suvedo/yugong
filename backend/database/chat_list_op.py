from sqlalchemy import text
import traceback
from typing import Tuple

from utils.log_util import logger
import config
from database.db_engine import engine

def insert_chat(thread_id: str, request_id: str, user_id: str, text_input: str) -> int:
    try:
        sql1 = "SELECT COUNT(*) FROM chat_list WHERE thread_id = :thread_id"
        sql2 = "INSERT INTO chat_list (thread_id, user_id, title) VALUES (:thread_id, :user_id, :title)"
        with engine.begin() as conn:
            result = conn.execute(text(sql1), {"thread_id": thread_id})
            count = result.scalar() or 0
            if count > 0:
                logger.info(f"request_id:{request_id}, thread_id:{thread_id} already exists in chat_list")
                return 0
            else:
                conn.execute(text(sql2), {"thread_id": thread_id, "user_id": user_id, "title": text_input})
                logger.info(f"request_id:{request_id}, thread_id:{thread_id}, user_id:{user_id}, insert chat success")
                return 1
    except:
        logger.error(f"request_id:{request_id}, thread_id:{thread_id}, user_id:{user_id}, insert chat exception:{traceback.format_exc()}")
        return -1


def get_chat_list(request_id: str, user_id: str) -> list:
    sql = "SELECT thread_id, title FROM chat_list WHERE user_id = :user_id ORDER BY created_at DESC"
    try:
        with engine.begin() as conn:
            result = conn.execute(text(sql), {"user_id": user_id})
            
            if result.rowcount == 0:
                logger.warning(f"request_id:{request_id}, user_id:{user_id}, not history chat list")
                return []

            rsp_json = []
            for i, row in enumerate(result):
                mapping = row._mapping
                thread_id = mapping.get("thread_id") or ""
                title = mapping.get("title") or ""
                if thread_id and title:
                    rsp_json.append({"thread_id": thread_id, "title": title})

            logger.info(f"request_id:{request_id}, user_id:{user_id}, get chat_list success: {rsp_json}")
            return rsp_json
    except:
        logger.error(f"request_id:{request_id}, user_id:{user_id}, get chat_list exception:{traceback.format_exc()}")
        return []