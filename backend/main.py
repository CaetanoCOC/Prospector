import sys
import os
import csv
import io
import threading
from pathlib import Path
from typing import Optional, List
from datetime import datetime

from fastapi import FastAPI, HTTPException, BackgroundTasks, Query, UploadFile, File, Form
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import StreamingResponse, FileResponse
from fastapi.staticfiles import StaticFiles
from pydantic import BaseModel
from dotenv import load_dotenv


def _get_base_dir() -> Path:
    """Writable directory: next to .exe (frozen) or project root (dev)."""
    if getattr(sys, "frozen", False):
        return Path(sys.executable).parent
    return Path(__file__).parent.parent


def _get_bundle_dir() -> Path:
    """Read-only bundled assets: sys._MEIPASS (frozen) or frontend/dist (dev)."""
    if getattr(sys, "frozen", False):
        return Path(sys._MEIPASS) / "frontend_dist"
    return Path(__file__).parent.parent / "frontend" / "dist"


load_dotenv(_get_base_dir() / ".env")

from backend.database.db import get_connection, init_db
from backend.core import cnpj_import as cnpj_parser
from backend.core import brasilapi
from backend.core import rf_downloader
from backend.core import scraper as email_scraper
from backend.core import gmail as gmail_client
from backend.core import reporter

app = FastAPI(title="Prospector API", version="2.0.0")

app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        "http://localhost:5012", "http://localhost:5013", "http://localhost:5014",
        "http://localhost:5015", "http://localhost:5016", "http://localhost:5017",
        "http://127.0.0.1:5012",
        "http://localhost:8004", "http://127.0.0.1:8004",
    ],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# ── In-memory progress trackers ──────────────────────────────────────────────
scrape_progress: dict = {"total": 0, "done": 0, "running": False}
import_progress: dict = {"total": 0, "done": 0, "failed": 0, "running": False, "niche": ""}
search_progress: dict = {
    "running": False, "phase": "", "status": "", "found": 0,
    "scanned": 0, "dl_total": 0, "dl_done": 0, "file_idx": 0,
    "enrich_done": 0, "enrich_total": 0, "year_month": "",
}

RF_CACHE_DIR = _get_base_dir() / "data" / "rf_cache"


@app.on_event("startup")
def startup():
    init_db()


# ─────────────────────────────────────────────
# PYDANTIC MODELS
# ─────────────────────────────────────────────

class ScrapeRequest(BaseModel):
    lead_ids: Optional[List[int]] = None


class LeadUpdate(BaseModel):
    lead_status: Optional[str] = None
    email: Optional[str] = None
    email_status: Optional[str] = None
    website: Optional[str] = None


class LeadCreate(BaseModel):
    cnpj: Optional[str] = None
    razao_social: Optional[str] = None
    nome_fantasia: Optional[str] = None
    email: Optional[str] = None
    website: Optional[str] = None
    phone: Optional[str] = None
    municipio: Optional[str] = None
    uf: Optional[str] = None
    niche: Optional[str] = None


class CampaignCreate(BaseModel):
    name: str
    niche: Optional[str] = None
    template_id: int
    lead_ids: List[int]


class ReplyUpdate(BaseModel):
    lead_id: int
    replied: bool


class TemplateCreate(BaseModel):
    name: str
    subject: str
    html_body: str


class TemplateUpdate(BaseModel):
    name: Optional[str] = None
    subject: Optional[str] = None
    html_body: Optional[str] = None


class SettingsUpdate(BaseModel):
    max_emails_per_day: Optional[int] = None


class TestEmailRequest(BaseModel):
    to_email: str
    template_id: int


class CnaeSearchRequest(BaseModel):
    cnae_codes: List[str]        # e.g. ["9602-5/01", "9602-5/02"]
    niche: str                   # label the user defines, e.g. "Barbearia"
    quantity: int = 50           # how many leads to import
    uf: Optional[str] = None     # state filter, e.g. "SP"
    municipio: Optional[str] = None  # city substring filter


# ─────────────────────────────────────────────
# HELPERS
# ─────────────────────────────────────────────

def _get_setting(conn, key: str, default=None):
    row = conn.execute("SELECT value FROM settings WHERE key = ?", (key,)).fetchone()
    return row["value"] if row else default


def _set_setting(conn, key: str, value: str):
    conn.execute(
        "INSERT OR REPLACE INTO settings (key, value) VALUES (?, ?)",
        (key, value),
    )
    conn.commit()


# ─────────────────────────────────────────────
# BUSCA POR CNAE (Receita Federal)
# ─────────────────────────────────────────────

def _run_cnae_search(cnae_codes: list, niche: str, quantity: int, uf: Optional[str], municipio: Optional[str]):
    global search_progress
    search_progress["running"] = True

    # Phase 1: Search RF files
    try:
        leads = rf_downloader.search_rf(
            cnae_codes=cnae_codes,
            uf=uf,
            municipio_filter=municipio,
            quantity=quantity,
            cache_dir=RF_CACHE_DIR,
            progress=search_progress,
        )
    except Exception as e:
        search_progress["status"] = f"Erro na busca: {e}"
        search_progress["running"] = False
        return

    if not leads:
        search_progress["status"] = "Nenhuma empresa encontrada com os critérios informados."
        search_progress["running"] = False
        return

    # Phase 2: Enrich via BrasilAPI (get razao_social + validate)
    search_progress["phase"] = "enrich"
    search_progress["enrich_total"] = len(leads)
    search_progress["enrich_done"] = 0
    search_progress["status"] = f"Enriquecendo {len(leads)} empresas via BrasilAPI..."

    conn = get_connection()
    saved = 0
    for lead in leads:
        search_progress["status"] = (
            f"Enriquecendo via BrasilAPI... ({search_progress['enrich_done'] + 1}/{search_progress['enrich_total']})"
        )

        # Try BrasilAPI for razao_social + cnae_descricao
        api_data = brasilapi.fetch_cnpj(lead["cnpj"], delay=0.35)
        if api_data:
            enriched = brasilapi.parse_lead_from_brasilapi(api_data, niche)
            # Merge: BrasilAPI wins for razao_social/cnae_descricao, RF wins for email/phone/address
            lead["razao_social"] = enriched.get("razao_social") or lead.get("razao_social")
            lead["cnae_descricao"] = enriched.get("cnae_descricao") or lead.get("cnae_descricao")
            # Keep RF email/phone if BrasilAPI doesn't have them
            if enriched.get("email"):
                lead["email"] = enriched["email"]
                lead["email_status"] = "found"
            if enriched.get("phone"):
                lead["phone"] = enriched["phone"]
        else:
            lead["razao_social"] = None

        lead["niche"] = niche

        try:
            conn.execute(
                """INSERT OR IGNORE INTO leads
                   (cnpj, razao_social, nome_fantasia, phone, website, email,
                    logradouro, numero, bairro, municipio, uf, cep,
                    cnae, cnae_descricao, niche, situacao, email_status, lead_status, created_at)
                   VALUES
                   (:cnpj, :razao_social, :nome_fantasia, :phone, :website, :email,
                    :logradouro, :numero, :bairro, :municipio, :uf, :cep,
                    :cnae, :cnae_descricao, :niche, :situacao, :email_status, 'new',
                    CURRENT_TIMESTAMP)""",
                lead,
            )
            conn.commit()
            saved += 1
        except Exception as e:
            search_progress["last_insert_error"] = str(e)

        search_progress["enrich_done"] += 1

    conn.close()
    search_progress["phase"] = "done"
    with_email = sum(1 for l in leads if l.get("email"))
    search_progress["status"] = f"Concluído! {saved} leads importados ({with_email} com email, {saved - with_email} sem email)."
    search_progress["running"] = False


@app.post("/api/search-cnae")
def search_by_cnae(req: CnaeSearchRequest):
    global search_progress
    if search_progress["running"]:
        raise HTTPException(400, "Busca já em andamento. Aguarde terminar.")
    if not req.cnae_codes:
        raise HTTPException(400, "Informe pelo menos um código CNAE.")
    if not req.niche.strip():
        raise HTTPException(400, "Informe o nome do nicho.")
    if req.quantity < 1 or req.quantity > 500:
        raise HTTPException(400, "Quantidade deve ser entre 1 e 500.")

    search_progress = {
        "running": True, "phase": "init", "status": "Iniciando...",
        "found": 0, "found_with_email": 0, "found_without_email": 0,
        "scanned": 0, "dl_total": 0, "dl_done": 0,
        "file_idx": 0, "enrich_done": 0, "enrich_total": 0,
        "year_month": "", "niche": req.niche,
        "quantity": req.quantity, "cnae_codes": req.cnae_codes,
        "uf_filter": req.uf or "",
        "municipio_filter": req.municipio or "",
    }

    t = threading.Thread(
        target=_run_cnae_search,
        args=(req.cnae_codes, req.niche, req.quantity, req.uf, req.municipio),
        daemon=True,
    )
    t.start()

    return {"message": "Busca iniciada.", "niche": req.niche, "quantity": req.quantity}


@app.get("/api/search-progress")
def get_search_progress():
    return search_progress


@app.get("/api/rf-cache")
def get_rf_cache_info():
    """Return info about cached RF files."""
    RF_CACHE_DIR.mkdir(parents=True, exist_ok=True)
    files = []
    for f in sorted(RF_CACHE_DIR.glob("Estabelecimentos*.zip")):
        files.append({
            "name": f.name,
            "size_mb": round(f.stat().st_size / 1024 / 1024, 1),
            "modified": datetime.fromtimestamp(f.stat().st_mtime).strftime("%Y-%m-%d"),
        })
    return {"files": files, "count": len(files)}


# ─────────────────────────────────────────────
# CNPJ IMPORT
# ─────────────────────────────────────────────

def _run_brasilapi_enrichment(cnpjs: List[str], niche: str):
    global import_progress
    import_progress.update({"total": len(cnpjs), "done": 0, "failed": 0, "running": True, "niche": niche})

    conn = get_connection()
    for cnpj in cnpjs:
        data = brasilapi.fetch_cnpj(cnpj, delay=0.35)
        if data:
            lead = brasilapi.parse_lead_from_brasilapi(data, niche)
            # Only import active businesses
            if lead.get("situacao", "").upper() not in ("ATIVA", "ACTIVE", ""):
                import_progress["failed"] += 1
                import_progress["done"] += 1
                continue
            try:
                conn.execute(
                    """INSERT OR IGNORE INTO leads
                       (cnpj, razao_social, nome_fantasia, phone, website, email,
                        logradouro, numero, bairro, municipio, uf, cep,
                        cnae, cnae_descricao, niche, situacao, email_status, lead_status, created_at)
                       VALUES
                       (:cnpj, :razao_social, :nome_fantasia, :phone, :website, :email,
                        :logradouro, :numero, :bairro, :municipio, :uf, :cep,
                        :cnae, :cnae_descricao, :niche, :situacao, :email_status, 'new',
                        CURRENT_TIMESTAMP)""",
                    lead,
                )
                conn.commit()
            except Exception:
                import_progress["failed"] += 1
        else:
            import_progress["failed"] += 1

        import_progress["done"] += 1

    import_progress["running"] = False
    conn.close()


@app.post("/api/import-cnpj")
async def import_cnpj(
    background_tasks: BackgroundTasks,
    file: UploadFile = File(...),
    niche: str = Form(...),
):
    global import_progress
    if import_progress["running"]:
        raise HTTPException(400, "Importação já em andamento. Aguarde terminar.")

    if not niche.strip():
        raise HTTPException(400, "Informe o nome do nicho.")

    content = await file.read()
    cnpjs = cnpj_parser.extract_cnpjs_from_csv(content)

    if not cnpjs:
        raise HTTPException(400, "Nenhum CNPJ válido encontrado no arquivo. Verifique o formato.")

    # Reset progress before starting
    import_progress = {"total": len(cnpjs), "done": 0, "failed": 0, "running": True, "niche": niche.strip()}

    t = threading.Thread(target=_run_brasilapi_enrichment, args=(cnpjs, niche.strip()), daemon=True)
    t.start()

    return {
        "message": f"{len(cnpjs)} CNPJs encontrados. Enriquecimento iniciado.",
        "total": len(cnpjs),
        "niche": niche.strip(),
    }


@app.get("/api/import-progress")
def get_import_progress():
    return import_progress


# ─────────────────────────────────────────────
# SCRAPER
# ─────────────────────────────────────────────

def _run_scraper(lead_ids: Optional[List[int]]):
    global scrape_progress
    conn = get_connection()

    if lead_ids:
        placeholders = ",".join("?" * len(lead_ids))
        rows = conn.execute(
            f"SELECT * FROM leads WHERE id IN ({placeholders}) AND website IS NOT NULL",
            lead_ids,
        ).fetchall()
    else:
        rows = conn.execute(
            "SELECT * FROM leads WHERE email_status IS NULL AND website IS NOT NULL"
        ).fetchall()

    scrape_progress["total"] = len(rows)
    scrape_progress["done"] = 0
    scrape_progress["running"] = True

    for row in rows:
        lead_dict = dict(row)
        result = email_scraper.scrape_lead(lead_dict)
        conn.execute(
            "UPDATE leads SET email = ?, email_status = ? WHERE id = ?",
            (result.get("email"), result.get("email_status"), lead_dict["id"]),
        )
        conn.commit()
        scrape_progress["done"] += 1

    scrape_progress["running"] = False
    conn.close()


@app.post("/api/scrape-emails")
def scrape_emails(req: ScrapeRequest, background_tasks: BackgroundTasks):
    global scrape_progress
    if scrape_progress["running"]:
        raise HTTPException(400, "Scraper already running")

    scrape_progress = {"total": 0, "done": 0, "running": True}
    background_tasks.add_task(_run_scraper, req.lead_ids)
    return {"message": "Scraper started", "status": "running"}


@app.get("/api/scrape-progress")
def get_scrape_progress():
    return scrape_progress


# ─────────────────────────────────────────────
# LEADS
# ─────────────────────────────────────────────

COOLDOWN_DAYS = 30

COOLDOWN_SUBQUERY = """
    AND id NOT IN (
        SELECT lead_id FROM email_logs
        WHERE status = 'sent'
        AND sent_at > datetime('now', '-{} days')
    )
""".format(COOLDOWN_DAYS)


@app.get("/api/leads")
def list_leads(
    niche: Optional[str] = None,
    municipio: Optional[str] = None,
    uf: Optional[str] = None,
    lead_status: Optional[str] = None,
    email_status: Optional[str] = None,
    has_email: bool = False,
    available_for_campaign: bool = False,
    limit: int = 200,
    offset: int = 0,
):
    conn = get_connection()
    query = "SELECT * FROM leads WHERE 1=1"
    params = []

    if niche:
        query += " AND niche LIKE ?"
        params.append(f"%{niche}%")
    if municipio:
        query += " AND municipio LIKE ?"
        params.append(f"%{municipio}%")
    if uf:
        query += " AND uf = ?"
        params.append(uf.upper())
    if lead_status:
        query += " AND lead_status = ?"
        params.append(lead_status)
    if email_status:
        query += " AND email_status = ?"
        params.append(email_status)
    if has_email:
        query += " AND email IS NOT NULL AND email != ''"
    if available_for_campaign:
        query += COOLDOWN_SUBQUERY

    count_query = "SELECT COUNT(*) FROM leads WHERE 1=1"
    count_params = list(params)
    if niche:
        count_query += " AND niche LIKE ?"
    if municipio:
        count_query += " AND municipio LIKE ?"
    if uf:
        count_query += " AND uf = ?"
    if lead_status:
        count_query += " AND lead_status = ?"
    if email_status:
        count_query += " AND email_status = ?"
    if has_email:
        count_query += " AND email IS NOT NULL AND email != ''"
    if available_for_campaign:
        count_query += COOLDOWN_SUBQUERY

    # Also count how many leads are currently in cooldown (for the campaign modal)
    cooldown_base = "SELECT COUNT(*) FROM leads WHERE email IS NOT NULL AND email != ''"
    cooldown_params: list = []
    if niche:
        cooldown_base += " AND niche LIKE ?"
        cooldown_params.append(f"%{niche}%")
    cooldown_base += f"""
        AND id IN (
            SELECT lead_id FROM email_logs
            WHERE status = 'sent'
            AND sent_at > datetime('now', '-{COOLDOWN_DAYS} days')
        )
    """

    query += " ORDER BY created_at DESC LIMIT ? OFFSET ?"
    params.extend([limit, offset])

    rows = conn.execute(query, params).fetchall()
    total = conn.execute(count_query, count_params).fetchone()[0]
    in_cooldown = conn.execute(cooldown_base, cooldown_params).fetchone()[0]
    conn.close()

    return {
        "leads": [dict(r) for r in rows],
        "total": total,
        "limit": limit,
        "offset": offset,
        "in_cooldown": in_cooldown,
    }


@app.post("/api/leads")
def create_lead(lead: LeadCreate):
    conn = get_connection()
    cursor = conn.execute(
        """INSERT INTO leads
           (cnpj, razao_social, nome_fantasia, email, website, phone,
            municipio, uf, niche, email_status, lead_status, created_at)
           VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'new', CURRENT_TIMESTAMP)""",
        (
            lead.cnpj or None,
            lead.razao_social or None,
            lead.nome_fantasia or None,
            lead.email or None,
            lead.website or None,
            lead.phone or None,
            lead.municipio or None,
            lead.uf or None,
            lead.niche or None,
            "found" if lead.email else None,
        ),
    )
    conn.commit()
    row = conn.execute("SELECT * FROM leads WHERE id = ?", (cursor.lastrowid,)).fetchone()
    conn.close()
    return dict(row)


@app.get("/api/niches")
def get_niches():
    conn = get_connection()
    rows = conn.execute(
        "SELECT DISTINCT niche FROM leads WHERE niche IS NOT NULL AND niche != '' ORDER BY niche"
    ).fetchall()
    conn.close()
    return [r["niche"] for r in rows]


@app.patch("/api/leads/{lead_id}")
def update_lead(lead_id: int, update: LeadUpdate):
    conn = get_connection()
    row = conn.execute("SELECT id FROM leads WHERE id = ?", (lead_id,)).fetchone()
    if not row:
        conn.close()
        raise HTTPException(404, "Lead not found")

    fields, values = [], []
    if update.lead_status is not None:
        fields.append("lead_status = ?"); values.append(update.lead_status)
    if update.email is not None:
        fields.append("email = ?"); values.append(update.email)
    if update.email_status is not None:
        fields.append("email_status = ?"); values.append(update.email_status)
    if update.website is not None:
        fields.append("website = ?"); values.append(update.website)

    if fields:
        values.append(lead_id)
        conn.execute(f"UPDATE leads SET {', '.join(fields)} WHERE id = ?", values)
        conn.commit()

    updated = conn.execute("SELECT * FROM leads WHERE id = ?", (lead_id,)).fetchone()
    conn.close()
    return dict(updated)


@app.delete("/api/leads/{lead_id}")
def delete_lead(lead_id: int):
    conn = get_connection()
    conn.execute("DELETE FROM email_logs WHERE lead_id = ?", (lead_id,))
    conn.execute("DELETE FROM leads WHERE id = ?", (lead_id,))
    conn.commit()
    conn.close()
    return {"message": "Lead removed"}


@app.get("/api/leads/export")
def export_leads_csv(
    niche: Optional[str] = None,
    municipio: Optional[str] = None,
    uf: Optional[str] = None,
    lead_status: Optional[str] = None,
    email_status: Optional[str] = None,
):
    conn = get_connection()
    query = "SELECT * FROM leads WHERE 1=1"
    params = []
    if niche:
        query += " AND niche LIKE ?"; params.append(f"%{niche}%")
    if municipio:
        query += " AND municipio LIKE ?"; params.append(f"%{municipio}%")
    if uf:
        query += " AND uf = ?"; params.append(uf.upper())
    if lead_status:
        query += " AND lead_status = ?"; params.append(lead_status)
    if email_status:
        query += " AND email_status = ?"; params.append(email_status)
    query += " ORDER BY created_at DESC"

    rows = conn.execute(query, params).fetchall()
    conn.close()

    output = io.StringIO()
    if rows:
        writer = csv.DictWriter(output, fieldnames=rows[0].keys())
        writer.writeheader()
        writer.writerows([dict(r) for r in rows])

    output.seek(0)
    return StreamingResponse(
        iter([output.getvalue()]),
        media_type="text/csv",
        headers={"Content-Disposition": "attachment; filename=leads.csv"},
    )


# ─────────────────────────────────────────────
# CAMPAIGNS
# ─────────────────────────────────────────────

@app.get("/api/campaigns")
def list_campaigns():
    conn = get_connection()
    rows = conn.execute(
        """
        SELECT c.*, t.name as template_name,
               COUNT(CASE WHEN el.replied = 1 THEN 1 END) as replied_count
        FROM campaigns c
        LEFT JOIN templates t ON t.id = c.template_id
        LEFT JOIN email_logs el ON el.campaign_id = c.id
        GROUP BY c.id
        ORDER BY c.created_at DESC
        """
    ).fetchall()
    conn.close()
    return [dict(r) for r in rows]


@app.get("/api/campaigns/{campaign_id}/logs")
def get_campaign_logs(campaign_id: int):
    conn = get_connection()
    rows = conn.execute(
        """
        SELECT el.*,
               COALESCE(l.nome_fantasia, l.razao_social) as lead_name,
               l.email as lead_email,
               l.municipio, l.uf, l.niche
        FROM email_logs el
        JOIN leads l ON l.id = el.lead_id
        WHERE el.campaign_id = ?
        ORDER BY el.sent_at DESC
        """,
        (campaign_id,),
    ).fetchall()
    conn.close()
    return [dict(r) for r in rows]


@app.post("/api/campaigns")
def create_campaign(req: CampaignCreate):
    conn = get_connection()

    template = conn.execute(
        "SELECT * FROM templates WHERE id = ?", (req.template_id,)
    ).fetchone()
    if not template:
        conn.close()
        raise HTTPException(404, "Template not found")

    cur = conn.execute(
        "INSERT INTO campaigns (name, niche, template_id, total_sent) VALUES (?, ?, ?, 0)",
        (req.name, req.niche, req.template_id),
    )
    campaign_id = cur.lastrowid
    conn.commit()

    placeholders = ",".join("?" * len(req.lead_ids))
    leads = conn.execute(
        f"""SELECT * FROM leads
            WHERE id IN ({placeholders})
            AND email IS NOT NULL
            AND id NOT IN (
                SELECT lead_id FROM email_logs
                WHERE status = 'sent'
                AND sent_at > datetime('now', '-{COOLDOWN_DAYS} days')
            )""",
        req.lead_ids,
    ).fetchall()

    sent_count = 0
    for lead in leads:
        lead_dict = dict(lead)
        success = gmail_client.send_email(
            lead_dict["email"],
            template["subject"],
            template["html_body"],
            lead_dict,
        )
        status = "sent" if success else "failed"

        conn.execute(
            "INSERT INTO email_logs (lead_id, campaign_id, subject, status) VALUES (?, ?, ?, ?)",
            (lead_dict["id"], campaign_id, template["subject"], status),
        )

        if success:
            conn.execute(
                "UPDATE leads SET lead_status = 'contacted' WHERE id = ?",
                (lead_dict["id"],),
            )
            sent_count += 1

    conn.execute(
        "UPDATE campaigns SET total_sent = ? WHERE id = ?",
        (sent_count, campaign_id),
    )
    conn.commit()
    conn.close()

    skipped_cooldown = len(req.lead_ids) - len(leads)
    return {
        "campaign_id": campaign_id,
        "sent": sent_count,
        "failed": len(leads) - sent_count,
        "skipped_cooldown": skipped_cooldown,
        "message": (
            f"Campanha enviada: {sent_count}/{len(leads)} emails entregues"
            + (f" · {skipped_cooldown} em cooldown (30 dias)" if skipped_cooldown else "")
        ),
    }


@app.delete("/api/campaigns/{campaign_id}")
def delete_campaign(campaign_id: int):
    conn = get_connection()
    conn.execute("DELETE FROM email_logs WHERE campaign_id = ?", (campaign_id,))
    conn.execute("DELETE FROM campaigns WHERE id = ?", (campaign_id,))
    conn.commit()
    conn.close()
    return {"message": "Campaign deleted"}


@app.patch("/api/campaigns/{campaign_id}/reply")
def mark_reply(campaign_id: int, update: ReplyUpdate):
    conn = get_connection()
    conn.execute(
        "UPDATE email_logs SET replied = ? WHERE campaign_id = ? AND lead_id = ?",
        (1 if update.replied else 0, campaign_id, update.lead_id),
    )
    if update.replied:
        conn.execute(
            "UPDATE leads SET lead_status = 'replied' WHERE id = ?",
            (update.lead_id,),
        )
    conn.commit()
    conn.close()
    return {"message": "Reply status updated"}


# ─────────────────────────────────────────────
# TEMPLATES
# ─────────────────────────────────────────────

@app.get("/api/templates")
def list_templates():
    conn = get_connection()
    rows = conn.execute("SELECT * FROM templates ORDER BY created_at ASC").fetchall()
    conn.close()
    return [dict(r) for r in rows]


@app.post("/api/templates")
def create_template(req: TemplateCreate):
    conn = get_connection()
    cur = conn.execute(
        "INSERT INTO templates (name, subject, html_body) VALUES (?, ?, ?)",
        (req.name, req.subject, req.html_body),
    )
    conn.commit()
    template = conn.execute("SELECT * FROM templates WHERE id = ?", (cur.lastrowid,)).fetchone()
    conn.close()
    return dict(template)


@app.put("/api/templates/{template_id}")
def update_template(template_id: int, req: TemplateUpdate):
    conn = get_connection()
    fields, values = [], []
    if req.name is not None:
        fields.append("name = ?"); values.append(req.name)
    if req.subject is not None:
        fields.append("subject = ?"); values.append(req.subject)
    if req.html_body is not None:
        fields.append("html_body = ?"); values.append(req.html_body)

    if fields:
        values.append(template_id)
        conn.execute(f"UPDATE templates SET {', '.join(fields)} WHERE id = ?", values)
        conn.commit()

    row = conn.execute("SELECT * FROM templates WHERE id = ?", (template_id,)).fetchone()
    conn.close()
    if not row:
        raise HTTPException(404, "Template not found")
    return dict(row)


@app.delete("/api/templates/{template_id}")
def delete_template(template_id: int):
    conn = get_connection()
    conn.execute("DELETE FROM templates WHERE id = ?", (template_id,))
    conn.commit()
    conn.close()
    return {"message": "Template deleted"}


# ─────────────────────────────────────────────
# STATS & SETTINGS
# ─────────────────────────────────────────────

@app.get("/api/stats")
def get_stats():
    conn = get_connection()
    stats = reporter.get_stats(conn)
    conn.close()
    return stats


@app.get("/api/settings")
def get_settings():
    conn = get_connection()
    max_emails = int(_get_setting(conn, "max_emails_per_day") or 50)
    conn.close()
    return {"max_emails_per_day": max_emails}


@app.post("/api/settings")
def save_settings(req: SettingsUpdate):
    conn = get_connection()
    if req.max_emails_per_day is not None:
        _set_setting(conn, "max_emails_per_day", str(req.max_emails_per_day))
    conn.close()
    return {"message": "Settings saved"}


# ─────────────────────────────────────────────
# GMAIL
# ─────────────────────────────────────────────

@app.post("/api/gmail/auth")
def gmail_auth():
    try:
        email = gmail_client.start_oauth_flow()
        return {"message": "Gmail connected", "email": email}
    except Exception as e:
        raise HTTPException(500, str(e))


@app.get("/api/gmail/status")
def gmail_status():
    return gmail_client.get_gmail_status()


@app.post("/api/gmail/test")
def send_test_email(req: TestEmailRequest):
    conn = get_connection()
    row = conn.execute("SELECT * FROM templates WHERE id = ?", (req.template_id,)).fetchone()
    conn.close()
    if not row:
        raise HTTPException(404, "Template not found")
    fake_lead = {"nome_fantasia": "Empresa Teste", "razao_social": "Empresa Teste LTDA", "website": "https://example.com"}
    ok = gmail_client.send_email(req.to_email, row["subject"], row["html_body"], fake_lead)
    if not ok:
        raise HTTPException(500, "Failed to send. Check Gmail connection.")
    return {"message": f"Test email sent to {req.to_email}"}


@app.post("/api/gmail/disconnect")
def gmail_disconnect():
    gmail_client.disconnect_gmail()
    return {"message": "Gmail disconnected"}


# ── Static file serving (for .exe mode) ──────────────────────────────────────

_dist_dir = _get_bundle_dir()
if _dist_dir.exists():
    _assets_dir = _dist_dir / "assets"
    if _assets_dir.exists():
        app.mount("/assets", StaticFiles(directory=str(_assets_dir)), name="assets")

    @app.get("/favicon.svg")
    async def favicon():
        return FileResponse(str(_dist_dir / "favicon.svg"))

    @app.get("/icons.svg")
    async def icons_svg():
        return FileResponse(str(_dist_dir / "icons.svg"))

    @app.get("/{full_path:path}")
    async def serve_spa(full_path: str):
        return FileResponse(str(_dist_dir / "index.html"))
