import re
import time
import requests
from typing import Optional

BRASILAPI_BASE = "https://brasilapi.com.br/api/cnpj/v1"


def clean_cnpj(cnpj: str) -> str:
    return re.sub(r"\D", "", cnpj).zfill(14)


def fetch_cnpj(cnpj: str, delay: float = 0.3) -> Optional[dict]:
    """
    Fetch company data from BrasilAPI by CNPJ.
    Returns None on error (404, rate limit, network).
    delay: seconds to wait before making the request (rate limiting).
    """
    cnpj_clean = clean_cnpj(cnpj)
    if len(cnpj_clean) != 14 or not cnpj_clean.isdigit():
        return None

    if delay > 0:
        time.sleep(delay)

    try:
        resp = requests.get(
            f"{BRASILAPI_BASE}/{cnpj_clean}",
            timeout=12,
            headers={"User-Agent": "Prospector/1.0"},
        )
        if resp.status_code == 200:
            return resp.json()
        if resp.status_code == 429:
            # Rate limited — wait and retry once
            time.sleep(2)
            resp = requests.get(f"{BRASILAPI_BASE}/{cnpj_clean}", timeout=12)
            if resp.status_code == 200:
                return resp.json()
        return None
    except Exception:
        return None


def parse_lead_from_brasilapi(data: dict, niche: str) -> dict:
    """
    Map BrasilAPI CNPJ response fields to our leads table schema.
    """
    ddd1 = data.get("ddd_telefone_1") or ""
    phone = ddd1.strip() if ddd1.strip() else None

    email = (data.get("email") or "").strip().lower() or None

    nome_fantasia = (data.get("nome_fantasia") or "").strip() or None
    razao_social = (data.get("razao_social") or "").strip() or None

    situacao = (data.get("descricao_situacao_cadastral") or "").strip().upper()

    cnae_codigo = str(data.get("cnae_fiscal") or "").strip() or None
    cnae_descricao = (data.get("cnae_fiscal_descricao") or "").strip() or None

    return {
        "cnpj": clean_cnpj(data.get("cnpj", "")),
        "razao_social": razao_social,
        "nome_fantasia": nome_fantasia,
        "phone": phone,
        "website": None,  # BrasilAPI doesn't provide website
        "email": email,
        "email_status": "found" if email else None,
        "logradouro": (data.get("logradouro") or "").strip() or None,
        "numero": (data.get("numero") or "").strip() or None,
        "bairro": (data.get("bairro") or "").strip() or None,
        "municipio": (data.get("municipio") or "").strip() or None,
        "uf": (data.get("uf") or "").strip().upper() or None,
        "cep": re.sub(r"\D", "", data.get("cep") or "") or None,
        "cnae": cnae_codigo,
        "cnae_descricao": cnae_descricao,
        "niche": niche,
        "situacao": situacao,
    }
