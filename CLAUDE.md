# CLAUDE.md — Prospector

Leia este arquivo **antes de qualquer ação** no projeto.

---

## O que é o Prospector

Sistema desktop pessoal (não é produto vendido) em Python + React que:
1. **Busca automática** por CNAE diretamente nos arquivos da Receita Federal (download automático, sem upload manual)
2. Filtra empresas: apenas ATIVAS com telefone (email coletado quando disponível)
3. Enriquece via **BrasilAPI** (razão social, endereço completo, validação)
4. Extrai emails dos sites via **BeautifulSoup4** (para leads sem email na RF)
5. Armazena tudo localmente em **SQLite**
6. Dispara campanhas de cold email via **Gmail API (OAuth2)**

**Para quem:** Uso exclusivo do Caetano. Ferramenta de prospecção para vender o CaetanoRevive (e futuros produtos) no **Brasil**.
**Conta de email de prospecção:** `caetanorevive@gmail.com`
**Fonte de leads:** Receita Federal → arquivos Estabelecimentos (download automático via Nextcloud SERPRO+)

---

## Stack Tecnológica

### Backend
- Python 3.11+ (ambiente conda em `D:\PORTFOLIO\Prospector\psp`)
- FastAPI rodando em `localhost:8004` ← **porta atual**
- SQLite (`data/prospector.db`)
- **Receita Federal** — download automático via Nextcloud SERPRO+ (arquivos Estabelecimentos, ~200-400MB cada)
- **BrasilAPI** — `https://brasilapi.com.br/api/cnpj/v1/{cnpj}` (enriquecimento, gratuito, sem auth)
- requests + BeautifulSoup4 (scraper de email via website)
- Gmail API OAuth2 (disparo de emails)

### Frontend
- React + Vite + TypeScript
- Design: **dark mode premium** (Linear-inspired, sem shadcn/ui classes — tudo inline styles)
- Tokens principais: `--bg: #070c07`, `--green-bright: #4ade80`, `--green-mid: #22c55e`
- Comunicação: `fetch("/api/...")` via proxy Vite → `localhost:8004`
- Tailwind CSS (apenas utilitários básicos, design via CSS vars inline)

### Distribuição
- PyInstaller 6.x → `.exe` — modo **onedir** (`dist/Prospector/Prospector.exe` + `_internal/`)
- Entry point: `launcher.py` (raiz do projeto)
- Frontend bundled em `_internal/frontend_dist/`, servido pelo FastAPI em produção
- Dados do usuário (DB, RF cache, credentials, token) ficam **ao lado do `.exe`**, nunca dentro do bundle

---

## Credenciais e Chaves de API

| Recurso | Localização |
|---|---|
| BrasilAPI | Sem chave — API pública gratuita |
| Google OAuth2 credentials (dev) | `psp.json` → copiar para `backend/core/credentials.json` |
| Google OAuth2 credentials (.exe) | `psp.json` → copiar para `dist/Prospector/credentials.json` |
| Gmail token (dev) | `backend/core/token.json` (criado automaticamente) |
| Gmail token (.exe) | `dist/Prospector/token.json` (criado automaticamente) |

**NUNCA commitar `credentials.json` ou `token.json`.**

---

## Paleta de Cores — Verde Pastel

```css
--color-bg:            #F1F8F1   /* background geral */
--color-surface:       #FFFFFF   /* cards e painéis */
--color-primary:       #388E3C   /* botões primários, badges ativos */
--color-primary-light: #A5D6A7   /* hover, bordas de destaque */
--color-accent:        #E8F5E9   /* backgrounds de seções */
--color-text:          #1B5E20   /* texto principal */
--color-muted:         #757575   /* texto secundário */
--color-danger:        #CC3300   /* erros, falhas */
```

---

## Estrutura de Pastas

```
D:\PORTFOLIO\Prospector\
├── CLAUDE.md
├── PROSPECTOR_PROJECT_BRIEF.txt
├── Prospector.md
├── psp.json                      ← credenciais Google OAuth2 (fonte)
├── launcher.py                   ← entry point do .exe (NÃO é o main.py!)
├── prospector.spec               ← configuração PyInstaller
├── prospector.ico                ← ícone do .exe
├── psp/                          ← ambiente conda Python 3.11
│
├── requirements.txt
├── .env                          ← variáveis de ambiente (não commitar)
├── .gitignore
│
├── backend/
│   ├── main.py                   ← FastAPI entry point + todas as rotas
│   ├── core/
│   │   ├── __init__.py
│   │   ├── rf_downloader.py      ← download + parse arquivos RF (Nextcloud SERPRO+)
│   │   ├── brasilapi.py          ← enriquecimento de CNPJ via BrasilAPI
│   │   ├── cnpj_import.py        ← parser de CSV manual de CNPJs
│   │   ├── scraper.py            ← BeautifulSoup4 extrator de email
│   │   ├── gmail.py              ← Gmail API OAuth2
│   │   ├── reporter.py           ← métricas para dashboard
│   │   ├── credentials.json      ← OAuth2 (não commitar)
│   │   └── token.json            ← gerado automaticamente (não commitar)
│   └── database/
│       ├── __init__.py
│       ├── db.py                 ← conexão e setup SQLite
│       └── models.py             ← criação das 4 tabelas
│
├── frontend/
│   ├── package.json
│   ├── vite.config.ts
│   ├── tailwind.config.ts
│   └── src/
│       ├── main.tsx
│       ├── App.tsx
│       ├── lib/
│       │   ├── api.ts            ← todas as funções fetch() para FastAPI
│       │   └── theme.ts          ← variáveis CSS verde pastel
│       ├── components/
│       │   ├── Sidebar.tsx       ← shadcn sidebar-07
│       │   ├── LeadTable.tsx
│       │   ├── EmailPreview.tsx
│       │   └── StatusBadge.tsx
│       └── pages/
│           ├── Dashboard.tsx
│           ├── Search.tsx
│           ├── Leads.tsx
│           ├── Campaigns.tsx
│           ├── Templates.tsx
│           └── Settings.tsx
│
└── data/
    └── prospector.db             ← SQLite local
```

---

## Banco de Dados — 4 Tabelas SQLite

### leads
| Campo | Tipo | Notas |
|---|---|---|
| id | INTEGER PK AUTOINCREMENT | |
| cnpj | TEXT UNIQUE | 14 dígitos sem formatação |
| razao_social | TEXT | nome oficial Receita Federal |
| nome_fantasia | TEXT | nome comercial |
| phone | TEXT | DDD+número da BrasilAPI |
| website | TEXT | preenchido pelo scraper |
| email | TEXT | da BrasilAPI ou scraper |
| logradouro, numero, bairro | TEXT | endereço da Receita Federal |
| municipio | TEXT | cidade |
| uf | TEXT | estado (2 letras) |
| cep | TEXT | só dígitos |
| cnae | TEXT | código CNAE principal |
| cnae_descricao | TEXT | descrição do CNAE |
| niche | TEXT | nicho definido pelo usuário no import |
| situacao | TEXT | ATIVA / BAIXADA / etc |
| email_status | TEXT | null / found / not_found |
| lead_status | TEXT DEFAULT 'new' | new / contacted / replied / converted / removed |
| created_at | DATETIME | |

### campaigns
| Campo | Tipo |
|---|---|
| id | INTEGER PK |
| name, niche | TEXT |
| template_id | INTEGER FK → templates.id |
| total_sent | INTEGER DEFAULT 0 |
| created_at | DATETIME |

### email_logs
| Campo | Tipo |
|---|---|
| id | INTEGER PK |
| lead_id | INTEGER FK → leads.id |
| campaign_id | INTEGER FK → campaigns.id |
| subject | TEXT |
| sent_at | DATETIME |
| status | TEXT (sent / failed) |
| replied | BOOLEAN DEFAULT FALSE |

### templates
| Campo | Tipo |
|---|---|
| id | INTEGER PK |
| name | TEXT |
| subject | TEXT |
| html_body | TEXT (HTML completo) |
| created_at | DATETIME |

---

## Rotas FastAPI

```
BUSCA RF (AUTOMÁTICA)
POST   /api/search-cnae         Inicia busca por CNAE nos arquivos RF (download automático, background)
GET    /api/search-progress     Status da busca em background (fases: init/download/scan/enrich/done)
GET    /api/rf-cache            Lista arquivos RF em cache (data/rf_cache/)

IMPORTAÇÃO CSV (MANUAL)
POST   /api/import-cnpj         Upload CSV + niche → extrai CNPJs → enriquece via BrasilAPI (background)
GET    /api/import-progress     Status do enriquecimento em background

LEADS
POST   /api/scrape-emails       Roda scraper nos leads sem email (usa website)
GET    /api/leads               Lista leads (filtros: nicho, municipio, uf, status, email, has_email, available_for_campaign)
                                  has_email=true → apenas leads com email IS NOT NULL
                                  available_for_campaign=true → exclui leads em cooldown (30 dias)
                                  Retorna também: in_cooldown (count de leads com email no cooldown)
POST   /api/leads               Cria lead manualmente
PATCH  /api/leads/{id}          Atualiza status/campos
DELETE /api/leads/{id}          Remove lead + email_logs relacionados
GET    /api/leads/export        Export CSV
GET    /api/niches              Lista todos os nichos distintos no banco

CAMPANHAS
GET    /api/campaigns           Lista campanhas
POST   /api/campaigns           Cria e dispara campanha
DELETE /api/campaigns/{id}      Deleta campanha + email_logs associados
PATCH  /api/campaigns/{id}/reply  Marca lead como respondeu

TEMPLATES
GET    /api/templates
POST   /api/templates
PUT    /api/templates/{id}
DELETE /api/templates/{id}

CONFIG / STATUS
GET    /api/stats               Métricas para dashboard
GET    /api/settings
POST   /api/settings
POST   /api/gmail/auth          Inicia fluxo OAuth2
GET    /api/gmail/status
POST   /api/gmail/test          Envia email de teste (to_email, template_id)
POST   /api/gmail/disconnect    Remove token
GET    /api/scrape-progress     Status do scraper em background
```

---

## Integrações de API

### Receita Federal — Arquivos Bulk CNPJ (Automático)
- **Servidor:** Nextcloud SERPRO+ — `https://arquivos.receitafederal.gov.br/`
- **Auth:** Basic `(share_token, "")` — token público: `gn672Ad4CF8N6TK`
- **URL dos arquivos:** `https://arquivos.receitafederal.gov.br/public.php/webdav/Dados/Cadastros/CNPJ/{YYYY-MM}/Estabelecimentos{0-9}.zip`
- **Municipios:** mesmo caminho, arquivo `Municipios.zip`
- Encoding: `latin-1`, separador `;`, sem cabeçalho, ~30 colunas por linha
- Cache local em `data/rf_cache/` — válido por 32 dias (sem re-download)
- Filtros aplicados: situação ATIVA (código `02`) + telefone obrigatório + email opcional
- CNAE normalizado: `9602-5/01` → `9602501` (strip de não-dígitos)

### dados.gov.br — Import CSV manual (opcional)
- Arquivo: Estabelecimentos (CSV, separador `;`, encoding `latin-1`, sem cabeçalho)
- Formato CNPJ: 3 colunas → CNPJ_BASICO(8) + CNPJ_ORDEM(4) + CNPJ_DV(2)
- Fluxo: usuário baixa manualmente e faz upload via aba "Importar CSV"

### BrasilAPI — Enriquecimento CNPJ
- Endpoint: `GET https://brasilapi.com.br/api/cnpj/v1/{cnpj14digitos}`
- Gratuito, sem autenticação
- Rate limit: delay de 0.35s entre chamadas (configurado em `brasilapi.py`)
- Retorna: razao_social, nome_fantasia, situacao_cadastral, cnae, endereço, telefone, email
- Somente empresas com `situacao = ATIVA` são importadas
- Retry automático em caso de 429 (rate limit)

### Scraper de Email
- Regex: `r'[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}'`
- Fluxo: homepage → /contact → /about → /contact-us
- Timeout: 8 segundos por request
- Filtrar falsos positivos: @example, @sentry, @test, @domain
- Taxa esperada: ~50% de sucesso

### Gmail API
- Scope: `https://www.googleapis.com/auth/gmail.send` — **SOMENTE este scope**
- Não usar `users.getProfile` — scope insuficiente, retorna 403. Email fixo: `caetanorevive@gmail.com`
- Limite: 500 emails/dia (usar no máx 50/dia)
- credentials.json vem de `psp.json` (OAuth2 tipo Desktop App)
- Variáveis nos templates: `{BUSINESS_NAME}`, `{OWNER_NAME}`, `{BOOKING_URL}`, `{BOOKING_DOMAIN}`
- Emails enviados como `multipart/alternative` com texto puro (fallback) + HTML UTF-8

---

## Interface — 6 Páginas

| Página | shadcn/ui Block | Componentes |
|---|---|---|
| Dashboard | dashboard-01 | Cards + Chart + Table |
| Buscar Leads | Formulário custom | Input + Slider + Progress + DataTable |
| Leads Salvos | DataTable + Badge | Filtros, export CSV, status badges |
| Campanhas | DataTable + Dialog + Switch | Nova campanha, histórico, toggle "respondeu" |
| Templates | Card + Textarea + Dialog | Editor HTML, preview visual |
| Configurações | Input + Button + Label | Gmail OAuth, limites diários, teste de email |

**Sidebar global:** shadcn `sidebar-07` (colapsa para ícones)

### Status Badges (Leads)
| Status | Cor |
|---|---|
| new | verde claro |
| contacted | azul |
| replied | dourado |
| converted | verde escuro |
| removed | cinza |

---

## Ambiente de Desenvolvimento

### Ativar ambiente Python
```bash
conda activate "D:\PORTFOLIO\Prospector\psp"
```

### Rodar backend
```bash
# Rodar da raiz do projeto (D:\PORTFOLIO\Prospector)
/d/PORTFOLIO/Prospector/psp/python.exe -m uvicorn backend.main:app --port 8004
```
> **IMPORTANTE:** Sempre rodar da raiz (`D:\PORTFOLIO\Prospector`), não de dentro de `backend/`.
> A porta é **8004**. Se trocar de porta, atualizar `frontend/vite.config.ts` → `target`.

### Rodar frontend
```bash
cd frontend
npm run dev
# Abre em localhost:5012 (ou próxima porta livre: 5013, 5014...)
```

### Matar processos presos na porta
```powershell
# No PowerShell do Windows:
Get-NetTCPConnection -LocalPort 8004 | Select-Object OwningProcess
Stop-Process -Id <PID> -Force
```

### Reiniciar backend pelo Claude Code (bash Git)
```bash
# SEMPRE limpar pycache antes — timestamp NTFS do Windows causa bug de 0 resultados na busca RF
rm -rf /d/PORTFOLIO/Prospector/backend/core/__pycache__/
rm -rf /d/PORTFOLIO/Prospector/backend/__pycache__/
rm -rf /d/PORTFOLIO/Prospector/backend/database/__pycache__/

# Matar processo antigo e subir novamente
/c/Windows/System32/WindowsPowerShell/v1.0/powershell.exe -Command "try { Stop-Process -Id (Get-NetTCPConnection -LocalPort 8004 -ErrorAction Stop).OwningProcess -Force } catch {}"
/d/PORTFOLIO/Prospector/psp/python.exe -m uvicorn backend.main:app --port 8004 &
```

### Instalar dependências Python
```bash
pip install fastapi uvicorn requests beautifulsoup4 \
    google-auth google-auth-oauthlib google-auth-httplib2 \
    google-api-python-client python-dotenv python-multipart
```

### Instalar shadcn/ui components
```bash
npx shadcn@latest add sidebar card table button input badge \
    chart dialog switch select label separator progress slider
```

---

## Ordem de Build

### Backend (começar aqui)
1. Estrutura de pastas completa
2. `database/db.py` + `database/models.py` (4 tabelas)
3. `core/rf_downloader.py` (download Nextcloud + parse RF)
4. `core/brasilapi.py` (enriquecimento CNPJ)
5. `core/cnpj_import.py` (parser CSV manual)
6. `core/scraper.py` (extrator de email)
7. `core/gmail.py` (OAuth2 + envio)
8. `core/reporter.py` (métricas)
9. `backend/main.py` (FastAPI + todas as rotas)
10. Testar em `http://localhost:8004/docs`
11. Testar busca RF por CNAE real
12. Testar scraper em 5 sites reais

### Frontend (após backend funcionar)
11. Ler `github.com/Dammyjay93/interface-design`
12. Criar projeto React + Vite + shadcn/ui em `/frontend`
13. Configurar `theme.ts` com cores verde pastel
14. `Sidebar.tsx` com sidebar-07
15. `lib/api.ts` (chamadas FastAPI)
16-21. Páginas: Dashboard, Search, Leads, Campaigns, Templates, Settings
22. Carregar templates HTML do CaetanoRevive no banco
23. Testar fluxo completo

### Compilação (somente após tudo testado)
24. `cd frontend && npm run build` → `frontend/dist/`
25. Matar o Prospector.exe se estiver rodando
26. `cd D:\PORTFOLIO\Prospector`
27. `/d/PORTFOLIO/Prospector/psp/python.exe -m PyInstaller -y prospector.spec`
28. Copiar credentials: `cp psp.json dist/Prospector/credentials.json`
29. Testar: abrir `dist/Prospector/Prospector.exe` — browser deve abrir em ~2.5s

---

## O que NÃO fazer

- Não usar Yelp Fusion API (projeto migrado para RF + BrasilAPI)
- Não usar URL antiga da RF: `arquivos.receitafederal.gov.br/dados/cnpj/...` → retorna 404
- URL correta da RF: `arquivos.receitafederal.gov.br/public.php/webdav/Dados/Cadastros/CNPJ/{YYYY-MM}/...` com auth Basic
- Não usar Google Places API (tem custo)
- Não fazer Yellow Pages scraping
- Não implementar sistema de login (uso pessoal)
- Não conectar diretamente com CaetanoRevive (projetos separados)
- Não compilar `.exe` antes de testar tudo no browser
- Não usar `onefile` no PyInstaller com uvicorn/FastAPI — causa problemas de threading; usar `onedir` (COLLECT)
- Não usar `block_cipher` nem `cipher=` no `.spec` — removido no PyInstaller 6.x, quebra o build
- Não esquecer de copiar `credentials.json` para ao lado do `.exe` após cada recompilação — ele fica FORA do bundle
- Não usar `console=True` no `.spec` em produção — abre janela de terminal feia; usar `console=False`
- Não usar `getProfile` da Gmail API — scope `gmail.send` não autoriza
- Não rodar uvicorn de dentro da pasta `backend/` (imports quebram)
- Não usar `position: fixed` dentro de elementos com animação CSS `transform` (quebra posicionamento)
- Não referenciar campos antigos: `yelp_id`, `name`, `city`, `state`, `rating`, `review_count`
- Campos corretos: `cnpj`, `razao_social`, `nome_fantasia`, `municipio`, `uf`
- Não reiniciar o uvicorn sem antes limpar `__pycache__` — causa busca RF retornar 0 resultados
- Não usar `email_status: "found"` como único filtro de campanhas — usar `has_email=true` (email IS NOT NULL)

---

## Templates Pré-carregados

Ao inicializar o banco, inserir automaticamente:
- "CaetanoRevive - Barbershop"
- "CaetanoRevive - Hair Salon"
- "Template em branco"

---

## Decisões Técnicas Importantes

### SQLite — Evitar "database is locked"
`database/db.py` usa `isolation_level=None` (autocommit) + `PRAGMA busy_timeout=30000`.
- `isolation_level=None` evita transações implícitas do Python que conflitam com writes concorrentes
- `conn.commit()` no código é no-op mas mantido por clareza
- `PRAGMA journal_mode=WAL` é chamado em cada `get_connection()` (idempotente)
- `PRAGMA foreign_keys=ON` ativo — **ao deletar um lead, deletar `email_logs` primeiro**

### Delete de Lead
Rota `DELETE /api/leads/{id}` **deve** deletar email_logs antes do lead:
```python
conn.execute("DELETE FROM email_logs WHERE lead_id = ?", (lead_id,))
conn.execute("DELETE FROM leads WHERE id = ?", (lead_id,))
```

### Modais (`position: fixed`)
Todos os modais devem ser renderizados **fora** de qualquer `div` com animação CSS (`className="fade-in"`).
Usar React Fragment `<>...</>` para colocar o modal antes do wrapper animado.

### Proxy Vite
`frontend/vite.config.ts` deve apontar para a porta do backend:
```ts
proxy: { "/api": { target: "http://localhost:8004" } }
```
Se mudar a porta do backend, atualizar aqui também.

### Municípios RF — Aspas no CSV
O arquivo `Municipios.zip` da RF tem campos com aspas: `"9701";"BRASILIA"`.
O parser **deve** fazer `.strip('"')` em código e nome, senão o lookup falha e o campo `municipio` fica com código numérico em vez do nome.
Função correta: `_parse_municipios()` em `rf_downloader.py` — usar `parts[i].strip().strip('"')`.

### Municípios RF — Filtro com Acentos
O filtro de município na busca RF usa `_strip_accents()` (unicodedata NFD) para comparação case+accent-insensitive.
"sao paulo" encontra "São Paulo", "Sao Paulo", "SÃO PAULO" etc.
Sem isso, qualquer município com acento retornaria 0 resultados.

### Delete de Campanha
Rota `DELETE /api/campaigns/{id}` **deve** deletar email_logs antes da campanha:
```python
conn.execute("DELETE FROM email_logs WHERE campaign_id = ?", (campaign_id,))
conn.execute("DELETE FROM campaigns WHERE id = ?", (campaign_id,))
```

### email_status ao enriquecer via BrasilAPI
Quando BrasilAPI retorna email durante a fase de enriquecimento (`_run_cnae_search`), **sempre** atualizar `email_status = "found"` junto com o email:
```python
if enriched.get("email"):
    lead["email"] = enriched["email"]
    lead["email_status"] = "found"  # ← obrigatório
```
Sem isso, o lead tem email no banco mas `email_status = null`, e não aparece nos filtros de campanha.

### Python `__pycache__` — Problema de Timestamp no Windows
Ao editar `.py` files com o Claude Code no Windows, o timestamp do arquivo pode não mudar (resolução de 1s no NTFS), fazendo Python usar o `.pyc` antigo em vez do código novo.
**Sintoma confirmado (2025-03-25):** busca RF varre 70M+ registros e retorna 0 resultados — pycache executa código antigo que não faz o match do CNAE.
**SEMPRE antes de reiniciar o uvicorn:**
```bash
rm -rf /d/PORTFOLIO/Prospector/backend/core/__pycache__/
rm -rf /d/PORTFOLIO/Prospector/backend/__pycache__/
rm -rf /d/PORTFOLIO/Prospector/backend/database/__pycache__/
# Depois reiniciar o uvicorn
```

### Email Opcional na Busca RF
Filtro da busca RF exige apenas: ATIVA + telefone. Email é coletado se presente, não é obrigatório.
CNAEs de comércio varejista (ex: `4781-4/00`) raramente têm email cadastrado na RF (~5-10%).
Leads sem email ficam com `email_status = null` para scraping posterior.

### Filtro de Leads na Campanha
O modal "Nova Campanha" usa `has_email=true` + `available_for_campaign=true` + niche filter via API.
**Não usar** `email_status: "found"` como único filtro — leads enriquecidos via BrasilAPI podem ter email mas `email_status = null`.
Ao mudar o nicho no modal, a lista recarrega do servidor — não filtra client-side.

### Cooldown de 30 dias por Lead
Cada lead só pode receber email a cada 30 dias (anti-spam, proteção de reputação).
- `COOLDOWN_DAYS = 30` definido em `main.py` — alterar lá para mudar o prazo
- `available_for_campaign=true` exclui leads com `email_logs.sent_at > now - 30 days`
- O modal mostra badge amarelo "X em cooldown (30 dias)" para transparência
- `POST /api/campaigns` aplica o filtro de cooldown automaticamente — mesmo que o frontend mande IDs de leads em cooldown, eles são ignorados no envio
- A resposta de `POST /api/campaigns` inclui `skipped_cooldown: N` informando quantos foram pulados

### Preview HTML em iframes
Sempre usar `key={htmlBody}` no iframe de preview para forçar re-render ao mudar conteúdo.
Thumbnails de template: iframe fixo em 600px de largura (padrão email) + `transform: scale(0.5)`.

### Design System Atual
Interface dark mode, **sem classes Tailwind no layout** — apenas inline `style={{}}`.
Tokens definidos em `frontend/src/index.css`. Ver Dashboard.tsx como referência de padrão.

---

## Compilação PyInstaller — Regras Definitivas

### Estrutura do output
```
dist/Prospector/
├── Prospector.exe       ← duplo clique para abrir
├── credentials.json     ← copiar de psp.json após cada build (NUNCA no bundle)
├── token.json           ← gerado automaticamente no 1º login Gmail
├── error.log            ← aparece somente se o .exe crashar na inicialização
├── data/                ← criado automaticamente no 1º launch
│   ├── prospector.db
│   └── rf_cache/
└── _internal/           ← DLLs, módulos Python, frontend — NÃO mexer
    └── frontend_dist/   ← build do React bundled aqui
```

### Separação de caminhos: bundle vs dados do usuário
- **`sys._MEIPASS`** → assets somente leitura (frontend_dist, módulos Python) — destruído e recriado a cada execução
- **`Path(sys.executable).parent`** → dados persistentes (DB, credentials, token, RF cache) — ao lado do .exe

Funções de caminho em cada módulo:
```python
# db.py e main.py
def _get_base_dir() -> Path:
    if getattr(sys, "frozen", False):
        return Path(sys.executable).parent
    return Path(__file__).parent.parent  # raiz do projeto

# gmail.py
def _get_user_data_dir() -> Path:
    if getattr(sys, "frozen", False):
        return Path(sys.executable).parent
    return Path(__file__).parent  # backend/core/ em dev
```

### launcher.py — regras obrigatórias
1. Redirecionar `sys.stdout` e `sys.stderr` para `os.devnull` **antes de qualquer import** quando frozen
   - Sem isso, o uvicorn crasha silenciosamente com `console=False` (stdout é None no Windows)
2. `multiprocessing.freeze_support()` logo depois
3. Abrir browser em thread separada com `daemon=True` e delay de 2.5s
4. Se a porta 8004 já estiver em uso (processo anterior não fechou), matar via `taskkill` e aguardar 1s antes de subir
5. Capturar qualquer exceção → gravar `error.log` ao lado do `.exe` + `MessageBoxW` do Windows

### prospector.spec — regras obrigatórias (PyInstaller 6.x)
- **SEM** `block_cipher` e **SEM** `cipher=` — foram removidos no 6.x
- Usar `collect_all()` para: `uvicorn`, `starlette`, `fastapi`, `anyio`, `pydantic`, `h11`, `httptools`, `googleapiclient`, `google.auth`, `google_auth_oauthlib`, `requests`
  - Sem isso, módulos com lazy loading causam `ModuleNotFoundError` em runtime
- Incluir DLLs do Conda via glob automático:
  ```python
  CONDA_DLL_DIRS = [
      r"D:\PORTFOLIO\Prospector\psp\DLLs",
      r"D:\PORTFOLIO\Prospector\psp\Library\bin",
  ]
  ```
  Sem isso: `ImportError: DLL load failed while importing _ctypes / _ssl`
- `console=False` — sem janela de terminal
- `upx=False` — evita falsos positivos em antivírus
- Usar `COLLECT` (onedir) — **não** `onefile`; o onefile causa problemas com threading no uvicorn
- `icon="prospector.ico"`
- `frontend/dist` incluído como `("frontend/dist", "frontend_dist")`

### FastAPI — servindo o frontend no .exe
Em `backend/main.py`, ao final do arquivo (após todas as rotas API):
```python
_dist_dir = _get_bundle_dir()  # sys._MEIPASS/frontend_dist ou frontend/dist
if _dist_dir.exists():
    app.mount("/assets", StaticFiles(directory=str(_dist_dir / "assets")), name="assets")

    @app.get("/{full_path:path}")
    async def serve_spa(full_path: str):
        return FileResponse(str(_dist_dir / "index.html"))
```
A catch-all `/{full_path:path}` deve vir DEPOIS de todas as rotas `/api/` — FastAPI avalia em ordem.

### Após cada recompilação
```bash
cp psp.json dist/Prospector/credentials.json
```
O `credentials.json` é removido junto com `dist/` no rebuild — sempre copiar de volta.
