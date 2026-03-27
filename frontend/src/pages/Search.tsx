import { useState, useRef, useEffect } from "react";
import { searchByCnae, getSearchProgress, getRfCacheInfo, importCnpjCsv, getImportProgress, type SearchProgress } from "@/lib/api";
import { Search as SearchIcon, Loader2, CheckCircle2, AlertCircle, Plus, X, Database, Upload, ChevronDown, ChevronUp } from "lucide-react";

const UF_OPTIONS = [
  "", "AC","AL","AP","AM","BA","CE","DF","ES","GO","MA","MT","MS",
  "MG","PA","PB","PR","PE","PI","RJ","RN","RS","RO","RR","SC","SP","SE","TO",
];

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

const focus = (e: React.FocusEvent<HTMLInputElement | HTMLSelectElement>) => {
  e.currentTarget.style.borderColor = "rgba(74,222,128,0.5)";
};
const blur = (e: React.FocusEvent<HTMLInputElement | HTMLSelectElement>) => {
  e.currentTarget.style.borderColor = "var(--border)";
};

function ProgressPanel({ p }: { p: SearchProgress }) {
  const isEnrich = p.phase === "enrich";
  const isDone = p.phase === "done";
  const isDownload = p.phase === "download";
  const isScan = p.phase === "scan";

  const dlPct = isDownload && p.dl_total > 0
    ? Math.round((p.dl_done / p.dl_total) * 100) : 0;
  const enrichPct = isEnrich && p.enrich_total > 0
    ? Math.round((p.enrich_done / p.enrich_total) * 100) : 0;

  return (
    <div style={{ background: "var(--surface-2)", border: "1px solid var(--border)", borderRadius: 12, padding: "20px 24px", boxShadow: "var(--shadow-1)" }}>
      <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 10 }}>
        {isDone
          ? <CheckCircle2 size={16} style={{ color: "var(--green-bright)" }} />
          : <Loader2 size={16} className="animate-spin" style={{ color: "var(--green-bright)" }} />
        }
        <span style={{ fontSize: 13, fontWeight: 600, color: "var(--text-1)" }}>
          {isDone ? "Concluído!" : p.niche ? `Buscando — ${p.niche}` : "Processando..."}
        </span>
      </div>

      {/* Active filters pill row */}
      <div style={{ display: "flex", flexWrap: "wrap", gap: 6, marginBottom: 14 }}>
        {p.cnae_codes?.map(c => (
          <span key={c} style={{ background: "rgba(74,222,128,0.08)", border: "1px solid rgba(74,222,128,0.2)", borderRadius: 5, padding: "2px 8px", fontSize: 11, fontFamily: "monospace", color: "var(--green-bright)" }}>
            CNAE: {c}
          </span>
        ))}
        {p.uf_filter && (
          <span style={{ background: "rgba(96,165,250,0.08)", border: "1px solid rgba(96,165,250,0.2)", borderRadius: 5, padding: "2px 8px", fontSize: 11, color: "#60a5fa" }}>
            UF: {p.uf_filter}
          </span>
        )}
        {p.municipio_filter && (
          <span style={{ background: "rgba(251,191,36,0.08)", border: "1px solid rgba(251,191,36,0.2)", borderRadius: 5, padding: "2px 8px", fontSize: 11, color: "#fbbf24" }}>
            Município: {p.municipio_filter}
          </span>
        )}
      </div>

      {/* Status message */}
      <div style={{ fontSize: 12, color: "var(--text-2)", marginBottom: 14, minHeight: 18 }}>
        {p.status}
      </div>

      {/* Download bar */}
      {isDownload && (
        <div style={{ marginBottom: 12 }}>
          <div style={{ display: "flex", justifyContent: "space-between", fontSize: 11, color: "var(--text-3)", marginBottom: 5 }}>
            <span>Download arquivo RF {p.file_idx + 1}/10</span>
            <span>{p.dl_total > 0 ? `${Math.round(p.dl_done / 1024 / 1024)}MB / ${Math.round(p.dl_total / 1024 / 1024)}MB` : "..."}</span>
          </div>
          <div style={{ background: "var(--surface-3)", borderRadius: 99, height: 5 }}>
            <div style={{ height: "100%", borderRadius: 99, background: "var(--green-mid)", width: `${dlPct}%`, transition: "width 500ms" }} />
          </div>
        </div>
      )}

      {/* Scan stats */}
      {(isScan || isDone || isEnrich) && (
        <div style={{ display: "flex", gap: 20, marginBottom: 14 }}>
          <div style={{ fontSize: 11, color: "var(--text-3)" }}>
            <span style={{ fontSize: 18, fontWeight: 700, color: "var(--text-1)", display: "block", lineHeight: 1 }}>
              {p.scanned.toLocaleString("pt-BR")}
            </span>
            registros analisados
          </div>
          <div style={{ fontSize: 11, color: "var(--text-3)" }}>
            <span style={{ fontSize: 18, fontWeight: 700, color: "var(--green-bright)", display: "block", lineHeight: 1 }}>
              {p.found}
            </span>
            encontradas (com tel)
          </div>
          {(p.found_with_email > 0 || p.found_without_email > 0) && (
            <div style={{ fontSize: 11, color: "var(--text-3)" }}>
              <span style={{ display: "block", lineHeight: 1, marginBottom: 2 }}>
                <span style={{ fontSize: 13, fontWeight: 700, color: "var(--green-bright)" }}>{p.found_with_email}</span>
                <span style={{ fontSize: 10, color: "var(--text-3)" }}> com email</span>
              </span>
              <span style={{ display: "block" }}>
                <span style={{ fontSize: 13, fontWeight: 700, color: "var(--text-2)" }}>{p.found_without_email}</span>
                <span style={{ fontSize: 10, color: "var(--text-3)" }}> sem email</span>
              </span>
            </div>
          )}
        </div>
      )}

      {/* Enrich bar */}
      {(isEnrich || isDone) && p.enrich_total > 0 && (
        <div style={{ marginBottom: 12 }}>
          <div style={{ display: "flex", justifyContent: "space-between", fontSize: 11, color: "var(--text-3)", marginBottom: 5 }}>
            <span>Enriquecendo via BrasilAPI</span>
            <span>{p.enrich_done}/{p.enrich_total}</span>
          </div>
          <div style={{ background: "var(--surface-3)", borderRadius: 99, height: 5 }}>
            <div style={{
              height: "100%", borderRadius: 99,
              background: isDone ? "var(--green-bright)" : "var(--green-mid)",
              width: `${isDone ? 100 : enrichPct}%`,
              transition: "width 500ms",
              boxShadow: isDone ? "0 0 8px rgba(74,222,128,0.4)" : "none",
            }} />
          </div>
        </div>
      )}
    </div>
  );
}

export function Search() {
  const [mode, setMode] = useState<"cnae" | "csv">("cnae");

  // ── CNAE search state ──────────────────────────────────────────────────────
  const [cnaeInput, setCnaeInput] = useState("");
  const [cnaeList, setCnaeList] = useState<string[]>([]);
  const [niche, setNiche] = useState("");
  const [quantity, setQuantity] = useState(50);
  const [uf, setUf] = useState("");
  const [municipio, setMunicipio] = useState("");
  const [searching, setSearching] = useState(false);
  const [searchProgress, setSearchProgress] = useState<SearchProgress | null>(null);
  const [searchError, setSearchError] = useState("");
  const [cacheFiles, setCacheFiles] = useState<{ name: string; size_mb: number; modified: string }[]>([]);
  const [showCache, setShowCache] = useState(false);

  // ── CSV import state ────────────────────────────────────────────────────────
  const [file, setFile] = useState<File | null>(null);
  const [csvNiche, setCsvNiche] = useState("");
  const [csvLoading, setCsvLoading] = useState(false);
  const [csvProgress, setCsvProgress] = useState<{ total: number; done: number; failed: number; running: boolean; niche: string } | null>(null);
  const [csvDone, setCsvDone] = useState(false);
  const [csvError, setCsvError] = useState("");
  const fileInputRef = useRef<HTMLInputElement>(null);

  const pollRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const stopPolling = () => { if (pollRef.current) { clearInterval(pollRef.current); pollRef.current = null; } };

  useEffect(() => {
    getRfCacheInfo().then(r => setCacheFiles(r.files)).catch(() => {});
    // Resume if already running
    getSearchProgress().then(p => {
      if (p.running || p.phase === "done") {
        setSearchProgress(p);
        if (p.running) { setSearching(true); startPollSearch(); }
      }
    }).catch(() => {});
  }, []);

  const startPollSearch = () => {
    pollRef.current = setInterval(async () => {
      try {
        const p = await getSearchProgress();
        setSearchProgress(p);
        if (!p.running) {
          stopPolling();
          setSearching(false);
          getRfCacheInfo().then(r => setCacheFiles(r.files)).catch(() => {});
        }
      } catch { stopPolling(); setSearching(false); }
    }, 1000);
  };

  const handleAddCnae = () => {
    const val = cnaeInput.trim();
    if (!val) return;
    if (!cnaeList.includes(val)) setCnaeList(prev => [...prev, val]);
    setCnaeInput("");
  };

  const handleSearch = async () => {
    if (!cnaeList.length) { setSearchError("Adicione pelo menos um CNAE."); return; }
    if (!niche.trim()) { setSearchError("Informe o nome do nicho."); return; }
    setSearchError("");
    setSearching(true);
    setSearchProgress(null);
    try {
      await searchByCnae({ cnae_codes: cnaeList, niche: niche.trim(), quantity, uf: uf || undefined, municipio: municipio.trim() || undefined });
      startPollSearch();
    } catch (e: unknown) {
      setSearchError(e instanceof Error ? e.message : "Erro ao iniciar busca.");
      setSearching(false);
    }
  };

  const handleReset = () => {
    stopPolling();
    setSearchProgress(null);
    setSearching(false);
    setSearchError("");
  };

  // CSV import handlers
  const handleCsvImport = async () => {
    if (!file) { setCsvError("Selecione um arquivo CSV."); return; }
    if (!csvNiche.trim()) { setCsvError("Informe o nicho."); return; }
    setCsvError(""); setCsvLoading(true); setCsvDone(false); setCsvProgress(null);
    try {
      const res = await importCnpjCsv(file, csvNiche.trim());
      setCsvProgress({ total: res.total, done: 0, failed: 0, running: true, niche: res.niche });
      pollRef.current = setInterval(async () => {
        try {
          const p = await getImportProgress();
          setCsvProgress(p);
          if (!p.running) { stopPolling(); setCsvDone(true); setCsvLoading(false); }
        } catch { stopPolling(); setCsvLoading(false); }
      }, 1200);
    } catch (e: unknown) { setCsvError(e instanceof Error ? e.message : "Erro."); setCsvLoading(false); }
  };

  const isDone = searchProgress?.phase === "done";

  return (
    <div className="fade-in" style={{ padding: "28px", maxWidth: 760 }}>
      {/* Header */}
      <div style={{ marginBottom: 24 }}>
        <h1 style={{ fontSize: 20, fontWeight: 600, letterSpacing: "-0.4px", color: "var(--text-1)", lineHeight: 1.2 }}>
          Buscar Leads
        </h1>
        <p style={{ fontSize: 12, color: "var(--text-3)", marginTop: 3 }}>
          Busca automática por CNAE na Receita Federal — apenas empresas ativas com telefone (email quando disponível).
        </p>
      </div>

      {/* Mode tabs */}
      <div style={{ display: "flex", gap: 4, background: "var(--surface-2)", border: "1px solid var(--border)", borderRadius: 10, padding: 4, marginBottom: 24, width: "fit-content" }}>
        {[
          { key: "cnae", label: "Buscar por CNAE", icon: SearchIcon },
          { key: "csv", label: "Importar CSV manual", icon: Upload },
        ].map(({ key, label, icon: Icon }) => (
          <button
            key={key}
            onClick={() => setMode(key as "cnae" | "csv")}
            style={{
              display: "flex", alignItems: "center", gap: 7,
              padding: "7px 14px", borderRadius: 7, border: "none", cursor: "pointer",
              fontFamily: "inherit", fontSize: 12, fontWeight: 500,
              background: mode === key ? "var(--surface-4)" : "transparent",
              color: mode === key ? "var(--text-1)" : "var(--text-3)",
              transition: "all 100ms",
            }}
          >
            <Icon size={13} />
            {label}
          </button>
        ))}
      </div>

      {/* ── CNAE Search Mode ───────────────────────────────────────────────── */}
      {mode === "cnae" && (
        <>
          {/* Form */}
          {!searching && !isDone && (
            <div style={{ background: "var(--surface-2)", border: "1px solid var(--border)", borderRadius: 12, padding: "24px", boxShadow: "var(--shadow-1)", display: "flex", flexDirection: "column", gap: 20 }}>

              {/* CNAE codes */}
              <div>
                <span style={lbl}>Códigos CNAE *</span>
                <div style={{ display: "flex", gap: 8 }}>
                  <input
                    style={{ ...inp, flex: 1 }}
                    type="text"
                    value={cnaeInput}
                    onChange={e => setCnaeInput(e.target.value)}
                    placeholder="ex: 9602-5/01"
                    onFocus={focus} onBlur={blur}
                    onKeyDown={e => { if (e.key === "Enter") handleAddCnae(); }}
                  />
                  <button
                    onClick={handleAddCnae}
                    style={{ display: "flex", alignItems: "center", gap: 5, padding: "8px 14px", background: "var(--surface-3)", border: "1px solid var(--border)", borderRadius: 8, cursor: "pointer", fontFamily: "inherit", fontSize: 12, color: "var(--text-2)", transition: "all 100ms" }}
                    onMouseEnter={e => { (e.currentTarget as HTMLButtonElement).style.borderColor = "rgba(74,222,128,0.4)"; (e.currentTarget as HTMLButtonElement).style.color = "var(--green-bright)"; }}
                    onMouseLeave={e => { (e.currentTarget as HTMLButtonElement).style.borderColor = "var(--border)"; (e.currentTarget as HTMLButtonElement).style.color = "var(--text-2)"; }}
                  >
                    <Plus size={13} /> Adicionar
                  </button>
                </div>
                <div style={{ fontSize: 11, color: "var(--text-4)", marginTop: 5 }}>
                  Pressione Enter ou clique Adicionar. Ex: 9602-5/01 (cabelereiros), 9602-5/02 (barbearias), 9313-1/00 (academias)
                </div>

                {/* CNAE tags */}
                {cnaeList.length > 0 && (
                  <div style={{ display: "flex", flexWrap: "wrap", gap: 6, marginTop: 10 }}>
                    {cnaeList.map(c => (
                      <span key={c} style={{ display: "flex", alignItems: "center", gap: 5, background: "rgba(74,222,128,0.08)", border: "1px solid rgba(74,222,128,0.2)", borderRadius: 6, padding: "4px 10px", fontSize: 12, fontFamily: "monospace", color: "var(--green-bright)" }}>
                        {c}
                        <button onClick={() => setCnaeList(prev => prev.filter(x => x !== c))}
                          style={{ background: "transparent", border: "none", cursor: "pointer", padding: 0, color: "rgba(74,222,128,0.6)", lineHeight: 1 }}>
                          <X size={11} />
                        </button>
                      </span>
                    ))}
                  </div>
                )}
              </div>

              {/* Niche name */}
              <div>
                <span style={lbl}>Nome do Nicho *</span>
                <input style={inp} type="text" value={niche} onChange={e => setNiche(e.target.value)}
                  placeholder="ex: Barbearia, Academia, Salão de Beleza..."
                  onFocus={focus} onBlur={blur} />
                <div style={{ fontSize: 11, color: "var(--text-4)", marginTop: 5 }}>
                  Todos os leads importados serão marcados com este nicho.
                </div>
              </div>

              {/* Quantity + UF + Municipio */}
              <div style={{ display: "grid", gridTemplateColumns: "2fr 1fr 1fr", gap: 14 }}>
                <div>
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 6 }}>
                    <span style={lbl as React.CSSProperties}>Quantidade</span>
                    <span style={{ fontSize: 16, fontWeight: 700, color: "var(--green-bright)" }}>{quantity}</span>
                  </div>
                  <input type="range" min={10} max={200} step={10} value={quantity}
                    onChange={e => setQuantity(Number(e.target.value))} style={{ width: "100%" }} />
                  <div style={{ display: "flex", justifyContent: "space-between", fontSize: 10, color: "var(--text-4)", marginTop: 3 }}>
                    <span>10</span><span>200</span>
                  </div>
                </div>
                <div>
                  <span style={lbl}>Estado (UF)</span>
                  <select style={inp} value={uf} onChange={e => setUf(e.target.value)} onFocus={focus} onBlur={blur}>
                    <option value="">Todos</option>
                    {UF_OPTIONS.filter(Boolean).map(u => <option key={u} value={u}>{u}</option>)}
                  </select>
                </div>
                <div>
                  <span style={lbl}>Município</span>
                  <input style={inp} type="text" value={municipio} onChange={e => setMunicipio(e.target.value)}
                    placeholder="ex: São Paulo" onFocus={focus} onBlur={blur} />
                </div>
              </div>

              {/* Error */}
              {searchError && (
                <div style={{ display: "flex", alignItems: "center", gap: 8, padding: "10px 14px", borderRadius: 8, background: "rgba(248,113,113,0.08)", border: "1px solid rgba(248,113,113,0.2)", color: "var(--red)", fontSize: 12 }}>
                  <AlertCircle size={14} /> {searchError}
                </div>
              )}

              {/* Search button */}
              <button
                onClick={handleSearch}
                disabled={!cnaeList.length || !niche.trim()}
                style={{
                  display: "flex", alignItems: "center", justifyContent: "center", gap: 8,
                  background: "var(--green-mid)", color: "#050a05",
                  border: "none", borderRadius: 9, padding: "12px 24px",
                  fontSize: 14, fontWeight: 600, cursor: !cnaeList.length || !niche.trim() ? "not-allowed" : "pointer",
                  fontFamily: "inherit",
                  opacity: !cnaeList.length || !niche.trim() ? 0.4 : 1,
                  transition: "background 120ms, opacity 120ms",
                }}
                onMouseEnter={e => { if (cnaeList.length && niche.trim()) (e.currentTarget as HTMLButtonElement).style.background = "#4ade80"; }}
                onMouseLeave={e => { (e.currentTarget as HTMLButtonElement).style.background = "var(--green-mid)"; }}
              >
                <SearchIcon size={15} /> Buscar {quantity} empresas
              </button>

              {/* Cache info */}
              {cacheFiles.length > 0 && (
                <div>
                  <button
                    onClick={() => setShowCache(!showCache)}
                    style={{ display: "flex", alignItems: "center", gap: 6, background: "transparent", border: "none", cursor: "pointer", fontSize: 11, color: "var(--text-4)", fontFamily: "inherit", padding: 0 }}
                  >
                    <Database size={12} />
                    {cacheFiles.length} arquivo(s) RF em cache — próximas buscas mais rápidas
                    {showCache ? <ChevronUp size={11} /> : <ChevronDown size={11} />}
                  </button>
                  {showCache && (
                    <div style={{ marginTop: 8, display: "flex", flexDirection: "column", gap: 4 }}>
                      {cacheFiles.map(f => (
                        <div key={f.name} style={{ fontSize: 11, color: "var(--text-4)", fontFamily: "monospace", padding: "4px 10px", background: "var(--surface-3)", borderRadius: 6 }}>
                          {f.name} — {f.size_mb}MB — {f.modified}
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )}
            </div>
          )}

          {/* Progress */}
          {searchProgress && (
            <div style={{ marginTop: !searching && !isDone ? 0 : 0 }}>
              <ProgressPanel p={searchProgress} />
              {isDone && (
                <button
                  onClick={handleReset}
                  style={{
                    marginTop: 12, display: "flex", alignItems: "center", gap: 6,
                    background: "rgba(74,222,128,0.08)", color: "var(--green-bright)",
                    border: "1px solid rgba(74,222,128,0.18)", borderRadius: 8,
                    padding: "8px 16px", fontSize: 12, fontWeight: 500,
                    cursor: "pointer", fontFamily: "inherit", transition: "background 100ms",
                  }}
                  onMouseEnter={e => { (e.currentTarget as HTMLButtonElement).style.background = "rgba(74,222,128,0.14)"; }}
                  onMouseLeave={e => { (e.currentTarget as HTMLButtonElement).style.background = "rgba(74,222,128,0.08)"; }}
                >
                  Nova busca
                </button>
              )}
            </div>
          )}

          {/* How it works */}
          {!searching && !isDone && (
            <div style={{ marginTop: 20, background: "rgba(74,222,128,0.03)", border: "1px solid rgba(74,222,128,0.1)", borderRadius: 10, padding: "14px 16px" }}>
              <div style={{ fontSize: 10, fontWeight: 600, letterSpacing: "0.08em", textTransform: "uppercase", color: "var(--green-bright)", marginBottom: 10 }}>
                Como funciona
              </div>
              {[
                ["1", "Baixa o arquivo da Receita Federal automaticamente (~200MB, salvo em cache por 30 dias)"],
                ["2", "Filtra: apenas empresas ATIVAS com telefone — email coletado se disponível (opcional)"],
                ["3", "Enriquece via BrasilAPI para obter razão social e validar dados"],
                ["4", "Importa direto para o banco — pronto para campanha"],
              ].map(([n, text]) => (
                <div key={n} style={{ display: "flex", alignItems: "flex-start", gap: 10, fontSize: 12, color: "var(--text-2)", marginBottom: 6 }}>
                  <span style={{ minWidth: 18, height: 18, borderRadius: "50%", background: "rgba(74,222,128,0.12)", border: "1px solid rgba(74,222,128,0.2)", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 10, fontWeight: 700, color: "var(--green-bright)" }}>{n}</span>
                  {text}
                </div>
              ))}
            </div>
          )}
        </>
      )}

      {/* ── CSV Import Mode ────────────────────────────────────────────────── */}
      {mode === "csv" && (
        <div style={{ background: "var(--surface-2)", border: "1px solid var(--border)", borderRadius: 12, padding: "24px", boxShadow: "var(--shadow-1)", display: "flex", flexDirection: "column", gap: 18 }}>
          <div>
            <span style={lbl}>Nome do Nicho *</span>
            <input style={inp} type="text" value={csvNiche} onChange={e => setCsvNiche(e.target.value)}
              placeholder="ex: Barbearia SP..." disabled={csvLoading} onFocus={focus} onBlur={blur} />
          </div>

          <div>
            <span style={lbl}>Arquivo CSV *</span>
            <div
              onClick={() => !csvLoading && fileInputRef.current?.click()}
              style={{ border: `2px dashed ${file ? "rgba(74,222,128,0.3)" : "var(--border)"}`, borderRadius: 10, padding: "28px 24px", textAlign: "center", cursor: csvLoading ? "default" : "pointer", background: file ? "rgba(74,222,128,0.02)" : "var(--surface-3)", transition: "border-color 120ms" }}
            >
              {file ? (
                <div style={{ fontSize: 13, color: "var(--text-1)", fontWeight: 500 }}>{file.name} — {(file.size / 1024 / 1024).toFixed(2)} MB</div>
              ) : (
                <div style={{ fontSize: 13, color: "var(--text-3)" }}>
                  <Upload size={20} style={{ marginBottom: 8, display: "block", margin: "0 auto 8px" }} />
                  Arraste ou clique para selecionar CSV do dados.gov.br
                </div>
              )}
            </div>
            <input ref={fileInputRef} type="file" accept=".csv,.txt" style={{ display: "none" }} onChange={e => { const f = e.target.files?.[0]; if (f) setFile(f); }} />
          </div>

          {csvError && (
            <div style={{ display: "flex", alignItems: "center", gap: 8, padding: "10px 14px", borderRadius: 8, background: "rgba(248,113,113,0.08)", border: "1px solid rgba(248,113,113,0.2)", color: "var(--red)", fontSize: 12 }}>
              <AlertCircle size={14} /> {csvError}
            </div>
          )}

          {csvProgress && (
            <div>
              <div style={{ display: "flex", justifyContent: "space-between", fontSize: 12, color: "var(--text-3)", marginBottom: 6 }}>
                <span>{csvDone ? "Concluído!" : "Enriquecendo via BrasilAPI..."}</span>
                <span>{csvProgress.done}/{csvProgress.total}</span>
              </div>
              <div style={{ background: "var(--surface-3)", borderRadius: 99, height: 5 }}>
                <div style={{ height: "100%", borderRadius: 99, background: csvDone ? "var(--green-bright)" : "var(--green-mid)", width: `${csvProgress.total > 0 ? Math.round(csvProgress.done / csvProgress.total * 100) : 0}%`, transition: "width 600ms" }} />
              </div>
            </div>
          )}

          <button
            onClick={handleCsvImport}
            disabled={csvLoading || !file || !csvNiche.trim()}
            style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: 8, background: "var(--green-mid)", color: "#050a05", border: "none", borderRadius: 9, padding: "11px 24px", fontSize: 14, fontWeight: 600, cursor: csvLoading || !file || !csvNiche.trim() ? "not-allowed" : "pointer", fontFamily: "inherit", opacity: csvLoading || !file || !csvNiche.trim() ? 0.4 : 1, transition: "opacity 120ms" }}
            onMouseEnter={e => { if (!csvLoading && file && csvNiche.trim()) (e.currentTarget as HTMLButtonElement).style.background = "#4ade80"; }}
            onMouseLeave={e => { (e.currentTarget as HTMLButtonElement).style.background = "var(--green-mid)"; }}
          >
            {csvLoading ? <Loader2 size={15} className="animate-spin" /> : <Upload size={15} />}
            {csvLoading ? "Importando..." : "Importar CSV"}
          </button>
        </div>
      )}
    </div>
  );
}
