// Express app factory — no .listen() here.
//
// Two entry points import this:
//   · server/index.js  (local dev + Render)  calls app.listen()
//   · api/index.js     (Vercel serverless)    exports the app directly
//
// Keeping route wiring in one place means both deploys stay in sync.

import path from 'node:path';
import { fileURLToPath } from 'node:url';
import cors from 'cors';
import express from 'express';
import { analyze } from './analyze.js';
import { attachBillingRoutes } from './billing.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const app = express();

app.use(cors());

// Stripe webhook needs the raw body, so attachBillingRoutes runs before
// express.json() and mounts its own express.raw() for the webhook route.
attachBillingRoutes(app);

app.use(express.json());

app.get('/api/health', (_req, res) => {
  res.json({ ok: true });
});

app.post('/api/analyze', (req, res) => {
  try {
    const result = analyze(req.body || {});
    res.json(result);
  } catch (err) {
    res.status(400).json({ error: err.message || 'Invalid input' });
  }
});

// Serve the built Vite bundle in single-service deploys (Render, Fly, local
// `npm start`). Skipped under Vercel because static assets are served by the
// CDN layer there, and skipped in dev so `vite dev` can own :5173.
if (process.env.NODE_ENV === 'production' && !process.env.VERCEL) {
  const clientDist = path.resolve(__dirname, '../client/dist');
  app.use(express.static(clientDist));
  app.get(/^(?!\/api\/).*/, (_req, res) => {
    res.sendFile(path.join(clientDist, 'index.html'));
  });
}

export default app;
