from utils.mail_util import send_163_email

def send_code_message(to_mail: str, code: str) -> bool:
    return send_163_email(
        sender="yugongservice@163.com",
        auth_code="LFRpDDGkxqQpht6L",
        receiver=to_mail,
        subject="愚公开源社区验证码",
        content=f"欢迎登录愚公开源社区，您的验证码是：{code}，请在10分钟内使用。",
    )