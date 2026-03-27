import { useEffect, useState } from "react";
import {
  getCampaigns, getCampaignLogs, createCampaign, markReply, deleteCampaign,
  getTemplates, getLeads, getNiches,
  type Campaign, type EmailLog, type Template, type Lead,
} from "@/lib/api";
import { formatDate } from "@/lib/utils";
import { Send, ChevronDown, ChevronUp, CheckCircle2, Loader2, X, Plus, Trash2 } from "lucide-react";

const inp: React.CSSProperties = {
  width: "100%",
  background: "var(--surface-3)",
  color: "var(--text-1)",
  border: "1px solid var(--border)",
  borderRadius: 8,
  padding: "8px 12px",
  fontSize: 13,
  fontFamily: "inherit",
  outline: "none",
  transition: "border-color 120ms",
};

const lbl: React.CSSProperties = {
  fontSize: 10,
  fontWeight: 600,
  letterSpacing: "0.08em",
  textTransform: "uppercase",
  color: "var(--text-3)",
  display: "block",
  marginBottom: 6,
};

export function Campaigns() {
  const [campaigns, setCampaigns] = useState<Campaign[]>([]);
  const [expanded, setExpanded] = useState<number | null>(null);
  const [logs, setLogs] = useState<Record<number, EmailLog[]>>({});
  const [loading, setLoading] = useState(true);
  const [showNew, setShowNew] = useState(false);

  const load = async () => {
    setLoading(true);
    const data = await getCampaigns();
    setCampaigns(data);
    setLoading(false);
  };

  useEffect(() => { load(); }, []);

  const toggleExpand = async (id: number) => {
    if (expanded === id) { setExpanded(null); return; }
    setExpanded(id);
    if (!logs[id]) {
      const data = await getCampaignLogs(id);
      setLogs(prev => ({ ...prev, [id]: data }));
    }
  };

  const handleDelete = async (id: number) => {
    if (!confirm("Deletar esta campanha e todos os seus registros de envio?")) return;
    await deleteCampaign(id);
    setCampaigns(prev => prev.filter(c => c.id !== id));
    if (expanded === id) setExpanded(null);
  };

  const handleToggleReply = async (campaignId: number, leadId: number, replied: boolean) => {
    await markReply(campaignId, leadId, !replied);
    setLogs(prev => ({
      ...prev,
      [campaignId]: prev[campaignId].map(l => l.lead_id === leadId ? { ...l, replied: replied ? 0 : 1 } : l),
    }));
    setCampaigns(prev =>
      prev.map(c => c.id === campaignId ? { ...c, replied_count: (c.replied_count ?? 0) + (replied ? -1 : 1) } : c)
    );
  };

  return (
    <>
    {showNew && (
      <NewCampaignModal onClose={() => setShowNew(false)} onCreated={() => { setShowNew(false); load(); }} />
    )}
    <div className="fade-in" style={{ padding: "28px", maxWidth: 900 }}>
      {/* Header */}
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 24 }}>
        <div>
          <h1 style={{ fontSize: 20, fontWeight: 600, letterSpacing: "-0.4px", color: "var(--text-1)", lineHeight: 1.2 }}>
            Campanhas
          </h1>
          <p style={{ fontSize: 12, color: "var(--text-3)", marginTop: 3 }}>
            Emails disparados via Gmail API
          </p>
        </div>
        <button
          onClick={() => setShowNew(true)}
          style={{
            display: "flex", alignItems: "center", gap: 7,
            background: "var(--green-mid)", color: "#050a05",
            border: "none", borderRadius: 8, padding: "9px 16px",
            fontSize: 13, fontWeight: 600, cursor: "pointer", fontFamily: "inherit",
            transition: "background 120ms",
          }}
          onMouseEnter={e => { (e.currentTarget as HTMLButtonElement).style.background = "#4ade80"; }}
          onMouseLeave={e => { (e.currentTarget as HTMLButtonElement).style.background = "var(--green-mid)"; }}
        >
          <Plus size={14} /> Nova Campanha
        </button>
      </div>

      {loading ? (
        <div style={{ display: "flex", alignItems: "center", justifyContent: "center", height: 120, gap: 8, color: "var(--text-3)" }}>
          <div style={{ width: 14, height: 14, borderRadius: "50%", border: "2px solid var(--green-bright)", borderTopColor: "transparent" }} className="animate-spin" />
          Carregando...
        </div>
      ) : campaigns.length === 0 ? (
        <div style={{ background: "var(--surface-2)", border: "1px solid var(--border)", borderRadius: 12, padding: "64px 0", textAlign: "center", fontSize: 13, color: "var(--text-3)" }}>
          Nenhuma campanha ainda. Crie sua primeira campanha para começar a enviar.
        </div>
      ) : (
        <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
          {campaigns.map(c => (
            <div
              key={c.id}
              style={{ background: "var(--surface-2)", border: "1px solid var(--border)", borderRadius: 12, boxShadow: "var(--shadow-1)", overflow: "hidden" }}
            >
              {/* Row */}
              <button
                onClick={() => toggleExpand(c.id)}
                style={{
                  width: "100%", display: "flex", alignItems: "center", justifyContent: "space-between",
                  padding: "16px 20px", background: "transparent", border: "none", cursor: "pointer",
                  textAlign: "left", fontFamily: "inherit", transition: "background 80ms",
                }}
                onMouseEnter={e => { (e.currentTarget as HTMLButtonElement).style.background = "var(--surface-3)"; }}
                onMouseLeave={e => { (e.currentTarget as HTMLButtonElement).style.background = "transparent"; }}
              >
                <div style={{ display: "flex", alignItems: "center", gap: 14 }}>
                  <div style={{ width: 36, height: 36, borderRadius: 9, background: "rgba(74,222,128,0.08)", border: "1px solid rgba(74,222,128,0.12)", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
                    <Send size={15} style={{ color: "var(--green-bright)" }} />
                  </div>
                  <div>
                    <div style={{ fontSize: 14, fontWeight: 600, color: "var(--text-1)" }}>{c.name}</div>
                    <div style={{ fontSize: 11, color: "var(--text-3)", marginTop: 2 }}>
                      {formatDate(c.created_at)} · {c.niche} · {c.template_name}
                    </div>
                  </div>
                </div>

                <div style={{ display: "flex", alignItems: "center", gap: 16 }}>
                  <div style={{ textAlign: "right" }}>
                    <div style={{ fontSize: 20, fontWeight: 600, color: "var(--green-bright)", lineHeight: 1 }}>{c.total_sent}</div>
                    <div style={{ fontSize: 10, color: "var(--text-3)", marginTop: 2 }}>enviados</div>
                  </div>
                  <div style={{ textAlign: "right" }}>
                    <div style={{ fontSize: 20, fontWeight: 600, color: "var(--text-1)", lineHeight: 1 }}>{c.replied_count ?? 0}</div>
                    <div style={{ fontSize: 10, color: "var(--text-3)", marginTop: 2 }}>respostas</div>
                  </div>
                  <button
                    onClick={e => { e.stopPropagation(); handleDelete(c.id); }}
                    style={{ padding: 6, borderRadius: 7, background: "transparent", border: "none", cursor: "pointer", color: "var(--text-3)", transition: "all 80ms", flexShrink: 0 }}
                    onMouseEnter={e => { (e.currentTarget as HTMLButtonElement).style.background = "rgba(248,113,113,0.1)"; (e.currentTarget as HTMLButtonElement).style.color = "var(--red)"; }}
                    onMouseLeave={e => { (e.currentTarget as HTMLButtonElement).style.background = "transparent"; (e.currentTarget as HTMLButtonElement).style.color = "var(--text-3)"; }}
                    title="Deletar campanha"
                  >
                    <Trash2 size={14} />
                  </button>
                  {expanded === c.id
                    ? <ChevronUp size={15} style={{ color: "var(--text-3)" }} />
                    : <ChevronDown size={15} style={{ color: "var(--text-3)" }} />}
                </div>
              </button>

              {/* Logs */}
              {expanded === c.id && (
                <div style={{ borderTop: "1px solid var(--border)" }}>
                  {!logs[c.id] ? (
                    <div style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: 8, padding: "24px 0", fontSize: 13, color: "var(--text-3)" }}>
                      <Loader2 size={14} className="animate-spin" /> Carregando...
                    </div>
                  ) : logs[c.id].length === 0 ? (
                    <div style={{ padding: "24px 0", textAlign: "center", fontSize: 13, color: "var(--text-3)" }}>
                      Nenhum email registrado.
                    </div>
                  ) : (
                    <table style={{ width: "100%", borderCollapse: "collapse" }}>
                      <thead>
                        <tr style={{ borderBottom: "1px solid var(--border)" }}>
                          {["Empresa", "Email", "Município/UF", "Status", "Respondeu?"].map(h => (
                            <th key={h} style={{ textAlign: "left", padding: "10px 20px", fontSize: 10, fontWeight: 600, letterSpacing: "0.08em", textTransform: "uppercase", color: "var(--text-3)" }}>
                              {h}
                            </th>
                          ))}
                        </tr>
                      </thead>
                      <tbody>
                        {logs[c.id].map(log => (
                          <tr
                            key={log.id}
                            style={{ borderBottom: "1px solid var(--border-soft)", transition: "background 60ms" }}
                            onMouseEnter={e => { (e.currentTarget as HTMLTableRowElement).style.background = "var(--surface-3)"; }}
                            onMouseLeave={e => { (e.currentTarget as HTMLTableRowElement).style.background = "transparent"; }}
                          >
                            <td style={{ padding: "11px 20px", fontSize: 13, fontWeight: 500, color: "var(--text-1)" }}>{log.lead_name}</td>
                            <td style={{ padding: "11px 20px", fontSize: 12, fontFamily: "monospace", color: "var(--text-2)" }}>{log.lead_email}</td>
                            <td style={{ padding: "11px 20px", fontSize: 13, color: "var(--text-2)" }}>
                              {log.municipio}{log.uf ? ` / ${log.uf}` : ""}
                            </td>
                            <td style={{ padding: "11px 20px" }}>
                              <span style={{
                                fontSize: 11, fontWeight: 500, padding: "3px 8px", borderRadius: 5,
                                ...(log.status === "sent"
                                  ? { background: "rgba(74,222,128,0.1)", color: "var(--green-bright)", border: "1px solid rgba(74,222,128,0.18)" }
                                  : { background: "rgba(248,113,113,0.1)", color: "var(--red)", border: "1px solid rgba(248,113,113,0.18)" }),
                              }}>
                                {log.status}
                              </span>
                            </td>
                            <td style={{ padding: "11px 20px" }}>
                              <button
                                onClick={() => handleToggleReply(c.id, log.lead_id, !!log.replied)}
                                style={{
                                  display: "flex", alignItems: "center", gap: 5,
                                  padding: "5px 10px", borderRadius: 6, fontSize: 12, fontWeight: 500,
                                  cursor: "pointer", fontFamily: "inherit", transition: "all 80ms", border: "1px solid",
                                  ...(log.replied
                                    ? { background: "rgba(251,191,36,0.1)", color: "var(--amber)", borderColor: "rgba(251,191,36,0.2)" }
                                    : { background: "var(--surface-4)", color: "var(--text-2)", borderColor: "var(--border)" }),
                                }}
                              >
                                {log.replied ? <><CheckCircle2 size={11} /> Respondeu</> : "Marcar respondeu"}
                              </button>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  )}
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
    </>
  );
}

// ── Modal ─────────────────────────────────────────────────────────────────────

function NewCampaignModal({ onClose, onCreated }: { onClose: () => void; onCreated: () => void }) {
  const [name, setName] = useState("");
  const [templateId, setTemplateId] = useState<number | null>(null);
  const [templates, setTemplates] = useState<Template[]>([]);
  const [leads, setLeads] = useState<Lead[]>([]);
  const [niches, setNiches] = useState<string[]>([]);
  const [filterNiche, setFilterNiche] = useState("");
  const [maxSend, setMaxSend] = useState(50);
  const [preview, setPreview] = useState<Template | null>(null);
  const [sending, setSending] = useState(false);
  const [result, setResult] = useState<string | null>(null);
  const [inCooldown, setInCooldown] = useState(0);

  useEffect(() => {
    getTemplates().then(setTemplates);
    getNiches().then(setNiches).catch(() => {});
  }, []);

  // Reload leads whenever niche changes — only leads with email AND not in cooldown
  useEffect(() => {
    getLeads({ has_email: true, available_for_campaign: true, niche: filterNiche || undefined, limit: 500 })
      .then(r => { setLeads(r.leads); setInCooldown(r.in_cooldown); })
      .catch(() => {});
  }, [filterNiche]);

  const filteredLeads = leads.slice(0, maxSend);
  const selectedTemplate = templates.find(t => t.id === templateId) ?? null;

  const handleSend = async () => {
    if (!name || !templateId || filteredLeads.length === 0) return;
    setSending(true);
    try {
      const res = await createCampaign({ name, niche: filterNiche || undefined, template_id: templateId, lead_ids: filteredLeads.map(l => l.id) });
      setResult(res.message);
      setTimeout(onCreated, 1500);
    } catch (e: unknown) {
      setResult(`Erro: ${e instanceof Error ? e.message : "Unknown error"}`);
      setSending(false);
    }
  };

  return (
    <div style={{ position: "fixed", inset: 0, zIndex: 50, display: "flex", alignItems: "center", justifyContent: "center", background: "rgba(0,0,0,0.65)", backdropFilter: "blur(10px)" }}>
      <div style={{ width: "100%", maxWidth: 580, maxHeight: "90vh", overflowY: "auto", background: "var(--surface-2)", border: "1px solid var(--border-strong)", borderRadius: 14, boxShadow: "var(--shadow-3)" }}>
        {/* Header */}
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "18px 24px", borderBottom: "1px solid var(--border)" }}>
          <h2 style={{ fontSize: 16, fontWeight: 600, color: "var(--text-1)" }}>Nova Campanha</h2>
          <button
            onClick={onClose}
            style={{ background: "transparent", border: "none", cursor: "pointer", color: "var(--text-3)", padding: 4, borderRadius: 6, transition: "all 80ms" }}
            onMouseEnter={e => { (e.currentTarget as HTMLButtonElement).style.background = "var(--surface-4)"; (e.currentTarget as HTMLButtonElement).style.color = "var(--text-1)"; }}
            onMouseLeave={e => { (e.currentTarget as HTMLButtonElement).style.background = "transparent"; (e.currentTarget as HTMLButtonElement).style.color = "var(--text-3)"; }}
          >
            <X size={18} />
          </button>
        </div>

        <div style={{ padding: "24px", display: "flex", flexDirection: "column", gap: 18 }}>
          <div>
            <span style={lbl}>Nome da campanha</span>
            <input style={inp} type="text" value={name} onChange={e => setName(e.target.value)}
              placeholder="ex: Barbershops Miami - Março"
              onFocus={e => { e.currentTarget.style.borderColor = "rgba(74,222,128,0.5)"; }}
              onBlur={e => { e.currentTarget.style.borderColor = "var(--border)"; }} />
          </div>

          <div>
            <span style={lbl}>Template de email</span>
            <select style={inp} value={templateId ?? ""} onChange={e => setTemplateId(Number(e.target.value) || null)}>
              <option value="">Selecionar template...</option>
              {templates.map(t => <option key={t.id} value={t.id}>{t.name}</option>)}
            </select>
            {selectedTemplate && (
              <button
                onClick={() => setPreview(preview ? null : selectedTemplate)}
                style={{ marginTop: 6, fontSize: 12, color: "var(--green-bright)", background: "transparent", border: "none", cursor: "pointer", padding: 0, fontFamily: "inherit" }}
              >
                {preview ? "Esconder preview" : "Ver preview"}
              </button>
            )}
            {preview && (
              <div style={{ marginTop: 10, borderRadius: 8, overflow: "hidden", border: "1px solid var(--border)", height: 260, position: "relative" }}>
                <iframe key={preview.id} srcDoc={preview.html_body} style={{ width: "100%", height: "100%", background: "white", display: "block", border: "none" }} title="Preview" sandbox="allow-same-origin allow-scripts" />
              </div>
            )}
          </div>

          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 14 }}>
            <div>
              <span style={lbl}>Nicho alvo</span>
              <select style={inp} value={filterNiche} onChange={e => setFilterNiche(e.target.value)}>
                <option value="">Todos os nichos</option>
                {niches.map(n => <option key={n} value={n}>{n}</option>)}
              </select>
            </div>
            <div>
              <span style={lbl}>Máx a enviar: <span style={{ color: "var(--green-bright)", fontWeight: 700 }}>{maxSend}</span></span>
              <input type="range" min={1} max={50} value={maxSend} onChange={e => setMaxSend(Number(e.target.value))} style={{ width: "100%", marginTop: 8 }} />
            </div>
          </div>

          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "12px 14px", borderRadius: 8, background: "var(--surface-3)", border: "1px solid var(--border)", fontSize: 13 }}>
            <span style={{ color: "var(--text-2)" }}>
              <span style={{ fontWeight: 600, color: "var(--green-bright)" }}>{filteredLeads.length}</span> leads receberão este email
              {filteredLeads.length === 0 && <span style={{ color: "var(--red)", marginLeft: 8 }}>· Sem leads disponíveis</span>}
            </span>
            {inCooldown > 0 && (
              <span style={{ display: "flex", alignItems: "center", gap: 5, fontSize: 11, fontWeight: 500, color: "#f59e0b", background: "rgba(245,158,11,0.08)", border: "1px solid rgba(245,158,11,0.2)", borderRadius: 6, padding: "3px 9px" }}>
                <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/></svg>
                {inCooldown} em cooldown (30 dias)
              </span>
            )}
          </div>

          {result && (
            <div style={{
              padding: "12px 14px", borderRadius: 8, fontSize: 13, fontWeight: 500,
              ...(result.startsWith("Erro")
                ? { background: "rgba(248,113,113,0.08)", color: "var(--red)", border: "1px solid rgba(248,113,113,0.2)" }
                : { background: "rgba(74,222,128,0.08)", color: "var(--green-bright)", border: "1px solid rgba(74,222,128,0.2)" }),
            }}>
              {result}
            </div>
          )}
        </div>

        {/* Footer */}
        <div style={{ display: "flex", alignItems: "center", justifyContent: "flex-end", gap: 10, padding: "16px 24px", borderTop: "1px solid var(--border)" }}>
          <button
            onClick={onClose}
            style={{ background: "transparent", color: "var(--text-2)", border: "1px solid var(--border)", borderRadius: 8, padding: "8px 14px", fontSize: 13, cursor: "pointer", fontFamily: "inherit", transition: "all 80ms" }}
            onMouseEnter={e => { (e.currentTarget as HTMLButtonElement).style.background = "var(--surface-4)"; (e.currentTarget as HTMLButtonElement).style.color = "var(--text-1)"; }}
            onMouseLeave={e => { (e.currentTarget as HTMLButtonElement).style.background = "transparent"; (e.currentTarget as HTMLButtonElement).style.color = "var(--text-2)"; }}
          >
            Cancelar
          </button>
          <button
            onClick={handleSend}
            disabled={sending || !name || !templateId || filteredLeads.length === 0}
            style={{
              display: "flex", alignItems: "center", gap: 7,
              background: "var(--green-mid)", color: "#050a05",
              border: "none", borderRadius: 8, padding: "8px 16px",
              fontSize: 13, fontWeight: 600, cursor: "pointer", fontFamily: "inherit",
              opacity: (sending || !name || !templateId || filteredLeads.length === 0) ? 0.4 : 1,
              transition: "background 120ms",
            }}
            onMouseEnter={e => { if (!sending) (e.currentTarget as HTMLButtonElement).style.background = "#4ade80"; }}
            onMouseLeave={e => { (e.currentTarget as HTMLButtonElement).style.background = "var(--green-mid)"; }}
          >
            {sending ? <><Loader2 size={13} className="animate-spin" /> Enviando...</> : <><Send size={13} /> Enviar {filteredLeads.length} emails</>}
          </button>
        </div>
      </div>
    </div>
  );
}
