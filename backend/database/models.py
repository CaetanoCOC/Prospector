import sqlite3


def _migrate_leads_table(conn: sqlite3.Connection):
    """Drop old Yelp-based leads table if it hasn't been migrated yet."""
    cols = [row[1] for row in conn.execute("PRAGMA table_info(leads)").fetchall()]
    if cols and "cnpj" not in cols:
        # Old schema — wipe and recreate
        conn.execute("DELETE FROM email_logs")
        conn.execute("DROP TABLE IF EXISTS leads")
        conn.commit()


def create_tables(conn: sqlite3.Connection):
    _migrate_leads_table(conn)
    conn.executescript("""
        CREATE TABLE IF NOT EXISTS leads (
            id              INTEGER PRIMARY KEY AUTOINCREMENT,
            cnpj            TEXT UNIQUE,
            razao_social    TEXT,
            nome_fantasia   TEXT,
            phone           TEXT,
            website         TEXT,
            email           TEXT,
            logradouro      TEXT,
            numero          TEXT,
            bairro          TEXT,
            municipio       TEXT,
            uf              TEXT,
            cep             TEXT,
            cnae            TEXT,
            cnae_descricao  TEXT,
            niche           TEXT,
            situacao        TEXT,
            email_status    TEXT DEFAULT NULL,
            lead_status     TEXT DEFAULT 'new',
            created_at      DATETIME DEFAULT CURRENT_TIMESTAMP
        );

        CREATE TABLE IF NOT EXISTS templates (
            id              INTEGER PRIMARY KEY AUTOINCREMENT,
            name            TEXT NOT NULL,
            subject         TEXT NOT NULL,
            html_body       TEXT NOT NULL,
            created_at      DATETIME DEFAULT CURRENT_TIMESTAMP
        );

        CREATE TABLE IF NOT EXISTS campaigns (
            id              INTEGER PRIMARY KEY AUTOINCREMENT,
            name            TEXT NOT NULL,
            niche           TEXT,
            template_id     INTEGER,
            total_sent      INTEGER DEFAULT 0,
            created_at      DATETIME DEFAULT CURRENT_TIMESTAMP,
            FOREIGN KEY (template_id) REFERENCES templates(id)
        );

        CREATE TABLE IF NOT EXISTS email_logs (
            id              INTEGER PRIMARY KEY AUTOINCREMENT,
            lead_id         INTEGER,
            campaign_id     INTEGER,
            subject         TEXT,
            sent_at         DATETIME DEFAULT CURRENT_TIMESTAMP,
            status          TEXT,
            replied         INTEGER DEFAULT 0,
            FOREIGN KEY (lead_id) REFERENCES leads(id),
            FOREIGN KEY (campaign_id) REFERENCES campaigns(id)
        );

        CREATE TABLE IF NOT EXISTS settings (
            key             TEXT PRIMARY KEY,
            value           TEXT
        );
    """)
    conn.commit()


BARBERSHOP_HTML = """<!DOCTYPE html>
<html>
<head>
<meta charset="UTF-8">
<style>
  body { font-family: Arial, sans-serif; font-size: 15px; color: #222; background: #f9f9f9; margin: 0; padding: 0; }
  .container { max-width: 580px; margin: 32px auto; background: #fff; border-radius: 8px; padding: 40px 48px; border: 1px solid #e0e0e0; }
  h2 { font-size: 20px; color: #1B5E20; margin-bottom: 8px; }
  p { line-height: 1.7; margin: 12px 0; }
  .cta { display: inline-block; margin-top: 20px; padding: 12px 28px; background: #388E3C; color: #fff; border-radius: 6px; text-decoration: none; font-weight: bold; font-size: 15px; }
  .footer { margin-top: 36px; font-size: 12px; color: #9e9e9e; border-top: 1px solid #f0f0f0; padding-top: 16px; }
</style>
</head>
<body>
<div class="container">
  <h2>Hey {BUSINESS_NAME} 👋</h2>
  <p>My name is Caetano, and I help barbershops like yours bring back clients who haven't visited in a while — automatically.</p>
  <p>I built a reactivation system specifically for barbershops. It sends personalized follow-up messages to your past clients at the right time, getting them back in the chair without any extra work from you.</p>
  <p>Most shops see <strong>15–30% of dormant clients return</strong> within the first 30 days.</p>
  <p>I'd love to show you how it works for <strong>{BUSINESS_NAME}</strong>. Would you be open to a quick 10-minute call this week?</p>
  <a href="{BOOKING_URL}" class="cta">See How It Works</a>
  <div class="footer">
    Caetano | CaetanoRevive<br>
    <a href="mailto:caetanorevive@gmail.com">caetanorevive@gmail.com</a><br><br>
    Você recebeu este email pois seu negócio foi encontrado em nossos registros. Responda PARAR para cancelar.
  </div>
</div>
</body>
</html>"""

HAIR_SALON_HTML = """<!DOCTYPE html>
<html>
<head>
<meta charset="UTF-8">
<style>
  body { font-family: Arial, sans-serif; font-size: 15px; color: #222; background: #f9f9f9; margin: 0; padding: 0; }
  .container { max-width: 580px; margin: 32px auto; background: #fff; border-radius: 8px; padding: 40px 48px; border: 1px solid #e0e0e0; }
  h2 { font-size: 20px; color: #1B5E20; margin-bottom: 8px; }
  p { line-height: 1.7; margin: 12px 0; }
  .cta { display: inline-block; margin-top: 20px; padding: 12px 28px; background: #388E3C; color: #fff; border-radius: 6px; text-decoration: none; font-weight: bold; font-size: 15px; }
  .footer { margin-top: 36px; font-size: 12px; color: #9e9e9e; border-top: 1px solid #f0f0f0; padding-top: 16px; }
</style>
</head>
<body>
<div class="container">
  <h2>Hi {BUSINESS_NAME} 👋</h2>
  <p>I'm Caetano, and I specialize in helping hair salons win back clients who've gone quiet — with zero effort on your end.</p>
  <p>My reactivation system automatically reaches out to your past clients at the perfect moment, reminding them why they loved your salon and making it easy for them to book again.</p>
  <p>Salons using this system typically see <strong>20–35% of lapsed clients return</strong> within the first month.</p>
  <p>I'd love to walk you through exactly how it would work for <strong>{BUSINESS_NAME}</strong>. Can we grab 10 minutes this week?</p>
  <a href="{BOOKING_URL}" class="cta">See How It Works</a>
  <div class="footer">
    Caetano | CaetanoRevive<br>
    <a href="mailto:caetanorevive@gmail.com">caetanorevive@gmail.com</a><br><br>
    Você recebeu este email pois seu negócio foi encontrado em nossos registros. Responda PARAR para cancelar.
  </div>
</div>
</body>
</html>"""

BLANK_HTML = """<!DOCTYPE html>
<html>
<head>
<meta charset="UTF-8">
<style>
  body { font-family: Arial, sans-serif; font-size: 15px; color: #222; }
  .container { max-width: 580px; margin: 32px auto; padding: 40px; }
</style>
</head>
<body>
<div class="container">
  <p>Hi {BUSINESS_NAME},</p>
  <p>Write your message here.</p>
  <p>Best,<br>Caetano</p>
</div>
</body>
</html>"""


def seed_templates(conn: sqlite3.Connection):
    existing = conn.execute("SELECT COUNT(*) FROM templates").fetchone()[0]
    if existing > 0:
        return

    templates = [
        (
            "CaetanoRevive - Barbershop",
            "Quick question for {BUSINESS_NAME}",
            BARBERSHOP_HTML,
        ),
        (
            "CaetanoRevive - Hair Salon",
            "Question for {BUSINESS_NAME}",
            HAIR_SALON_HTML,
        ),
        (
            "Template em branco",
            "Hello from Caetano",
            BLANK_HTML,
        ),
    ]

    conn.executemany(
        "INSERT INTO templates (name, subject, html_body) VALUES (?, ?, ?)",
        templates,
    )
    conn.commit()
