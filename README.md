# SQL Natural Language Data Analysis

Upload a CSV, ask a plain-English question, and get a SQL-backed answer with a table, chart, and generated SQL.

## Stack

- Next.js 16 App Router
- TypeScript
- Tailwind CSS v4
- `better-sqlite3` for one local SQLite DB per dataset
- OpenAI `gpt-4o-mini` for SQL generation and result explanation
- Recharts for charts
- PapaParse for CSV parsing

## Setup

```bash
npm install
cp .env.local.example .env.local
npm run dev
```

Required environment variable:

```bash
OPENAI_API_KEY=sk-...
```

Recommended for deployed persistence:

```bash
BLOB_READ_WRITE_TOKEN=vercel_blob_rw_...
```

## Main Commands

```bash
npm run dev      # local development
npm run build    # production build and type check
npm run lint     # ESLint
npm test         # backend safety tests
```

## Project Structure

- `app/page.tsx` - upload page
- `app/workspace/page.tsx` - multi-dataset workspace
- `app/api/upload/route.ts` - CSV upload, parsing, SQLite creation
- `app/api/query/route.ts` - natural-language question to SQL execution
- `components/Workspace.tsx` - dataset switching, question input, history
- `components/ResultsPanel.tsx` - answer/table/chart/SQL output
- `lib/csv.ts` - CSV cleaning, type inference, column sanitization
- `lib/db.ts` - SQLite helpers
- `lib/sql-validator.ts` - SELECT-only SQL guardrails
- `lib/rate-limit.ts` - lightweight in-memory route limits
- `tests/` - backend safety tests

## Backend Guardrails

- CSV-only uploads.
- Max upload size: 50 MB.
- Max parsed rows: 100,000.
- Max columns: 200.
- Dataset IDs must be UUIDs.
- SQL must be single-statement `SELECT`.
- Dangerous keywords, joins, unions, recursive CTEs, PRAGMA, and SQLite metadata access are blocked.
- Query results are capped at 500 rows.
- Uploads and query routes have lightweight per-IP rate limits.

## Storage Note

Local uploads are stored in `./uploads`. On Vercel or Lambda, writes go to `/tmp/uploads`, which is ephemeral. When `BLOB_READ_WRITE_TOKEN` is configured, uploads are also persisted to Vercel Blob and restored by dataset ID before workspace/query routes run.
