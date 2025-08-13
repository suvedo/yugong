from sqlalchemy import text
import traceback
from typing import Tuple
from datetime import datetime, timedelta, timezone
import random
import json

from utils.log_util import logger
from database.db_engine import engine


def insert(request_id: str, user_id: str, to_mail: str) -> bool:
    try:
        sql = "INSERT INTO user_info (user_id, to_mail) VALUES (:user_id, :to_mail) ON CONFLICT (user_id) DO NOTHING"
        with engine.begin() as conn:
            conn.execute(text(sql), {"user_id": user_id, "to_mail": to_mail})

        logger.info(f"request_id:{request_id}, user_id:{user_id}, to_mail:{to_mail}, insert user success")
        
        return True
    except:
        logger.error(f"request_id:{request_id}, user_id:{user_id}, to_mail:{to_mail}, insert user exception:{traceback.format_exc()}")
        return False