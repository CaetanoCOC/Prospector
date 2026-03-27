import { useEffect, useState } from "react";
import { getStats, type Stats } from "@/lib/api";
import { formatDate } from "@/lib/utils";
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from "recharts";
import { Users, Mail, Send, TrendingUp } from "lucide-react";

function Stat({
  label, value, sub, icon: Icon, progress, delay,
}: {
  label: string; value: string | number; sub?: string;
  icon: React.ElementType; progress?: number; delay: number;
}) {
  return (
    <div
      className={`fade-in fade-in-${delay}`}
      style={{
        background: "var(--surface-2)",
        border: "1px solid var(--border)",
        borderRadius: 12,
        padding: "18px 20px",
        display: "flex",
        flexDirection: "column",
        gap: 14,
        boxShadow: "var(--shadow-1)",
        cursor: "default",
        transition: "box-shadow 150ms, border-color 150ms",
      }}
      onMouseEnter={e => {
        const el = e.currentTarget as HTMLDivElement;
        el.style.boxShadow = "var(--shadow-2), 0 0 0 1px rgba(74,222,128,0.16)";
        el.style.borderColor = "rgba(74,222,128,0.16)";
      }}
      onMouseLeave={e => {
        const el = e.currentTarget as HTMLDivElement;
        el.style.boxShadow = "var(--shadow-1)";
        el.style.borderColor = "var(--border)";
      }}
    >
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
        <span style={{ fontSize: 10, fontWeight: 600, letterSpacing: "0.08em", textTransform: "uppercase", color: "var(--text-3)" }}>
          {label}
        </span>
        <div style={{
          width: 28, height: 28, borderRadius: 8,
          background: "var(--green-subtle)",
          border: "1px solid rgba(74,222,128,0.1)",
          display: "flex", alignItems: "center", justifyContent: "center",
        }}>
          <Icon size={13} color="var(--green-bright)" />
        </div>
      </div>

      <div>
        <div className="num-glow" style={{ fontSize: 30, fontWeight: 600, letterSpacing: "-1px", color: "var(--green-bright)", lineHeight: 1 }}>
          {value}
        </div>
        {sub && <div style={{ fontSize: 11, color: "var(--text-3)", marginTop: 6 }}>{sub}</div>}
      </div>

      {progress !== undefined && (
        <div style={{ height: 3, borderRadius: 9999, overflow: "hidden", background: "rgba(255,255,255,0.05)" }}>
          <div className="progress-shine" style={{ width: `${Math.min(progress, 100)}%`, height: "100%", borderRadius: 9999 }} />
        </div>
      )}
    </div>
  );
}

const Tip = ({ active, payload, label }: { active?: boolean; payload?: { value: number }[]; label?: string }) => {
  if (!active || !payload?.length) return null;
  return (
    <div style={{
      background: "var(--surface-4)",
      border: "1px solid var(--border-strong)",
      borderRadius: 8,
      padding: "8px 12px",
      boxShadow: "var(--shadow-3)",
    }}>
      <div style={{ fontSize: 10, color: "var(--text-3)", marginBottom: 4 }}>{label}</div>
      <div style={{ fontSize: 13, fontWeight: 600, color: "var(--green-bright)" }}>{payload[0].value} leads</div>
    </div>
  );
};

export function Dashboard() {
  const [stats, setStats] = useState<Stats | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    getStats()
      .then(setStats)
      .catch(console.error)
      .finally(() => setLoading(false));
  }, []);

  if (loading) return (
    <div style={{ display: "flex", alignItems: "center", justifyContent: "center", height: 240, gap: 8, color: "var(--text-3)" }}>
      <div style={{ width: 16, height: 16, borderRadius: "50%", border: "2px solid var(--green-bright)", borderTopColor: "transparent" }} className="animate-spin" />
      Loading...
    </div>
  );

  const emailPct = stats && stats.total_leads > 0
    ? Math.round((stats.leads_with_email / stats.total_leads) * 100) : 0;

  return (
    <div className="fade-in" style={{ padding: "28px 28px", maxWidth: 1100 }}>
      {/* Header */}
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 24 }}>
        <div>
          <h1 style={{ fontSize: 20, fontWeight: 600, letterSpacing: "-0.4px", color: "var(--text-1)", lineHeight: 1.2 }}>
            Overview
          </h1>
          <p style={{ fontSize: 12, color: "var(--text-3)", marginTop: 3 }}>
            Lead generation performance
          </p>
        </div>

      </div>

      {/* Stats */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(4,1fr)", gap: 12, marginBottom: 20 }}>
        <Stat label="Total Leads" value={stats?.total_leads ?? 0} icon={Users} sub="in database" delay={1} />
        <Stat label="With Email" value={stats?.leads_with_email ?? 0} sub={`${emailPct}% coverage`} icon={Mail} progress={emailPct} delay={2} />
        <Stat label="Sent Today" value={stats?.sent_today ?? 0} sub="via Gmail API" icon={Send} delay={3} />
        <Stat label="Reply Rate" value={`${stats?.reply_rate ?? 0}%`} sub={`${stats?.total_replied ?? 0} of ${stats?.total_sent ?? 0}`} icon={TrendingUp} progress={stats?.reply_rate ?? 0} delay={4} />
      </div>

      {/* Chart + Campaigns */}
      <div style={{ display: "grid", gridTemplateColumns: "3fr 2fr", gap: 16 }}>
        <div style={{ background: "var(--surface-2)", border: "1px solid var(--border)", borderRadius: 12, padding: "20px 20px", boxShadow: "var(--shadow-1)" }}>
          <div style={{ display: "flex", alignItems: "flex-end", justifyContent: "space-between", marginBottom: 20 }}>
            <div>
              <div style={{ fontSize: 13, fontWeight: 600, color: "var(--text-1)" }}>Weekly leads</div>
              <div style={{ fontSize: 11, color: "var(--text-3)", marginTop: 2 }}>Past 8 weeks</div>
            </div>
            <span style={{ fontSize: 11, color: "var(--green-bright)", fontWeight: 500 }}>
              {(stats?.weekly_leads ?? []).reduce((a, b) => a + b.leads, 0)} collected
            </span>
          </div>
          <ResponsiveContainer width="100%" height={180}>
            <AreaChart data={stats?.weekly_leads ?? []} margin={{ top: 4, right: 4, left: -22, bottom: 0 }}>
              <defs>
                <linearGradient id="g" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="#4ade80" stopOpacity={0.16} />
                  <stop offset="100%" stopColor="#4ade80" stopOpacity={0} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.03)" vertical={false} />
              <XAxis dataKey="week" tick={{ fontSize: 10, fill: "rgba(255,255,255,0.25)" }} axisLine={false} tickLine={false} />
              <YAxis tick={{ fontSize: 10, fill: "rgba(255,255,255,0.25)" }} axisLine={false} tickLine={false} />
              <Tooltip content={<Tip />} cursor={{ stroke: "rgba(74,222,128,0.1)", strokeWidth: 1 }} />
              <Area type="monotone" dataKey="leads" stroke="#4ade80" strokeWidth={1.5} fill="url(#g)" dot={false} activeDot={{ r: 3, fill: "#4ade80", strokeWidth: 0 }} />
            </AreaChart>
          </ResponsiveContainer>
        </div>

        <div style={{ background: "var(--surface-2)", border: "1px solid var(--border)", borderRadius: 12, padding: "20px 20px", boxShadow: "var(--shadow-1)", display: "flex", flexDirection: "column" }}>
          <div style={{ fontSize: 13, fontWeight: 600, color: "var(--text-1)", marginBottom: 16 }}>Recent campaigns</div>
          {!stats?.recent_campaigns?.length ? (
            <div style={{ flex: 1, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 12, color: "var(--text-3)" }}>
              No campaigns yet
            </div>
          ) : (
            <div style={{ display: "flex", flexDirection: "column" }}>
              {stats.recent_campaigns.map((c, i) => (
                <div key={c.id} style={{
                  display: "flex", alignItems: "center", justifyContent: "space-between",
                  padding: "10px 0",
                  borderTop: i > 0 ? "1px solid var(--border-soft)" : "none",
                }}>
                  <div style={{ minWidth: 0, flex: 1, paddingRight: 12 }}>
                    <div style={{ fontSize: 12, fontWeight: 500, color: "var(--text-1)", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{c.name}</div>
                    <div style={{ fontSize: 10, color: "var(--text-3)", marginTop: 2 }}>{formatDate(c.created_at)} · {c.niche}</div>
                  </div>
                  <div style={{ textAlign: "right", flexShrink: 0 }}>
                    <div style={{ fontSize: 17, fontWeight: 600, color: "var(--green-bright)", lineHeight: 1 }}>{c.total_sent}</div>
                    <div style={{ fontSize: 10, color: "var(--text-3)", marginTop: 2 }}>sent</div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
