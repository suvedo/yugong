from logging import warning
import httpx
import os
from random import randrange
import traceback
import time

from utils.log_util import logger

SUPPORTED_INPUT_CONTENT_TYPES = ['text', 'text/plain']
SUPPORTED_OUTPUT_CONTENT_TYPES = ['text/plain', 'image/png']

task_creation_url = "https://dashscope.aliyuncs.com/api/v1/services/aigc/text2image/image-synthesis"
task_polling_url  = "https://dashscope.aliyuncs.com/api/v1/tasks/{task_id}"

task_creation_url2 = "https://dashscope.aliyuncs.com/api/v1/services/aigc/image2image/image-synthesis"
task_polling_url2  = "https://dashscope.aliyuncs.com/api/v1/tasks/{task_id}"


async def gen_image_from_text(request_id: str, 
                        model: str,
                        prompt: str, 
                        negative_prompt: str = "",
                        size: str = "1024*1024"
                    ) -> str:
    headers = {
        'X-DashScope-Async': 'enable',
        'Authorization': f'Bearer {os.getenv("DASHSCOPE_API_KEY")}',
        'Content-Type': 'application/json'
    }

    payload = {}

    payload["model"] = model

    payload["input"] = {}
    payload["input"]["prompt"] = prompt
    if negative_prompt:
        payload["input"]["negative_prompt"] = negative_prompt
    
    payload["parameters"] = {}
    payload["parameters"]["size"] = size
    payload["parameters"]["n"] = 1
    payload["parameters"]["seed"] = randrange(0, 2147483646)
    payload["parameters"]["prompt_extend"] = True
    payload["parameters"]["watermark"] = False

    try :
        async with httpx.AsyncClient(timeout=300) as client:
            # 创建任务
            task_id = None
            retry = 0
            while (True):
                response = await client.post(task_creation_url, headers=headers, json=payload)

                if (response.status_code != 200):
                    logger.warning(f"request_id:{request_id}, create task from model {model} failed! response: {response.text}")
                    retry +=1
                    if retry < 3:
                        logger.info(f"request_id:{request_id}, retry {retry} time")
                    else:
                        logger.error(f"request_id:{request_id}, after 3 times retry, quit!")
                        break
                else:
                    rsp_json = response.json()
                    if "output" in rsp_json and "task_id" in rsp_json["output"]:
                        task_id = str(rsp_json["output"]["task_id"])
                        break

            if not task_id:
                logger.info(f"request_id:{request_id}, cann't generate image from model {model} because of the task creation fatal")
                return ""
            logger.info(f"request_id:{request_id}, task_id:{task_id}, task submission succeed")

            # 轮询任务状态
            retry = 0
            headers = {
                "Authorization": f"Bearer {os.getenv('DASHSCOPE_API_KEY')}"
                
            }
            url = task_polling_url.format(task_id=task_id)
            while (True):
                response = await client.get(url, headers=headers)

                # 检查响应状态
                if response.status_code == 200:
                    rsp_json = response.json()
                    if "output" in rsp_json \
                        and "task_id" in rsp_json["output"] \
                        and rsp_json["output"]["task_id"] == task_id \
                        and "task_status" in rsp_json["output"]:

                        if rsp_json["output"]["task_status"] == "SUCCEEDED":
                            logger.info(f"request_id:{request_id}, prompt:{prompt}, image generation api rsp:{rsp_json}")
                            result = rsp_json["output"]["results"][0]
                            url = result["url"]
                            actual_prompt= result["actual_prompt"] if "actual_prompt" in result else ""
                            logger.info(f"request_id:{request_id}, prompt:{prompt}, actual_prompt:{actual_prompt}, negative_prompt:{negative_prompt}, generate image in {url}")
                            return url

                        if rsp_json["output"]["task_status"] == "FAILED" \
                            or rsp_json["output"]["task_status"] == "CANCELED":
                            logger.info(f"request_id:{request_id}, task_id:{task_id}, task failed or canceled, response is {rsp_json}")
                            return ""
                
                retry += 1
                if retry > 6000: # 最长等待时间10分钟
                    logger.error(f"request_id:{request_id}, task polling timeout!")
                    return ""

                time.sleep(0.1) # 100ms后再请求

    except:
        logger.error(f"request_id:{request_id}, generate image from text error:{traceback.format_exc()}")

    return ""


async def gen_image_from_image(request_id: str, 
                        model: str,
                        input_img_url: str,
                        prompt: str, 
                        negative_prompt: str = "",
                        size: str = "1024*1024"
                    ) -> str:
    headers = {
        'X-DashScope-Async': 'enable',
        'Authorization': f'Bearer {os.getenv("DASHSCOPE_API_KEY")}',
        'Content-Type': 'application/json'
    }

    payload = {}

    payload["model"] = model

    payload["input"] = {}
    payload["input"]["function"] = "description_edit"
    payload["input"]["prompt"] = prompt
    payload["input"]["base_image_url"] = input_img_url
    
    payload["parameters"] = {}
    payload["parameters"]["n"] = 1
    payload["parameters"]["seed"] = randrange(0, 2147483646)
    payload["parameters"]["watermark"] = False

    try :
        async with httpx.AsyncClient(timeout=300) as client:
            # 创建任务
            task_id = None
            retry = 0
            while (True):
                response = await client.post(task_creation_url2, headers=headers, json=payload)

                if (response.status_code != 200):
                    logger.warning(f"request_id:{request_id}, create task from model {model} failed! response: {response.text}")
                    retry +=1
                    if retry < 3:
                        logger.info(f"request_id:{request_id}, retry {retry} time")
                    else:
                        logger.error(f"request_id:{request_id}, after 3 times retry, quit!")
                        break
                else:
                    rsp_json = response.json()
                    if "output" in rsp_json and "task_id" in rsp_json["output"]:
                        task_id = str(rsp_json["output"]["task_id"])
                        break

            if not task_id:
                logger.info(f"request_id:{request_id}, cann't generate image from model {model} because of the task creation fatal")
                return ""
            logger.info(f"request_id:{request_id}, task_id:{task_id}, task submission succeed")

            # 轮询任务状态
            retry = 0
            headers = {
                "Authorization": f"Bearer {os.getenv('DASHSCOPE_API_KEY')}"
                
            }
            url = task_polling_url2.format(task_id=task_id)
            while (True):
                response = await client.get(url, headers=headers)

                # 检查响应状态
                if response.status_code == 200:
                    rsp_json = response.json()
                    if "output" in rsp_json \
                        and "task_id" in rsp_json["output"] \
                        and rsp_json["output"]["task_id"] == task_id \
                        and "task_status" in rsp_json["output"]:

                        if rsp_json["output"]["task_status"] == "SUCCEEDED":
                            logger.info(f"request_id:{request_id}, prompt:{prompt}, image generation api rsp:{rsp_json}")
                            result = rsp_json["output"]["results"][0]
                            url = result["url"]
                            actual_prompt= result["actual_prompt"] if "actual_prompt" in result else ""
                            logger.info(f"request_id:{request_id}, prompt:{prompt}, actual_prompt:{actual_prompt}, negative_prompt:{negative_prompt}, generate image in {url}")
                            return url

                        if rsp_json["output"]["task_status"] == "FAILED" \
                            or rsp_json["output"]["task_status"] == "CANCELED":
                            logger.info(f"request_id:{request_id}, task_id:{task_id}, task failed or canceled, response is {rsp_json}")
                            return ""
                
                retry += 1
                if retry > 6000: # 最长等待时间10分钟
                    logger.error(f"request_id:{request_id}, task polling timeout!")
                    return ""

                time.sleep(0.1) # 100ms后再请求

    except:
        logger.error(f"request_id:{request_id}, generate image from image error:{traceback.format_exc()}")

    return ""