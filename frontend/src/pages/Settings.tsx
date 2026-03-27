import { useEffect, useState } from "react";
import {
  getSettings, saveSettings, gmailStatus, gmailAuth, gmailDisconnect,
  sendTestEmail, getTemplates, type Settings, type Template,
} from "@/lib/api";
import { CheckCircle2, XCircle, Loader2, Link2, Link2Off, Send } from "lucide-react";

const sectionStyle: React.CSSProperties = {
  background: "var(--surface-2)",
  border: "1px solid var(--border)",
  borderRadius: 12,
  padding: "24px",
  marginBottom: 16,
  boxShadow: "var(--shadow-1)",
};

const sectionTitle: React.CSSProperties = {
  fontSize: 10,
  fontWeight: 600,
  letterSpacing: "0.08em",
  textTransform: "uppercase",
  color: "var(--text-3)",
  marginBottom: 20,
  paddingBottom: 12,
  borderBottom: "1px solid var(--border)",
};

const labelStyle: React.CSSProperties = {
  fontSize: 10,
  fontWeight: 600,
  letterSpacing: "0.08em",
  textTransform: "uppercase",
  color: "var(--text-3)",
  display: "block",
  marginBottom: 6,
};

const inpStyle: React.CSSProperties = {
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

export function SettingsPage() {
  const [settings, setSettings] = useState<Settings | null>(null);
  const [maxEmails, setMaxEmails] = useState(50);
  const [gmail, setGmail] = useState<{ connected: boolean; email: string | null } | null>(null);
  const [templates, setTemplates] = useState<Template[]>([]);
  const [testEmail, setTestEmail] = useState("");
  const [testTemplateId, setTestTemplateId] = useState<number | "">("");
  const [loading, setLoading] = useState(true);
  const [gmailLoading, setGmailLoading] = useState(false);
  const [testLoading, setTestLoading] = useState(false);
  const [saved, setSaved] = useState(false);
  const [testResult, setTestResult] = useState<{ ok: boolean; msg: string } | null>(null);

  const load = async () => {
    setLoading(true);
    const [s, g, t] = await Promise.all([getSettings(), gmailStatus(), getTemplates()]);
    setSettings(s);
    setMaxEmails(s.max_emails_per_day);
    setGmail(g);
    setTemplates(t);
    if (t.length > 0) setTestTemplateId(t[0].id);
    setLoading(false);
  };

  useEffect(() => { load(); }, []);
  void settings;

  const handleConnectGmail = async () => {
    setGmailLoading(true);
    try {
      const res = await gmailAuth();
      setGmail({ connected: true, email: res.email });
    } catch (e: unknown) {
      alert(`Erro Gmail: ${e instanceof Error ? e.message : "Erro desconhecido"}`);
    } finally { setGmailLoading(false); }
  };

  const handleDisconnectGmail = async () => {
    if (!confirm("Desconectar Gmail?")) return;
    await gmailDisconnect();
    setGmail({ connected: false, email: null });
  };

  const handleSaveLimits = async () => {
    await saveSettings({ max_emails_per_day: maxEmails });
    setSaved(true);
    setTimeout(() => setSaved(false), 2000);
  };

  const handleSendTest = async () => {
    if (!testEmail.trim() || !testTemplateId) return;
    setTestLoading(true);
    setTestResult(null);
    try {
      const res = await sendTestEmail(testEmail.trim(), Number(testTemplateId));
      setTestResult({ ok: true, msg: res.message });
    } catch (e: unknown) {
      setTestResult({ ok: false, msg: e instanceof Error ? e.message : "Erro ao enviar" });
    } finally { setTestLoading(false); }
  };

  if (loading) return (
    <div style={{ display: "flex", alignItems: "center", justifyContent: "center", height: 240, gap: 8, color: "var(--text-3)" }}>
      <div style={{ width: 14, height: 14, borderRadius: "50%", border: "2px solid var(--green-bright)", borderTopColor: "transparent" }} className="animate-spin" />
      Carregando configurações...
    </div>
  );

  const btnPrimary: React.CSSProperties = {
    display: "flex", alignItems: "center", gap: 7,
    background: "var(--green-mid)", color: "#050a05",
    border: "none", borderRadius: 8, padding: "8px 16px",
    fontSize: 13, fontWeight: 600, cursor: "pointer", fontFamily: "inherit",
    transition: "background 120ms",
  };

  return (
    <div className="fade-in" style={{ padding: "28px", maxWidth: 680 }}>
      <div style={{ marginBottom: 24 }}>
        <h1 style={{ fontSize: 20, fontWeight: 600, letterSpacing: "-0.4px", color: "var(--text-1)", lineHeight: 1.2 }}>
          Configurações
        </h1>
        <p style={{ fontSize: 12, color: "var(--text-3)", marginTop: 3 }}>
          Gmail OAuth e limites de envio
        </p>
      </div>

      {/* Gmail */}
      <div style={sectionStyle}>
        <div style={sectionTitle as React.CSSProperties}>Gmail API</div>
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
          <div>
            <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 4 }}>
              <span style={{
                width: 8, height: 8, borderRadius: "50%",
                background: gmail?.connected ? "var(--green-bright)" : "var(--red)",
                boxShadow: gmail?.connected ? "0 0 8px rgba(74,222,128,0.5)" : "0 0 8px rgba(248,113,113,0.4)",
                display: "inline-block",
              }} />
              {gmail?.connected
                ? <CheckCircle2 size={14} style={{ color: "var(--green-bright)" }} />
                : <XCircle size={14} style={{ color: "var(--red)" }} />}
              <span style={{ fontSize: 13, fontWeight: 500, color: "var(--text-1)" }}>
                {gmail?.connected ? "Conectado" : "Não conectado"}
              </span>
            </div>
            {gmail?.connected && gmail.email && (
              <div style={{ fontSize: 12, fontFamily: "monospace", color: "var(--text-2)", marginLeft: 24 }}>{gmail.email}</div>
            )}
            {!gmail?.connected && (
              <div style={{ fontSize: 12, color: "var(--text-3)", marginLeft: 24 }}>Conecte para enviar campanhas via Gmail</div>
            )}
          </div>

          {gmail?.connected ? (
            <button
              onClick={handleDisconnectGmail}
              style={{ display: "flex", alignItems: "center", gap: 6, background: "transparent", color: "var(--red)", border: "1px solid rgba(248,113,113,0.2)", borderRadius: 8, padding: "8px 14px", fontSize: 13, cursor: "pointer", fontFamily: "inherit", transition: "background 100ms" }}
              onMouseEnter={e => { (e.currentTarget as HTMLButtonElement).style.background = "rgba(248,113,113,0.08)"; }}
              onMouseLeave={e => { (e.currentTarget as HTMLButtonElement).style.background = "transparent"; }}
            >
              <Link2Off size={13} /> Desconectar
            </button>
          ) : (
            <button
              onClick={handleConnectGmail}
              disabled={gmailLoading}
              style={{ ...btnPrimary, opacity: gmailLoading ? 0.6 : 1 }}
              onMouseEnter={e => { if (!gmailLoading) (e.currentTarget as HTMLButtonElement).style.background = "#4ade80"; }}
              onMouseLeave={e => { (e.currentTarget as HTMLButtonElement).style.background = "var(--green-mid)"; }}
            >
              {gmailLoading ? <Loader2 size={13} className="animate-spin" /> : <Link2 size={13} />}
              {gmailLoading ? "Abrindo browser..." : "Conectar Gmail"}
            </button>
          )}
        </div>

        {!gmail?.connected && (
          <div style={{ marginTop: 16, padding: "12px 14px", borderRadius: 8, background: "var(--surface-3)", border: "1px solid var(--border)", fontSize: 12, color: "var(--text-2)" }}>
            <strong style={{ color: "var(--text-1)" }}>Setup:</strong> Uma janela do browser abrirá para autorização OAuth2. Certifique-se que{" "}
            <code style={{ background: "rgba(74,222,128,0.08)", color: "var(--green-bright)", padding: "2px 6px", borderRadius: 4, fontSize: 11 }}>
              backend/core/credentials.json
            </code>{" "}
            existe.
          </div>
        )}
      </div>

      {/* Test Email */}
      {gmail?.connected && (
        <div style={sectionStyle}>
          <div style={sectionTitle as React.CSSProperties}>Enviar Email de Teste</div>
          <div style={{ display: "flex", gap: 10, alignItems: "flex-end" }}>
            <div style={{ flex: 1 }}>
              <span style={labelStyle}>Para</span>
              <input
                style={inpStyle}
                type="email"
                placeholder="seu@email.com"
                value={testEmail}
                onChange={e => setTestEmail(e.target.value)}
                onFocus={e => { e.currentTarget.style.borderColor = "rgba(74,222,128,0.5)"; }}
                onBlur={e => { e.currentTarget.style.borderColor = "var(--border)"; }}
              />
            </div>
            <div style={{ flex: 1 }}>
              <span style={labelStyle}>Template</span>
              <select
                style={inpStyle}
                value={testTemplateId}
                onChange={e => setTestTemplateId(Number(e.target.value))}
                onFocus={e => { e.currentTarget.style.borderColor = "rgba(74,222,128,0.5)"; }}
                onBlur={e => { e.currentTarget.style.borderColor = "var(--border)"; }}
              >
                {templates.map(t => <option key={t.id} value={t.id}>{t.name}</option>)}
              </select>
            </div>
            <button
              onClick={handleSendTest}
              disabled={testLoading || !testEmail.trim() || !testTemplateId}
              style={{ ...btnPrimary, opacity: testLoading || !testEmail.trim() || !testTemplateId ? 0.4 : 1, whiteSpace: "nowrap" }}
              onMouseEnter={e => { if (!testLoading) (e.currentTarget as HTMLButtonElement).style.background = "#4ade80"; }}
              onMouseLeave={e => { (e.currentTarget as HTMLButtonElement).style.background = "var(--green-mid)"; }}
            >
              {testLoading ? <Loader2 size={13} className="animate-spin" /> : <Send size={13} />}
              Enviar
            </button>
          </div>
          {testResult && (
            <div style={{ marginTop: 12, display: "flex", alignItems: "center", gap: 8, fontSize: 12, color: testResult.ok ? "var(--green-bright)" : "var(--red)" }}>
              {testResult.ok ? <CheckCircle2 size={13} /> : <XCircle size={13} />}
              {testResult.msg}
            </div>
          )}
        </div>
      )}

      {/* Limits */}
      <div style={sectionStyle}>
        <div style={sectionTitle as React.CSSProperties}>Limites Diários</div>
        <div>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 8 }}>
            <span style={{ fontSize: 13, fontWeight: 500, color: "var(--text-1)" }}>Máx emails por dia</span>
            <span style={{ fontSize: 16, fontWeight: 600, color: "var(--green-bright)" }}>{maxEmails}</span>
          </div>
          <input
            type="range" min={10} max={500} step={5}
            value={maxEmails}
            onChange={e => setMaxEmails(Number(e.target.value))}
            style={{ width: "100%" }}
          />
          <div style={{ display: "flex", justifyContent: "space-between", fontSize: 10, color: "var(--text-4)", marginTop: 4 }}>
            <span>10</span>
            <span style={{ color: "var(--amber)" }}>500 (limite Gmail)</span>
          </div>

          <div style={{ display: "flex", alignItems: "center", gap: 12, marginTop: 20 }}>
            <button
              onClick={handleSaveLimits}
              style={btnPrimary}
              onMouseEnter={e => { (e.currentTarget as HTMLButtonElement).style.background = "#4ade80"; }}
              onMouseLeave={e => { (e.currentTarget as HTMLButtonElement).style.background = "var(--green-mid)"; }}
            >
              Salvar limites
            </button>
            {saved && (
              <div style={{ display: "flex", alignItems: "center", gap: 6, fontSize: 13, fontWeight: 500, color: "var(--green-bright)" }}>
                <CheckCircle2 size={14} /> Salvo
              </div>
            )}
          </div>
        </div>
      </div>

      {/* BrasilAPI info */}
      <div style={{ ...sectionStyle, marginBottom: 0 }}>
        <div style={sectionTitle as React.CSSProperties}>BrasilAPI</div>
        <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
          <span style={{ width: 8, height: 8, borderRadius: "50%", background: "var(--green-bright)", boxShadow: "0 0 8px rgba(74,222,128,0.5)", display: "inline-block" }} />
          <CheckCircle2 size={14} style={{ color: "var(--green-bright)" }} />
          <span style={{ fontSize: 13, fontWeight: 500, color: "var(--green-bright)" }}>Sem autenticação necessária</span>
        </div>
        <div style={{ fontSize: 12, color: "var(--text-3)", marginTop: 8 }}>
          A BrasilAPI é gratuita e pública. Usada para enriquecer CNPJs com dados da Receita Federal (razão social, endereço, telefone, email).
        </div>
      </div>
    </div>
  );
}
