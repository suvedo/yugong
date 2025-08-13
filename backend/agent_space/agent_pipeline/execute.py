import json
from typing import Tuple
import traceback
from typing import AsyncGenerator

from embedding import text_embedding
from database import a2a_server_op, file_op
from rank import llm_ranker
from utils import a2a_util
from utils.log_util import logger
from utils.enums import STREAM_MESSAGE_TYPE, AGUI_EVENT

async def a2a_server_execute(
        request_id: str, 
        text_input: str, 
        file_id_list: list[str],
        agent_name: str,
        agent_org: str
    ) -> Tuple[str, list[str]] | None:
    try:
        # 根据file_id查询文件名字、类型、大小等元数据
        file_metadata_list = [] # list[list[str]]
        for file_id in file_id_list:
            filename, mime_type, size = file_op.get_file_metadata_by_id(request_id, file_id)
            file_metadata_list.append([file_id, filename, mime_type, size])
        
        # 生成对文件元数据的文本描述
        file_metadata_discription = ""
        if len(file_metadata_list) > 0:
            file_metadata_json = [
                {"文件名": filename, "文件类型": mime_type, "文件大小（单位：字节）": size} \
                for _, filename, mime_type, size in file_metadata_list \
                if filename or mime_type
            ]
            file_metadata_discription = "输入文件的信息如下：" + json.dumps(file_metadata_json, ensure_ascii=False)

            # i = 1
            # for filename, mime_type, _ in file_metadata_list:
            #     if not filename and not mime_type:
            #         continue
            #     file_meta_data_discription += f"{i}、文件名：{filename}，文件类型：{mime_type}  "
            #     i += 1

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
        
        # 大模型排序   TODO:返回一个agent调用列表，并push至队列等待调用（即广搜）
        logger.info(f"start agent plan in a2a server execute, request_id:{request_id}")
        rank_idx  = llm_ranker.rank_agent_card(request_id, text_input_file_disc, agent_card_str_list)
        if rank_idx < 0 or rank_idx >= len(agent_card_url_list):
            return None
        rank_agent_card_url = agent_card_url_list[rank_idx]
        logger.info(f"request_id:{request_id}, selected agent card is {rank_agent_card_url}")

        # 调用agent server
        if rank_agent_card_url:
            logger.info(f"start a2a server call in a2a server execute, request_id:{request_id}, rank_agent_card_url:{rank_agent_card_url}")
            agent_answer = await a2a_util.get_a2a_server_rsp_with_url(request_id, rank_agent_card_url, text_input, file_metadata_list)
            if len(agent_answer) > 0:
                return agent_answer[0]
        
        logger.warning(f"request_id:{request_id}, call a2a server failed")
        return None

    except:
        logger.error(f"request_id:{request_id}, a2a server execute failed:{traceback.format_exc()}")
        return None


async def a2a_server_execute_stream(
        request_id: str, 
        text_input: str, 
        file_id_list: list[str],
        agent_name: str,
        agent_org: str
    ) -> AsyncGenerator[Tuple[str, str, str], None]:
    try:
        # 根据file_id查询文件名字、类型、大小等元数据
        file_metadata_list = [] # list[list[str]]
        for file_id in file_id_list:
            filename, mime_type, size = file_op.get_file_metadata_by_id(request_id, file_id)
            file_metadata_list.append([file_id, filename, mime_type, size])
        
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
            yield STREAM_MESSAGE_TYPE.WARNING, "未检索到可用agent", ""
            return
        agent_card_url_list = [item[0] for item in retrieve_res]
        agent_card_str_list = [item[1] for item in retrieve_res]
        yield STREAM_MESSAGE_TYPE.REASONING, f"已检索到{len(agent_card_url_list)}个可用agent\n", ""
        
        # 大模型排序   TODO:返回一个agent调用列表，并push至队列等待调用（即广搜）
        logger.info(f"start agent plan in a2a server execute, request_id:{request_id}")
        rank_idx  = llm_ranker.rank_agent_card(request_id, text_input_file_disc, agent_card_str_list)
        if rank_idx < 0 or rank_idx >= len(agent_card_url_list):
            yield STREAM_MESSAGE_TYPE.WARNING, "未能排序出合适的agent", ""
            return
        rank_agent_card_url = agent_card_url_list[rank_idx]
        logger.info(f"request_id:{request_id}, selected agent card is {rank_agent_card_url}")
        yield STREAM_MESSAGE_TYPE.REASONING, f"已挑选出最合适的agent\n", ""

        # 调用agent server
        if rank_agent_card_url:
            logger.info(f"start a2a server call in a2a server execute, request_id:{request_id}, rank_agent_card_url:{rank_agent_card_url}")
            # 这里假设 get_a2a_server_rsp_with_url_stream 是异步流式生成器
            async for chunk in a2a_util.get_a2a_server_rsp_with_url_stream(
                request_id, rank_agent_card_url, text_input, file_metadata_list
            ):
                yield chunk
            return

        logger.warning(f"request_id:{request_id}, call a2a server failed")
        yield STREAM_MESSAGE_TYPE.ERROR, "调用agent server失败", ""
        return

    except GeneratorExit:
        logger.info(f"request_id:{request_id}, a2a_server_execute_stream generator cancelled")
        raise
    except Exception:
        logger.error(f"request_id:{request_id}, a2a server execute failed:{traceback.format_exc()}")
        yield STREAM_MESSAGE_TYPE.ERROR, "执行阶段出现异常", ""