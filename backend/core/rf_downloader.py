"""
Receita Federal CNPJ bulk data downloader + parser.

Files: Nextcloud/SERPRO+ via WebDAV
Base: https://arquivos.receitafederal.gov.br/public.php/webdav/Dados/Cadastros/CNPJ/{YYYY-MM}/
Auth: Basic (share_token, "")
- Estabelecimentos{0-9}.zip  (~200-400MB each, ~6M rows each, latin-1, semicolon)
- Municipios.zip             (~500KB, code → name lookup)

Estabelecimentos columns (0-indexed):
 0 CNPJ_BASICO       8 digits
 1 CNPJ_ORDEM        4 digits
 2 CNPJ_DV           2 digits
 3 MATRIZ_FILIAL      1=matriz 2=filial
 4 NOME_FANTASIA
 5 SITUACAO_CADASTRAL 02=ATIVA
 6 DATA_SITUACAO
 7 MOTIVO_SITUACAO
 8 NOME_CIDADE_EXT
 9 PAIS
10 DATA_INICIO
11 CNAE_PRINCIPAL     digits only (e.g. 9602501)
12 CNAE_SECUNDARIA
13 TIPO_LOGRADOURO
14 LOGRADOURO
15 NUMERO
16 COMPLEMENTO
17 BAIRRO
18 CEP
19 UF
20 MUNICIPIO          code (lookup via Municipios table)
21 DDD_1
22 TELEFONE_1
23 DDD_2
24 TELEFONE_2
25 DDD_FAX
26 FAX
27 EMAIL
28 SITUACAO_ESPECIAL
29 DATA_SITUACAO_ESPECIAL
"""

import re
import csv
import io
import zipfile
import time
import unicodedata
import requests
from pathlib import Path
from datetime import datetime, timedelta
from typing import Optional

RF_BASE = "https://arquivos.receitafederal.gov.br/public.php/webdav/Dados/Cadastros/CNPJ"
RF_SHARE_TOKEN = "gn672Ad4CF8N6TK"
RF_AUTH = (RF_SHARE_TOKEN, "")
SITUACAO_ATIVA = "02"
CACHE_MAX_DAYS = 32  # re-download after ~1 month


def normalize_cnae(cnae: str) -> str:
    """'9602-5/01' → '9602501'"""
    return re.sub(r"\D", "", cnae)


def _strip_accents(s: str) -> str:
    """'São Paulo' → 'sao paulo' (lowercase, no accents)"""
    return unicodedata.normalize("NFD", s).encode("ascii", "ignore").decode("ascii").lower()


def _cache_is_fresh(path: Path) -> bool:
    if not path.exists():
        return False
    age = datetime.now().timestamp() - path.stat().st_mtime
    return age < CACHE_MAX_DAYS * 86400


def get_latest_month() -> str:
    """
    Probe RF Nextcloud to find the latest available month.
    Tries current month, then previous months up to 4 months back.
    """
    now = datetime.now()
    for delta in range(5):
        dt = (now.replace(day=1) - timedelta(days=delta * 32)).replace(day=1)
        ym = dt.strftime("%Y-%m")
        url = f"{RF_BASE}/{ym}/Municipios.zip"
        try:
            r = requests.head(url, auth=RF_AUTH, timeout=8)
            if r.status_code == 200:
                return ym
        except Exception:
            continue
    return now.strftime("%Y-%m")


def _parse_municipios(text: str) -> dict:
    """Parse Municipios CSV content into {code: name} dict.
    Handles quoted fields: '"0001";"GUAJARA-MIRIM"' → {'0001': 'Guajara-Mirim'}.
    """
    municipios = {}
    for line in text.splitlines():
        line = line.strip()
        if not line:
            continue
        parts = line.split(";")
        if len(parts) >= 2:
            code = parts[0].strip().strip('"')
            name = parts[1].strip().strip('"').title()
            if code:
                municipios[code] = name
    return municipios


def ensure_municipios(cache_dir: Path, year_month: str) -> dict:
    """
    Download Municipios.zip (small, ~500KB) and return {code: name}.
    Cached indefinitely — municipality names don't change.
    """
    cache_file = cache_dir / f"Municipios_{year_month}.txt"

    if cache_file.exists():
        content = cache_file.read_text(encoding="latin-1")
        return _parse_municipios(content)

    url = f"{RF_BASE}/{year_month}/Municipios.zip"
    r = requests.get(url, auth=RF_AUTH, timeout=30)
    r.raise_for_status()

    with zipfile.ZipFile(io.BytesIO(r.content)) as zf:
        fname = zf.namelist()[0]
        content = zf.read(fname).decode("latin-1")

    cache_file.write_text(content, encoding="latin-1")
    return _parse_municipios(content)


def _download_to_cache(url: str, dest: Path, progress: dict) -> None:
    """Stream-download a file to disk, updating progress dict."""
    r = requests.get(url, auth=RF_AUTH, stream=True, timeout=180)
    r.raise_for_status()

    total = int(r.headers.get("content-length", 0))
    progress["dl_total"] = total
    progress["dl_done"] = 0

    tmp = dest.with_suffix(".tmp")
    with open(tmp, "wb") as f:
        for chunk in r.iter_content(chunk_size=131072):  # 128KB chunks
            if chunk:
                f.write(chunk)
                progress["dl_done"] = progress.get("dl_done", 0) + len(chunk)

    tmp.rename(dest)


def search_rf(
    cnae_codes: list,
    uf: Optional[str],
    municipio_filter: Optional[str],
    quantity: int,
    cache_dir: Path,
    progress: dict,
) -> list:
    """
    Search RF Estabelecimentos files for companies matching all criteria:
    - CNAE matches any in cnae_codes
    - situacao_cadastral = ATIVA (02)
    - has valid email
    - has DDD + telefone
    - optional: UF filter
    - optional: municipio name filter (substring, case-insensitive)

    Returns list of lead dicts ready to insert into the leads table.
    File downloads are cached in cache_dir (valid for ~32 days).
    """
    cache_dir.mkdir(parents=True, exist_ok=True)
    normalized_cnaes = {normalize_cnae(c) for c in cnae_codes}

    progress.update({
        "phase": "init",
        "status": "Detectando versão mais recente da Receita Federal...",
        "found": 0,
        "found_with_email": 0,
        "found_without_email": 0,
        "scanned": 0,
        "dl_total": 0,
        "dl_done": 0,
        "file_idx": 0,
    })

    year_month = get_latest_month()
    progress["year_month"] = year_month
    progress["status"] = f"Dados de {year_month}. Carregando tabela de municípios..."

    try:
        municipios = ensure_municipios(cache_dir, year_month)
    except Exception:
        municipios = {}

    results = []

    for file_idx in range(10):
        if len(results) >= quantity:
            break

        progress["file_idx"] = file_idx
        cache_file = cache_dir / f"Estabelecimentos{file_idx}_{year_month}.zip"
        url = f"{RF_BASE}/{year_month}/Estabelecimentos{file_idx}.zip"

        # Download if not cached
        if not _cache_is_fresh(cache_file):
            progress["phase"] = "download"
            progress["status"] = f"Baixando arquivo {file_idx + 1}/10 da Receita Federal..."
            progress["dl_total"] = 0
            progress["dl_done"] = 0
            try:
                _download_to_cache(url, cache_file, progress)
            except Exception as e:
                progress["status"] = f"Erro ao baixar arquivo {file_idx + 1}: {e}"
                continue
        else:
            progress["phase"] = "scan"
            progress["status"] = f"Usando cache — arquivo {file_idx + 1}/10"

        # Scan the file
        progress["phase"] = "scan"
        progress["status"] = f"Analisando arquivo {file_idx + 1}/10... ({len(results)} encontradas)"

        try:
            with zipfile.ZipFile(cache_file) as zf:
                csv_name = zf.namelist()[0]
                with zf.open(csv_name) as raw:
                    wrapper = io.TextIOWrapper(raw, encoding="latin-1")
                    reader = csv.reader(wrapper, delimiter=";")

                    for row in reader:
                        if len(results) >= quantity:
                            break
                        if len(row) < 28:
                            continue

                        progress["scanned"] += 1

                        # ── Filters ─────────────────────────────────────────
                        # 1. Situação ATIVA
                        if row[5].strip() != SITUACAO_ATIVA:
                            continue

                        # 2. CNAE match
                        cnae = row[11].strip()
                        if cnae not in normalized_cnaes:
                            continue

                        # 3. UF filter
                        row_uf = row[19].strip().upper()
                        if uf and row_uf != uf.upper():
                            continue

                        # 4. Has phone (DDD + number) — REQUIRED
                        ddd = re.sub(r"\D", "", row[21].strip())
                        tel = re.sub(r"\D", "", row[22].strip())
                        if len(ddd) < 2 or len(tel) < 7:
                            continue

                        # 5. Municipio filter (substring match, accent-insensitive)
                        municipio_code = row[20].strip()
                        municipio_name = municipios.get(municipio_code, municipio_code)
                        if municipio_filter and _strip_accents(municipio_filter) not in _strip_accents(municipio_name):
                            continue

                        # 6. Email — OPTIONAL (collected if valid, not required)
                        raw_email = row[27].strip().lower()
                        has_valid_email = (
                            bool(raw_email)
                            and "@" in raw_email
                            and "." in raw_email.split("@")[-1]
                            and not any(bad in raw_email for bad in ("@example", "@test", "@sentry", "naotem", "nao@", "sem@"))
                        )
                        email = raw_email if has_valid_email else None

                        # ── Build lead ───────────────────────────────────────
                        cnpj = row[0].zfill(8) + row[1].zfill(4) + row[2].zfill(2)
                        tipo_log = row[13].strip()
                        logradouro = f"{tipo_log} {row[14].strip()}".strip()
                        cep = re.sub(r"\D", "", row[18])

                        results.append({
                            "cnpj": cnpj,
                            "nome_fantasia": row[4].strip() or None,
                            "razao_social": None,       # enriched later via BrasilAPI
                            "phone": f"({ddd}) {tel}",
                            "email": email,
                            "email_status": "found" if email else None,
                            "logradouro": logradouro or None,
                            "numero": row[15].strip() or None,
                            "bairro": row[17].strip().title() or None,
                            "municipio": municipio_name or None,
                            "uf": row_uf,
                            "cep": cep or None,
                            "cnae": cnae,
                            "cnae_descricao": None,
                            "situacao": "ATIVA",
                            "website": None,
                        })

                        if email:
                            progress["found_with_email"] += 1
                        else:
                            progress["found_without_email"] += 1

                        progress["found"] = len(results)
                        progress["status"] = (
                            f"Analisando arquivo {file_idx + 1}/10... "
                            f"({progress['scanned']:,} registros, {len(results)} encontradas)"
                        )

        except Exception as e:
            progress["status"] = f"Erro ao processar arquivo {file_idx + 1}: {e}"
            continue

    with_email = progress.get("found_with_email", 0)
    without_email = progress.get("found_without_email", 0)
    progress["status"] = (
        f"Busca concluída: {len(results)} empresas ativas com telefone "
        f"({with_email} com email, {without_email} sem email — raspar depois)."
    )
    return results
