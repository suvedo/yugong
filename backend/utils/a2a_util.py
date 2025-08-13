from itertools import count
import re
from tkinter import Y
from typing import Any
from uuid import uuid4
import base64
import json
from typing import Tuple
from datetime import datetime
from typing import AsyncGenerator

from a2a.client import A2ACardResolver, A2AClient
from a2a.types import (
    AgentCard,
    DataPart,
    FilePart,
    FileWithBytes,
    FileWithUri,
    MessageSendParams,
    SendMessageRequest,
    SendStreamingMessageRequest,
    JSONRPCErrorResponse,
    SendMessageSuccessResponse,
    SendStreamingMessageSuccessResponse,
    Task,
    Message,
    Artifact,
    TaskStatusUpdateEvent,
    TaskArtifactUpdateEvent,
    TaskState,
    Part,
    TextPart
)
from a2a.client.errors import (
    A2AClientHTTPError,
    A2AClientJSONError
)
import httpx
import traceback
import magic

from database import file_op
from utils.log_util import logger
import config
from utils.enums import AGUI_EVENT, STREAM_MESSAGE_TYPE
from utils import file_util


async def get_agent_card(request_id: str, a2a_server_url: str) -> AgentCard | None:
    async with httpx.AsyncClient(timeout=10) as httpx_client:
        # Initialize A2ACardResolver
        resolver = A2ACardResolver(
            httpx_client=httpx_client,
            base_url=a2a_server_url,
            # agent_card_path uses default, extended_agent_card_path also uses default
        )
        # --8<-- [end:A2ACardResolver]

        # Fetch Public Agent Card and Initialize Client
        final_agent_card_to_use: AgentCard | None = None

        try:
            logger.info(
                f'request_id:{request_id}, Attempting to fetch public agent card from: {a2a_server_url}{config.PUBLIC_AGENT_CARD_PATH}'
            )
            _public_card = (
                await resolver.get_agent_card()
            )  # Fetches from default public path
            logger.info(f'request_id:{request_id}, Successfully fetched public agent card: '
                        f'{_public_card.model_dump_json()}')
            
            final_agent_card_to_use = _public_card

            if _public_card.supportsAuthenticatedExtendedCard:
                try:
                    logger.info(
                        f'request_id:{request_id}, Public card supports authenticated extended card. Attempting to fetch from: {a2a_server_url}{config.EXTENDED_AGENT_CARD_PATH}'
                    )
                    auth_headers_dict = {
                        'Authorization': 'Bearer dummy-token-for-extended-card'
                    }
                    _extended_card = await resolver.get_agent_card(
                        relative_card_path=config.EXTENDED_AGENT_CARD_PATH,
                        http_kwargs={'headers': auth_headers_dict},
                    )
                    logger.info(
                        f'request_id:{request_id}, Successfully fetched authenticated extended agent card: '
                        f'{_extended_card.model_dump_json(indent=2, exclude_none=True)}'
                    )
                    final_agent_card_to_use = (
                        _extended_card  # Update to use the extended card
                    )
                except Exception as e_extended:
                    logger.warning(
                        f'request_id:{request_id}, Failed to fetch extended agent card: {e_extended}. Will proceed with public card.',
                        exc_info=True,
                    )
            elif (
                _public_card
            ):  # supportsAuthenticatedExtendedCard is False or None
                logger.info(
                    f'request_id:{request_id}, Public card does not indicate support for an extended card. Using public card.'
                )

            return final_agent_card_to_use
        except Exception as e:
            logger.error(
                f'request_id:{request_id}, Critical error fetching public agent card: {e}', exc_info=True
            )
            
        return None


async def get_a2a_server_rsp_with_url(
        request_id: str, 
        agent_card_url: str, 
        query: str, 
        file_metadata_list: list[list[str|int]]
    ) -> Tuple[str, list[list[str]]]:
    """
    returns:
        `str` 状态：working failed rejected等
        `list[list[str]]` 外层list：返回内容的列表，内层list：第一个元素为返回的文本消息(可能为空)，第二个元素为返回的文件id(可能为空)
    """
    if not query:
        logger.error(f"request_id:{request_id}, query is empty")
        return "failed", []
    
    agent_card = await get_agent_card(request_id, agent_card_url)
    if agent_card is None:
        logger.error(f"request_id:{request_id}, can't get agent card from url:agent_card_url")
        return "failed", []

    return "failed", []

    # return await get_a2a_server_rsp(request_id, agent_card, query, file_metadata_list)


async def get_a2a_server_rsp_with_url_stream2(
        request_id: str, 
        agent_card_url: str, 
        query: str, 
        file_metadata_list: list[list[str|int]]
    ) -> Tuple[str, str]:
    """
    returns:
        `type` 返回的消息类型：text:文本消息，file:文件id
        `content` 返回的文本或文件id
    """
    if not query:
        logger.error(f"request_id:{request_id}, query is empty")
        return
    
    # for i in range(3):
    #     yield "text", f"大家啊开发机<b>阿萨法今飞凯达</b>数据，范德萨<a href='https://www.baidu.com' target='_blank'>讲课费夹克式</a>。进度款萨芬交付沙发{i}<br><ol><li>第一条</li><li>第二条</li></ol><i>斜体</i>"
    # yield "file", "6929c6a9ee674340a26e99fa2adb9ca0"
    # for i in range(3,6):
    #     yield "text", f"大家啊开发机<b>阿萨法今飞凯达</b>数据，范德萨<a href='https://www.baidu.com' target='_blank'>讲课费夹克式</a>。进度款萨芬交付沙发{i}<br><ul><li>第一条</li><li>第二条</li></ul><i>斜体</i>"
    # yield "file", "6929c6a9ee674340a26e99fa2adb9ca0"
    # return
    
    agent_card = await get_agent_card(request_id, agent_card_url)
    if agent_card is None:
        logger.error(f"request_id:{request_id}, can't get agent card from url:agent_card_url")
        yield "text", "<span style='color: red;'>调用失败</span><br>"
    else:
        async for chunk in get_a2a_server_rsp_stream2(request_id, agent_card, query, file_metadata_list):
            yield chunk


async def get_a2a_server_rsp_with_url_stream(
        request_id: str, 
        agent_card_url: str, 
        query: str, 
        file_metadata_list: list[list[str]]
    ) -> AsyncGenerator[Tuple[str, str, str], None]:
    agent_card = await get_agent_card(request_id, agent_card_url)
    if agent_card is None:
        logger.error(f"request_id:{request_id}, can't get agent card from url:agent_card_url")
        yield STREAM_MESSAGE_TYPE.ERROR, "获取agent调用信息失败\n", ""
        return

    async for item in get_a2a_server_rsp_stream(request_id, agent_card, query, file_metadata_list):
        yield item


async def get_a2a_server_rsp_stream(
        request_id: str, 
        agent_card: AgentCard, 
        query: str, 
        file_metadata_list: list[list[str]]
    ) -> AsyncGenerator[Tuple[str, str, str], None]:
    """
    返回值：
        STREAM_MESSAGE_TYPE: reasoning, warning, error等
        str: 返回的文本内容
        str: 返回的文件id
    """
    async with httpx.AsyncClient(timeout=1000) as httpx_client:
        # --8<-- [start:send_message]
        try:
            client = A2AClient(
                httpx_client=httpx_client, agent_card=agent_card
            )
            yield STREAM_MESSAGE_TYPE.REASONING, "连接agent成功，正在请求agent获取结果...\n", ""

            send_message_payload: dict[str, Any] = {
                'message': {
                    'role': 'user',
                    'parts': [
                        {'kind': 'text', 'text': query}
                    ],
                    'messageId': uuid4().hex,
                },
            }

            for file_meta_data in file_metadata_list:
                file_id, filename, mime_type, size = file_meta_data
                file_uri = config.FILE_DOWNLOAD_URI.format(file_id=file_id)
                file_part = {'kind': 'file', 'file': {'mimeType': str(mime_type), 'uri': file_uri}}
                send_message_payload['message']['parts'].append(file_part)

            request = SendMessageRequest(
                id=str(uuid4()), params=MessageSendParams(**send_message_payload)
            )

            response = await client.send_message(request)
            yield STREAM_MESSAGE_TYPE.REASONING, "请求agent成功，正在解析结果...\n", ""

            response  = response.model_dump(mode='json', exclude_none=True)
            if "result" in response and "parts" in response["result"]:
                for part in response["result"]["parts"]:
                    # 处理文本
                    if "kind" in part and part["kind"] == "text" and "text" in part:
                        # rsp_text.append(part["text"])
                        yield STREAM_MESSAGE_TYPE.RESULT, part["text"], ""
                    # 处理文件
                    elif "kind" in part and part["kind"] == "file" and "file" in part:
                        file_part = part["file"]
                        # 处理以bytes方式返回的文件
                        if "bytes" in file_part:
                            base64_str = file_part["bytes"]
                            decoded_data = base64.b64decode(base64_str)  # 解码为二进制数据
                        elif "uri" in file_part:
                            file_uri = file_part["uri"]
                            decoded_data = file_util.download_file(file_uri)
                        else:
                            logger.warning(f"request_id:{request_id}, unknown file part:{file_part}")
                            continue
                        
                        try:
                            size = len(decoded_data)
                            mime_type = file_part["mimeType"] if "mimeType" in file_part else ""
                            filename  = file_part["name"] if "name" in file_part else config.DEFAULT_FILENAME_IN_DATABASE
                            if not mime_type:
                                # 从decoded_data中获取mime_type
                                mime_type = magic.from_buffer(decoded_data, mime=True)
                            if not mime_type:
                                mime_type = config.DEFAULT_MIME_TYPE_IN_DATABASE
                                logger.warning(f"request_id: {request_id}, cann't get mimetype, use default:{mime_type}")

                            gen_file_id = uuid4().hex
                            file_op.insert_file(request_id, gen_file_id, filename, mime_type, size, decoded_data)

                            yield STREAM_MESSAGE_TYPE.RESULT, "", gen_file_id
                        except:
                            # logger.error(f"request_id: {request_id}, query: {query}, save to file exception: {traceback.format_exc()}")
                            logger.error(f"request_id: {request_id}, query: {query}, insert into database file exception: {traceback.format_exc()}")
                            yield STREAM_MESSAGE_TYPE.WARNING, "解析文件遇到问题\n", ""
            else:
                yield STREAM_MESSAGE_TYPE.ERROR, "agent未返回结果\n", ""

        except GeneratorExit:
            logger.info(f"request_id:{request_id}, get_a2a_server_rsp_stream generator cancelled")
            raise
        except Exception as e:
            logger.error(f"request_id:{request_id}, get_a2a_server_rsp_stream error: {e}")
            yield STREAM_MESSAGE_TYPE.ERROR, f"agent调用异常: {str(e)}", ""


def process_a2a_part(request_id: str, part: Part) -> Tuple[str, str, str, str]:
    """
    returns:
        `Tuple[str, str, str, str]` 第一个元素是文本消息（包括a2a里的dict，会转成json str），
        第二个元素是文件名称，
        第三个元素是文件类型(mime type)
        第四个元素是文件的base64编码（如果是uri，下载后转为base64），
    """
    if isinstance(part.root, TextPart):
        return part.root.text, "", "", ""
    if isinstance(part.root, DataPart):
        data = json.dumps(part.root.data, ensure_ascii=False)
        return "```json" + data + "```", "", "", ""
    if isinstance(part.root, FilePart):
        file = part.root.file
        name  = file.name
        mime_type = file.mimeType
        if isinstance(file, FileWithBytes):
            bytes = file.bytes
            return "", name, mime_type, bytes
        
        if isinstance(file, FileWithUri):
            uri = file.uri
            logger.info(f"request_id:{request_id}, file uri is {uri}")
            decoded_data = file_util.download_file(uri)
            if not decoded_data:
                logger.warning(f"request_id:{request_id}, file is empty")
            bytes = base64.b64encode(decoded_data)
            return "", name, mime_type, bytes
             

def process_a2a_task(request_id: str, 
                        task: Task, 
                        # final_state: str, 
                        # final_text_file_list: list[str, str, str, str, str], # 0: id, 1: text, 2: filename, 3: mime_type, 4: file_bytes
                    ):
    task_id    = task.id
    context_id = task.contextId
    status     = task.status
    artifacts  = task.artifacts
    metadata   = task.metadata
    history    = task.history

    # if final_state != str(TaskState.completed) \
    #         and final_state != str(TaskState.canceled) \
    #         and final_state != str(TaskState.failed) \
    #         and final_state != str(TaskState.rejected):
    #     final_state = str(status.state)

    if status.message: # 如果status.message和artifacts同时存在，优先展示status.message中的内容
        yield process_a2a_message(request_id, status.message)

    if artifacts:
        for artifact in artifacts:
            yield process_a2a_artifact(request_id, artifact)


def process_a2a_artifact(request_id: str, 
                            artifact: Artifact,
                            # final_text_file_list: list[str, str, str, str, str], # 0: id, 1: text, 2: filename, 3: mime_type, 4: file_bytes
                        ):
    artifact_id = artifact.artifactId
    for part in artifact.parts:
        text, name, mime_type, file_bytes = process_a2a_part(request_id, part)
        yield artifact_id, text, name, mime_type, file_bytes
        # if text:
        #     if len(final_text_file_list) == 0 \
        #             or final_text_file_list[-1][0] != artifact_id \
        #             or final_text_file_list[-1][3] != "":
        #         final_text_file_list.append([artifact_id, text, "", "", ""])
        #     else:
        #         final_text_file_list[-1][1] += text
        # if file_bytes:
        #     if len(final_text_file_list) == 0 \
        #             or final_text_file_list[-1][0] != artifact_id \
        #             or final_text_file_list[-1][1] != "":
        #         final_text_file_list.append([artifact_id, "", name, mime_type, file_bytes])
        #     else:
        #         if name:
        #             final_text_file_list[-1][2] = name
        #         if mime_type:
        #             final_text_file_list[-1][3] = mime_type
        #         final_text_file_list[-1][4] += file_bytes


def process_a2a_message(request_id: str, 
                            message: Message,
                            # final_text_file_list: list[str, str, str, str, str], # 0: id, 1: text, 2: filename, 3: mime_type, 4: file_bytes
                        ):
    message_id = message.messageId
    for part in message.parts:
        text, name, mime_type, file_bytes = process_a2a_part(request_id, part)
        yield message_id, text, name, mime_type, file_bytes
        # if text:
        #     if len(final_text_file_list) == 0 \
        #             or final_text_file_list[-1][0] != message_id \
        #             or final_text_file_list[-1][3] != "":
        #         final_text_file_list.append([message_id, text, "", "", ""])
        #     else:
        #         final_text_file_list[-1][1] += text
        # if file_bytes:
        #     if len(final_text_file_list) == 0 \
        #             or final_text_file_list[-1][0] != message_id \
        #             or final_text_file_list[-1][1] != "":
        #         final_text_file_list.append([message_id, "", name, mime_type, file_bytes])
        #     else:
        #         if name:
        #             final_text_file_list[-1][2] = name
        #         if mime_type:
        #             final_text_file_list[-1][3] = mime_type
        #         final_text_file_list[-1][4] += file_bytes


def process_task_status_update_event(request_id: str, 
                                        task_status_update_event: TaskStatusUpdateEvent,
                                        # final_state: str, 
                                        # final_text_file_list: list[str, str, str, str, str], # 0: id, 1: text, 2: filename, 3: mime_type, 4: file_bytes
                                    ):
    status = task_status_update_event.status
    
    # if final_state != str(TaskState.completed) \
    #         and final_state != str(TaskState.canceled) \
    #         and final_state != str(TaskState.failed) \
    #         and final_state != str(TaskState.rejected):
    #     final_state = str(status.state)

    if status.message:
        yield process_a2a_message(request_id, status.message)


def process_task_artifact_update_event(request_id: str, 
                                        task_artifact_update_event: TaskArtifactUpdateEvent,
                                        # final_state: str,
                                        # final_text_file_list: list[str, str, str, str, str], # 0: id, 1: text, 2: filename, 3: mime_type, 4: file_bytes
                                    ):
    # if final_state != str(TaskState.completed) \
    #         and final_state != str(TaskState.canceled) \
    #         and final_state != str(TaskState.failed) \
    #         and final_state != str(TaskState.rejected) \
    #         and task_artifact_update_event.lastChunk:
    #     final_state = "completed"
    
    append = task_artifact_update_event.append
    if append:
        artifact = task_artifact_update_event.artifact
        yield process_a2a_artifact(request_id, artifact)


def process_file_bytes(request_id, filename, mime_type, file_bytes):
    if file_bytes:
        decoded_data = base64.b64decode(file_bytes)  # 解码为二进制数据
        size = len(decoded_data)
        if not filename:
            filename = config.DEFAULT_FILENAME_IN_DATABASE
        if not mime_type:
            # 从decoded_data中获取mime_type
            mime_type = magic.from_buffer(decoded_data, mime=True)
        if not mime_type:
            mime_type = config.DEFAULT_MIME_TYPE_IN_DATABASE
            logger.warning(f"request_id: {request_id}, cann't get mimetype, use default:{mime_type}")

        gen_file_id = uuid4().hex
        if file_op.insert_file(request_id, gen_file_id, filename, mime_type, size, decoded_data):
            return gen_file_id

    return ""


async def get_a2a_server_rsp_stream2(
        request_id: str, 
        agent_card: AgentCard, 
        query: str, 
        file_metadata_list: list[list[str|int]]
    ) -> Tuple[str, str]:
    """
    returns:
        `type` 返回的消息类型：text:文本消息，file:文件id
        `content` 返回的文本或文件id
    """
    
    async with httpx.AsyncClient(timeout=1000) as httpx_client:
        client = A2AClient(
            httpx_client=httpx_client, agent_card=agent_card
        )
        
        send_message_payload: dict[str, Any] = {
            'message': {
                'role': 'user',
                'parts': [
                    {'kind': 'text', 'text': query}
                ],
                'messageId': uuid4().hex,
            },
        }

        for file_meta_data in file_metadata_list:
            file_id, filename, mime_type, size = file_meta_data
            file_uri = config.FILE_DOWNLOAD_URI.format(file_id=file_id)
            file_part = {'kind': 'file', 'file': {'mimeType': str(mime_type), 'uri': file_uri}}
            send_message_payload['message']['parts'].append(file_part)

        logger.info(f"request_id:{request_id}, send message payload is {json.dumps(send_message_payload, ensure_ascii=False)}")

        if agent_card.capabilities.streaming: # 如果agent card里包含streaming能力，优先用streaming请求
            try:
                request = SendStreamingMessageRequest(
                    id=request_id,
                    params=MessageSendParams(**send_message_payload)
                )
                logger.info(f"request_id:{request_id}, send streaming request")

                # final_state, final_text_file_list = "", []
                prev_id, final_name, final_mime_type, total_file_bytes = "", "", "", ""
                async for response in client.send_message_streaming(request):
                    if isinstance(response.root, JSONRPCErrorResponse):
                        logger.warning(f"request_id:{request_id}, receive JSONRPCErrorResponse when send streaming request: " \
                                        f"{JSONRPCErrorResponse.model_dump(mode='json', exclude_none=True)}")
                    elif isinstance(response.root, SendStreamingMessageSuccessResponse):  
                        result = response.root.result
                        if isinstance(result, Task):
                            for id, text, name, mime_type, file_bytes in \
                                process_a2a_task(request_id, result):
                                if text:
                                    prev_id = id
                                    yield "text", text
                                if file_bytes:
                                    if id != prev_id:
                                        if total_file_bytes:
                                            file_id = process_file_bytes(request_id, final_name, final_mime_type, total_file_bytes)
                                            final_name, final_mime_type, total_file_bytes = "", "", ""
                                            if file_id:
                                                yield "file", file_id
                                    if name:
                                        final_name = name
                                    if mime_type:
                                        final_mime_type = mime_type
                                    total_file_bytes += file_bytes
                                    prev_id = id
                        elif isinstance(result, Message):
                            for id, text, name, mime_type, file_bytes in \
                                    process_a2a_message(request_id, result):
                                if text:
                                    prev_id = id
                                    yield "text", text
                                if file_bytes:
                                    if id != prev_id:
                                        if total_file_bytes:
                                            file_id = process_file_bytes(request_id, final_name, final_mime_type, total_file_bytes)
                                            final_name, final_mime_type, total_file_bytes = "", "", ""
                                            if file_id:
                                                yield "file", file_id
                                    if name:
                                        final_name = name
                                    if mime_type:
                                        final_mime_type = mime_type
                                    total_file_bytes += file_bytes
                                    prev_id = id
                        elif isinstance(result, TaskStatusUpdateEvent):
                            for id, text, name, mime_type, file_bytes in \
                                    process_task_status_update_event(request_id, result):
                                if text:
                                    prev_id = id
                                    yield "text", text
                                if file_bytes:
                                    if id != prev_id:
                                        if total_file_bytes:
                                            file_id = process_file_bytes(request_id, final_name, final_mime_type, total_file_bytes)
                                            final_name, final_mime_type, total_file_bytes = "", "", ""
                                            if file_id:
                                                yield "file", file_id
                                    if name:
                                        final_name = name
                                    if mime_type:
                                        final_mime_type = mime_type
                                    total_file_bytes += file_bytes
                                    prev_id = id
                            if result.final:
                                break
                        elif isinstance(result, TaskArtifactUpdateEvent):
                            for id, text, name, mime_type, file_bytes in \
                                    process_task_artifact_update_event(request_id, result):
                                if text:
                                    prev_id = id
                                    yield "text", text
                                if file_bytes:
                                    if id != prev_id:
                                        if total_file_bytes:
                                            file_id = process_file_bytes(request_id, final_name, final_mime_type, total_file_bytes)
                                            final_name, final_mime_type, total_file_bytes = "", "", ""
                                            if file_id:
                                                yield "file", file_id
                                    if name:
                                        final_name = name
                                    if mime_type:
                                        final_mime_type = mime_type
                                    total_file_bytes += file_bytes
                                    prev_id = id    
                        else:
                            logger.error(f"request_id:{request_id}, unknown SendStreamingMessageSuccessResponse type")
                    else:
                        logger.warning(f"request_id:{request_id}, unknown return type from A2AClient.send_message_streaming")

                if total_file_bytes:
                    file_id = process_file_bytes(request_id, final_name, final_mime_type, total_file_bytes)
                    final_name, final_mime_type, total_file_bytes = "", "", ""
                    if file_id:
                        yield "file", file_id
                
                # final_text_fileid_list = process_file_bytes(request_id, final_text_file_list)
                # logger.info(f"request_id:{request_id}, send_message_streaming final result: final_state={final_state}, final_text_fileid_list={final_text_fileid_list}")
                # return final_state, final_text_fileid_list
            
            except A2AClientHTTPError as e:
                logger.error(f"request_id:{request_id}, A2AClientHTTPError when send streaming request, error message: {e.message}, traceback: {traceback.format_exc()}")
            except A2AClientJSONError as e:
                logger.error(f"request_id:{request_id}, A2AClientJSONError when send streaming request, error message: {e.message}, traceback: {traceback.format_exc()}")
            except Exception as e:
                logger.error(f"request_id:{request_id}, exception in send streaming request: {traceback.format_exc()}")
                return
            
        try: # 不支持streaming 或调用streaming失败，调message/send
            request = SendMessageRequest(
                id=str(uuid4()), params=MessageSendParams(**send_message_payload)
            )

            response = await client.send_message(request)
            # final_state, final_text_file_list = "", []
            prev_id, final_name, final_mime_type, total_file_bytes = "", "", "", ""
            if isinstance(response.root, JSONRPCErrorResponse):
                logger.warning(f"request_id:{request_id}, receive JSONRPCErrorResponse when send streaming request: " \
                                f"{JSONRPCErrorResponse.model_dump(mode='json', exclude_none=True)}")
            elif isinstance(response.root, SendMessageSuccessResponse):
                result = response.root.result
                if isinstance(result, Task):
                    for id, text, name, mime_type, file_bytes in \
                            process_a2a_task(request_id, result):
                        if text:
                            prev_id = id
                            yield "text", text
                        if file_bytes:
                            if id != prev_id:
                                if total_file_bytes:
                                    file_id = process_file_bytes(request_id, final_name, final_mime_type, total_file_bytes)
                                    final_name, final_mime_type, total_file_bytes = "", "", ""
                                    if file_id:
                                        yield "file", file_id
                            if name:
                                final_name = name
                            if mime_type:
                                final_mime_type = mime_type
                            total_file_bytes += file_bytes
                            prev_id = id
                elif isinstance(result, Message):
                    for id, text, name, mime_type, file_bytes in \
                            process_a2a_message(request_id, result):
                        if text:
                            prev_id = id
                            yield "text", text
                        if file_bytes:
                            if id != prev_id:
                                if total_file_bytes:
                                    file_id = process_file_bytes(request_id, final_name, final_mime_type, total_file_bytes)
                                    final_name, final_mime_type, total_file_bytes = "", "", ""
                                    if file_id:
                                        yield "file", file_id
                            if name:
                                final_name = name
                            if mime_type:
                                final_mime_type = mime_type
                            total_file_bytes += file_bytes
                            prev_id = id
                if total_file_bytes:
                    file_id = process_file_bytes(request_id, final_name, final_mime_type, total_file_bytes)
                    final_name, final_mime_type, total_file_bytes = "", "", ""
                    if file_id:
                        yield "file", file_id
            else:
                logger.warning(f"request_id:{request_id}, unknown return type from A2AClient.send_message")

            # final_text_fileid_list = process_file_bytes(request_id, final_text_file_list)
            # logger.info(f"request_id:{request_id}, send_message final result: final_state={final_state}, final_text_fileid_list={final_text_fileid_list}")
            # return final_state, final_text_fileid_list
        except A2AClientHTTPError as e:
            logger.error(f"request_id:{request_id}, A2AClientHTTPError when send streaming request, error message: {e.message}, traceback: {traceback.format_exc()}")
        except A2AClientJSONError as e:
            logger.error(f"request_id:{request_id}, A2AClientJSONError when send streaming request, error message: {e.message}, traceback: {traceback.format_exc()}")
        except Exception as e:
            logger.error(f"request_id:{request_id}, exception in send streaming request: {traceback.format_exc()}")

        # return "failed", []
            

def transform_agent_card2semantic_json_str(request_id: str, agent_card_json_str: str) -> str | None:
    try:
        agent_card_json = json.loads(agent_card_json_str)

        semantic_json = {}

        # 名字
        name = agent_card_json['name']
        semantic_json["名字"] = name

        # 描述
        description = agent_card_json['description']
        semantic_json["描述"] = description

        # 智能体链接
        url = agent_card_json['url']
        semantic_json["智能体链接"] = url

        # 供应商名字
        provider_obj = agent_card_json['provider'] if 'provider' in agent_card_json else None
        provider_org = provider_obj['organization'] if provider_obj and 'organization' in provider_obj else ''
        semantic_json["供应商名字"] = provider_org

        # 能力
        capability_str_list = []
        capabilities = agent_card_json['capabilities']
        if 'streaming' in capabilities:
            if capabilities['streaming']:
                capability_str_list.append("支持流式方式")
            else:
                capability_str_list.append("不支持流式方式")
        if 'pushNotifications' in capabilities:
            if capabilities['pushNotifications']:
                capability_str_list.append("支持推送通知方式")
            else:
                capability_str_list.append("不支持推送通知方式")
        semantic_json["能力"] = "，".join(capability_str_list)

        # 默认输入模式
        default_input_modes = agent_card_json['defaultInputModes']
        semantic_json["默认输入模式"] = default_input_modes

        # 默认输出模式
        default_output_modes = agent_card_json['defaultOutputModes']
        semantic_json["默认输出模式"] = default_output_modes

        # 技能列表
        skills = agent_card_json['skills']
        skills_cn = []
        for skill in skills:
            s_name = skill['name']
            s_description = skill['description']
            s_tags = skill['tags']
            s_examples = None if 'examples' not in skill else skill['examples']
            s_input_modes = None if 'inputModes' not in skill else skill['inputModes']
            s_output_modes = None if 'outputModes' not in skill else skill['outputModes']
            skill_cn = {
                "技能名字": s_name,
                "技能描述": s_description,
                "技能标签": s_tags
            }
            if s_examples:
                skill_cn["示例"] = s_examples
            if s_input_modes:
                skill_cn['该技能输入模式'] = s_input_modes
            if s_output_modes:
                skill_cn['该技能输出模式'] = s_output_modes
            skills_cn.append(skill_cn)
        
        semantic_json['技能列表'] = skills_cn
        semantic_json_str = json.dumps(semantic_json, ensure_ascii=False)
        
        return semantic_json_str
    except:
        logger.error(f"request_id:{request_id}, transform agent card to semantic json str error:{traceback.format_exc()}")

    return None


def check_name(name: str) -> bool:
    if not name or "|" in name:
        return False
    return True


def check_provider_org(provider_org: str) -> bool:
    if "|" in provider_org:
        return False
    return True