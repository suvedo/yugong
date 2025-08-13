# from enum import Enum, unique

# @unique  # 确保枚举值唯一
# class AGUI_EVENT(Enum):
class AGUI_EVENT:
    TEXT_MESSAGE_CHUNK = "TEXT_MESSAGE_CHUNK"    # 成员名大写，值可自定义
    FILE_ID_STRING     = "FILE_ID_STRING"
    RUN_STARTED        = "RUN_STARTED"
    RUN_FINISHED       = "RUN_FINISHED"
    RUN_ERROR          = "RUN_ERROR"
    RUN_CANCEL         = "RUN_CANCEL"
    CHAT_LIST_UPDATED  = "CHAT_LIST_UPDATED"
    
    
# @unique  # 确保枚举值唯一
# class STREAM_MESSAGE_TYPE(Enum):
class STREAM_MESSAGE_TYPE:
    REASONING = "reasoning"    # 成员名大写，值可自定义
    WARNING = "warning"
    ERROR = "error"
    RESULT = "result"