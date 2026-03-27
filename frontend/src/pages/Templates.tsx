import { useEffect, useState } from "react";
import { getTemplates, createTemplate, updateTemplate, deleteTemplate, sendTestEmail, type Template } from "@/lib/api";
import { formatDate, truncate } from "@/lib/utils";
import { Plus, Trash2, Pencil, Save, ChevronLeft, Send } from "lucide-react";

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

export function Templates() {
  const [templates, setTemplates] = useState<Template[]>([]);
  const [loading, setLoading] = useState(true);
  const [editing, setEditing] = useState<Template | null>(null);
  const [isNew, setIsNew] = useState(false);
  const [saving, setSaving] = useState(false);
  const [testEmail, setTestEmail] = useState("");
  const [testSending, setTestSending] = useState(false);
  const [testMsg, setTestMsg] = useState("");
  const [name, setName] = useState("");
  const [subject, setSubject] = useState("");
  const [htmlBody, setHtmlBody] = useState("");

  const load = async () => {
    setLoading(true);
    const data = await getTemplates();
    setTemplates(data);
    setLoading(false);
  };

  useEffect(() => { load(); }, []);

  const openEditor = (t?: Template) => {
    if (t) {
      setEditing(t); setName(t.name); setSubject(t.subject); setHtmlBody(t.html_body); setIsNew(false);
    } else {
      setEditing(null); setName(""); setSubject("");
      setHtmlBody(`<!DOCTYPE html>\n<html>\n<head><meta charset="UTF-8"></head>\n<body style="font-family:Arial,sans-serif;font-size:15px;color:#222;max-width:580px;margin:32px auto;padding:0 24px;">\n  <p>Hi {BUSINESS_NAME},</p>\n  <p>Write your message here.</p>\n  <p>Best,<br>Caetano</p>\n</body>\n</html>`);
      setIsNew(true);
    }
  };

  const closeEditor = () => { setEditing(null); setIsNew(false); };

  const handleSave = async () => {
    if (!name || !subject || !htmlBody) return;
    setSaving(true);
    try {
      if (isNew) await createTemplate({ name, subject, html_body: htmlBody });
      else if (editing) await updateTemplate(editing.id, { name, subject, html_body: htmlBody });
      await load(); closeEditor();
    } catch (e) { console.error(e); }
    finally { setSaving(false); }
  };

  const handleDelete = async (id: number) => {
    if (!confirm("Deletar este template?")) return;
    await deleteTemplate(id);
    setTemplates(prev => prev.filter(t => t.id !== id));
    if (editing?.id === id) closeEditor();
  };

  // ── Editor ────────────────────────────────────────────────────────────────
  if (editing !== null || isNew) {
    return (
      <div className="fade-in" style={{ padding: "28px", maxWidth: 1100 }}>
        {/* Breadcrumb */}
        <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 24 }}>
          <button
            onClick={closeEditor}
            style={{ display: "flex", alignItems: "center", gap: 5, fontSize: 13, color: "var(--text-3)", background: "transparent", border: "none", cursor: "pointer", fontFamily: "inherit", padding: 0, transition: "color 80ms" }}
            onMouseEnter={e => { (e.currentTarget as HTMLButtonElement).style.color = "var(--green-bright)"; }}
            onMouseLeave={e => { (e.currentTarget as HTMLButtonElement).style.color = "var(--text-3)"; }}
          >
            <ChevronLeft size={14} /> Templates
          </button>
          <span style={{ color: "var(--text-4)" }}>/</span>
          <span style={{ fontSize: 13, fontWeight: 500, color: "var(--text-1)" }}>
            {isNew ? "Novo Template" : editing?.name}
          </span>
        </div>

        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16 }}>
          {/* Form */}
          <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
            <div style={{ background: "var(--surface-2)", border: "1px solid var(--border)", borderRadius: 12, padding: "22px", boxShadow: "var(--shadow-1)" }}>
              <div style={{ marginBottom: 16 }}>
                <span style={lbl}>Nome do template</span>
                <input style={inp} type="text" value={name} onChange={e => setName(e.target.value)}
                  placeholder="ex: CaetanoRevive - Barbershop"
                  onFocus={e => { e.currentTarget.style.borderColor = "rgba(74,222,128,0.5)"; }}
                  onBlur={e => { e.currentTarget.style.borderColor = "var(--border)"; }} />
              </div>

              <div style={{ marginBottom: 16 }}>
                <span style={lbl}>Linha de assunto</span>
                <input style={inp} type="text" value={subject} onChange={e => setSubject(e.target.value)}
                  placeholder="Quick question for {BUSINESS_NAME}"
                  onFocus={e => { e.currentTarget.style.borderColor = "rgba(74,222,128,0.5)"; }}
                  onBlur={e => { e.currentTarget.style.borderColor = "var(--border)"; }} />
              </div>

              <div>
                <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 8 }}>
                  <span style={lbl as React.CSSProperties}>Corpo HTML</span>
                  <div style={{ display: "flex", alignItems: "center", gap: 4, fontSize: 10, color: "var(--text-3)" }}>
                    Variáveis:
                    {["{BUSINESS_NAME}", "{BOOKING_URL}", "{BOOKING_DOMAIN}"].map(v => (
                      <code key={v} style={{ background: "rgba(74,222,128,0.08)", color: "var(--green-bright)", border: "1px solid rgba(74,222,128,0.15)", padding: "2px 6px", borderRadius: 4, fontSize: 10, marginLeft: 4 }}>
                        {v}
                      </code>
                    ))}
                  </div>
                </div>
                <textarea
                  value={htmlBody}
                  onChange={e => setHtmlBody(e.target.value)}
                  style={{ ...inp, height: 280, resize: "none", fontFamily: "monospace", fontSize: 12, padding: "10px 12px" }}
                  onFocus={e => { e.currentTarget.style.borderColor = "rgba(74,222,128,0.5)"; }}
                  onBlur={e => { e.currentTarget.style.borderColor = "var(--border)"; }}
                />
              </div>
            </div>

            {/* Test email */}
            {editing && (
              <div style={{ background: "var(--surface-2)", border: "1px solid var(--border)", borderRadius: 12, padding: "18px 22px", boxShadow: "var(--shadow-1)" }}>
                <span style={{ fontSize: 10, fontWeight: 600, letterSpacing: "0.08em", textTransform: "uppercase", color: "var(--text-3)", display: "block", marginBottom: 10 }}>
                  Enviar email de teste
                </span>
                <div style={{ display: "flex", gap: 8 }}>
                  <input
                    style={{ flex: 1, background: "var(--surface-3)", color: "var(--text-1)", border: "1px solid var(--border)", borderRadius: 8, padding: "8px 12px", fontSize: 13, fontFamily: "inherit", outline: "none" }}
                    type="email" placeholder="seu@email.com" value={testEmail}
                    onChange={e => setTestEmail(e.target.value)}
                    onFocus={e => { e.currentTarget.style.borderColor = "rgba(74,222,128,0.5)"; }}
                    onBlur={e => { e.currentTarget.style.borderColor = "var(--border)"; }}
                  />
                  <button
                    onClick={async () => {
                      if (!testEmail || !editing) return;
                      setTestSending(true); setTestMsg("");
                      try {
                        const res = await sendTestEmail(testEmail, editing.id);
                        setTestMsg(res.message);
                      } catch (e: unknown) { setTestMsg(e instanceof Error ? e.message : "Erro"); }
                      finally { setTestSending(false); }
                    }}
                    disabled={testSending || !testEmail}
                    style={{ display: "flex", alignItems: "center", gap: 6, background: "rgba(74,222,128,0.08)", color: "var(--green-bright)", border: "1px solid rgba(74,222,128,0.18)", borderRadius: 8, padding: "8px 14px", fontSize: 12, fontWeight: 500, cursor: "pointer", fontFamily: "inherit", whiteSpace: "nowrap", opacity: testSending || !testEmail ? 0.5 : 1 }}
                  >
                    <Send size={12} /> {testSending ? "Enviando..." : "Enviar teste"}
                  </button>
                </div>
                {testMsg && (
                  <div style={{ marginTop: 8, fontSize: 12, color: testMsg.includes("Erro") || testMsg.includes("Failed") ? "var(--red)" : "var(--green-bright)" }}>
                    {testMsg}
                  </div>
                )}
              </div>
            )}

            {/* Actions */}
            <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
              <button
                onClick={handleSave}
                disabled={saving || !name || !subject || !htmlBody}
                style={{
                  display: "flex", alignItems: "center", gap: 7,
                  background: "var(--green-mid)", color: "#050a05",
                  border: "none", borderRadius: 8, padding: "9px 18px",
                  fontSize: 13, fontWeight: 600, cursor: "pointer", fontFamily: "inherit",
                  opacity: saving || !name || !subject || !htmlBody ? 0.4 : 1,
                  transition: "background 120ms",
                }}
                onMouseEnter={e => { if (!saving) (e.currentTarget as HTMLButtonElement).style.background = "#4ade80"; }}
                onMouseLeave={e => { (e.currentTarget as HTMLButtonElement).style.background = "var(--green-mid)"; }}
              >
                <Save size={13} />
                {saving ? "Salvando..." : "Salvar template"}
              </button>
              {editing && (
                <button
                  onClick={() => handleDelete(editing.id)}
                  style={{ display: "flex", alignItems: "center", gap: 6, background: "transparent", color: "var(--red)", border: "1px solid rgba(248,113,113,0.2)", borderRadius: 8, padding: "8px 14px", fontSize: 13, cursor: "pointer", fontFamily: "inherit", transition: "background 100ms" }}
                  onMouseEnter={e => { (e.currentTarget as HTMLButtonElement).style.background = "rgba(248,113,113,0.08)"; }}
                  onMouseLeave={e => { (e.currentTarget as HTMLButtonElement).style.background = "transparent"; }}
                >
                  <Trash2 size={13} /> Deletar
                </button>
              )}
            </div>
          </div>

          {/* Preview */}
          <div>
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 10 }}>
              <span style={{ fontSize: 10, fontWeight: 600, letterSpacing: "0.08em", textTransform: "uppercase", color: "var(--text-3)" }}>Preview</span>
              <span style={{ fontSize: 10, color: "var(--text-4)" }}>Variáveis aparecem como-estão</span>
            </div>
            <div style={{ borderRadius: 12, overflow: "hidden", border: "1px solid var(--border)", height: 440 }}>
              <iframe key={htmlBody} srcDoc={htmlBody} style={{ width: "100%", height: "100%", background: "white", display: "block", border: "none" }} title="Preview" sandbox="allow-same-origin allow-scripts" />
            </div>
          </div>
        </div>
      </div>
    );
  }

  // ── List ──────────────────────────────────────────────────────────────────
  return (
    <div className="fade-in" style={{ padding: "28px", maxWidth: 1000 }}>
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 24 }}>
        <div>
          <h1 style={{ fontSize: 20, fontWeight: 600, letterSpacing: "-0.4px", color: "var(--text-1)", lineHeight: 1.2 }}>Templates</h1>
          <p style={{ fontSize: 12, color: "var(--text-3)", marginTop: 3 }}>Templates HTML com substituição de variáveis</p>
        </div>
        <button
          onClick={() => openEditor()}
          style={{ display: "flex", alignItems: "center", gap: 7, background: "var(--green-mid)", color: "#050a05", border: "none", borderRadius: 8, padding: "9px 16px", fontSize: 13, fontWeight: 600, cursor: "pointer", fontFamily: "inherit", transition: "background 120ms" }}
          onMouseEnter={e => { (e.currentTarget as HTMLButtonElement).style.background = "#4ade80"; }}
          onMouseLeave={e => { (e.currentTarget as HTMLButtonElement).style.background = "var(--green-mid)"; }}
        >
          <Plus size={14} /> Novo Template
        </button>
      </div>

      {loading ? (
        <div style={{ display: "flex", alignItems: "center", justifyContent: "center", height: 120, gap: 8, color: "var(--text-3)" }}>
          <div style={{ width: 14, height: 14, borderRadius: "50%", border: "2px solid var(--green-bright)", borderTopColor: "transparent" }} className="animate-spin" />
          Carregando...
        </div>
      ) : (
        <div style={{ display: "grid", gridTemplateColumns: "repeat(3,1fr)", gap: 14 }}>
          {templates.map(t => (
            <div
              key={t.id}
              style={{ background: "var(--surface-2)", border: "1px solid var(--border)", borderRadius: 12, overflow: "hidden", boxShadow: "var(--shadow-1)", transition: "box-shadow 150ms, border-color 150ms" }}
              onMouseEnter={e => { const el = e.currentTarget as HTMLDivElement; el.style.boxShadow = "var(--shadow-2), 0 0 0 1px rgba(74,222,128,0.14)"; el.style.borderColor = "rgba(74,222,128,0.14)"; }}
              onMouseLeave={e => { const el = e.currentTarget as HTMLDivElement; el.style.boxShadow = "var(--shadow-1)"; el.style.borderColor = "var(--border)"; }}
            >
              {/* Thumbnail */}
              <div style={{ height: 140, overflow: "hidden", background: "#fff", borderBottom: "1px solid var(--border)", position: "relative" }}>
                <iframe
                  srcDoc={t.html_body}
                  style={{ position: "absolute", top: 0, left: 0, width: 600, height: 400, transform: "scale(0.5)", transformOrigin: "top left", pointerEvents: "none", border: "none" }}
                  title={t.name}
                  sandbox="allow-same-origin"
                />
              </div>

              <div style={{ padding: "14px 16px" }}>
                <div style={{ fontSize: 13, fontWeight: 600, color: "var(--text-1)", marginBottom: 3 }}>{t.name}</div>
                <div style={{ fontSize: 11, color: "var(--text-3)", marginBottom: 4 }}>{truncate(t.subject, 40)}</div>
                <div style={{ fontSize: 10, color: "var(--text-4)", marginBottom: 14 }}>Criado {formatDate(t.created_at)}</div>

                <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                  <button
                    onClick={() => openEditor(t)}
                    style={{ display: "flex", alignItems: "center", gap: 5, background: "rgba(74,222,128,0.08)", color: "var(--green-bright)", border: "1px solid rgba(74,222,128,0.18)", borderRadius: 7, padding: "5px 10px", fontSize: 12, fontWeight: 500, cursor: "pointer", fontFamily: "inherit", transition: "background 80ms" }}
                    onMouseEnter={e => { (e.currentTarget as HTMLButtonElement).style.background = "rgba(74,222,128,0.14)"; }}
                    onMouseLeave={e => { (e.currentTarget as HTMLButtonElement).style.background = "rgba(74,222,128,0.08)"; }}
                  >
                    <Pencil size={11} /> Editar
                  </button>
                  <button
                    onClick={() => handleDelete(t.id)}
                    style={{ padding: "5px 7px", borderRadius: 7, background: "transparent", border: "none", cursor: "pointer", color: "var(--text-3)", transition: "all 80ms" }}
                    onMouseEnter={e => { (e.currentTarget as HTMLButtonElement).style.background = "rgba(248,113,113,0.1)"; (e.currentTarget as HTMLButtonElement).style.color = "var(--red)"; }}
                    onMouseLeave={e => { (e.currentTarget as HTMLButtonElement).style.background = "transparent"; (e.currentTarget as HTMLButtonElement).style.color = "var(--text-3)"; }}
                  >
                    <Trash2 size={13} />
                  </button>
                </div>
              </div>
            </div>
          ))}

          {/* Add new */}
          <button
            onClick={() => openEditor()}
            style={{ border: "2px dashed var(--border-strong)", borderRadius: 12, background: "transparent", display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", gap: 8, height: 200, cursor: "pointer", transition: "all 150ms", fontFamily: "inherit" }}
            onMouseEnter={e => { (e.currentTarget as HTMLButtonElement).style.borderColor = "rgba(74,222,128,0.3)"; (e.currentTarget as HTMLButtonElement).style.background = "rgba(74,222,128,0.04)"; }}
            onMouseLeave={e => { (e.currentTarget as HTMLButtonElement).style.borderColor = "var(--border-strong)"; (e.currentTarget as HTMLButtonElement).style.background = "transparent"; }}
          >
            <Plus size={20} style={{ color: "var(--text-4)" }} />
            <span style={{ fontSize: 13, color: "var(--text-4)" }}>Novo template</span>
          </button>
        </div>
      )}
    </div>
  );
}
