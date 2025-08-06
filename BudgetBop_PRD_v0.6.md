
# Budget Bop – Product Requirements Document (v0.6)
_Last updated: 2025-08-06_

---

## 1 · Product Overview
**Vision** Turn the once-a-month budgeting ritual into a five‑minute, clipboard‑powered web app—zero bank logins, zero spreadsheets.  
**Tag line (MVP)** *“Paste. Review. Decide.”*

---

## 2 · Goals & Success Metrics

| Goal | Metric | Target |
|------|--------|--------|
| Import speed | Time to ingest all accounts on the 1<sup>st</sup> | **≤ 5 min** by month 3 |
| Auto‑categorisation | % transactions auto‑tagged on first import | **≥ 80 %** by month 3 |
| Data completeness | Months where completeness bar = 100 % | **100 %** |
| Effort reduction | Self‑rated effort vs. spreadsheet (1–5) | **≥ 4** |

---

## 3 · Personas & Core Use Cases

### Primary persona – Household Budgeter
Tech‑savvy, privacy‑conscious, reviews finances once per calendar month with spouse.

| ID | User story | Acceptance criteria |
|----|------------|---------------------|
| **U0 – Google sign‑in** | Sign in with Google; no passwords. | OAuth completes; session cookie set. |
| **U1 – Demographics** | Enter country, province/state, age. | Required; saved to profile. |
| **U2 – AI category setup** | Editable table of suggested categories & budgets, generated from U1. | Defaults appear ≤ 2 s; at least one category must exist. |
| **U3 – Enter app** | Wizard finished → `/dashboard`; future logins skip wizard. | `onboarding_complete=true`. |
| **U4 – Clipboard import** | Paste “recent activity” table; transactions appear. | Column‑mapping wizard; dedupe; uncategorised flagged. |
| **U5 – Bulk import text/image** | Paste raw text **or** drop receipt/screenshot on Income or Expenses page; AI parses entries. | Tesseract.js OCR for images; GPT‑4o‑mini parses; user approves. |
| **U6 – Auto‑categorise** | Vendor → category rules remembered. | Rule created on correction; editable. |
| **U7 – Month‑end review** | Dashboard shows spend vs. budget, savings rate. | Loads < 1 s; completeness 100 %. |
| **U8 – Data backup** | Export / import full JSON. | Round‑trip idempotent. |

---

## 4 · Functional Requirements

### 4.1 Authentication & Hosting (free‑tier)
* **Next.js 14** on **Vercel (Hobby)**  
* **NextAuth.js** Google provider — 14‑day http‑only session cookie  
* Secrets held in Vercel env vars

### 4.2 Data Storage
* **Supabase (free)** Postgres tables `users, profiles, categories, budgets, accounts, transactions, rules`  
* Row‑level security linked to Supabase UID  
* Optional Dexie cache for offline read‑only dashboard

### 4.3 Onboarding Wizard
1. **DemographicsForm** → `profiles`  
2. **CategoryAIWizard** – calls GPT‑4o‑mini (GitHub dev key) → returns `{name, group, default_budget}` list, editable shadcn `<Table>`  
3. Completion sets `onboarding_complete`

### 4.4 Navigation & Routes
* `/dashboard` – summary cards & charts  
* `/income` – CRUD table + bulk import modal  
* `/expenses` – identical pattern  
* `/settings` – edit demographics + category/budget table

### 4.5 Import & Parsing Engine
* Clipboard TSV/CSV/HTML parser with column‑mapping templates  
* **BulkImportModal**: text area or file‑drop (PNG/JPG/PDF)  
  * Images → **Tesseract.js** OCR (client)  
  * Parsed text → `/api/parse` → GPT‑4o‑mini → array of transactions  
* SHA‑1 hash deduplication

### 4.6 Auto‑Categoriser v0
Rule table `vendor_regex → category_id`, “Remember” checkbox default ON

### 4.7 Dashboard
Income, spend, net savings, savings‑rate cards; variance heat‑map; 12‑month sparkline; completeness bar

### 4.8 Settings
Demographics editor + full category/budget CRUD

---

## 5 · Non‑Functional Requirements

| Area | Requirement |
|------|-------------|
| **Cost guardrail** | All infra/services stay on free tiers |
| Security | Supabase RLS; secrets server‑side |
| Performance | Parse & write 1 000 rows ≤ 1 s |
| Offline | Read‑only dashboard via Dexie cache |
| Accessibility | WCAG 2.1 AA (shadcn/radix) |
| **Developer preview mode** | In `development` build:<br>• `?devStep=1|2|3` renders a specific onboarding step.<br>• `?resetOnboarding=1` (or `/api/dev/reset`) clears profile & categories.<br>• Optional floating Dev Toolbar to trigger these actions.<br>• Disabled in production. |

---

## 6 · Tech Stack (all free)

| Layer | Choice |
|-------|--------|
| UI | Next.js 14 + React + TypeScript |
| Components | shadcn/ui + Tailwind |
| Charts | Recharts |
| Auth | NextAuth.js (Google) |
| DB/Auth | Supabase free tier |
| OCR | Tesseract.js (browser) |
| AI parsing | OpenAI GPT‑4o‑mini via GitHub dev key |
| Dev ops | GitHub repo → Vercel CI/CD |
| Tooling | pnpm · ESLint · Prettier · Vitest · Storybook · Playwright |

---

## 7 · Development Roadmap

| Phase | Weeks | Milestones |
|-------|-------|------------|
| **0.1 Scaffold** | 1 | Next.js app, shadcn preset, Supabase schema, Google auth |
| **0.2 Onboarding** | 2 | DemographicsForm, CategoryAIWizard, RLS policies |
| **0.3 Import MVP** | 3 | Clipboard wizard, dedupe, transactions table, auto‑categoriser v0 |
| **0.4 Bulk Import** | 2 | Tesseract OCR + text parser modal for Income/Expenses |
| **0.5 Dashboard** | 2 | Summary cards, variance heat‑map, completeness bar |
| **0.6 Polish** | 2 | Offline cache, JSON export/import, unit + e2e tests |

_All development and QA use the Developer Preview shortcuts; production build omits them._

---

## 8 · Out‑of‑Scope (MVP)
Banking aggregator APIs · Email scraping · Forecasting/“what‑if” tools · Paid tiers & scaling

---

## 9 · Risks & Mitigations

| Risk | Mitigation |
|------|------------|
| Tesseract OCR errors | Preview + manual edit before save |
| GPT‑4o‑mini quota | Monthly call cap in env var |
| Supabase free‑tier limits | Single‑user MVP; monitor rows/storage |
| Clipboard HTML quirks | Sanitise + preview diff |
| Google session expiry | Refresh token rotation; prompt re‑login |

---

## Appendix · Suggested Folder Structure
```text
app/                # Next.js App Router
  ├─ (auth)/login
  ├─ (onboarding)/
  ├─ dashboard/
  ├─ income/
  ├─ expenses/
  └─ settings/
components/
  ├─ ui/
  ├─ onboarding/
  ├─ import/
  └─ charts/
lib/
  ├─ supabase.ts
  ├─ parser.ts
  ├─ ocr.ts
  └─ categoriser.ts
scripts/
  ├─ seed.ts
  └─ dev-reset.ts
tests/               # vitest & playwright
```
