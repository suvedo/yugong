from typing import Tuple
import json
import traceback

from utils.log_util import logger
from embedding import text_embedding
from utils import a2a_util

def gen_semantic_embedding_from_agent_card(request_id: str, agent_card_json_str: str) -> Tuple[str | None, list[float] | None]:
    try:
        
        semantic_json_str = a2a_util.transform_agent_card2semantic_json_str(request_id, agent_card_json_str)
        if semantic_json_str:
            logger.info(f"request_id:{request_id}, semantic json str:{semantic_json_str}")
        else:
            return None, None

        # json字符串转向量
        agent_card_embeded = text_embedding.embed_text(semantic_json_str)
        agent_card_embeded = json.loads(agent_card_embeded)
        agent_card_embeded = agent_card_embeded["data"][0]["embedding"]

        return semantic_json_str, agent_card_embeded
    except:
        logger.error(f"request_id:{request_id}, generate semantic from agent card error:{traceback.format_exc()}")


    return None, None