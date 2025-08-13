import traceback
import json

from utils.llm_client import client
from rank.llm_prompts import AGENT_RANK_SYSTEM_PROMPT, AGENT_CARD_RANK_SYSTEM_PROMPT
import config
from utils.log_util import logger
from utils import a2a_util

def rank_agent(query, candidate_agents, rank_num):
    try:
        user_prompt = f"Query:{query}，候选 Agent 列表：{candidate_agents}"

        logger.info(f"user_prompt={user_prompt}")

        completion = client.chat.completions.create(
            model=config.AGENT_RANK_MODEL, 
            messages=[
                {'role': 'system', 'content': AGENT_RANK_SYSTEM_PROMPT.format(rank_num=rank_num)},
                {'role': 'user', 'content': user_prompt}
            ]
        )

        if completion.choices[0].message.content:
            ans = completion.choices[0].message.content.replace("\n", "")
            logger.info(f"rank_agent结果：{ans}")
            if "```json" in ans:
                ans = ans.split("```json")[1]
                if "```" in ans:
                    ans = ans.split("```")[0]
            ans = json.loads(ans)
            # logger.info(f"rank_agent结果：{ans}")
            return ans

        return None
    except Exception as e:
        logger.error(f"rank_agent exception:{traceback.format_exc()}")
        return None


def rank_agent_card(request_id: str,
                    text_input: str,
                    candidate_cards: list[str]) -> int:
    semantic_candidate_cards = []
    for i, cand_card in enumerate(candidate_cards):
        semantic_card = a2a_util.transform_agent_card2semantic_json_str(request_id, cand_card)
        if semantic_card:
            obj = json.loads(semantic_card)
            obj["id"] = i
            semantic_candidate_cards.append(json.dumps(obj, ensure_ascii=False))

    user_prompt = f"Query:{text_input}，候选 Agent 列表：{semantic_candidate_cards}"
    completion = client.chat.completions.create(
        model=config.AGENT_CARD_RANK_MODEL, 
        messages=[
            {'role': 'system', 'content': AGENT_CARD_RANK_SYSTEM_PROMPT},
            {'role': 'user', 'content': user_prompt}
        ]
    )

    if completion.choices[0].message.content:
        ans = completion.choices[0].message.content.replace("\n", "").replace("\t", "")
        logger.info(f"request_id:{request_id}, rank_agent_card result：{ans}")
        if "```json" in ans:
            ans = ans.split("```json")[1]
            if "```" in ans:
                ans = ans.split("```")[0]
        try:
            ans = json.loads(ans)
            if not ans["selected_agent"]:
                logger.info(f"request_id:{request_id}, no agent matches user query")
                return -1
            idx = int(ans["selected_agent"]["agent_id"])
            if idx >= len(candidate_cards) or idx < 0:
                logger.warning(f"request_id:{request_id}, selected agent id={idx} by llm is >= len(candidate_cards)={len(candidate_cards)} or < 0 ")
                return -1
            return idx
        except:
            logger.error(f"request_id:{request_id}, exception: {traceback.format_exc()}")
            return -1

    return -1