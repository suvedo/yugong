from sqlalchemy import text
import traceback
import json

from utils.log_util import logger
import config
from database.db_engine import engine

def insert_message(thread_id: str, request_id: str, user_id: str, message_id: str, user_message: str) -> bool:
    sql = "INSERT INTO chat_messages (thread_id, user_id, message_id, user_message) VALUES (:thread_id, :user_id, :message_id, :user_message)"
    try:
        with engine.begin() as conn:
            conn.execute(text(sql), {"thread_id": thread_id, "user_id": user_id, "message_id": message_id, "user_message": user_message})

        logger.info(f"request_id:{request_id}, thread_id:{thread_id}, user_id:{user_id}, message_id:{message_id}, insert message success")
        return True
    except:
        logger.error(f"request_id:{request_id}, thread_id:{thread_id}, user_id:{user_id}, message_id:{message_id}, insert message exception:{traceback.format_exc()}")
        return False


def get_message_list(request_id: str, thread_id: str) -> list:
    sql = "SELECT user_message FROM chat_messages WHERE thread_id = :thread_id ORDER BY created_at ASC"
    try:
        with engine.begin() as conn:
            result = conn.execute(text(sql), {"thread_id": thread_id})
            
            rsp_json = []
            for i, row in enumerate(result):
                mapping = row._mapping
                user_message = mapping.get("user_message") or ""

                if user_message:
                    user_message = json.loads(user_message)
                    rsp_json.append(user_message)

            logger.info(f"request_id:{request_id}, user_id:{thread_id}, get chat_list success: {len(rsp_json)}")
            return rsp_json
    except:
        logger.error(f"request_id:{request_id}, thread_id:{thread_id}, get message list exception:{traceback.format_exc()}")
        return []