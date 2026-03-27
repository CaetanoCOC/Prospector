import re
import io
import csv
from typing import List


def extract_cnpjs_from_csv(content: bytes) -> List[str]:
    """
    Auto-detect format and extract CNPJs from uploaded CSV.

    Handles two formats:
    1. dados.gov.br Estabelecimentos file:
       - No header row
       - Semicolon-separated (;)
       - Encoding: latin-1
       - CNPJ in first 3 columns: CNPJ_BASICO(8) | CNPJ_ORDEM(4) | CNPJ_DV(2)

    2. Simple CSV with a column named "cnpj" (14 digits, any separator):
       - UTF-8 or latin-1
       - Has header row containing the word "cnpj"
    """
    text = None
    for encoding in ("utf-8-sig", "utf-8", "latin-1", "cp1252"):
        try:
            text = content.decode(encoding)
            break
        except (UnicodeDecodeError, LookupError):
            continue

    if text is None:
        return []

    text = text.strip()
    if not text:
        return []

    lines = text.splitlines()
    if not lines:
        return []

    first_line = lines[0].lower()

    # Detect separator
    sep = ";"
    if "cnpj" in first_line:
        # Has header — detect separator by counting occurrences
        comma_count = first_line.count(",")
        semi_count = first_line.count(";")
        tab_count = first_line.count("\t")
        sep = max([(comma_count, ","), (semi_count, ";"), (tab_count, "\t")], key=lambda x: x[0])[1]

    cnpjs: List[str] = []

    # ── Format 1: has header with "cnpj" ────────────────────────────────────
    if "cnpj" in first_line:
        reader = csv.DictReader(io.StringIO(text), delimiter=sep)
        for row in reader:
            # Find column whose name contains "cnpj"
            cnpj_val = None
            for key in row.keys():
                if key and "cnpj" in key.lower():
                    cnpj_val = row[key]
                    break
            if cnpj_val:
                digits = re.sub(r"\D", "", cnpj_val)
                if len(digits) == 14:
                    cnpjs.append(digits)
                elif len(digits) == 8:
                    # Might be partial (only CNPJ_BASICO) — skip, handled below
                    pass
        if cnpjs:
            return list(dict.fromkeys(cnpjs))  # deduplicate preserving order

    # ── Format 2: dados.gov.br Estabelecimentos (no header, semicolon) ──────
    # First 3 columns: CNPJ_BASICO(8) ; CNPJ_ORDEM(4) ; CNPJ_DV(2)
    for line in lines:
        line = line.strip()
        if not line:
            continue
        parts = line.split(";")
        if len(parts) >= 3:
            basico = re.sub(r"\D", "", parts[0]).zfill(8)
            ordem = re.sub(r"\D", "", parts[1]).zfill(4)
            dv = re.sub(r"\D", "", parts[2]).zfill(2)
            cnpj = basico + ordem + dv
            if len(cnpj) == 14 and cnpj.isdigit():
                cnpjs.append(cnpj)

    return list(dict.fromkeys(cnpjs))  # deduplicate preserving order
