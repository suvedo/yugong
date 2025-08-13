import sys
import logging
import logging.handlers
import os

env = os.getenv('MY_APP_ENV', 'development')

def get_logger():
    # 获取logger实例，如果参数为空则返回root logger
    log = logging.getLogger(__name__)
    log.propagate = False

    # 指定logger输出格式
    # formatter = logging.Formatter('[%(asctime)s] [%(module)s] [%(process)d] [%(levelname)s] : %(message)s')
    formatter = logging.Formatter("%(asctime)s-%(process)d-%(thread)d"
                                   "-%(filename)s[line:%(lineno)d]-%(levelname)s : %(message)s")

    # 控制台日志
    console_handler = logging.StreamHandler(sys.stderr)
    console_handler.formatter = formatter  # 也可以直接给formatter赋值
    #console_handler.encoding  = 'utf-8'

    # 文件日志
    if not os.path.exists('./log/'):
        os.mkdir('./log/')
    fhandler = logging.handlers.TimedRotatingFileHandler("./log/flask_server.log", when='MIDNIGHT', interval=1, encoding='utf-8')
    fhandler.suffix = "%Y-%m-%d"
    fhandler.setLevel(level=logging.DEBUG)
    fhandler.setFormatter(formatter)

    # 为logger添加的日志处理器
    log.addHandler(console_handler)
    log.addHandler(fhandler)

    # 指定日志的最低输出级别，默认为WARN级别
    log.setLevel(logging.DEBUG)
    return log


logger = get_logger()