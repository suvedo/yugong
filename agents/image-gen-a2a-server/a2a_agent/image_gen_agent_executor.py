import uuid
import requests
from datetime import datetime
import traceback
import base64
from typing import Tuple

from a2a.server.agent_execution import AgentExecutor, RequestContext
from a2a.server.events import EventQueue
from a2a.utils import new_agent_text_message, new_agent_parts_message
from a2a.types import (
    FilePart,
    FileWithBytes,
    Part,
)

from a2a_agent import image_gen_agent
import config
from utils.log_util import logger
from utils import message_util

class ImageGenAgentExecutor(AgentExecutor):
    """Image Gen AgentProxy Implementation."""

    def __init__(self):
        pass

    
    async def execute(
            self,
            context: RequestContext,
            event_queue: EventQueue,
        ) -> None:
        try:
            request_id = str(uuid.uuid4())
            query = context.get_user_input()

            if not query:
                logger.warning(f"request_id: {request_id}, no text input")

            user_image_uri_list = message_util.get_user_image_uri_list(context.message)

            if len(user_image_uri_list) > 0:
                input_img_url = user_image_uri_list[0][0] # only one image by default

                model = await self._select_model_from_image(request_id, query, input_img_url)

                prompt, negative_prompt = await self._gen_prompts(request_id, query)

                img_size = await self._extract_size(request_id, query)

                img_url = await image_gen_agent.gen_image_from_image(request_id, model, input_img_url, prompt, negative_prompt, img_size)

            else:
                model = await self._select_model_from_text(request_id, query)

                prompt, negative_prompt = await self._gen_prompts(request_id, query)

                img_size = await self._extract_size(request_id, query)

                img_url = await image_gen_agent.gen_image_from_text(request_id, model, prompt, negative_prompt, img_size)

            if not img_url:
                await event_queue.enqueue_event(new_agent_text_message("图片生成失败"))
            else:
                # 设置请求头模拟浏览器
                headers = {
                    'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
                }
                
                # 流式下载大文件
                response = requests.get(img_url, headers=headers, stream=True)
                response.raise_for_status()  # 检查HTTP错误
                
                # 确定文件名
                suffix = img_url.split("?")[0].split(".")[-1]
                save_path = f"{config.GEN_IMAGE_SAVE_DIR}/{str(datetime.now()).replace(' ','')}-{request_id}.{suffix}"
                
                # 分块写入文件
                with open(save_path, 'wb') as f:
                    for chunk in response.iter_content(chunk_size=8192):
                        if chunk:  # 过滤keep-alive新块
                            f.write(chunk)

                # 向客户端回传图片
                with open(save_path, "rb") as image_file:
                    encoded_string = base64.b64encode(image_file.read()).decode('utf-8')

                file_part = FilePart(kind="file", file=FileWithBytes(bytes=encoded_string, mimeType=f"image/{suffix}", name=save_path.split("/")[-1]))
                await event_queue.enqueue_event(new_agent_parts_message(parts=[Part(root=file_part)]))

                logger.info(f"request_id:{request_id}, query:{query}, generate image complete")
        except:
            await event_queue.enqueue_event(new_agent_text_message("图片生成失败"))
            logger.error(f"request_id:{request_id}, image gen agent executor exception: {traceback.format_exc()}")

        
    
    
    async def cancel(
        self, context: RequestContext, event_queue: EventQueue
    ) -> None:
        raise Exception('cancel not supported')

    
    async def _select_model_from_text(self, request_id: str, query: str):
        return "wanx2.0-t2i-turbo"

    async def _select_model_from_image(self, request_id: str, query: str, input_img_url):
        return "wanx2.1-imageedit"

    
    async def _gen_prompts(self, request_id: str, query: str):
        return query, ""

    async def _extract_size(self, request_id: str, query: str):
        return "1024*1024"
