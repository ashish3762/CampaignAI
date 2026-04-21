// Vercel serverless entry — exports the Express app as a default handler.
// vercel.json rewrites /api/* to this file. An Express app is callable as
// (req, res) => {}, so Vercel's Node runtime can invoke it directly.
import app from '../server/app.js';
export default app;
