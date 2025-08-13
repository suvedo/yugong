import os

# 向量召回的数量
AGENT_VEC_RETRIEVE_NUM = 10
# AGENT_RANK_MODEL      = "deepseek-r1"
AGENT_RANK_MODEL      = "deepseek-v3"
AGENT_RANK_NUM        = 3

# a2a配置
PUBLIC_AGENT_CARD_PATH = '/.well-known/agent.json'
EXTENDED_AGENT_CARD_PATH = '/agent/authenticatedExtendedCard'
A2A_SERVER_RETRIEVE_NUM = 10
A2A_SERVER_RETRIEVE_COSIN_THRES = 1.0

PLAN_LLM_MODEL = "deepseek-r1"
AGENT_CARD_RANK_MODEL = "deepseek-r1"


GEN_IMAGE_SAVE_DIR = f'{os.path.dirname(os.path.abspath(__file__))}/generated_images'

ALLOWED_EXTENSIONS = {'png', 'jpg', 'jpeg', 'gif', 'pdf', 'doc', 'docx', 'txt'}
FILE_DOWNLOAD_URI  = "http://207.148.19.172:5001/agent-space/download_file/{file_id}"
DEFAULT_FILENAME_IN_DATABASE = "default_filename"
DEFAULT_MIME_TYPE_IN_DATABASE = "default/default_type"

AGENT_PREFIX_RECOMMEND_NUM = 5

# 是否使用os agent
USE_OS_AGENT=True

# 使用的数据库配置
USE_WHICH_DB = 'ALIYUN'