import requests

import config

def allowed_file(filename: str) -> bool:
    """检查文件扩展名是否允许"""
    return '.' in filename and \
           filename.rsplit('.', 1)[1].lower() in config.ALLOWED_EXTENSIONS

def download_file(url: str) -> bytes:
    """下载文件"""
    try:
        response = requests.get(url)
        return response.content
    except:
        return b""