from typing import Tuple

from a2a.types import (
    FilePart,
    FileWithUri,
    Role,
    Message)


def get_user_image_uri_list(message: Message | None) -> list[Tuple[str, str|None]]:
    """
    Extracts a list of image URLs and their MIME types from the user's message.

    Args:
        message (Message | None): The message object to extract image information from.

    Returns:
        list[Tuple[str, str|None]]: A list of tuples, each containing the image URL from user and its MIME type,
        for all file parts in the user's message. Returns an empty list if no files are found or if the message is None.
    """
    if not message:
        return []

    file_parts = [part.root for part in message.parts \
                    if (message.role == Role.user and isinstance(part.root, FilePart))]

    return [
                (file_part.file.uri, file_part.file.mimeType) \
                for file_part in file_parts \
                if isinstance(file_part.file, FileWithUri) \
                    and file_part.file.mimeType \
                    and file_part.file.mimeType.startswith('image/')
            ]
    