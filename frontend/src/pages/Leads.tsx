import { useEffect, useState, useCallback } from "react";
import { getLeads, updateLead, deleteLead, exportLeadsCsv, createLead, getNiches, type Lead } from "@/lib/api";
import { StatusBadge } from "@/components/StatusBadge";
import { truncate } from "@/lib/utils";
import { ExternalLink, Trash2, ChevronDown, Download, RefreshCw, UserPlus, X, Building2 } from "lucide-react";

const LEAD_STATUSES = ["new", "contacted", "replied", "converted", "removed"];

const filterInp: React.CSSProperties = {
  background: "var(--surface-3)",
  color: "var(--text-1)",
  border: "1px solid var(--border)",
  borderRadius: 7,
  padding: "7px 11px",
  fontSize: 12,
  fontFamily: "inherit",
  outline: "none",
};

function formatCnpj(cnpj?: string) {
  if (!cnpj || cnpj.length !== 14) return cnpj || "—";
  return `${cnpj.slice(0, 2)}.${cnpj.slice(2, 5)}.${cnpj.slice(5, 8)}/${cnpj.slice(8, 12)}-${cnpj.slice(12)}`;
}

export function Leads() {
  const [leads, setLeads] = useState<Lead[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [filterNiche, setFilterNiche] = useState("");
  const [filterMunicipio, setFilterMunicipio] = useState("");
  const [filterUF, setFilterUF] = useState("");
  const [filterStatus, setFilterStatus] = useState("");
  const [filterEmail, setFilterEmail] = useState("");
  const [editingStatus, setEditingStatus] = useState<number | null>(null);
  const [showAddLead, setShowAddLead] = useState(false);
  const [niches, setNiches] = useState<string[]>([]);

  useEffect(() => { getNiches().then(setNiches).catch(() => {}); }, []);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const res = await getLeads({
        niche: filterNiche || undefined,
        municipio: filterMunicipio || undefined,
        uf: filterUF || undefined,
        lead_status: filterStatus || undefined,
        email_status: filterEmail || undefined,
        limit: 200,
      });
      setLeads(res.leads); setTotal(res.total);
    } catch (e) { console.error(e); }
    finally { setLoading(false); }
  }, [filterNiche, filterMunicipio, filterUF, filterStatus, filterEmail]);

  useEffect(() => { load(); }, [load]);

  const handleStatusChange = async (id: number, lead_status: string) => {
    await updateLead(id, { lead_status: lead_status as Lead["lead_status"] });
    setEditingStatus(null);
    setLeads(prev => prev.map(l => l.id === id ? { ...l, lead_status: lead_status as Lead["lead_status"] } : l));
  };

  const handleDelete = async (id: number) => {
    if (!confirm("Remover este lead?")) return;
    await deleteLead(id);
    setLeads(prev => prev.filter(l => l.id !== id));
    getNiches().then(setNiches);
  };

  const handleExport = () => {
    exportLeadsCsv({
      niche: filterNiche || undefined,
      municipio: filterMunicipio || undefined,
      uf: filterUF || undefined,
      lead_status: filterStatus || undefined,
      email_status: filterEmail || undefined,
    });
  };

  const hasFilter = filterNiche || filterMunicipio || filterUF || filterStatus || filterEmail;

  return (
    <>
    {showAddLead && (
      <AddLeadModal
        niches={niches}
        onClose={() => setShowAddLead(false)}
        onCreated={() => { setShowAddLead(false); load(); getNiches().then(setNiches); }}
      />
    )}
    <div className="fade-in" style={{ padding: "28px" }}>
      {/* Header */}
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 24 }}>
        <div>
          <h1 style={{ fontSize: 20, fontWeight: 600, letterSpacing: "-0.4px", color: "var(--text-1)", lineHeight: 1.2 }}>
            Leads
          </h1>
          <p style={{ fontSize: 12, color: "var(--text-3)", marginTop: 3 }}>{total} leads no banco</p>
        </div>
        <div style={{ display: "flex", gap: 8 }}>
          <button
            onClick={load}
            style={{ display: "flex", alignItems: "center", gap: 6, background: "transparent", color: "var(--text-2)", border: "1px solid var(--border)", borderRadius: 8, padding: "7px 13px", fontSize: 12, cursor: "pointer", fontFamily: "inherit", transition: "all 100ms" }}
            onMouseEnter={e => { (e.currentTarget as HTMLButtonElement).style.color = "var(--green-bright)"; (e.currentTarget as HTMLButtonElement).style.borderColor = "rgba(74,222,128,0.25)"; }}
            onMouseLeave={e => { (e.currentTarget as HTMLButtonElement).style.color = "var(--text-2)"; (e.currentTarget as HTMLButtonElement).style.borderColor = "var(--border)"; }}
          >
            <RefreshCw size={12} /> Atualizar
          </button>
          <button
            onClick={() => setShowAddLead(true)}
            style={{ display: "flex", alignItems: "center", gap: 6, background: "transparent", color: "var(--text-2)", border: "1px solid var(--border)", borderRadius: 8, padding: "7px 13px", fontSize: 12, cursor: "pointer", fontFamily: "inherit", transition: "all 100ms" }}
            onMouseEnter={e => { (e.currentTarget as HTMLButtonElement).style.color = "var(--green-bright)"; (e.currentTarget as HTMLButtonElement).style.borderColor = "rgba(74,222,128,0.25)"; }}
            onMouseLeave={e => { (e.currentTarget as HTMLButtonElement).style.color = "var(--text-2)"; (e.currentTarget as HTMLButtonElement).style.borderColor = "var(--border)"; }}
          >
            <UserPlus size={12} /> Adicionar Lead
          </button>
          <button
            onClick={handleExport}
            style={{ display: "flex", alignItems: "center", gap: 6, background: "rgba(74,222,128,0.08)", color: "var(--green-bright)", border: "1px solid rgba(74,222,128,0.18)", borderRadius: 8, padding: "7px 13px", fontSize: 12, fontWeight: 500, cursor: "pointer", fontFamily: "inherit", transition: "background 100ms" }}
            onMouseEnter={e => { (e.currentTarget as HTMLButtonElement).style.background = "rgba(74,222,128,0.14)"; }}
            onMouseLeave={e => { (e.currentTarget as HTMLButtonElement).style.background = "rgba(74,222,128,0.08)"; }}
          >
            <Download size={12} /> Exportar CSV
          </button>
        </div>
      </div>

      {/* Filters */}
      <div style={{ background: "var(--surface-2)", border: "1px solid var(--border)", borderRadius: 10, padding: "12px 16px", marginBottom: 16, display: "flex", gap: 8, alignItems: "center", flexWrap: "wrap" }}>
        <select style={{ ...filterInp, width: 160 }} value={filterNiche} onChange={e => setFilterNiche(e.target.value)}>
          <option value="">Todos os nichos</option>
          {niches.map(n => <option key={n} value={n}>{n}</option>)}
        </select>
        <input
          style={{ ...filterInp, width: 150 }}
          placeholder="Filtrar por município..."
          value={filterMunicipio}
          onChange={e => setFilterMunicipio(e.target.value)}
          onFocus={e => { e.currentTarget.style.borderColor = "rgba(74,222,128,0.4)"; }}
          onBlur={e => { e.currentTarget.style.borderColor = "var(--border)"; }}
        />
        <input
          style={{ ...filterInp, width: 80, textTransform: "uppercase" }}
          placeholder="UF"
          value={filterUF}
          onChange={e => setFilterUF(e.target.value.toUpperCase())}
          maxLength={2}
          onFocus={e => { e.currentTarget.style.borderColor = "rgba(74,222,128,0.4)"; }}
          onBlur={e => { e.currentTarget.style.borderColor = "var(--border)"; }}
        />
        <select style={{ ...filterInp }} value={filterStatus} onChange={e => setFilterStatus(e.target.value)}>
          <option value="">Todos os status</option>
          {LEAD_STATUSES.map(s => <option key={s} value={s}>{s}</option>)}
        </select>
        <select style={{ ...filterInp }} value={filterEmail} onChange={e => setFilterEmail(e.target.value)}>
          <option value="">Todos os emails</option>
          <option value="found">Com email</option>
          <option value="not_found">Sem email</option>
        </select>
        {hasFilter && (
          <button
            onClick={() => { setFilterNiche(""); setFilterMunicipio(""); setFilterUF(""); setFilterStatus(""); setFilterEmail(""); }}
            style={{ background: "transparent", color: "var(--red)", border: "none", borderRadius: 7, padding: "7px 11px", fontSize: 12, cursor: "pointer", fontFamily: "inherit", transition: "background 100ms" }}
            onMouseEnter={e => { (e.currentTarget as HTMLButtonElement).style.background = "rgba(248,113,113,0.08)"; }}
            onMouseLeave={e => { (e.currentTarget as HTMLButtonElement).style.background = "transparent"; }}
          >
            Limpar filtros
          </button>
        )}
      </div>

      {/* Table */}
      <div style={{ background: "var(--surface-2)", border: "1px solid var(--border)", borderRadius: 12, boxShadow: "var(--shadow-1)", overflow: "hidden" }}>
        {loading ? (
          <div style={{ display: "flex", alignItems: "center", justifyContent: "center", height: 120, gap: 8, color: "var(--text-3)" }}>
            <div style={{ width: 14, height: 14, borderRadius: "50%", border: "2px solid var(--green-bright)", borderTopColor: "transparent" }} className="animate-spin" />
            Carregando leads...
          </div>
        ) : leads.length === 0 ? (
          <div style={{ textAlign: "center", padding: "64px 0", fontSize: 13, color: "var(--text-3)" }}>
            <Building2 size={32} style={{ color: "var(--text-4)", marginBottom: 12 }} />
            <div>Nenhum lead encontrado.</div>
            <div style={{ marginTop: 4, fontSize: 12 }}>Importe um CSV na página Importar ou ajuste os filtros.</div>
          </div>
        ) : (
          <div style={{ overflowX: "auto" }}>
            <table style={{ width: "100%", borderCollapse: "collapse" }}>
              <thead>
                <tr style={{ borderBottom: "1px solid var(--border)" }}>
                  {["Empresa", "CNPJ", "Município / UF", "Nicho", "Email", "Telefone", "Status", "Email Status", ""].map((h, i) => (
                    <th key={i} style={{ textAlign: "left", padding: "10px 16px", fontSize: 10, fontWeight: 600, letterSpacing: "0.08em", textTransform: "uppercase", color: "var(--text-3)", whiteSpace: "nowrap" }}>
                      {h}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {leads.map(lead => {
                  const displayName = lead.nome_fantasia || lead.razao_social || "—";
                  const subName = lead.nome_fantasia ? lead.razao_social : null;
                  return (
                    <tr
                      key={lead.id}
                      style={{ borderBottom: "1px solid var(--border-soft)", transition: "background 60ms" }}
                      onMouseEnter={e => { (e.currentTarget as HTMLTableRowElement).style.background = "var(--surface-3)"; }}
                      onMouseLeave={e => { (e.currentTarget as HTMLTableRowElement).style.background = "transparent"; }}
                    >
                      {/* Empresa */}
                      <td style={{ padding: "11px 16px", maxWidth: 220 }}>
                        <div style={{ fontSize: 13, fontWeight: 500, color: "var(--text-1)" }}>{truncate(displayName, 32)}</div>
                        {subName && (
                          <div style={{ fontSize: 11, color: "var(--text-4)", marginTop: 1 }}>{truncate(subName, 32)}</div>
                        )}
                        {lead.website && (
                          <a href={lead.website} target="_blank" rel="noopener noreferrer"
                            style={{ display: "flex", alignItems: "center", gap: 4, fontSize: 11, color: "var(--text-3)", textDecoration: "none", marginTop: 2, transition: "color 80ms" }}
                            onMouseEnter={e => { (e.currentTarget as HTMLAnchorElement).style.color = "var(--green-bright)"; }}
                            onMouseLeave={e => { (e.currentTarget as HTMLAnchorElement).style.color = "var(--text-3)"; }}>
                            <ExternalLink size={10} />
                            {truncate(lead.website.replace(/^https?:\/\/(www\.)?/, ""), 24)}
                          </a>
                        )}
                      </td>

                      {/* CNPJ */}
                      <td style={{ padding: "11px 16px", fontSize: 11, fontFamily: "monospace", color: "var(--text-3)", whiteSpace: "nowrap" }}>
                        {formatCnpj(lead.cnpj)}
                      </td>

                      {/* Município/UF */}
                      <td style={{ padding: "11px 16px", fontSize: 12, color: "var(--text-2)", whiteSpace: "nowrap" }}>
                        {lead.municipio
                          ? <>{lead.municipio}{lead.uf ? <span style={{ color: "var(--text-4)" }}> / {lead.uf}</span> : ""}</>
                          : <span style={{ color: "var(--text-4)" }}>—</span>}
                      </td>

                      {/* Nicho */}
                      <td style={{ padding: "11px 16px", fontSize: 12, color: "var(--text-2)" }}>
                        {lead.niche
                          ? <span style={{ background: "rgba(74,222,128,0.08)", color: "var(--green-bright)", border: "1px solid rgba(74,222,128,0.16)", borderRadius: 5, padding: "2px 8px", fontSize: 11, fontWeight: 500 }}>{lead.niche}</span>
                          : <span style={{ color: "var(--text-4)" }}>—</span>}
                      </td>

                      {/* Email */}
                      <td style={{ padding: "11px 16px", fontSize: 12, fontFamily: "monospace", color: "var(--text-2)", maxWidth: 260 }} title={lead.email ?? undefined}>
                        {lead.email ? truncate(lead.email, 52) : <span style={{ color: "var(--text-4)" }}>—</span>}
                      </td>

                      {/* Telefone */}
                      <td style={{ padding: "11px 16px", fontSize: 12, color: "var(--text-2)", whiteSpace: "nowrap" }}>
                        {lead.phone || <span style={{ color: "var(--text-4)" }}>—</span>}
                      </td>

                      {/* Status dropdown */}
                      <td style={{ padding: "11px 16px", position: "relative" }}>
                        <button
                          onClick={() => setEditingStatus(editingStatus === lead.id ? null : lead.id)}
                          style={{ display: "flex", alignItems: "center", gap: 4, background: "transparent", border: "none", cursor: "pointer", padding: 0, fontFamily: "inherit" }}
                        >
                          <StatusBadge status={lead.lead_status} />
                          <ChevronDown size={11} style={{ color: "var(--text-3)" }} />
                        </button>
                        {editingStatus === lead.id && (
                          <div style={{ position: "absolute", left: 12, top: 40, zIndex: 20, background: "var(--surface-4)", border: "1px solid var(--border-strong)", borderRadius: 8, padding: "4px", boxShadow: "var(--shadow-3)", minWidth: 130 }}>
                            {LEAD_STATUSES.map(s => (
                              <button
                                key={s}
                                onClick={() => handleStatusChange(lead.id, s)}
                                style={{ width: "100%", textAlign: "left", padding: "7px 10px", fontSize: 12, background: "transparent", border: "none", cursor: "pointer", color: "var(--text-1)", borderRadius: 5, fontFamily: "inherit", textTransform: "capitalize", transition: "background 60ms" }}
                                onMouseEnter={e => { (e.currentTarget as HTMLButtonElement).style.background = "var(--surface-5)"; }}
                                onMouseLeave={e => { (e.currentTarget as HTMLButtonElement).style.background = "transparent"; }}
                              >
                                {s}
                              </button>
                            ))}
                          </div>
                        )}
                      </td>

                      {/* Email Status */}
                      <td style={{ padding: "11px 16px" }}>
                        <StatusBadge status={lead.email_status ?? "pending"} type="email" />
                      </td>

                      {/* Delete */}
                      <td style={{ padding: "11px 16px" }}>
                        <button
                          onClick={() => handleDelete(lead.id)}
                          style={{ padding: "5px", borderRadius: 6, background: "transparent", border: "none", cursor: "pointer", color: "var(--text-3)", transition: "all 80ms" }}
                          onMouseEnter={e => { (e.currentTarget as HTMLButtonElement).style.background = "rgba(248,113,113,0.1)"; (e.currentTarget as HTMLButtonElement).style.color = "var(--red)"; }}
                          onMouseLeave={e => { (e.currentTarget as HTMLButtonElement).style.background = "transparent"; (e.currentTarget as HTMLButtonElement).style.color = "var(--text-3)"; }}
                        >
                          <Trash2 size={13} />
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
    </>
  );
}

// ── Add Lead Modal ────────────────────────────────────────────────────────────

function AddLeadModal({ niches, onClose, onCreated }: {
  niches: string[];
  onClose: () => void;
  onCreated: () => void;
}) {
  const [razaoSocial, setRazaoSocial] = useState("");
  const [nomeFantasia, setNomeFantasia] = useState("");
  const [cnpj, setCnpj] = useState("");
  const [email, setEmail] = useState("");
  const [website, setWebsite] = useState("");
  const [phone, setPhone] = useState("");
  const [municipio, setMunicipio] = useState("");
  const [uf, setUf] = useState("");
  const [niche, setNiche] = useState("");
  const [customNiche, setCustomNiche] = useState("");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  const inp: React.CSSProperties = {
    width: "100%", background: "var(--surface-3)", color: "var(--text-1)",
    border: "1px solid var(--border)", borderRadius: 8, padding: "8px 12px",
    fontSize: 13, fontFamily: "inherit", outline: "none",
  };
  const lbl: React.CSSProperties = {
    fontSize: 10, fontWeight: 600, letterSpacing: "0.08em",
    textTransform: "uppercase", color: "var(--text-3)", display: "block", marginBottom: 6,
  };
  const focus = (e: React.FocusEvent<HTMLInputElement | HTMLSelectElement>) => { e.currentTarget.style.borderColor = "rgba(74,222,128,0.5)"; };
  const blur = (e: React.FocusEvent<HTMLInputElement | HTMLSelectElement>) => { e.currentTarget.style.borderColor = "var(--border)"; };

  const handleSave = async () => {
    if (!razaoSocial.trim() && !nomeFantasia.trim()) { setError("Informe a Razão Social ou o Nome Fantasia."); return; }
    setSaving(true);
    try {
      const finalNiche = customNiche.trim() || niche || undefined;
      await createLead({
        cnpj: cnpj.trim() || undefined,
        razao_social: razaoSocial.trim() || undefined,
        nome_fantasia: nomeFantasia.trim() || undefined,
        email: email.trim() || undefined,
        website: website.trim() || undefined,
        phone: phone.trim() || undefined,
        municipio: municipio.trim() || undefined,
        uf: uf.trim().toUpperCase() || undefined,
        niche: finalNiche,
      });
      onCreated();
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : "Erro ao salvar");
      setSaving(false);
    }
  };

  return (
    <div style={{ position: "fixed", inset: 0, zIndex: 50, display: "flex", alignItems: "center", justifyContent: "center", background: "rgba(0,0,0,0.65)", backdropFilter: "blur(10px)" }}>
      <div style={{ width: "100%", maxWidth: 540, maxHeight: "90vh", overflowY: "auto", background: "var(--surface-2)", border: "1px solid var(--border-strong)", borderRadius: 14, boxShadow: "var(--shadow-3)" }}>
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "18px 24px", borderBottom: "1px solid var(--border)" }}>
          <h2 style={{ fontSize: 16, fontWeight: 600, color: "var(--text-1)" }}>Adicionar Lead</h2>
          <button onClick={onClose} style={{ background: "transparent", border: "none", cursor: "pointer", color: "var(--text-3)", padding: 4, borderRadius: 6 }}>
            <X size={18} />
          </button>
        </div>

        <div style={{ padding: "24px", display: "flex", flexDirection: "column", gap: 14 }}>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
            <div>
              <span style={lbl}>Razão Social</span>
              <input style={inp} type="text" value={razaoSocial} onChange={e => setRazaoSocial(e.target.value)} placeholder="Empresa LTDA" onFocus={focus} onBlur={blur} />
            </div>
            <div>
              <span style={lbl}>Nome Fantasia</span>
              <input style={inp} type="text" value={nomeFantasia} onChange={e => setNomeFantasia(e.target.value)} placeholder="Nome do negócio" onFocus={focus} onBlur={blur} />
            </div>
          </div>

          <div>
            <span style={lbl}>CNPJ</span>
            <input style={inp} type="text" value={cnpj} onChange={e => setCnpj(e.target.value)} placeholder="00.000.000/0000-00" onFocus={focus} onBlur={blur} />
          </div>

          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
            <div>
              <span style={lbl}>Email</span>
              <input style={inp} type="email" value={email} onChange={e => setEmail(e.target.value)} placeholder="contato@empresa.com.br" onFocus={focus} onBlur={blur} />
            </div>
            <div>
              <span style={lbl}>Telefone</span>
              <input style={inp} type="text" value={phone} onChange={e => setPhone(e.target.value)} placeholder="(11) 99999-9999" onFocus={focus} onBlur={blur} />
            </div>
          </div>

          <div>
            <span style={lbl}>Website</span>
            <input style={inp} type="text" value={website} onChange={e => setWebsite(e.target.value)} placeholder="https://empresa.com.br" onFocus={focus} onBlur={blur} />
          </div>

          <div style={{ display: "grid", gridTemplateColumns: "2fr 1fr", gap: 12 }}>
            <div>
              <span style={lbl}>Município</span>
              <input style={inp} type="text" value={municipio} onChange={e => setMunicipio(e.target.value)} placeholder="São Paulo" onFocus={focus} onBlur={blur} />
            </div>
            <div>
              <span style={lbl}>UF</span>
              <input style={inp} type="text" value={uf} onChange={e => setUf(e.target.value.toUpperCase())} placeholder="SP" maxLength={2} onFocus={focus} onBlur={blur} />
            </div>
          </div>

          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
            <div>
              <span style={lbl}>Nicho existente</span>
              <select style={inp} value={niche} onChange={e => setNiche(e.target.value)} onFocus={focus} onBlur={blur}>
                <option value="">Selecionar nicho...</option>
                {niches.map(n => <option key={n} value={n}>{n}</option>)}
              </select>
            </div>
            <div>
              <span style={lbl}>Ou novo nicho</span>
              <input style={inp} type="text" value={customNiche} onChange={e => setCustomNiche(e.target.value)} placeholder="ex: Academia" onFocus={focus} onBlur={blur} />
            </div>
          </div>

          {error && (
            <div style={{ padding: "10px 12px", borderRadius: 8, background: "rgba(248,113,113,0.08)", border: "1px solid rgba(248,113,113,0.2)", color: "var(--red)", fontSize: 12 }}>
              {error}
            </div>
          )}
        </div>

        <div style={{ display: "flex", justifyContent: "flex-end", gap: 10, padding: "16px 24px", borderTop: "1px solid var(--border)" }}>
          <button onClick={onClose} style={{ background: "transparent", color: "var(--text-2)", border: "1px solid var(--border)", borderRadius: 8, padding: "8px 14px", fontSize: 13, cursor: "pointer", fontFamily: "inherit" }}>
            Cancelar
          </button>
          <button
            onClick={handleSave}
            disabled={saving}
            style={{ display: "flex", alignItems: "center", gap: 7, background: "var(--green-mid)", color: "#050a05", border: "none", borderRadius: 8, padding: "8px 16px", fontSize: 13, fontWeight: 600, cursor: "pointer", fontFamily: "inherit", opacity: saving ? 0.6 : 1 }}
            onMouseEnter={e => { if (!saving) (e.currentTarget as HTMLButtonElement).style.background = "#4ade80"; }}
            onMouseLeave={e => { (e.currentTarget as HTMLButtonElement).style.background = "var(--green-mid)"; }}
          >
            {saving ? "Salvando..." : "Adicionar Lead"}
          </button>
        </div>
      </div>
    </div>
  );
}
