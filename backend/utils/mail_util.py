import smtplib
from email.mime.text import MIMEText
from email.mime.multipart import MIMEMultipart
from email.header import Header

def send_163_email(sender: str, 
                    auth_code: str, 
                    receiver: str, 
                    subject: str, 
                    content: str, 
                    attachment_path: str = None
                ) -> bool:
    # 配置SMTP服务器
    smtp_server = "smtp.163.com"
    port = 465  # SSL加密端口
    
    # 创建邮件对象
    msg = MIMEMultipart()
    msg["From"] = sender  # 必须与登录账号一致
    msg["To"] = receiver
    msg["Subject"] = Header(subject, "utf-8")
    
    # 添加文本正文
    text_part = MIMEText(content, "plain", "utf-8")
    msg.attach(text_part)
    
    # 添加附件（可选）
    if attachment_path:
        with open(attachment_path, "rb") as f:
            att = MIMEText(f.read(), "base64", "utf-8")
            att["Content-Type"] = "application/octet-stream"
            att["Content-Disposition"] = f'attachment; filename="{attachment_path.split("/")[-1]}"'
            msg.attach(att)
    
    # 发送邮件
    try:
        with smtplib.SMTP_SSL(smtp_server, port) as server:
            server.login(sender, auth_code)  # 使用授权码登录
            server.sendmail(sender, receiver, msg.as_string())
        return True
    except:
        return False