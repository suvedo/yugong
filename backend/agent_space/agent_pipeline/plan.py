import json
import traceback
from typing import Tuple, AsyncGenerator

from agent_space.agent_pipeline.llm_prompts import ANSWER_TEXT_QUERY_PROMPT
from utils.llm_client import client
from utils.log_util   import logger
import config
from utils.enums import STREAM_MESSAGE_TYPE


def answer_by_llm(request_id: str, text_input: str) -> Tuple[int | None, str | None]:
    try:
        user_prompt = f"{text_input}"

        completion = client.chat.completions.create(
            model=config.PLAN_LLM_MODEL, 
            messages=[
                {'role': 'system', 'content': ANSWER_TEXT_QUERY_PROMPT},
                {'role': 'user', 'content': user_prompt}
            ]
        )

        if completion.choices[0].message.content:
            ans = completion.choices[0].message.content.replace("\n", "")
            logger.info(f"request_id:{request_id}, LLM answer in answer_by_llm：{ans}")
            if "```json" in ans:
                ans = ans.split("```json")[1]
                if "```" in ans:
                    ans = ans.split("```")[0]
            ans = json.loads(ans)
            if "status" in ans \
                and ans["status"] == "success" \
                and "answer" in ans \
                and ans["answer"]:
                return 1, str(ans["answer"])

            return 0, ""

        return None, None
    except Exception as e:
        logger.error(f"rank_agent exception:{traceback.format_exc()}")
        return None, None

    
async def answer_by_llm_stream(request_id: str, text_input: str) -> AsyncGenerator[Tuple[str, str, int], None]:
    """
        str: 返回的文本内容
        int: 大模型是否有答案
    """
    try:
        user_prompt = f"{text_input}"
        # 1. yield 推理开始
        yield STREAM_MESSAGE_TYPE.REASONING, "任务规划中...\n", -1
        completion = client.chat.completions.create(
            model=config.PLAN_LLM_MODEL, 
            messages=[
                {'role': 'system', 'content': ANSWER_TEXT_QUERY_PROMPT},
                {'role': 'user', 'content': user_prompt}
            ]
        )
        # 2. yield 原始返回内容
        if completion.choices[0].message.content:
            ans = completion.choices[0].message.content.replace("\n", "")
            logger.info(f"request_id:{request_id}, LLM answer in answer_by_llm_stream：{ans}")
            if "```json" in ans:
                ans = ans.split("```json")[1]
                if "```" in ans:
                    ans = ans.split("```", 1)[0]
            ans = json.loads(ans)
            if "status" in ans \
                and ans["status"] == "success" \
                and "answer" in ans \
                and ans["answer"]:
                # 3. yield 最终答案，按块流式输出
                answer = str(ans["answer"])
                import re
                blocks = re.split(r'(。|！|？|\n)', answer)
                buf = ''
                for b in blocks:
                    buf += b
                    if b in ('。', '！', '？', '\n'):
                        yield STREAM_MESSAGE_TYPE.RESULT, buf, 1
                        buf = ''
                if buf.strip():
                    yield STREAM_MESSAGE_TYPE.RESULT, buf, 1
                return

            yield STREAM_MESSAGE_TYPE.REASONING, "", 0
            return
        
        yield STREAM_MESSAGE_TYPE.REASONING, "", 0
    except GeneratorExit:
        logger.info(f"request_id:{request_id}, answer_by_llm_stream generator cancelled")
        raise
    except Exception as e:
        logger.error(f"rank_agent exception:{traceback.format_exc()}")
        yield STREAM_MESSAGE_TYPE.ERROR, "推理出现异常，正在修复...\n", 0