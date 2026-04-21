# Ad Performance Analyzer

Paste your campaign metrics. Instantly see computed KPIs, a diagnosis of what's going wrong, actionable recommendations, and quick what-if scenarios. Every analysis is saved to your account so you can track how campaigns are trending over time.

Pure calculation + rules on the server. Supabase handles auth and history storage — no charts library, no backend database queries from the API.

## Project structure

```
CampaignAI/
├── server/                 Express API (port 3001)
│   ├── index.js            HTTP server + routes
│   ├── analyze.js          Metrics, benchmarks, diagnosis, recommendations
│   └── package.json
├── supabase/
│   └── schema.sql          analyses table + RLS policies
├── client/                 Vite + React + Tailwind (port 5173)
│   ├── index.html
│   ├── vite.config.js      Proxies /api to the server
│   ├── tailwind.config.js
│   ├── postcss.config.js
│   ├── .env.example        Supabase URL + publishable key template
│   ├── package.json
│   └── src/
│       ├── main.jsx
│       ├── App.jsx         Router + AuthProvider shell
│       ├── index.css
│       ├── lib/
│       │   ├── supabase.js Supabase client
│       │   └── analyses.js saveAnalysis / listRecentAnalyses helpers
│       ├── auth/
│       │   ├── AuthContext.jsx     user / session / login / signup / logout
│       │   ├── ProtectedRoute.jsx  redirect to /login when signed out
│       │   └── AuthLayout.jsx      shared card + form primitives
│       ├── pages/
│       │   ├── Analyzer.jsx        protected — the analyzer UI
│       │   ├── Dashboard.jsx       protected — recent analyses + trend deltas
│       │   ├── Login.jsx
│       │   └── Signup.jsx
│       └── components/
│           ├── InputForm.jsx
│           ├── MetricsCards.jsx
│           ├── Results.jsx
│           └── Simulator.jsx
└── README.md
```

## Run locally

Requires Node 18+ (tested on Node 22).

**1. Supabase project**

1. Create a project at https://supabase.com.
2. In *Project Settings → API*, copy the project URL and the **publishable** key (formerly the `anon` key).
3. In *Authentication → Providers*, confirm **Email** is enabled. For the fastest demo, toggle off "Confirm email" so signups log in immediately.
4. In *SQL Editor*, open a new query, paste the contents of [`supabase/schema.sql`](supabase/schema.sql), and run it. This creates the `analyses` table and the row-level-security policies that scope every read and write to the signed-in user.
5. Copy `client/.env.example` to `client/.env` and fill in:

```
VITE_SUPABASE_URL=https://YOUR-PROJECT.supabase.co
VITE_SUPABASE_ANON_KEY=YOUR-PUBLISHABLE-KEY
```

**2. API — terminal 1:**

```bash
cd server
npm install
npm run dev
```

The API starts on http://localhost:3001. Health check: `GET /api/health`.

**3. Web app — terminal 2:**

```bash
cd client
npm install
npm run dev
```

The app opens at http://localhost:5173. Vite proxies `/api/*` to the server, so no CORS or URL config is needed in the UI.

Routes:
- `/signup`, `/login` — public
- `/` — protected, the analyzer UI
- `/dashboard` — protected, history of your recent analyses

Unknown routes redirect to `/`, and every protected route redirects to `/login` when signed out.

## History & dashboard

Every baseline analysis (not scenario simulations) is written to `public.analyses` with the signed-in user's id. RLS ensures each user can only read and insert their own rows — there is no server-side code path that touches the table.

The `/dashboard` page pulls the most recent 10 rows and shows:

- A **"Since last analysis"** card with ROAS / CTR / CVR deltas between the latest two entries (hidden until you have at least two).
- A **Recent analyses** table — date, ROAS, CTR, CVR, and a short "biggest issue" chip (Low CTR, Low CVR, High CPM, Weak unit economics, Healthy, …).

The analyzer's success banner links straight to `/dashboard` once the save lands. First-time users land on an empty state that sends them back to `/` to run their first analysis.

All history data — schema, indexes, and policies — is defined in [`supabase/schema.sql`](supabase/schema.sql). Re-running it is idempotent (`create table if not exists`, `create policy` guarded by name).

## API

`POST /api/analyze`

Request:

```json
{
  "spend": 5000,
  "impressions": 500000,
  "clicks": 3500,
  "conversions": 60,
  "revenue": 9000,
  "industry": "E-commerce",
  "platform": "Meta"
}
```

Response includes `metrics` (CPM, CTR, CPC, CVR, ROAS), `benchmarks`, banded `analysis` per metric, a one-line `summary`, plus `issues` and `recommendations` arrays.

## Benchmarks (per-platform)

Benchmarks adapt to the selected platform. When no platform is chosen, the cross-industry default is used.

| Source                 | CTR  | CVR  | CPM  | ROAS |
| ---------------------- | ---- | ---- | ---- | ---- |
| Cross-industry default | 1.0% | 2.5% | $12  | 3.0x |
| Meta                   | 1.1% | 1.8% | $11  | 2.5x |
| Google                 | 3.0% | 4.0% | $8   | 3.5x |
| TikTok                 | 1.5% | 1.5% | $7   | 2.0x |

Numbers are drawn from WordStream 2024 benchmark reports and widely cited industry rules-of-thumb — reasonable defaults, not statistically rigorous. Bands around each benchmark are asymmetric (beating the benchmark has a higher bar than missing it on effort-driven metrics like CVR/ROAS).

All benchmarks, band ratios, diagnosis copy, and recommendations live in [`server/analyze.js`](server/analyze.js). Industry-specific benchmarks are the natural next step — the engine already threads `industry` through but currently ignores it.

## Scenarios

The simulator recomputes metrics for three quick what-ifs:

- **Improve CTR by 20%** — 20% more clicks at the same impressions; conversions and revenue scale with clicks.
- **Improve CVR by 20%** — 20% more conversions at the same clicks; revenue scales with conversions.
- **Increase budget 2x** — spend and all volumes double at current efficiency (ROAS unchanged).

## Production build (optional)

```bash
cd client && npm run build    # emits client/dist
cd ../server && npm start     # run API
```

Serve `client/dist` with any static host and point `/api` at the running server.
