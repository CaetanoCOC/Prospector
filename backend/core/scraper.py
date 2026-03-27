import re
import requests
from bs4 import BeautifulSoup
from urllib.parse import urlparse, urljoin
from typing import Optional

EMAIL_REGEX = re.compile(r"[a-zA-Z0-9._%+\-]+@[a-zA-Z0-9.\-]+\.[a-zA-Z]{2,}")

FAKE_DOMAINS = {"example", "sentry", "test", "domain", "wixpress", "squarespace",
                "shopify", "wordpress", "cloudflare", "google", "facebook",
                "instagram", "twitter", "yelp", "tripadvisor"}

CONTACT_PATHS = ["/contact", "/contact-us", "/about", "/about-us", "/reach-us", "/get-in-touch"]

HEADERS = {
    "User-Agent": (
        "Mozilla/5.0 (Windows NT 10.0; Win64; x64) "
        "AppleWebKit/537.36 (KHTML, like Gecko) "
        "Chrome/120.0.0.0 Safari/537.36"
    )
}


def _get_html(url: str) -> Optional[str]:
    try:
        resp = requests.get(url, headers=HEADERS, timeout=8, allow_redirects=True)
        if resp.status_code == 200:
            return resp.text
    except Exception:
        pass
    return None


def _extract_emails_from_html(html: str) -> list[str]:
    soup = BeautifulSoup(html, "html.parser")

    # Remove script/style tags to reduce noise
    for tag in soup(["script", "style", "noscript"]):
        tag.decompose()

    text = soup.get_text(separator=" ")
    # Also check mailto links
    mailto_emails = []
    for a in soup.find_all("a", href=True):
        href = a["href"]
        if href.startswith("mailto:"):
            email = href[7:].split("?")[0].strip()
            if email:
                mailto_emails.append(email)

    found = list(set(EMAIL_REGEX.findall(text) + mailto_emails))
    return found


def _filter_emails(emails: list[str], site_domain: str) -> list[str]:
    clean = []
    for email in emails:
        email = email.lower().strip(".")
        domain_part = email.split("@")[-1] if "@" in email else ""
        base = domain_part.split(".")[0] if domain_part else ""

        # Skip known fake domains
        if any(fake in domain_part for fake in FAKE_DOMAINS):
            continue
        # Skip image-like patterns
        if any(email.endswith(ext) for ext in [".png", ".jpg", ".gif", ".svg", ".webp"]):
            continue
        # Skip very long email addresses (likely obfuscated)
        if len(email) > 80:
            continue

        clean.append(email)

    if not clean:
        return []

    # Prioritize emails from same domain as the site
    if site_domain:
        same_domain = [e for e in clean if site_domain in e]
        if same_domain:
            return [same_domain[0]]

    return [clean[0]]


def scrape_email(website: str) -> Optional[str]:
    """
    Try to extract email from a business website.
    Returns the best email found, or None.
    """
    if not website:
        return None

    # Normalize URL
    if not website.startswith("http"):
        website = "https://" + website

    parsed = urlparse(website)
    site_domain = parsed.netloc.replace("www.", "").split(".")[0]

    # Try homepage first
    html = _get_html(website)
    if html:
        emails = _extract_emails_from_html(html)
        filtered = _filter_emails(emails, site_domain)
        if filtered:
            return filtered[0]

    # Try contact/about pages
    base_url = f"{parsed.scheme}://{parsed.netloc}"
    for path in CONTACT_PATHS:
        contact_url = urljoin(base_url, path)
        html = _get_html(contact_url)
        if html:
            emails = _extract_emails_from_html(html)
            filtered = _filter_emails(emails, site_domain)
            if filtered:
                return filtered[0]

    return None


def scrape_lead(lead: dict) -> dict:
    """
    Scrape email for a single lead dict.
    Returns updated lead dict with email and email_status.
    """
    website = lead.get("website")
    if not website:
        return {**lead, "email": None, "email_status": "not_found"}

    email = scrape_email(website)
    if email:
        return {**lead, "email": email, "email_status": "found"}
    else:
        return {**lead, "email": None, "email_status": "not_found"}
