import logging
import smtplib
from email.message import EmailMessage

from app.config import get_settings

logger = logging.getLogger("solara.email")


def send_email(to: str, subject: str, body: str) -> None:
    """Sends through SMTP when configured; in development the email is written to the log."""
    settings = get_settings()
    if not settings.smtp_host:
        logger.warning("SMTP not configured. Email to %s | %s\n%s", to, subject, body)
        return

    message = EmailMessage()
    message["From"] = settings.smtp_from
    message["To"] = to
    message["Subject"] = subject
    message.set_content(body)
    try:
        with smtplib.SMTP(settings.smtp_host, settings.smtp_port, timeout=15) as server:
            server.starttls()
            if settings.smtp_user:
                server.login(settings.smtp_user, settings.smtp_password)
            server.send_message(message)
    except (smtplib.SMTPException, OSError) as exc:
        logger.error("Sending email to %s failed: %s", to, exc)
