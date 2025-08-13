import json
import traceback
from langchain_core.tools import tool
from pydantic import BaseModel, Field
from typing import Tuple

from embedding import text_embedding
from database import a2a_server_op
from rank import llm_ranker
from utils import a2a_util
from utils.log_util import logger


class VectorRetrieveInputSchema(BaseModel):
    """
    当获取到用户输入的文本和文件元数据后（文件元数据可能为空），基于用户输入，从数据库中检索出可能满足用户需求的top-k个agent；
    返回两个列表，第一个为agent的调用url列表（即agent_card_url_list），第二个为agent的卡片内容列表（即agent_card_str_list），出错时返回None。
    """
    
    request_id: str = Field(description="请求的唯一标识符，用于日志追踪和调试")
    text_input: str = Field(description="用户输入的文本内容")
    file_metadata_list: list[list[str|int]] = Field(description="用户输入文件的元数据列表，每个元素是一个包含4个字符串或整数的列表：索引0: 文件ID，索引1: 文件名，索引2: MIME类型（文件类型），索引3: 文件大小（字节）")

@tool(args_schema=VectorRetrieveInputSchema)
def agent_retrieve_tool(request_id: str, text_input: str, file_metadata_list: list[list[str|int]]) -> Tuple[list[str], list[str]] | None:
    try:
        logger.info(f"request_id:{request_id}, start vector retrieve tool, text_input:{text_input}, file_metadata_list:{file_metadata_list}")
        
        # 生成对文件元数据的文本描述
        file_metadata_discription = ""
        if len(file_metadata_list) > 0:
            file_metadata_json = [
                {"文件名": filename, "文件类型": mime_type, "文件大小（单位：字节）": size} \
                for _, filename, mime_type, size in file_metadata_list \
                if filename or mime_type
            ]
            file_metadata_discription = "输入文件的信息如下：" + json.dumps(file_metadata_json, ensure_ascii=False)

        text_input_file_disc = "\n".join([text_input, file_metadata_discription])
        logger.info(f"request_id:{request_id}, text input with file meta data is: {text_input_file_disc}")

        # 用户query转成向量
        logger.info(f"start query embedding in a2a server execute, request_id:{request_id}")
        d_embeded = text_embedding.embed_text(text_input_file_disc)
        d_embeded = json.loads(d_embeded)
        e_vec = d_embeded["data"][0]["embedding"]

        # 向量检索
        logger.info(f"start agent retrieve in a2a server execute, request_id:{request_id}")
        retrieve_res = a2a_server_op.query(request_id, query_embedding=str(e_vec))
        if len(retrieve_res) <= 0:
            logger.info(f"request_id:{request_id}, no agent retrieved")
            return None
        agent_card_url_list = [item[0] for item in retrieve_res]
        agent_card_str_list = [item[1] for item in retrieve_res]

        logger.info(f"request_id:{request_id}, agent vector retrieve tool finished")

        return (agent_card_url_list, agent_card_str_list)
    except:
        logger.error(f"request_id:{request_id}, vector retrieve tool exception: {traceback.format_exc()}")
        return None


class AgentRankInputSchema(BaseModel):
    """
    当获取到top-k个候选agent列表后，基于用户输入的文本和文件元数据（可能为空），从top-k个候选agent列表中，选择最优agent，返回最优agent的调用url，出错时返回None
    """
    
    request_id: str = Field(description="请求的唯一标识符，用于日志追踪和调试")
    text_input: str = Field(description="用户输入的文本内容")
    file_metadata_list: list[list[str|int]] = Field(description="用户输入文件的元数据列表，每个元素是一个包含4个字符串或整数的列表：索引0: 文件ID，索引1: 文件名，索引2: MIME类型（文件类型），索引3: 文件大小（字节）")
    agent_card_url_list: list[str] = Field(description="候选agent的调用url列表")
    agent_card_str_list: list[str] = Field(description="候选agent的卡片内容列表")

@tool(args_schema=AgentRankInputSchema)
def agent_rank_tool(request_id: str, 
                        text_input: str, 
                        file_metadata_list: list[list[str|int]], 
                        agent_card_url_list: list[str], 
                        agent_card_str_list: list[str]
                    ) -> str | None:
    try:
        logger.info(f"request_id:{request_id}, start rank agents")
        
        # 生成对文件元数据的文本描述
        file_metadata_discription = ""
        if len(file_metadata_list) > 0:
            file_metadata_json = [
                {"文件名": filename, "文件类型": mime_type, "文件大小（单位：字节）": size} \
                for _, filename, mime_type, size in file_metadata_list \
                if filename or mime_type
            ]
            file_metadata_discription = "输入文件的信息如下：" + json.dumps(file_metadata_json, ensure_ascii=False)

        text_input_file_disc = "\n".join([text_input, file_metadata_discription])

        # 对agent进行排序，返回最优agent的url
        rank_idx  = llm_ranker.rank_agent_card(request_id, text_input_file_disc, agent_card_str_list)
        if rank_idx < 0 or rank_idx >= len(agent_card_url_list):
            return None
        rank_agent_card_url = agent_card_url_list[rank_idx]

        logger.info(f"request_id:{request_id}, agent rank tool finished, selected agent card is {rank_agent_card_url}")

        return rank_agent_card_url
    except:
        logger.error(f"request_id:{request_id}, agent rank tool exception: {traceback.format_exc()}")
        return None


class AgentCallInputSchema(BaseModel):
    """
    当获取到agent的调用url后，基于用户输入的文本和文件元数据（可能为空），调用agent server，返回agent的回复；
    agent回复为tuple类型：
        第一个元素为本次调用返回的状态（字符串），可能的值为：submitted/working/input_required/completed/canceled/failed/rejected/auth_required/unknown
        第二个元素为agent的回复（字符串列表），回复列表第一个元素为文本回复，第二个元素为文件id，
    """
    
    request_id: str = Field(description="请求的唯一标识符，用于日志追踪和调试")
    text_input: str = Field(description="用户输入的文本内容")
    file_metadata_list: list[list[str|int]] = Field(description="用户输入文件的元数据列表，每个元素是一个包含4个字符串或整数的列表：索引0: 文件ID，索引1: 文件名，索引2: MIME类型（文件类型），索引3: 文件大小（字节）")
    agent_card_url: str = Field(description="agent的调用url")

@tool(args_schema=AgentCallInputSchema)
async def agent_call_tool(request_id: str, text_input: str, file_metadata_list: list[list[str|int]], agent_card_url: str) -> Tuple[str, list[str]] | None:
    try:
        logger.info(f"request_id:{request_id}, start agent call tool, agent_card_url:{agent_card_url}")
        if agent_card_url:
            logger.info(f"start a2a server call in a2a server execute, request_id:{request_id}, rank_agent_card_url:{agent_card_url}")
            state, agent_answer = await a2a_util.get_a2a_server_rsp_with_url(request_id, agent_card_url, text_input, file_metadata_list)
            if len(agent_answer) > 0:
                logger.info(f"request_id:{request_id}, agent call tool finished")
                return agent_answer[0]

        return None
    except:
        logger.error(f"request_id:{request_id}, agent call tool exception: {traceback.format_exc()}")
        return None