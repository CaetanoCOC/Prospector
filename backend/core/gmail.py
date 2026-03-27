import sys
import os
import base64
import json
from pathlib import Path
from email.mime.text import MIMEText
from email.mime.multipart import MIMEMultipart
from typing import Optional

from google.auth.transport.requests import Request
from google.oauth2.credentials import Credentials
from google_auth_oauthlib.flow import InstalledAppFlow
from googleapiclient.discovery import build
from googleapiclient.errors import HttpError

SCOPES = ["https://www.googleapis.com/auth/gmail.send"]


def _get_user_data_dir() -> Path:
    """Returns writable directory for credentials/token."""
    if getattr(sys, "frozen", False):
        return Path(sys.executable).parent
    return Path(__file__).parent


CREDENTIALS_FILE = _get_user_data_dir() / "credentials.json"
TOKEN_FILE = _get_user_data_dir() / "token.json"

SENDER_EMAIL = "caetanorevive@gmail.com"


def _get_service():
    creds = None

    if TOKEN_FILE.exists():
        creds = Credentials.from_authorized_user_file(str(TOKEN_FILE), SCOPES)

    if not creds or not creds.valid:
        if creds and creds.expired and creds.refresh_token:
            creds.refresh(Request())
        else:
            raise RuntimeError("Gmail not authorized. Run /api/gmail/auth first.")

        with open(TOKEN_FILE, "w") as f:
            f.write(creds.to_json())

    return build("gmail", "v1", credentials=creds)


def start_oauth_flow() -> str:
    """
    Start the OAuth2 flow. Opens browser for user authorization.
    Returns the email of the authorized account.
    """
    if not CREDENTIALS_FILE.exists():
        raise FileNotFoundError(f"credentials.json not found at {CREDENTIALS_FILE}")

    flow = InstalledAppFlow.from_client_secrets_file(str(CREDENTIALS_FILE), SCOPES)
    creds = flow.run_local_server(port=0, open_browser=True)

    with open(TOKEN_FILE, "w") as f:
        f.write(creds.to_json())

    return SENDER_EMAIL


def get_gmail_status() -> dict:
    """Check if Gmail is connected and return status."""
    if not TOKEN_FILE.exists():
        return {"connected": False, "email": None}

    try:
        creds = Credentials.from_authorized_user_file(str(TOKEN_FILE), SCOPES)
        if creds and creds.valid:
            return {"connected": True, "email": SENDER_EMAIL}
        elif creds and creds.expired and creds.refresh_token:
            creds.refresh(Request())
            with open(TOKEN_FILE, "w") as f:
                f.write(creds.to_json())
            return {"connected": True, "email": SENDER_EMAIL}
    except Exception:
        pass

    return {"connected": False, "email": None}


def disconnect_gmail():
    """Remove token file to disconnect Gmail."""
    if TOKEN_FILE.exists():
        TOKEN_FILE.unlink()


def _replace_variables(text: str, lead: dict) -> str:
    """Replace template variables with lead data."""
    name = lead.get("nome_fantasia") or lead.get("razao_social") or lead.get("name") or "there"
    website = lead.get("website") or ""
    domain = website.replace("https://", "").replace("http://", "").replace("www.", "").rstrip("/")

    replacements = {
        "{BUSINESS_NAME}": name,
        "{OWNER_NAME}": lead.get("owner_name") or "there",
        "{BOOKING_URL}": website or "your website",
        "{BOOKING_DOMAIN}": domain or "your website",
    }
    for key, value in replacements.items():
        text = text.replace(key, value)
    return text


def send_email(to_email: str, subject: str, html_body: str, lead: dict) -> bool:
    """
    Send a single email via Gmail API.
    Returns True on success, False on failure.
    """
    try:
        service = _get_service()

        personalized_subject = _replace_variables(subject, lead)
        personalized_body = _replace_variables(html_body, lead)

        message = MIMEMultipart("alternative")
        message["Subject"] = personalized_subject
        message["From"] = SENDER_EMAIL
        message["To"] = to_email

        plain_text = personalized_body  # fallback stripped below
        import re as _re
        plain_text = _re.sub(r'<[^>]+>', '', personalized_body)
        plain_text = _re.sub(r'\s+', ' ', plain_text).strip()

        text_part = MIMEText(plain_text, "plain", "utf-8")
        html_part = MIMEText(personalized_body, "html", "utf-8")
        message.attach(text_part)
        message.attach(html_part)

        raw = base64.urlsafe_b64encode(message.as_bytes()).decode()
        service.users().messages().send(
            userId="me", body={"raw": raw}
        ).execute()

        return True
    except HttpError as e:
        print(f"Gmail API error: {e}")
        return False
    except Exception as e:
        print(f"Send email error: {e}")
        return False
