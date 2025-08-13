import traceback
import httpx
from uuid import uuid4
import json
from typing import Any
import base64

from a2a.client import A2ACardResolver, A2AClient
from a2a.types import (
    AgentCard,
    MessageSendParams,
    SendMessageRequest,
    SendStreamingMessageRequest,
)


async def get_agent_card(request_id: str, a2a_server_url: str) -> AgentCard | None:
    async with httpx.AsyncClient() as httpx_client:
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
            print(
                f'request_id:{request_id}, Attempting to fetch public agent card from: {a2a_server_url}/.well-known/agent.json'
            )
            _public_card = (
                await resolver.get_agent_card()
            )  # Fetches from default public path
            print(f'request_id:{request_id}, Successfully fetched public agent card: '
                        f'{_public_card.model_dump_json()}')
            
            final_agent_card_to_use = _public_card

            if _public_card.supportsAuthenticatedExtendedCard:
                try:
                    print(
                        f'request_id:{request_id}, Public card supports authenticated extended card. Attempting to fetch from: {a2a_server_url}/agent/authenticatedExtendedCard'
                    )
                    auth_headers_dict = {
                        'Authorization': 'Bearer dummy-token-for-extended-card'
                    }
                    _extended_card = await resolver.get_agent_card(
                        relative_card_path='/agent/authenticatedExtendedCard',
                        http_kwargs={'headers': auth_headers_dict},
                    )
                    print(
                        f'request_id:{request_id}, Successfully fetched authenticated extended agent card: '
                        f'{_extended_card.model_dump_json(indent=2, exclude_none=True)}'
                    )
                    final_agent_card_to_use = (
                        _extended_card  # Update to use the extended card
                    )
                except Exception as e_extended:
                    print(
                        f'request_id:{request_id}, Failed to fetch extended agent card: {e_extended}. Will proceed with public card.')
            elif (
                _public_card
            ):  # supportsAuthenticatedExtendedCard is False or None
                print(
                    f'request_id:{request_id}, Public card does not indicate support for an extended card. Using public card.'
                )

            return final_agent_card_to_use
        except Exception as e:
            print(
                f'request_id:{request_id}, Critical error fetching public agent card: {e}'
            )
            
        return None


async def get_a2a_server_rsp(request_id: str, agent_card: AgentCard, query_list: list[str], image_list: list[str]|None=None) -> list[str]:
    async with httpx.AsyncClient(timeout=1000) as httpx_client:
        # --8<-- [start:send_message]
        client = A2AClient(
            httpx_client=httpx_client, agent_card=agent_card
        )
        print(f'request_id:{request_id}, A2AClient initialized.')

        rsp_list: list[str] = []
        for i, query in enumerate(query_list):
            send_message_payload: dict[str, Any] = {
                'message': {
                    'role': 'user',
                    'parts': [
                        {'kind': 'text', 'text': query}
                    ],
                    'messageId': uuid4().hex,
                },
            }
            if image_list:
                image_part = {'kind': 'file', 'file': {'mimeType': 'image/png', 'uri': image_list[i]} }
                send_message_payload['message']['parts'].append(image_part)

            print(f"send_message_payload: {json.dumps(send_message_payload, ensure_ascii=False)}")
            
            request = SendMessageRequest(
                id=str(uuid4()), params=MessageSendParams(**send_message_payload)
            )

            response = await client.send_message(request)
            response  = response.model_dump(mode='json', exclude_none=True)
            print(f'request_id: {request_id}, query: {query}, a2a server response: {json.dumps(response, ensure_ascii=False)}')

            if "result" in response and "parts" in response["result"]:
                rsp_text = []
                for part in response["result"]["parts"]:
                    if "kind" in part and part["kind"] == "text" and "text" in part:
                        rsp_text.append(part["text"])
                    elif "kind" in part and part["kind"] == "file" and "file" in part:
                        file_part = part["file"]
                        if "bytes" in file_part:
                            base64_str = file_part["bytes"]
                            try:
                                decoded_data = base64.b64decode(base64_str)  # 解码为二进制数据
                                output_path = f"./{request_id}.png"
                                with open(output_path, "wb") as f:
                                    f.write(decoded_data)
                                print(f"文件已保存至: {output_path}")
                            except:
                                print(f"写入失败: {traceback.format_exc()}")
                rsp_list.append("\n".join(rsp_text))
            else:
                rsp_list.append("")

        return rsp_list



async def test_gen_image_from_text():
    request_id = uuid4().hex
    agent_card = await get_agent_card(request_id, 'http://localhost:10000')
    if agent_card is not None:
        rsp_list = await get_a2a_server_rsp(request_id, agent_card, ["生成一张海边美女的照片"])
        print(f"rsp_list:{rsp_list}")
    else:
        print("agent_card 获取失败")


async def test_gen_image_from_image():
    request_id = uuid4().hex
    agent_card = await get_agent_card(request_id, 'http://localhost:10000')
    if agent_card is not None:
        rsp_list = await get_a2a_server_rsp(request_id, agent_card, ["把照片中衣服颜色换成浅蓝色"], \
                            image_list=["http://207.148.19.172:5001/agent-space/download_file/cc87460c-01cc-4582-a74b-26239c18ee80"])
        print(f"rsp_list:{rsp_list}")
    else:
        print("agent_card 获取失败")

if __name__ == "__main__":
    import asyncio
    # asyncio.run(test_gen_image_from_text())
    asyncio.run(test_gen_image_from_image())