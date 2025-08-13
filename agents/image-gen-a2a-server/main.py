import sys, os

import click
import httpx
import uvicorn

from a2a.server.apps import A2AStarletteApplication
from a2a.server.request_handlers import DefaultRequestHandler
from a2a.server.tasks import InMemoryPushNotifier, InMemoryTaskStore
from a2a.types import (
    AgentCapabilities,
    AgentCard,
    AgentSkill,
    AgentProvider
)

from a2a_agent import image_gen_agent
from a2a_agent.image_gen_agent_executor import ImageGenAgentExecutor
from utils.log_util import logger
import config


class MissingAPIKeyError(Exception):
    """Exception for missing API key."""


@click.command()
@click.option('--host', 'host', default='localhost')
@click.option('--port', 'port', default=10000)
def main(host, port):
    """Starts the Currency Agent server."""
    try:
        os.makedirs(config.GEN_IMAGE_SAVE_DIR, exist_ok=True)

        capabilities = AgentCapabilities(streaming=False, pushNotifications=False)
        skill = AgentSkill(
            id='general image generation',
            name='通用文生图技能',
            description='基于用户文本描述，生成1张高质量图片',
            tags=['文生图', '高质量图片'],
            examples=['生成一张海边美女的照片'],
        )
        skill2 = AgentSkill(
            id='general image generation from image',
            name='通用图生图技能',
            description='基于用户文本描述和图片，生成1张高质量图片',
            tags=['图生图', '高质量图片'],
            examples=['把我的照片改绘成动漫风'],
        )
        provider = AgentProvider(organization='愚公社区', url=f'http://{host}:1234/')
        agent_card = AgentCard(
            name='图片编辑生成助手',
            description='基于用户文本描述，生成1张高质量图片',
            provider=provider,
            url=f'http://{host}:{port}/',
            version='1.0.0',
            defaultInputModes=image_gen_agent.SUPPORTED_INPUT_CONTENT_TYPES,
            defaultOutputModes=image_gen_agent.SUPPORTED_OUTPUT_CONTENT_TYPES,
            capabilities=capabilities,
            skills=[skill, skill2],
        )

        # --8<-- [start:DefaultRequestHandler]
        httpx_client = httpx.AsyncClient()
        request_handler = DefaultRequestHandler(
            agent_executor=ImageGenAgentExecutor(),
            task_store=InMemoryTaskStore(),
            push_notifier=InMemoryPushNotifier(httpx_client),
        )
        server = A2AStarletteApplication(
            agent_card=agent_card, http_handler=request_handler
        )

        uvicorn.run(server.build(), host=host, port=port)
        # --8<-- [end:DefaultRequestHandler]

    except MissingAPIKeyError as e:
        logger.error(f'Error: {e}')
        sys.exit(1)
    except Exception as e:
        logger.error(f'An error occurred during server startup: {e}')
        sys.exit(1)


if __name__ == '__main__':
    main()
