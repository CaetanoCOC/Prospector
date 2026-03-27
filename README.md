<div align="center">

# 🔍 Prospector

**Da Receita Federal ao cold email — prospecção B2B automatizada, empacotada como `.exe`.**

*Transforma os dados públicos do CNPJ em uma pipeline de vendas completa, rodando 100% local no Windows.*

---

![Python](https://img.shields.io/badge/Python-3.11+-3776AB?style=for-the-badge&logo=python&logoColor=white)
![FastAPI](https://img.shields.io/badge/FastAPI-latest-009688?style=for-the-badge&logo=fastapi&logoColor=white)
![React](https://img.shields.io/badge/React-19-61DAFB?style=for-the-badge&logo=react&logoColor=black)
![TypeScript](https://img.shields.io/badge/TypeScript-5.9-3178C6?style=for-the-badge&logo=typescript&logoColor=white)
![SQLite](https://img.shields.io/badge/SQLite-local-003B57?style=for-the-badge&logo=sqlite&logoColor=white)
![Gmail](https://img.shields.io/badge/Gmail_API-OAuth2-EA4335?style=for-the-badge&logo=gmail&logoColor=white)
![Platform](https://img.shields.io/badge/Platform-Windows-0078D4?style=for-the-badge&logo=windows&logoColor=white)

</div>

---

## 🚀 O que é

**Prospector** é um sistema desktop completo que integra dados oficiais do governo brasileiro para prospecção de negócios B2B. Ele consome diretamente os arquivos bulk de **CNPJ da Receita Federal do Brasil**, interpreta cadastros federais (CNAE, situação cadastral, dados de estabelecimento) e os transforma em uma pipeline de vendas funcional — tudo rodando localmente, sem nuvem.

> **Relevância fiscal:** o sistema processa os mesmos arquivos usados por auditores e analistas tributários — demonstrando domínio prático da estrutura de dados do CNPJ, codificação CNAE, situação cadastral e formatos de distribuição pública da Receita Federal.

---

## ⚡ Fluxo Completo

```
[Receita Federal — SERPRO+]
        ↓  download automático dos arquivos bulk (~400 MB)
        ↓  parse: latin-1 · separador ";" · 30 colunas · sem cabeçalho
        ↓  filtro: situação ATIVA (código 02) + telefone obrigatório
        ↓  normalização CNAE: "9602-5/01" → "9602501"

[BrasilAPI]
        ↓  enriquecimento: razão social, endereço, telefone, email
        ↓  rate limit: 0.35s entre chamadas + retry em 429

[Scraper — BeautifulSoup4]
        ↓  extração de email via website (homepage → /contact → /about)
        ↓  taxa de sucesso: ~50%

[Gmail API — OAuth2]
        ↓  disparo de campanhas com templates HTML personalizados
        ↓  cooldown automático de 30 dias por lead (anti-spam)

[SQLite local]
        ↓  leads · campanhas · email_logs · templates
        ↓  WAL + busy_timeout para writes concorrentes

[Interface React]
        ↓  dashboard · filtros · export CSV · histórico de campanhas
```

---

## ✨ Funcionalidades

| Funcionalidade | Descrição |
|---|---|
| 🔎 **Busca por CNAE** | Filtra empresas ativas nos arquivos bulk da RFB por código CNAE |
| ⬇️ **Download automático** | Baixa e faz cache dos arquivos Estabelecimentos (~200–400 MB cada) |
| 🏢 **Enriquecimento CNPJ** | Integração com BrasilAPI para dados completos do cadastro federal |
| 🕸️ **Scraper de email** | Extrai contatos dos sites das empresas via BeautifulSoup4 |
| 📧 **Campanhas de email** | Templates HTML com variáveis dinâmicas, disparados via Gmail API OAuth2 |
| 🛡️ **Cooldown inteligente** | Proteção automática contra re-envio (30 dias por lead) |
| 📊 **Dashboard com métricas** | Leads coletados, emails enviados, taxa de resposta |
| 📥 **Export CSV** | Exporta qualquer seleção de leads com um clique |
| 🖥️ **Aplicativo .exe** | Distribuído como app Windows nativo via PyInstaller — sem instalar Python |

---

## 🏛️ Dados da Receita Federal — Estrutura Processada

O sistema trabalha com os arquivos oficiais do **Cadastro Nacional de Pessoas Jurídicas (CNPJ)** distribuídos pelo SERPRO via Nextcloud:

```
Arquivo:     Estabelecimentos{0-9}.zip
Fonte:       arquivos.receitafederal.gov.br (Nextcloud SERPRO+)
Encoding:    latin-1
Separador:   ;  (sem cabeçalho)
Tamanho:     ~200–400 MB por arquivo (10 arquivos no total)
Frequência:  atualização mensal
Cache local: válido por 32 dias em data/rf_cache/
```

**Campos interpretados pelo sistema:**

| Posição | Campo | Uso |
|---------|-------|-----|
| 0–2 | CNPJ Básico + Ordem + DV | Composição do CNPJ de 14 dígitos |
| 4 | Situação Cadastral | Filtro: apenas código `02` (ATIVA) |
| 11 | CNAE Principal | Busca e categorização |
| 17–22 | Logradouro, Número, Bairro, CEP, UF, Município | Endereçamento |
| 19 | DDD + Telefone 1 | Filtro: obrigatório |
| 27 | Email | Coleta quando disponível |

---

## 🏗️ Arquitetura

```
Máquina local — 100% privado, sem servidor externo
┌──────────────────────────────────────────────────────┐
│  Prospector.exe                                      │
│                                                      │
│  FastAPI (localhost:8004)  ←→  React SPA             │
│            ↕                                         │
│       SQLite local                                   │
│            ↕                        ↕                │
│  Receita Federal SERPRO+        BrasilAPI            │
│  (arquivos bulk CNPJ)           (enriquecimento)     │
│            ↕                        ↕                │
│  Scraper BeautifulSoup4         Gmail API OAuth2     │
└──────────────────────────────────────────────────────┘
```

---

## 🗄️ Banco de Dados — SQLite

4 tabelas com `journal_mode=WAL` e `busy_timeout=30000ms` para operações concorrentes seguras:

<details>
<summary><strong>leads</strong> — dados cadastrais completos</summary>

```sql
leads (
  id, cnpj, razao_social, nome_fantasia,
  phone, website, email,
  logradouro, numero, bairro, municipio, uf, cep,
  cnae, cnae_descricao, niche, situacao,
  email_status, lead_status, created_at
)
```
</details>

<details>
<summary><strong>campaigns</strong> — campanhas de email disparadas</summary>

```sql
campaigns (id, name, niche, template_id, total_sent, created_at)
```
</details>

<details>
<summary><strong>email_logs</strong> — histórico de envios por lead/campanha</summary>

```sql
email_logs (id, lead_id, campaign_id, subject, sent_at, status, replied)
```
</details>

<details>
<summary><strong>templates</strong> — templates HTML com variáveis dinâmicas</summary>

```sql
templates (id, name, subject, html_body, created_at)
```
</details>

---

## 📁 Estrutura de Pastas

```
Prospector/
├── 🚀 launcher.py               ← Entry point do .exe
├── 📦 prospector.spec           ← Configuração PyInstaller
├── 📋 requirements.txt
│
├── backend/
│   ├── main.py                  ← FastAPI + todas as rotas (30+ endpoints)
│   └── core/
│       ├── rf_downloader.py     ← Download + parse arquivos Receita Federal
│       ├── brasilapi.py         ← Enriquecimento de CNPJ via BrasilAPI
│       ├── scraper.py           ← Extrator de email (BeautifulSoup4)
│       ├── gmail.py             ← Gmail API OAuth2
│       └── reporter.py         ← Métricas para o dashboard
│   └── database/
│       ├── db.py                ← Conexão SQLite (WAL + autocommit)
│       └── models.py            ← Criação das 4 tabelas
│
├── frontend/src/
│   ├── lib/api.ts               ← Todas as chamadas para o FastAPI
│   ├── components/
│   │   ├── Sidebar.tsx
│   │   └── StatusBadge.tsx
│   └── pages/
│       ├── Dashboard.tsx
│       ├── Search.tsx           ← Busca por CNAE com progress em tempo real
│       ├── Leads.tsx            ← Leads com filtros + export CSV
│       ├── Campaigns.tsx        ← Campanhas + histórico de envios
│       ├── Templates.tsx        ← Editor HTML com preview
│       └── Settings.tsx         ← Gmail OAuth + configurações
│
└── data/
    └── prospector.db            ← Criado automaticamente no primeiro launch
```

---

## 🔌 API REST — Principais Endpoints

```bash
# 🏛️ Receita Federal
POST  /api/search-cnae        # Busca empresas por CNAE (background job)
GET   /api/search-progress    # Status em tempo real (fases: download/scan/enrich)
GET   /api/rf-cache           # Arquivos RF em cache local

# 👥 Leads
GET   /api/leads              # Lista com filtros (uf, municipio, niche, has_email…)
GET   /api/leads/export       # Export CSV
PATCH /api/leads/{id}         # Atualiza status
DELETE /api/leads/{id}        # Remove lead + logs relacionados

# 📧 Campanhas
POST  /api/campaigns          # Cria e dispara campanha (respeita cooldown 30 dias)
GET   /api/campaigns          # Histórico completo

# 🔐 Gmail
POST  /api/gmail/auth         # Inicia fluxo OAuth2
GET   /api/gmail/status       # Verifica conexão
POST  /api/gmail/test         # Envia email de teste
```

> Documentação interativa disponível em `http://localhost:8004/docs`

---

## 🧰 Stack Tecnológica

### Backend

| Tecnologia | Versão | Uso |
|-----------|--------|-----|
| 🐍 Python | 3.11+ | Linguagem principal |
| ⚡ FastAPI | latest | API REST em `localhost:8004` |
| 🗄️ SQLite | built-in | Banco de dados local |
| 🌐 requests | latest | HTTP client para RF e BrasilAPI |
| 🕸️ BeautifulSoup4 | latest | Scraper de email |
| 📧 google-api-python-client | latest | Gmail API OAuth2 |
| 🦄 uvicorn | latest | Servidor ASGI |

### Frontend

| Tecnologia | Versão | Uso |
|-----------|--------|-----|
| ⚛️ React | 19 | SPA |
| 🔷 TypeScript | 5.9 | Tipagem estática |
| ⚡ Vite | 8 | Bundler e dev server |
| 🧩 Radix UI | latest | Componentes acessíveis |
| 📊 Recharts | 3 | Gráficos do dashboard |
| 🎨 Tailwind CSS | 4 | Utilitários de estilo |

### Distribuição

- **PyInstaller 6.x** — modo `onedir`, sem console, ícone customizado
- Frontend bundled em `_internal/frontend_dist/` dentro do `.exe`
- Dados persistentes (DB, credenciais, cache RF) ficam ao lado do `.exe`, nunca no bundle

---

## ⚙️ Configuração para Desenvolvimento

### 1. Backend

```bash
pip install -r requirements.txt

# Roda na porta 8004
python -m uvicorn backend.main:app --port 8004
```

### 2. Frontend

```bash
cd frontend
npm install
npm run dev     # → localhost:5012
```

### 3. Gmail API

1. Acesse [console.cloud.google.com](https://console.cloud.google.com)
2. Crie um projeto → ative a **Gmail API**
3. Crie credenciais OAuth2 do tipo **Desktop App**
4. Salve como `backend/core/credentials.json`
5. Na primeira execução o browser abrirá para autorização → `token.json` gerado automaticamente

> ⚠️ `credentials.json` e `token.json` estão no `.gitignore` e **nunca devem ser commitados**.

---

## 📦 Compilação para Windows (.exe)

```bash
# 1. Build do frontend
cd frontend && npm run build

# 2. Gerar o executável
python -m PyInstaller -y prospector.spec

# 3. Copiar credenciais para ao lado do .exe
cp credentials.json dist/Prospector/credentials.json

# 4. Executar
dist/Prospector/Prospector.exe
```

---

## 🧠 Decisões Técnicas

<details>
<summary><strong>SQLite com WAL mode</strong></summary>

Uso de `isolation_level=None` (autocommit) + `PRAGMA journal_mode=WAL` + `PRAGMA busy_timeout=30000` para suportar leituras simultâneas durante writes de background jobs sem travar a interface.
</details>

<details>
<summary><strong>Parse dos arquivos RF no Windows</strong></summary>

O timestamp NTFS tem resolução de 1 segundo, o que faz o Python reutilizar `.pyc` antigos ao editar arquivos. Solução: limpeza do `__pycache__` antes de cada restart do servidor em desenvolvimento.
</details>

<details>
<summary><strong>Municípios com aspas no CSV</strong></summary>

O arquivo `Municipios.zip` da RF usa aspas nos campos (`"9701";"BRASILIA"`), exigindo `.strip('"')` explícito no parser — caso contrário o lookup falha e o campo `municipio` fica com código numérico.
</details>

<details>
<summary><strong>Filtro de municípios com acentos</strong></summary>

Comparação case+accent-insensitive via `unicodedata.normalize('NFD')` — "sao paulo" encontra "São Paulo", "SÃO PAULO" etc.
</details>

<details>
<summary><strong>Gmail API scope mínimo</strong></summary>

Uso exclusivo de `gmail.send` — `getProfile` retorna 403 com esse scope, então o email do remetente é fixo em configuração.
</details>

---

## 💡 Sobre o Projeto

Desenvolvido como ferramenta pessoal de prospecção para vender o produto **[CaetanoRevive](https://github.com/seu-usuario/caetanorevive)** — um sistema de gestão para salões de beleza e barbearias. O Prospector resolve o problema de aquisição de clientes de forma escalável e automatizada, usando exclusivamente **fontes de dados públicas e oficiais do governo brasileiro**.

---

<div align="center">

*Projeto pessoal — código disponível como referência de portfólio.*

🇧🇷 Dados públicos · 🔒 100% local · ⚡ Zero cloud

</div>
