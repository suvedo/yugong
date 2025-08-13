import re
import traceback
# from flask import Flask, request, jsonify, Response
from fastapi import FastAPI, Request, File, UploadFile, WebSocket, WebSocketDisconnect
from fastapi.responses import JSONResponse, StreamingResponse
from fastapi.middleware.cors import CORSMiddleware
from werkzeug.utils import secure_filename
import json
from datetime import datetime
import os
import uuid
import mimetypes
import urllib.parse
import asyncio
import random

from embedding import text_embedding
from database import (agent_op,  
                        a2a_server_op, 
                        file_op, 
                        chat_message_op, 
                        chat_list_op, 
                        auth_op, 
                        user_op
                    )
from rank import llm_ranker
from agent_space import a2a_server_registry
import config
from utils.log_util import logger
from utils import a2a_util, auth_util
from utils import file_util
from utils.enums import AGUI_EVENT, STREAM_MESSAGE_TYPE
from agent_space.os_agent.multi_agent_graph import MultiAgentGraph
from agent_space.agent_pipeline import plan, execute

# app = Flask(__name__)
app = FastAPI()

# 配置CORS中间件
app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        "https://yugong.org",  # 生产环境域名
        "https://www.yugong.org",  # 生产环境域名
        "http://yugong.org",  # 生产环境域名
        "http://www.yugong.org",  # 生产环境域名
        "http://localhost:3030",  # 前端开发环境
        "http://127.0.0.1:3030",  # 前端开发环境（IP地址）
        "http://localhost:3000",  # Next.js默认端口
        "http://127.0.0.1:3000",  # Next.js默认端口（IP地址）
    ],
    allow_credentials=True,
    allow_methods=["GET", "POST", "PUT", "DELETE", "OPTIONS"],
    allow_headers=["*"],
)

multi_agent_graph = MultiAgentGraph()


@app.post('/agent-space/a2a_server_register')
async def a2a_server_register(request: Request):
    try:
        data = await request.json()
        request_id = data.get('request_id', str(uuid.uuid4()))
        # if not request_id:
        #     logger.error(f"no request_id in request")
        #     return JSONResponse(content={}, status_code=500)
        
        user_id = data.get('user_id', '')
        if not user_id:
            logger.error(f"request_id:{request_id}，no user_id in request")
            return JSONResponse(content={"text": "未获取到用户信息"}, status_code=500)

        a2a_server_url = data.get('a2a_server_url', '')
        a2a_server_url = a2a_server_url.strip()
        if not a2a_server_url:
            logger.error(f"request_id:{request_id}, no a2a_server_url in request")
            return JSONResponse(content={"text": "URL不能为空"}, status_code=500)

        logger.info(f"got /agent-space/a2a_server_register request, request_id:{request_id}, user_id:{user_id}, a2a_server_url:{a2a_server_url}")

        # 检查URL是否以http://或https://开头
        if not a2a_server_url.startswith("http://") and not a2a_server_url.startswith("https://"):
            logger.error(f"request_id:{request_id}, Request URL is missing an 'http://' or 'https://' protocol")
            return JSONResponse(content={"text": "URL必须以'http://'或'https://'开头"}, status_code=500)

        # 检查URL是否已存在
        if a2a_server_op.a2a_server_url_exists(request_id, a2a_server_url):
            # logger.error(f"request_id:{request_id}, a2a_server_url:{a2a_server_url} already exists")
            return JSONResponse(content={"text": "该URL已注册"}, status_code=500)

        # 获取agent card
        final_agent_card_to_use = await a2a_util.get_agent_card(request_id, a2a_server_url)
        if not final_agent_card_to_use:
            logger.error(f"request_id:{request_id}, a2a_server_url:{a2a_server_url}, cannot get agent card from this url")
            return JSONResponse(content={"text": "无法从该URL获取agent card"}, status_code=500)

        agent_card_json_str = final_agent_card_to_use.model_dump_json()
        logger.info(f"request_id:{request_id}, agent card json: {agent_card_json_str}")

        agent_card_json = json.loads(agent_card_json_str)
        name = agent_card_json['name'].strip()
        provider_obj = agent_card_json['provider'] if 'provider' in agent_card_json else None
        provider_org, provider_url = "", ""
        if provider_obj:
            provider_org = provider_obj['organization'].strip() if 'organization' in provider_obj else ''
            provider_url = provider_obj['url'].strip() if 'url' in provider_obj else ''

        # 检查name是否合法
        if not a2a_util.check_name(name):
            logger.error(f"request_id:{request_id}, name ({name}) is invalid")
            return JSONResponse(content={"text": "agent card中name不能为空且不能包含'|'字符"}, status_code=500)

        # 检查provider_org是否合法
        if not a2a_util.check_provider_org(provider_org):
            logger.error(f"request_id:{request_id}, provider_org ({provider_org}) is invalid")
            return JSONResponse(content={"text": "agent card中organization不能包含'|'字符"}, status_code=500)

         # 检查name和provider_org是否已存在
        if a2a_server_op.name_provider_org_exists(request_id, name, provider_org):
            if provider_org:
                return JSONResponse(content={"text": "该organization下已有相同name的agent"}, status_code=500)
            else:
                return JSONResponse(content={"text": "已有相同name的agent\n温馨提示：在agent card中指明organization可有效解决name重复问题"}, status_code=500)

        # 生成语义向量
        semantic_json_str, semantic_json_embedding = \
                    a2a_server_registry.gen_semantic_embedding_from_agent_card(request_id, agent_card_json_str)
        if not semantic_json_str or not semantic_json_embedding:
            logger.error(f"request_id:{request_id}, generate semantic embedding fail!")
            return JSONResponse(content={"text": "服务器内部错误，请稍后再试"}, status_code=500)

        # agent数据入库
        agent_card_json = json.loads(agent_card_json_str)
        url = agent_card_json['url']
        version = agent_card_json['version']
        
        succ = a2a_server_op.insert(
            request_id,
            user_id,
            a2a_server_url,
            name,
            url,
            provider_org,
            provider_url,
            version,
            agent_card_json_str,
            semantic_json_embedding,
            semantic_json_str
        )

        if succ == 0:
            logger.info(f"request_id:{request_id}, register a2a server succ!")
            return JSONResponse(content=agent_card_json, status_code=200)
        else:
            logger.error(f"request_id:{request_id}, register a2a server fail!")
            return JSONResponse(content={"text": "服务器内部错误，请稍后再试"}, status_code=500)    

        
    except:
        logger.error(f"request_id:{request_id}, api /agent-space/a2a_server_register error: {traceback.format_exc()}")

    return JSONResponse(content={}, status_code=500)


# 接口弃用
# @app.post("/agent-space/agent_space_chat")
# async def agent_space_chat(request: Request):
    # try:
    #     data = await request.json()
    #     request_id = data.get('request_id', '')
    #     user_id = data.get('user_id', 'undefined')
    #     text_input = data.get('text_input', '')
    #     file_id_list = data.get('file_id_list', [])
    #     agent_name = data.get('agent_name', '')
    #     agent_org = data.get('agent_org', '')

    #     if not request_id:
    #         logger.error(f"no request_id in request")
    #         return JSONResponse(content={}, status_code=500)

    #     if not text_input:
    #         logger.error(f"no text_input in request")
    #         return JSONResponse(content={}, status_code=500)
        
    #     logger.info(f"got /agent-space/agent_space_chat request, request_id:{request_id}, user_id:{user_id}, " \
    #                     f"text_input:{text_input}, file_id_list:{file_id_list}, agent_name:{agent_name}, agent_org:{agent_org}")
        
    #     # return jsonify({"text_answer": "来自后端回复测试", "file_id_list_answer": file_id_list}), 200

    #     # ---------用户指定agent---------
    #     if agent_name:
    #         # 根据用户指定的信息获取a2a server url
    #         a2a_server_url_list = a2a_server_op.select_agent_card_url(request_id, agent_name, agent_org)
    #         if len(a2a_server_url_list) <= 0 or len(a2a_server_url_list) > 1:
    #             logger.warning(f"request_id:{request_id}, there are {len(a2a_server_url_list)} agents with name '{agent_name}' and org '{agent_org}'")
            
    #         if len(a2a_server_url_list) > 0 and a2a_server_url_list[0]:
    #             final_a2a_server_url = a2a_server_url_list[0]
    #             logger.info(f"request_id:{request_id}, user assigned agent, a2a server url is {final_a2a_server_url}")
                
    #             # 根据file_id查询文件名字、类型、大小等元数据
    #             file_metadata_list = [] # list[list[str]]
    #             for file_id in file_id_list:
    #                 filename, mime_type, size = file_op.get_file_metadata_by_id(request_id, file_id)
    #                 file_metadata_list.append([file_id, filename, mime_type, size])

    #             state, agent_answer = await a2a_util.get_a2a_server_rsp_with_url(request_id, final_a2a_server_url, text_input, file_metadata_list)
    #             if len(agent_answer) > 0:
    #                 answer = agent_answer[0]
    #                 logger.info(f"request_id:{request_id}, answered by user assigned agent, answer is 【{answer}】")
    #                 return JSONResponse(content={"text_answer": answer[0], "file_id_list_answer": answer[1]}, status_code=200)

    #     # ---------规划阶段---------
    #     answered, answer = plan.answer_by_llm(request_id, text_input)
    #     if answered == 1:
    #         logger.info(f"request_id:{request_id}, answered by LLM, answer is 【{answer}】")
    #         return JSONResponse(content={"text_answer": answer, "file_id_list_answer": []}, status_code=200)
    #     # ---------规划阶段完---------

    #     # ---------执行阶段---------
    #     answer = await execute.a2a_server_execute(request_id, text_input, file_id_list, agent_name, agent_org)
    #     if answer:
    #         logger.info(f"request_id:{request_id}, answered by a2a server, answer is 【{answer}】")
    #         return JSONResponse(content={"text_answer": answer[0], "file_id_list_answer": answer[1]}, status_code=200)        
    #     # ---------执行阶段完---------

    #     return JSONResponse(content={}, status_code=500)

    # except:
    #     logger.error(f"request_id:{request_id}, api /agent-space/agent_space_chat error: {traceback.format_exc()}")

    # return JSONResponse(content={}, status_code=500)


@app.websocket("/agent-space/agent_space_chat_stream")
async def agent_space_chat_stream(websocket: WebSocket):
    await websocket.accept()
    try:
        # 1. 等待前端发送初始请求参数
        data = await websocket.receive_json()
        thread_id = data.get('thread_id', '')
        request_id = data.get('request_id', '')
        user_id = data.get('user_id', 'undefined')
        text_input = data.get('text_input', '')
        file_id_list = data.get('file_id_list', [])
        agent_name = data.get('agent_name', '')
        agent_org = data.get('agent_org', '')

        if not thread_id or not user_id or not text_input:
            # thread_id = str(uuid.uuid4())
            logger.error(f"thread_id:{thread_id}, user_id:{user_id}, text_input:{text_input}, no thread_id or user_id or text_input in request")
            return

        if not request_id:
            request_id = str(uuid.uuid4())
            logger.warning(f"no request_id in request, use a new request_id: {request_id}")


        logger.info(f"got /agent-space/agent_space_chat request, thread_id:{thread_id}, request_id:{request_id}, user_id:{user_id}, " \
                        f"text_input:{text_input}, file_id_list:{file_id_list}, agent_name:{agent_name}, agent_org:{agent_org}")

        await websocket.send_json({"event": AGUI_EVENT.RUN_STARTED})

        # 保存会话列表（侧边栏用）
        if chat_list_op.insert_chat(thread_id, request_id, user_id, text_input) == 1:
            await websocket.send_json({"event": AGUI_EVENT.CHAT_LIST_UPDATED})

        # 保存会话消息（聊天区用）
        for file_id in file_id_list:
            if file_id:
                user_message = json.dumps({
                    "role": "user",
                    "event": AGUI_EVENT.FILE_ID_STRING,
                    "source": "",
                    "agent_id": "",
                    "provider_url": "",
                    "content_type": "file", 
                    "content":file_id,
                }, ensure_ascii=False)
                message_id = str(uuid.uuid4())
                chat_message_op.insert_message(thread_id, request_id, user_id, message_id, user_message)
        user_message = json.dumps({
            "role": "user",
            "event": AGUI_EVENT.TEXT_MESSAGE_CHUNK,
            "source": "",
            "agent_id": "",
            "provider_url": "",
            "content_type": "text", 
            "content":text_input,
        }, ensure_ascii=False)
        message_id = str(uuid.uuid4())
        chat_message_op.insert_message(thread_id, request_id, user_id, message_id, user_message)

        # 2. 启动主任务（流式输出）
        stop_requested = False
        
        async def stream_agent_answer():
            nonlocal stop_requested
            
            # 创建停止检查函数
            async def check_stop():
                nonlocal stop_requested
                try:
                    msg = await asyncio.wait_for(websocket.receive_json(), timeout=0.01)
                    logger.info(f"request_id:{request_id}, received message in stream: {msg}")
                    if msg.get("action") == "stop":
                        logger.info(f"request_id:{request_id}, user stop the task in stream")
                        stop_requested = True
                        return True
                except asyncio.TimeoutError:
                    pass
                except Exception as e:
                    logger.error(f"request_id:{request_id}, check_stop error: {e}")
                return False
            
            if config.USE_OS_AGENT:
                async for chunk in multi_agent_graph.invoke_stream(thread_id, request_id, user_id, text_input, file_id_list, agent_name, agent_org):
                    if await check_stop():
                        return
                    logger.info(f"thread_id:{thread_id}, request_id:{request_id}, answered by os agent, answer is 【{chunk}】")
                    # {
                    #     "event": AGUI_EVENT.TEXT_MESSAGE_CHUNK,
                    #     "source": "agent",
                    #     "agent_id": agent_id,
                    #     "provider_url": provider_url,
                    #     "content_type": "text", 
                    #     "content":content,
                    # }
                    chunk["role"] = "assistant"
                    message_id = str(uuid.uuid4())
                    assistant_message = json.dumps(chunk, ensure_ascii=False)
                    chat_message_op.insert_message(thread_id, request_id, user_id, message_id, assistant_message)
                    
                    yield chunk
                         
            else:
                # ---------用户指定agent---------
                if agent_name:
                    if await check_stop():
                        return
                    yield {
                            "event": AGUI_EVENT.TEXT_MESSAGE_CHUNK, 
                            "message_type": STREAM_MESSAGE_TYPE.REASONING, 
                            "content": (f"检测到指定了agent@{agent_name}" + f"|{agent_org}" if agent_org else "") + "，我将使用指定的agent完成任务\n"
                        }
                    a2a_server_url_list = a2a_server_op.select_agent_card_url(request_id, agent_name, agent_org)
                    if len(a2a_server_url_list) <= 0:
                        logger.warning(f"request_id:{request_id}, there are {len(a2a_server_url_list)} agents with name '{agent_name}' and org '{agent_org}'")
                        if await check_stop():
                            return
                        yield {
                                "event": AGUI_EVENT.TEXT_MESSAGE_CHUNK, 
                                "message_type": STREAM_MESSAGE_TYPE.WARNING,
                                "content": "未检索到对应的agent，我们将匹配最适合你任务的agent\n" 
                            }
                    elif len(a2a_server_url_list) > 1:
                        logger.warning(f"request_id:{request_id}, there are {len(a2a_server_url_list)} agents with name '{agent_name}' and org '{agent_org}'")
                        if await check_stop():
                            return
                        yield {
                                "event": AGUI_EVENT.TEXT_MESSAGE_CHUNK,
                                "message_type": STREAM_MESSAGE_TYPE.WARNING,
                                "content": "根据你提供的agent信息，我们检索到多个agent，我们将选择其中一个完成任务\n" 
                            }
                    
                    if len(a2a_server_url_list) > 0 and a2a_server_url_list[0]:
                        final_a2a_server_url = a2a_server_url_list[0]
                        if await check_stop():
                            return
                        yield {
                                "event": AGUI_EVENT.TEXT_MESSAGE_CHUNK,
                                "message_type": STREAM_MESSAGE_TYPE.REASONING, 
                                "content": "已检索到对应的agent\n" 
                            }
                        file_metadata_list = []
                        for file_id in file_id_list:
                            if stop_requested:
                                return
                            filename, mime_type, size = file_op.get_file_metadata_by_id(request_id, file_id)
                            file_metadata_list.append([file_id, filename, mime_type, size])
                        
                        # 在调用 a2a server 前检查停止信号
                        if await check_stop():
                            return
                        
                        # 假设 get_a2a_server_rsp_with_url 支持流式生成器
                        async for chunk in a2a_util.get_a2a_server_rsp_with_url_stream(request_id, final_a2a_server_url, text_input, file_metadata_list):
                            if stop_requested:
                                return
                            msg_type, text_msg, file_id_msg = chunk
                            if text_msg:
                                if await check_stop():
                                    return
                                yield {
                                    "event": AGUI_EVENT.TEXT_MESSAGE_CHUNK, 
                                    "message_type": msg_type, 
                                    "content": text_msg
                                }
                            if file_id_msg:
                                if await check_stop():
                                    return
                                yield {
                                    "event": AGUI_EVENT.FILE_ID_STRING, 
                                    "message_type": msg_type, 
                                    "content": file_id_msg
                                }

                        return

                # ---------规划阶段---------
                answered = -1
                
                # 在调用 LLM 前检查停止信号
                if await check_stop():
                    return
                    
                async for chunk in plan.answer_by_llm_stream(request_id, text_input):
                    msg_type, text_msg, has_answer = chunk
                    if answered != 1 and has_answer != -1:
                        if has_answer == 1:
                            answered = 1
                        elif has_answer == 0:
                            answered = 0
                    if text_msg:
                        if await check_stop():
                            return
                        yield {
                            "event": AGUI_EVENT.TEXT_MESSAGE_CHUNK, 
                            "message_type": msg_type, 
                            "content": text_msg
                        }
                    logger.info(f"request_id:{request_id}, answered by LLM, answer is 【{text_msg}】")
                
                
                
                if answered == 1:
                    return
                
                # ---------执行阶段---------
                # 在调用执行阶段前检查停止信号
                if await check_stop():
                    return
                
                async for chunk in execute.a2a_server_execute_stream(request_id, text_input, file_id_list, agent_name, agent_org):
                    if await check_stop():
                        return
                    msg_type, text_msg, file_id_msg = chunk
                    if text_msg:
                        if await check_stop():
                            return
                        yield {
                            "event": AGUI_EVENT.TEXT_MESSAGE_CHUNK, 
                            "message_type": msg_type, 
                            "content": text_msg
                        }
                    if file_id_msg:
                        if await check_stop():
                            return
                        yield {
                            "event": AGUI_EVENT.FILE_ID_STRING, 
                            "message_type": msg_type, 
                            "content": file_id_msg
                        }
                    logger.info(f"request_id:{request_id}, answered by a2a server, answer is 【{text_msg}】")

        # 3. 使用单一任务处理流式输出
        async def process_messages():
            nonlocal stop_requested
            
            logger.info(f"request_id:{request_id}, starting stream processing...")
            try:
                async for event in stream_agent_answer():
                    if stop_requested:
                        logger.info(f"request_id:{request_id}, stream cancelled by stop signal")
                        break
                    
                    logger.info(f"request_id:{request_id}, send event: {event}")
                    await websocket.send_json(event)
                
                if not stop_requested:
                    await websocket.send_json({"event": AGUI_EVENT.RUN_FINISHED})
                else:
                    logger.info(f"request_id:{request_id}, stream cancelled, return RUN_CANCEL event")
                    await websocket.send_json({"event": AGUI_EVENT.RUN_CANCEL})
                    
            except WebSocketDisconnect:
                logger.info(f"request_id:{request_id}, WebSocket disconnected during stream")
            except Exception as e:
                logger.error(f"request_id:{request_id}, stream processing error: {e}")
                if not stop_requested:
                    try:
                        await websocket.send_json({"event": AGUI_EVENT.RUN_ERROR})
                    except:
                        pass
        
        # 启动消息处理
        await process_messages()
    except WebSocketDisconnect:
        logger.info(f"request_id:{request_id}, WebSocket disconnected")
    except Exception as e:
        logger.error(f"request_id:{request_id}, main exception: {e}")
        try:
            await websocket.send_json({"event": AGUI_EVENT.RUN_ERROR, "error": "服务器内部错误，请稍后再试"})
        except:
            pass


@app.get("/agent-space/download_file/{file_id}")
async def download_file(file_id: str):
    """
    异步文件下载接口
    支持客户端异步下载文件，提供更好的并发性能
    """
    request_id = str(uuid.uuid4())
    logger.info(f"got /agent-space/download_file request, request_id:{request_id}, file_id:{file_id}")

    if not file_id:
        logger.error(f"request_id:{request_id}, input file id is empty")
        return JSONResponse(content={"error": "文件ID不能为空"}, status_code=400)

    try:
        # 从数据库异步读取文件
        filename, mime_type, file_size, content = await file_op.get_file_by_id_async(request_id, file_id)
        if not mime_type or not content:
            logger.error(f"request_id:{request_id}, file_id:{file_id}, file not found or empty")
            return JSONResponse(content={"error": "文件不存在或为空"}, status_code=404)

        logger.info(f"request_id:{request_id}, file_id:{file_id}, size:{file_size}")
        filename_urlencoded = urllib.parse.quote(filename)
        content_disposition = f"attachment; filename*=UTF-8''{filename_urlencoded}"

        async def file_iterator(data: bytes, chunk_size: int = 8192):
            """异步文件迭代器，支持流式传输"""
            for i in range(0, len(data), chunk_size):
                yield data[i:i+chunk_size]
                # 让出控制权给其他协程，提高并发性能
                await asyncio.sleep(0)

        return StreamingResponse(
            file_iterator(content),
            media_type=mime_type,
            headers={
                "Content-Disposition": content_disposition,
                "X-File-ID": file_id,
                "Content-Length": str(file_size),
                "Content-Type": mime_type,
                "Cache-Control": "no-cache",
                "Access-Control-Allow-Origin": "*",
                "Access-Control-Allow-Methods": "GET",
                "Access-Control-Allow-Headers": "Content-Type"
            }
        )
        
    except Exception as e:
        logger.error(f"request_id:{request_id}, file_id:{file_id}, download failed: {traceback.format_exc()}")
        return JSONResponse(content={"error": "文件下载失败"}, status_code=500)


@app.post('/agent-space/upload_file')
async def upload_file(file: UploadFile = File(...)):
    """处理文件上传到Neon数据库"""
    request_id = str(uuid.uuid4())
    logger.info(f"got /agent-space/upload_file request, request_id:{request_id}")

    if not file.filename:
        logger.error(f"request_id:{request_id}, no file selected")
        return JSONResponse(content={'error': '未选择文件'}, status_code=400)

    # 验证文件类型
    # if not file_util.allowed_file(file.filename):
    #     logger.error(f"request_id:{request_id}, file type not supported")
    #     return JSONResponse(content={'error': '不支持的文件类型'}, status_code=400)

    try:
        filename = os.path.basename(file.filename)
        file_data = await file.read()
        file_size = len(file_data)
        mime_type = file.content_type
        if not mime_type:
            mime_type, _ = mimetypes.guess_type(filename)
            if not mime_type:
                mime_type = 'application/octet-stream'
        logger.info(f"request_id:{request_id}, file to upload is {filename}, mime_type is {mime_type}")

        # 写入数据库
        if file_op.insert_file(request_id, request_id, filename, mime_type, file_size, file_data):
            return JSONResponse(content={"file_id": request_id}, status_code=200)
        else:
            return JSONResponse(content={'error': '上传失败'}, status_code=500)
    except:
        logger.error(f"request_id:{request_id}, upload file exception:{traceback.format_exc()}")

    return JSONResponse(content={'error': '上传失败'}, status_code=500)


@app.get('/agent-space/show_agents')
async def show_agents(user_id: str | None = None):
    request_id = str(uuid.uuid4())
    logger.info(f"got /agent-space/show_agents request, request_id:{request_id}, user_id:{user_id}")

    rsp_json = []
    try:
        if user_id:
            if user_id == 'null':
                logger.warning(f"request_id:{request_id}, user_id is null")
                return JSONResponse(content=[], status_code=200)
            
            agent_card_str_list = a2a_server_op.get_latest_registered_by_user(request_id, user_id)
        else:
            agent_card_str_list = a2a_server_op.get_latest_registered(request_id)
        
        for agent_card_str in agent_card_str_list:
            agent_card_json = json.loads(agent_card_str)
            rsp_json.append(agent_card_json)
        logger.info(f"request_id:{request_id}, show agents succeed, rsp_json: {rsp_json}")
        
        return JSONResponse(content=rsp_json, status_code=200)
    except:
        logger.error(f"request_id:{request_id}, show agents exception:{traceback.format_exc()}")
    
    return JSONResponse(content=[], status_code=500)
    

@app.post('/agent-space/search_agent')
async def search_agent(request: Request):
    try:
        data = await request.json()
        request_id = data.get('request_id', '')

        user_id = data.get('user_id', '')
        if not user_id or user_id == 'null':
            logger.warning(f"request_id:{request_id}, can't get user id")
            return JSONResponse(content={'text': '未获取到用户信息'}, status_code=500)
        
        text_input = data.get('text_input', '')
        if not text_input:
            logger.error(f"request_id:{request_id}, text input is empty")
            return JSONResponse(content={'text': '任务描述不能为空'}, status_code=500)

        logger.info(f"request_id:{request_id}, got /agent-space/search_agent request, text_input={text_input}")
        
        # 用户query转成向量
        d_embeded = text_embedding.embed_text(text_input)
        d_embeded = json.loads(d_embeded)
        e_vec = d_embeded["data"][0]["embedding"]

        # 向量检索
        retrieve_res = a2a_server_op.vector_retrieve(request_id, str(e_vec))
        if retrieve_res is None or len(retrieve_res) <= 0:
            return JSONResponse(content={'text': '服务器内容错误，请稍后再试'}, status_code=500)
        
        # 大模型排序
        rank_idx  = llm_ranker.rank_agent_card(request_id, text_input, retrieve_res)
        if rank_idx < 0 or rank_idx >= len(retrieve_res):
            return JSONResponse(content={'text': '搜索失败，请稍后再试'}, status_code=500)
        retrieved_agent = json.loads(retrieve_res[rank_idx])

        logger.info(f"request_id:{request_id}, search agent succeed, retrieved agent card: {retrieved_agent}")
        
        return JSONResponse(content=retrieved_agent, status_code=200)
    except:
        logger.error(f"request_id:{request_id}, api /agent-space/search_agent error: {traceback.format_exc()}")

    return JSONResponse(content={'text': '服务器内容错误'}, status_code=500)


@app.post('/agent-space/agent_space_chat/search_agent_by_prefix')
async def search_agent_by_prefix(request: Request):
    try:
        data = await request.json()
        request_id = data.get('request_id', '')

        user_id = data.get('user_id', '')
        if not user_id:
            logger.error(f"request_id:{request_id}, can't get user id")
            return JSONResponse(content={'text': '未获取到用户信息'}, status_code=500)
        
        prefix = data.get('prefix', '')
        if len(prefix) > 10:
            logger.error(f"request_id:{request_id}, prefix is more than 10 characters")
            return JSONResponse(content=[], status_code=200)
        
        logger.info(f"request_id:{request_id}, user_id:{user_id}, got /agent-space/agent_space_chat/search_agent_by_prefix request, prefix:{prefix}")

        agent_name_org_list = a2a_server_op.select_agent_name_org_by_prefix(request_id, prefix, config.AGENT_PREFIX_RECOMMEND_NUM)
        if len(agent_name_org_list) < config.AGENT_PREFIX_RECOMMEND_NUM:
            agent_name_org_list += a2a_server_op.select_agent_name_org_by_similarity(
                                                request_id, 
                                                prefix, 
                                                config.AGENT_PREFIX_RECOMMEND_NUM - len(agent_name_org_list)
                                    )

        # 去重
        agent_name_org_list = list(set(agent_name_org_list))

        logger.info(f"request_id:{request_id}, search agent by prefix succeed, agent_name_org_list: {agent_name_org_list}")
        return JSONResponse(content=agent_name_org_list, status_code=200)
    except:
        logger.error(f"request_id:{request_id}, api /agent-space/agent_space_chat/search_agent_by_prefix error: {traceback.format_exc()}")
    
    return JSONResponse(content=[], status_code=500)


@app.get('/agent-space/get_chat_list/{user_id}')
async def get_chat_list(user_id: str):
    request_id = str(uuid.uuid4())
    logger.info(f"got /agent-space/get_chat_list request, request_id:{request_id}, user_id:{user_id}")

    if not user_id or user_id == 'null':
        logger.warning(f"request_id:{request_id}, can't get user id")
        return JSONResponse(content=[], status_code=200)

    chat_list = chat_list_op.get_chat_list(request_id, user_id)

    return JSONResponse(content=chat_list, status_code=200)


@app.get('/agent-space/get_message_list/{thread_id}')
async def get_message_list(thread_id: str):
    request_id = str(uuid.uuid4())
    logger.info(f"got /agent-space/get_message_list request, request_id:{request_id}, thread_id:{thread_id}")

    message_list = chat_message_op.get_message_list(request_id, thread_id)

    return JSONResponse(content=message_list, status_code=200)


@app.post('/agent-space-auth/send_code')
async def send_code(request: Request):
    try:
        data = await request.json()
        request_id = data.get('request_id', '')
        to_mail   = data.get('to_mail', '')
        if not to_mail:
            logger.error(f"request_id:{request_id}, to_mail is empty")
            return JSONResponse(content={'text': '邮箱不能为空'}, status_code=500)

        logger.info(f"got /agent-space-auth/send_code request, request_id:{request_id}, to_mail:{to_mail}")

        code = str(random.randint(100000, 999999))
        # code = '000000'
        if auth_util.send_code_message(to_mail, code) \
            and auth_op.insert_auth_code(request_id, to_mail, code):
            return JSONResponse(content={'text': '验证码发送成功'}, status_code=200)
        else:
            return JSONResponse(content={'text': '验证码发送失败'}, status_code=500)
    except:
        logger.error(f"request_id:{request_id}, api /agent-space-auth/send_code error: {traceback.format_exc()}")

    return JSONResponse(content={'text': '验证码发送失败'}, status_code=500)


@app.post('/agent-space-auth/verify')
async def verify(request: Request):
    try:
        data = await request.json()
        request_id = data.get('request_id', '')
        to_mail    = data.get('to_mail', '')
        code       = data.get('code', '')
        if not to_mail or not code:
            logger.error(f"request_id:{request_id}, to_mail:{to_mail} or code:{code} is empty")
            return JSONResponse(content={'verify_succeed': False, 'user_id': '', 'text': '邮箱或验证码不能为空'}, status_code=200)

        logger.info(f"got /agent-space-auth/verify request, request_id:{request_id}, to_mail:{to_mail}, code:{code}")

        if auth_op.verify(request_id, to_mail, code):
            logger.info(f"request_id:{request_id}, to_mail:{to_mail}, code:{code}, verify code success")
            user_op.insert(request_id, to_mail, to_mail)
            return JSONResponse(content={'verify_succeed': True, 'user_id': to_mail, 'text': '验证码验证成功'}, status_code=200)
        else:
            logger.info(f"request_id:{request_id}, to_mail:{to_mail}, code:{code}, verify code failed")
            return JSONResponse(content={'verify_succeed': False, 'user_id': '', 'text': '验证码错误或已过期'}, status_code=200)
    except:
        logger.error(f"request_id:{request_id}, api /agent-space-auth/verify error: {traceback.format_exc()}")

    return JSONResponse(content={'verify_succeed': False, 'user_id': '', 'text': '验证码验证失败'}, status_code=500)

    
# if __name__ == '__main__':
#     os.makedirs(config.GEN_IMAGE_SAVE_DIR, exist_ok=True)
#     app.run(host='0.0.0.0', port=5001, debug=True)

if __name__ == '__main__':
    import uvicorn
    os.makedirs(config.GEN_IMAGE_SAVE_DIR, exist_ok=True)
    uvicorn.run("app:app", host="0.0.0.0", port=5001, reload=True)
