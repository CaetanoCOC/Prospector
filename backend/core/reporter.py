import sqlite3
from datetime import datetime, timedelta


def get_stats(conn: sqlite3.Connection) -> dict:
    today = datetime.now().date().isoformat()

    total_leads = conn.execute("SELECT COUNT(*) FROM leads").fetchone()[0]

    leads_with_email = conn.execute(
        "SELECT COUNT(*) FROM leads WHERE email_status = 'found'"
    ).fetchone()[0]

    sent_today = conn.execute(
        "SELECT COUNT(*) FROM email_logs WHERE DATE(sent_at) = ? AND status = 'sent'",
        (today,),
    ).fetchone()[0]

    total_sent = conn.execute(
        "SELECT COUNT(*) FROM email_logs WHERE status = 'sent'"
    ).fetchone()[0]

    total_replied = conn.execute(
        "SELECT COUNT(*) FROM email_logs WHERE replied = 1"
    ).fetchone()[0]

    reply_rate = round((total_replied / total_sent * 100), 1) if total_sent > 0 else 0.0

    # Leads por semana (últimas 8 semanas)
    weekly_data = []
    for i in range(7, -1, -1):
        week_start = (datetime.now() - timedelta(weeks=i)).date()
        week_end = (datetime.now() - timedelta(weeks=i - 1)).date()
        count = conn.execute(
            "SELECT COUNT(*) FROM leads WHERE DATE(created_at) >= ? AND DATE(created_at) < ?",
            (week_start.isoformat(), week_end.isoformat()),
        ).fetchone()[0]
        weekly_data.append({
            "week": week_start.strftime("%b %d"),
            "leads": count,
        })

    # Últimas 5 campanhas
    recent_campaigns = conn.execute(
        """
        SELECT c.id, c.name, c.niche, c.total_sent, c.created_at,
               COUNT(CASE WHEN el.replied = 1 THEN 1 END) as replied_count
        FROM campaigns c
        LEFT JOIN email_logs el ON el.campaign_id = c.id
        GROUP BY c.id
        ORDER BY c.created_at DESC
        LIMIT 5
        """
    ).fetchall()

    campaigns_list = [
        {
            "id": row["id"],
            "name": row["name"],
            "niche": row["niche"],
            "total_sent": row["total_sent"],
            "created_at": row["created_at"],
            "replied_count": row["replied_count"],
        }
        for row in recent_campaigns
    ]

    return {
        "total_leads": total_leads,
        "leads_with_email": leads_with_email,
        "sent_today": sent_today,
        "reply_rate": reply_rate,
        "total_sent": total_sent,
        "total_replied": total_replied,
        "weekly_leads": weekly_data,
        "recent_campaigns": campaigns_list,
    }
