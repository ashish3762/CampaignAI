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
import { ZodError } from 'zod';
import { analyze } from './analyze.js';
import { attachBillingRoutes } from './billing.js';
import { AppError, ValidationError } from './errors.js';
import { analyzeInputSchema } from './schemas.js';
import { runScenarios } from './scenarios.js';
import { simulate } from './simulate.js';
import { simulateInputSchema } from './simulateSchema.js';

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

app.post('/api/analyze', (req, res, next) => {
  try {
    const input = analyzeInputSchema.parse(req.body || {});
    const result = analyze(input);
    res.json(result);
  } catch (err) {
    next(err);
  }
});

app.post('/api/simulate', (req, res, next) => {
  try {
    const input = simulateInputSchema.parse(req.body || {});
    const result = simulate(input);
    res.json(result);
  } catch (err) {
    next(err);
  }
});

app.post('/api/scenarios', (req, res, next) => {
  try {
    const input = analyzeInputSchema.parse(req.body || {});
    const result = runScenarios(input);
    res.json(result);
  } catch (err) {
    next(err);
  }
});

// ---------------------------------------------------------------------------
// Error middleware — dispatches on error type instead of parsing strings.
// ---------------------------------------------------------------------------
app.use((err, _req, res, _next) => {
  if (err instanceof ZodError) {
    return res.status(400).json({
      error: 'Invalid input',
      issues: err.issues.map((i) => ({
        path: i.path.join('.'),
        message: i.message,
      })),
    });
  }
  if (err instanceof AppError) {
    return res.status(err.status).json({ error: err.message });
  }
  // Domain validation (from analyze.js validate()) — still a 400.
  if (err instanceof Error && err.message.startsWith('Invalid value')) {
    return res.status(400).json({ error: err.message });
  }
  console.error('[unhandled]', err);
  res.status(500).json({ error: 'Internal server error' });
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
