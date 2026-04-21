// Entry point for local dev (`npm run dev:server`) and single-service
// deploys like Render. Vercel uses api/index.js instead and never calls
// this file.
import app from './app.js';

const PORT = Number(process.env.PORT) || 3001;
app.listen(PORT, () => {
  console.log(`Ad Performance Analyzer API listening on http://localhost:${PORT}`);
});
