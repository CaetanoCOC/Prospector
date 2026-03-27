const BASE = "/api";

async function req<T>(path: string, options?: RequestInit): Promise<T> {
  const res = await fetch(BASE + path, {
    headers: { "Content-Type": "application/json" },
    ...options,
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({ detail: res.statusText }));
    throw new Error(err.detail || "Request failed");
  }
  return res.json();
}

// ── LEADS ───────────────────────────────────────────────────────────────────

export interface Lead {
  id: number;
  cnpj?: string;
  razao_social?: string;
  nome_fantasia?: string;
  phone?: string;
  website?: string;
  email?: string;
  logradouro?: string;
  numero?: string;
  bairro?: string;
  municipio?: string;
  uf?: string;
  cep?: string;
  cnae?: string;
  cnae_descricao?: string;
  niche?: string;
  situacao?: string;
  email_status?: "found" | "not_found" | null;
  lead_status: "new" | "contacted" | "replied" | "converted" | "removed";
  created_at?: string;
}

export const getLeads = (params?: {
  niche?: string;
  municipio?: string;
  uf?: string;
  lead_status?: string;
  email_status?: string;
  has_email?: boolean;
  available_for_campaign?: boolean;
  limit?: number;
  offset?: number;
}) => {
  const qs = new URLSearchParams();
  if (params?.niche) qs.set("niche", params.niche);
  if (params?.municipio) qs.set("municipio", params.municipio);
  if (params?.uf) qs.set("uf", params.uf);
  if (params?.lead_status) qs.set("lead_status", params.lead_status);
  if (params?.email_status) qs.set("email_status", params.email_status);
  if (params?.has_email) qs.set("has_email", "true");
  if (params?.available_for_campaign) qs.set("available_for_campaign", "true");
  if (params?.limit !== undefined) qs.set("limit", String(params.limit));
  if (params?.offset !== undefined) qs.set("offset", String(params.offset));
  return req<{ leads: Lead[]; total: number; limit: number; offset: number; in_cooldown: number }>(
    `/leads?${qs}`
  );
};

export const createLead = (data: {
  cnpj?: string;
  razao_social?: string;
  nome_fantasia?: string;
  email?: string;
  website?: string;
  phone?: string;
  municipio?: string;
  uf?: string;
  niche?: string;
}) => req<Lead>("/leads", { method: "POST", body: JSON.stringify(data) });

export const getNiches = () => req<string[]>("/niches");

export const updateLead = (id: number, data: Partial<Lead>) =>
  req<Lead>(`/leads/${id}`, { method: "PATCH", body: JSON.stringify(data) });

export const deleteLead = (id: number) =>
  req<{ message: string }>(`/leads/${id}`, { method: "DELETE" });

export const exportLeadsCsv = (params?: {
  niche?: string;
  municipio?: string;
  uf?: string;
  lead_status?: string;
  email_status?: string;
}) => {
  const qs = new URLSearchParams();
  if (params?.niche) qs.set("niche", params.niche);
  if (params?.municipio) qs.set("municipio", params.municipio);
  if (params?.uf) qs.set("uf", params.uf);
  if (params?.lead_status) qs.set("lead_status", params.lead_status);
  if (params?.email_status) qs.set("email_status", params.email_status);
  window.open(`${BASE}/leads/export?${qs}`, "_blank");
};

// ── BUSCA POR CNAE (Receita Federal) ─────────────────────────────────────────

export interface SearchProgress {
  running: boolean;
  phase: "init" | "download" | "scan" | "enrich" | "done" | "";
  status: string;
  found: number;
  found_with_email: number;
  found_without_email: number;
  scanned: number;
  dl_total: number;
  dl_done: number;
  file_idx: number;
  enrich_done: number;
  enrich_total: number;
  year_month: string;
  niche: string;
  quantity: number;
  cnae_codes: string[];
  uf_filter: string;
  municipio_filter: string;
}

export const searchByCnae = (data: {
  cnae_codes: string[];
  niche: string;
  quantity: number;
  uf?: string;
  municipio?: string;
}) =>
  req<{ message: string; niche: string; quantity: number }>("/search-cnae", {
    method: "POST",
    body: JSON.stringify(data),
  });

export const getSearchProgress = () => req<SearchProgress>("/search-progress");

export const getRfCacheInfo = () =>
  req<{ files: { name: string; size_mb: number; modified: string }[]; count: number }>("/rf-cache");

// ── CNPJ IMPORT ──────────────────────────────────────────────────────────────

export interface ImportProgress {
  total: number;
  done: number;
  failed: number;
  running: boolean;
  niche: string;
}

export const importCnpjCsv = (file: File, niche: string) => {
  const form = new FormData();
  form.append("file", file);
  form.append("niche", niche);
  return fetch(`${BASE}/import-cnpj`, { method: "POST", body: form }).then(
    async (res) => {
      if (!res.ok) {
        const err = await res.json().catch(() => ({ detail: res.statusText }));
        throw new Error(err.detail || "Import failed");
      }
      return res.json() as Promise<{ message: string; total: number; niche: string }>;
    }
  );
};

export const getImportProgress = () =>
  req<ImportProgress>("/import-progress");

// ── SCRAPER ──────────────────────────────────────────────────────────────────

export const scrapeEmails = (lead_ids?: number[]) =>
  req<{ message: string; status: string }>("/scrape-emails", {
    method: "POST",
    body: JSON.stringify({ lead_ids: lead_ids ?? null }),
  });

export const getScrapeProgress = () =>
  req<{ total: number; done: number; running: boolean }>("/scrape-progress");

// ── CAMPAIGNS ────────────────────────────────────────────────────────────────

export interface Campaign {
  id: number;
  name: string;
  niche?: string;
  template_id: number;
  template_name?: string;
  total_sent: number;
  replied_count?: number;
  created_at?: string;
}

export interface EmailLog {
  id: number;
  lead_id: number;
  campaign_id: number;
  subject?: string;
  sent_at?: string;
  status: "sent" | "failed";
  replied: number;
  lead_name?: string;
  lead_email?: string;
  municipio?: string;
  uf?: string;
  niche?: string;
}

export const getCampaigns = () => req<Campaign[]>("/campaigns");

export const deleteCampaign = (id: number) =>
  req<{ message: string }>(`/campaigns/${id}`, { method: "DELETE" });

export const getCampaignLogs = (id: number) =>
  req<EmailLog[]>(`/campaigns/${id}/logs`);

export const createCampaign = (data: {
  name: string;
  niche?: string;
  template_id: number;
  lead_ids: number[];
}) =>
  req<{ campaign_id: number; sent: number; failed: number; message: string }>(
    "/campaigns",
    { method: "POST", body: JSON.stringify(data) }
  );

export const markReply = (
  campaign_id: number,
  lead_id: number,
  replied: boolean
) =>
  req<{ message: string }>(`/campaigns/${campaign_id}/reply`, {
    method: "PATCH",
    body: JSON.stringify({ lead_id, replied }),
  });

// ── TEMPLATES ────────────────────────────────────────────────────────────────

export interface Template {
  id: number;
  name: string;
  subject: string;
  html_body: string;
  created_at?: string;
}

export const getTemplates = () => req<Template[]>("/templates");

export const createTemplate = (data: Omit<Template, "id" | "created_at">) =>
  req<Template>("/templates", { method: "POST", body: JSON.stringify(data) });

export const updateTemplate = (id: number, data: Partial<Template>) =>
  req<Template>(`/templates/${id}`, { method: "PUT", body: JSON.stringify(data) });

export const deleteTemplate = (id: number) =>
  req<{ message: string }>(`/templates/${id}`, { method: "DELETE" });

// ── STATS ────────────────────────────────────────────────────────────────────

export interface Stats {
  total_leads: number;
  leads_with_email: number;
  sent_today: number;
  reply_rate: number;
  total_sent: number;
  total_replied: number;
  weekly_leads: { week: string; leads: number }[];
  recent_campaigns: Campaign[];
}

export const getStats = () => req<Stats>("/stats");

// ── SETTINGS ─────────────────────────────────────────────────────────────────

export interface Settings {
  max_emails_per_day: number;
}

export const getSettings = () => req<Settings>("/settings");

export const saveSettings = (data: Partial<Settings>) =>
  req<{ message: string }>("/settings", {
    method: "POST",
    body: JSON.stringify(data),
  });

// ── GMAIL ────────────────────────────────────────────────────────────────────

export const gmailAuth = () =>
  req<{ message: string; email: string }>("/gmail/auth", { method: "POST" });

export const gmailStatus = () =>
  req<{ connected: boolean; email: string | null }>("/gmail/status");

export const sendTestEmail = (to_email: string, template_id: number) =>
  req<{ message: string }>("/gmail/test", {
    method: "POST",
    body: JSON.stringify({ to_email, template_id }),
  });

export const gmailDisconnect = () =>
  req<{ message: string }>("/gmail/disconnect", { method: "POST" });
