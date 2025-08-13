import json
import asyncio
from sqlalchemy import text
from sqlalchemy.ext.asyncio import create_async_engine, AsyncSession
from sqlalchemy.orm import sessionmaker
import traceback
from typing import Tuple

from utils.log_util import logger
import config
from database.db_engine import engine, get_async_engine

def get_file_by_id(request_id: str, file_id: str) -> Tuple[str, str, int, bytes]:
    """
    Retrieve file information and content from the database by file ID.

    Args:
        request_id (str): The unique request identifier for logging and tracing.
        file_id (str): The unique identifier of the file to retrieve.

    Returns:
        Tuple[str, str, int, bytes]: A tuple containing the filename, MIME type, file size in bytes, and file content as bytes.
                                     If the file is not found or an error occurs, returns ("", "", 0, b"").
    """
    sql = "SELECT filename, mime_type, size, content FROM files WHERE id = :id"
    try:
        with engine.begin() as conn:
            result = conn.execute(
                text(sql),
                {"id": file_id}
            )

            if result.rowcount == 0:
                logger.error(f"request_id:{request_id}, file_id:{file_id}, file not found")
                return "", "", 0, b""

            for i, row in enumerate(result):
                mapping = row._mapping
                filename = mapping.get("filename") or ""
                mime_type = mapping.get("mime_type") or ""
                size      = int(mapping.get("size") or  0)
                content = mapping.get("content") or b""
                return filename, str(mime_type), size, content

    except:
        logger.error(f"request_id:{request_id}, get file by id exception:{traceback.format_exc()}")

    return "", "", 0, b""


async def get_file_by_id_async(request_id: str, file_id: str) -> Tuple[str, str, int, bytes]:
    """
    Asynchronously retrieve file information and content from the database by file ID.

    Args:
        request_id (str): The unique request identifier for logging and tracing.
        file_id (str): The unique identifier of the file to retrieve.

    Returns:
        Tuple[str, str, int, bytes]: A tuple containing the filename, MIME type, file size in bytes, and file content as bytes.
                                     If the file is not found or an error occurs, returns ("", "", 0, b"").
    """
    sql = "SELECT filename, mime_type, size, content FROM files WHERE id = :id"
    try:
        async_engine = get_async_engine()
        async with async_engine.connect() as conn:
            result = await conn.execute(
                text(sql),
                {"id": file_id}
            )

            row = result.first()
            if row is None:
                logger.error(f"request_id:{request_id}, file_id:{file_id}, file not found")
                return "", "", 0, b""

            mapping = row._mapping
            filename = mapping.get("filename") or ""
            mime_type = mapping.get("mime_type") or ""
            size      = int(mapping.get("size") or  0)
            content = mapping.get("content") or b""
            return filename, str(mime_type), size, content

    except:
        logger.error(f"request_id:{request_id}, get file by id async exception:{traceback.format_exc()}")

    return "", "", 0, b""


def get_file_metadata_by_id(request_id: str, file_id: str) -> Tuple[str, str, int]:
    """
    Retrieve filename, MIME type, size and etc from the database by file ID.

    Args:
        request_id (str): The unique request identifier for logging and tracing.
        file_id (str): The unique identifier of the file to retrieve.

    Returns:
        Tuple[str, str, int]: A tuple containing the filename, MIME type, file size in bytes.
                                     If the file is not found or an error occurs, returns ("", "", 0).
    """
    sql = "SELECT filename, mime_type, size FROM files WHERE id = :id"
    try:
        with engine.begin() as conn:
            result = conn.execute(
                text(sql),
                {"id": file_id}
            )

            if result.rowcount == 0:
                logger.error(f"request_id:{request_id}, file_id:{file_id}, filename not found")
                return "", "", 0

            for i, row in enumerate(result):
                mapping = row._mapping
                filename = mapping.get("filename") or ""
                mime_type = mapping.get("mime_type") or ""
                size      = int(mapping.get("size") or  0)
                return filename, mime_type, size

    except:
        logger.error(f"request_id:{request_id}, get filename by id exception:{traceback.format_exc()}")

    return "", "", 0


def insert_file(request_id: str, file_id: str, filename: str, mime_type: str, size: int, file_data: bytes) -> bool:
    sql = ("INSERT INTO files (id, filename, mime_type, size, content) "
                    "VALUES (:id, :filename, :mime_type, :size, :content)")
    try:
        with engine.begin() as conn:
            # conn.execute(text("SET statement_timeout TO 15000"))
            result = conn.execute(
                text(sql),
                {
                    "id": file_id,
                    "filename": filename,
                    "mime_type": mime_type,
                    "size": size,
                    "content": file_data
                }
            )

            logger.info(f"request_id:{request_id}, file insert database result: {result.rowcount}")

        return True
    except:
        logger.error(f"request_id:{request_id}, upload file fatal: {traceback.format_exc()}")

    return False