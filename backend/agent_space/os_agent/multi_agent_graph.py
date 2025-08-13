from calendar import c
import json, os
from random import randint
import traceback
from re import sub
from tkinter import Label
from pydantic import BaseModel, Field
from typing import Literal
from langgraph.prebuilt import create_react_agent
from langchain_core.messages import HumanMessage, SystemMessage, AIMessage
from langchain_community.chat_models.tongyi import ChatTongyi
from langgraph.graph import StateGraph, MessagesState, START, END
from langgraph.graph.message import add_messages
from typing import Annotated
from typing_extensions import TypedDict
from operator import add
from langchain_core.runnables import RunnableConfig
from langgraph.config import get_stream_writer
from langgraph.checkpoint.postgres import PostgresSaver
from langgraph.checkpoint.memory import InMemorySaver
# from langgraph.runtime import Runtime
from langchain_core.messages.utils import (
    trim_messages,
    count_tokens_approximately
)

from database import file_op
from utils.log_util import logger
from utils import a2a_util
from utils.enums import AGUI_EVENT
from agent_space.os_agent.tools import (
    agent_retrieve_tool,
    agent_rank_tool,
    agent_call_tool
)
from agent_space.os_agent.prompts import AGENT_SELECTION_SYSTEM_PROMPT
import config
from database import a2a_server_op


# class ToolCallingSupervisorResponse(BaseModel):
#     """返回给用户的结构化数据"""

#     event: Literal["TEXT_MESSAGE_CHUNK", "FILE_ID_STRING", "RUN_STARTED", "RUN_FINISHED", "RUN_ERROR", "RUN_CANCEL"] \
#                 = Field(description="本次返回内容的事件类型，TEXT_MESSAGE_CHUNK表示文本消息片段，FILE_ID_STRING表示文件ID，RUN_STARTED表示运行开始，RUN_FINISHED表示运行结束，RUN_ERROR表示运行错误，RUN_CANCEL表示运行取消")
#     message_type: Literal["reasoning", "warning", "error", "result"] \
#         = Field(description="本次返回消息的类型（只有在event为TEXT_MESSAGE_CHUNK时有效），reasoning表示思考过程，warning表示告警消息，error表示错误消息，result表示本次对话的最终结果，输出给用户的最后一个回复应该为result类型")
#     content: str = Field(description="本次返回的具体内容，如果event为TEXT_MESSAGE_CHUNK，则content为文本消息片段；如果event为FILE_ID_STRING，则content为文件ID；否则，则content为空")


class AgentRankerResponse(BaseModel):
    """agent ranker返回的结构化数据"""

    succeed: bool = Field(description="是否成功挑选出满足用户要求的agent")
    agent_card_url: str = Field(description="当成功挑选出agent时，该字段为agent的调用url，否则，该字段为空")
    error_msg: str = Field(description="当挑选agent失败或超过工具调用次数上限时，该字段为展示给用户的错误信息，否则，该字段为空")
    

class State(MessagesState):
    text_input              : str
    input_file_metadata_list: list[list[str]]
    agent_name              : str
    agent_org               : str
    agent_ranker_succeed    : bool
    ranked_agent_card_url   : str
    agent_ranker_error_msg  : str


class AgentInvocationResponse(TypedDict):
    event         : Literal["TEXT_MESSAGE_CHUNK", "FILE_ID_STRING", "RUN_STARTED", "RUN_FINISHED", "RUN_ERROR", "RUN_CANCEL"]
    message_type  : Literal["reasoning", "warning", "error", "result"]
    content       : str



class MultiAgentGraph:
    def __init__(self):
        model = ChatTongyi(
                #model="qwen-turbo"
                model="qwen3-235b-a22b",
                streaming=True
            )
        
        tools = [
            agent_retrieve_tool, 
            # agent_rank_tool
        ]

        agent_ranker = create_react_agent(
            model=model,
            tools=tools,
            response_format=AgentRankerResponse  
        )
        system_msg = SystemMessage(
            content=AGENT_SELECTION_SYSTEM_PROMPT
        )
        async def agent_ranker_subgraph(state: State, config: RunnableConfig):
            writer = get_stream_writer()
            request_id = config["configurable"]["request_id"]
            merge_msg_content = ""
            try:
                agent_name = state["agent_name"]
                agent_org  = state["agent_org"]
                if agent_name:
                    agent_id = agent_name + ("|"+agent_org if agent_org else "")
                    msg_content = f"检测到指定了agent<span style='color: green;'>@{agent_id}</span>，我将使用指定的agent完成任务<br>"
                    message = {
                            "event": AGUI_EVENT.TEXT_MESSAGE_CHUNK,
                            "source": "platform",
                            "agent_id": "",
                            "provider_url": "",
                            "content_type": "text", 
                            "content": msg_content,
                        }
                    writer(message)
                    merge_msg_content += msg_content
                    
                    agent_card_url_list = a2a_server_op.select_agent_card_url(request_id, agent_name, agent_org)
                    if len(agent_card_url_list) > 0:
                        if len(agent_card_url_list) > 1:
                            logger.warning(f"request_id:{request_id}, there are {len(agent_card_url_list)} agents with name '{agent_name}' and org '{agent_org}'")
                    
                        idx = randint(0, len(agent_card_url_list) - 1)
                        final_a2a_server_url = agent_card_url_list[idx]
                        logger.info(f"request_id:{request_id}, select agent card url by name|org: {final_a2a_server_url}")
                        msg_content = f"已查询到agent<span style='color: green;'>@"+agent_id+"</span>，正在调用...<br>"
                        message = {
                                "event": AGUI_EVENT.TEXT_MESSAGE_CHUNK,
                                "source": "platform",
                                "agent_id": "",
                                "provider_url": "",
                                "content_type": "text", 
                                "content": msg_content,
                            }
                        writer(message)
                        merge_msg_content += msg_content
                        return {
                            "messages": AIMessage(content=merge_msg_content),
                            "agent_ranker_succeed": True, 
                            "ranked_agent_card_url": final_a2a_server_url, 
                            "agent_ranker_error_msg": ""
                        }

                    msg_content = f"<span style='color: red;'>未查询@{agent_id}的调用链接，我将基于你的指令匹配最合适的agent<br></span>"
                    message = {
                            "event": AGUI_EVENT.TEXT_MESSAGE_CHUNK,
                            "source": "platform",
                            "agent_id": "",
                            "provider_url": "",
                            "content_type": "text", 
                            "content": msg_content,
                        }
                    writer(message)
                    merge_msg_content += msg_content

                human_msg = HumanMessage(
                    content=state["text_input"]
                )
                state["messages"].append(human_msg)

                trimmed_messages = trim_messages(
                    state["messages"],
                    strategy="last",
                    token_counter=count_tokens_approximately,
                    max_tokens=32000,
                    start_on="human",
                    end_on=("human", "tool"),
                )

                msg_content = "正在匹配agent...<br>"
                message = {
                    "event": AGUI_EVENT.TEXT_MESSAGE_CHUNK,
                    "source": "platform",
                    "agent_id": "",
                    "provider_url": "",
                    "content_type": "text", 
                    "content": msg_content,
                }
                writer(message) 
                merge_msg_content += msg_content
                
                async for chunk in agent_ranker.astream(
                    {"messages": [system_msg] + trimmed_messages},
                    config={
                        "configurable": {
                            "thread_id": config["configurable"]["thread_id"],
                            "request_id": config["configurable"]["request_id"], 
                            "user_id": config["configurable"]["user_id"], 
                            "file_metadata_list": state["input_file_metadata_list"]
                        }
                    },
                    stream_mode="updates"
                ):
                    logger.info(f'request_id:{config["configurable"]["request_id"]},agent_ranker_subgraph response chunk:{chunk}')
                    if isinstance(chunk, dict) \
                            and "generate_structured_response" in chunk \
                            and "structured_response" in chunk["generate_structured_response"]:
                        rsp = chunk["generate_structured_response"]["structured_response"]
                        if rsp and rsp.agent_card_url:
                            agent_card = await a2a_util.get_agent_card(config["configurable"]["request_id"], rsp.agent_card_url)
                            if not agent_card:
                                continue
                            name = agent_card.name
                            provider_org = agent_card.provider.organization if agent_card.provider else ""
                            agent_id = name + ("|"+provider_org if provider_org else "")
                            msg_content = "为你找到agent<span style='color: green;'>@"+agent_id+"</span>，正在调用...<br>"
                            message = {
                                    "event": AGUI_EVENT.TEXT_MESSAGE_CHUNK,
                                    "source": "platform",
                                    "agent_id": "",
                                    "provider_url": "",
                                    "content_type": "text", 
                                    "content": msg_content,
                                }
                            writer(message) 
                            merge_msg_content += msg_content
                            return {
                                        "messages": AIMessage(content=merge_msg_content),
                                        "agent_ranker_succeed": rsp.succeed, 
                                        "ranked_agent_card_url": rsp.agent_card_url, 
                                        "agent_ranker_error_msg": rsp.error_msg
                                }
                
                msg_content = "<span style='color: red;'>抱歉，没找到匹配你需求的agent</span><br>"
                message = {
                        "event": AGUI_EVENT.TEXT_MESSAGE_CHUNK,
                        "source": "platform",
                        "agent_id": "",
                        "provider_url": "",
                        "content_type": "text", 
                        "content": msg_content,
                    }
                writer(message) 
                merge_msg_content += msg_content
                return {
                            "messages": AIMessage(content=merge_msg_content),
                            "agent_ranker_succeed": False, 
                            "ranked_agent_card_url": "", 
                            "agent_ranker_error_msg": "未找到任何符合要求的agent"
                    }
            except Exception as e:
                logger.error(f"request_id:{config["configurable"]["request_id"]}, agent_ranker_subgraph error: {traceback.format_exc()}")
                msg_content = "<span style='color: red;'>抱歉，服务遇到点问题，正在抢修...</span><br>"
                message = {
                        "event": AGUI_EVENT.TEXT_MESSAGE_CHUNK,
                        "source": "platform",
                        "agent_id": "",
                        "provider_url": "",
                        "content_type": "text", 
                        "content": msg_content,
                    }
                writer(message) 
                merge_msg_content += msg_content
                return {
                    "messages": AIMessage(content=merge_msg_content),
                    "agent_ranker_succeed": False, 
                    "ranked_agent_card_url": "", 
                    "agent_ranker_error_msg": "抱歉，服务遇到点问题，正在抢修..."
                }

        def call_agent_condition(state: State, config: RunnableConfig):
            if state["agent_ranker_succeed"] and state["ranked_agent_card_url"]:
                return "agent_invocation_subgraph"
            else:
                return END

        async def agent_invocation_subgraph(state: State, config: RunnableConfig):
            request_id = config["configurable"]["request_id"]
            agent_card_url = state["ranked_agent_card_url"]
            query = state["text_input"]
            file_metadata_list = state["input_file_metadata_list"]

            writer = get_stream_writer()

            try:
                agent_card = await a2a_util.get_agent_card(config["configurable"]["request_id"], agent_card_url)
                if not agent_card:
                    msg_content = "<span style='color: red;'>获取agent信息失败</span><br>"
                    message = {
                            "event": AGUI_EVENT.TEXT_MESSAGE_CHUNK,
                            "source": "platform",
                            "agent_id": "",
                            "provider_url": "",
                            "content_type": "text", 
                            "content": msg_content,
                        }
                    writer(message)
                    return {
                            "messages": AIMessage(content=msg_content),
                        }
                
                name = agent_card.name
                provider_org = agent_card.provider.organization if agent_card.provider else ""
                agent_id = name + ("|"+provider_org if provider_org else "")

                provider_url = agent_card.provider.url if agent_card.provider else ""

                message_str = ""
    
                async for type, content in a2a_util.get_a2a_server_rsp_with_url_stream2(
                                                                request_id, 
                                                                agent_card_url, 
                                                                query, 
                                                                file_metadata_list
                                                            ):
                    message = {
                            "event": AGUI_EVENT.FILE_ID_STRING if type == "file" else AGUI_EVENT.TEXT_MESSAGE_CHUNK,
                            "source": "agent",
                            "agent_id": agent_id,
                            "provider_url": provider_url,
                            "content_type": type, 
                            "content":content,
                        }
                    if type == "text":
                        message_str += content
                    writer(message) 

                return {
                            "messages": AIMessage(content=message_str),
                        }
            except Exception as e:
                logger.error(f"request_id:{request_id}, agent_invocation_subgraph error: {traceback.format_exc()}")
                msg_content = "<span style='color: red;'>调用agent失败</span><br>"
                message = {
                        "event": AGUI_EVENT.TEXT_MESSAGE_CHUNK,
                        "source": "platform",
                        "agent_id": "",
                        "provider_url": "",
                        "content_type": "text", 
                        "content": msg_content,
                    }
                writer(message)
                return {
                        "messages": AIMessage(content=msg_content),
                    }

        
        # with PostgresSaver.from_conn_string(DB_URI) as checkpointer:
        checkpointer = InMemorySaver()

        builder = StateGraph(State)
        builder.add_node("agent_ranker_subgraph", agent_ranker_subgraph)
        builder.add_node("agent_invocation_subgraph", agent_invocation_subgraph)

        builder.add_edge(START, "agent_ranker_subgraph")
        builder.add_conditional_edges("agent_ranker_subgraph", call_agent_condition, {
            "agent_invocation_subgraph": "agent_invocation_subgraph",
            END: END
        })

        self.graph = builder.compile(checkpointer=checkpointer)


    async def invoke_stream(self, thread_id: str, request_id: str, user_id: str, text_input: str, file_id_list: list[str], agent_name: str, agent_org: str) :
        try:
            # 根据file_id查询文件名字、类型、大小等元数据
            file_metadata_list = [] # list[list[str]]
            for file_id in file_id_list:
                filename, mime_type, size = file_op.get_file_metadata_by_id(request_id, file_id)
                file_metadata_list.append([file_id, filename, mime_type, size])

            input = {
                    "text_input": text_input,
                    "input_file_metadata_list": file_metadata_list,
                    "agent_name": agent_name,
                    "agent_org": agent_org
                }

            async for chunk in self.graph.astream(input, config={
                            "configurable": {
                                "thread_id": thread_id,
                                "request_id": request_id, 
                                "user_id": user_id
                            }
                        },
                        stream_mode="custom"
                    ):
                yield chunk

        except Exception as e:
            logger.error(f"request_id:{request_id}, MultiAgentGraph invoke failed: {traceback.format_exc()}")
            yield {
                    "event": AGUI_EVENT.TEXT_MESSAGE_CHUNK,
                    "source": "platform", 
                    "agent_id": "",
                    "provider_url": "",
                    "message_type": "text", 
                    "content": "抱歉，服务遇到点问题，正在抢修..."
                }

if __name__ == "__main__":
    import asyncio
    
    async def main():
        supervisor = MultiAgentGraph()
        async for chunk in  supervisor.invoke_stream("thread_id_001", "123", "noname_user", "生成一张海边傍晚的图片", []):
            print(f"lh_debug5: {chunk}")
        async for chunk in  supervisor.invoke_stream("thread_id_001", "456", "noname_user", "生成第二张海边傍晚的图片", []):
            print(f"lh_debug5: {chunk}")
        # async for chunk in supervisor.invoke_stream("thread_id_001", "123", "noname_user", "生成一段海边风景的视频", []):
        #     print("lh_debug:", chunk)
        #     if isinstance(chunk, dict) and \
        #         "generate_structured_response" in chunk \
        #         and "structured_response" in chunk["generate_structured_response"]:
        #         rsp = chunk["generate_structured_response"]["structured_response"]
        #         print(f"lh_debug2: event:{rsp.event}, message_type:{rsp.message_type}, content:{rsp.content}")
    
    asyncio.run(main())