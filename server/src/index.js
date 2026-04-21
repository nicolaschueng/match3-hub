import 'dotenv/config';
import express from 'express';
import cors from 'cors';
import path from 'node:path';
import fs from 'node:fs';
import { fileURLToPath } from 'node:url';
import { db, getMeta } from './db.js';
import { fetchAllSources } from './fetcher.js';
import { startCron } from './cron.js';
import { aiEnabled } from './ai.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const app = express();
app.use(cors());
app.use(express.json());

app.get('/api/health', (_req, res) => {
  res.json({
    ok: true,
    ai: aiEnabled,
    last_fetch_at: getMeta('last_fetch_at'),
    last_fetch_inserted: getMeta('last_fetch_inserted'),
    last_fetch_scanned: getMeta('last_fetch_scanned'),
  });
});

app.get('/api/brief', (_req, res) => {
  res.json({
    date: getMeta('daily_brief_date'),
    brief: getMeta('daily_brief') || '',
    last_fetch_at: getMeta('last_fetch_at'),
  });
});

app.get('/api/articles', (req, res) => {
  const { lang, q, tag, limit = 50 } = req.query;
  let sql = 'SELECT * FROM articles WHERE 1=1';
  const args = [];
  if (lang) { sql += ' AND lang = ?'; args.push(lang); }
  if (q) { sql += ' AND (title LIKE ? OR ai_summary LIKE ?)'; args.push(`%${q}%`, `%${q}%`); }
  if (tag) { sql += ' AND tags LIKE ?'; args.push(`%${tag}%`); }
  sql += ' ORDER BY published_at DESC, id DESC LIMIT ?';
  args.push(Number(limit) || 50);
  const rows = db.prepare(sql).all(...args);
  res.json(rows.map((r) => ({ ...r, tags: safeParse(r.tags, []) })));
});

app.get('/api/sources', (_req, res) => {
  res.json(db.prepare('SELECT * FROM sources ORDER BY lang, name').all());
});

app.get('/api/games', (req, res) => {
  const { region, q } = req.query;
  let sql = 'SELECT * FROM games WHERE 1=1';
  const args = [];
  if (region) { sql += ' AND region = ?'; args.push(region); }
  if (q) { sql += ' AND (title LIKE ? OR publisher LIKE ?)'; args.push(`%${q}%`, `%${q}%`); }
  sql += ' ORDER BY released_year DESC, id';
  const rows = db.prepare(sql).all(...args);
  res.json(rows.map((r) => ({ ...r, sources: safeParse(r.sources, []) })));
});

app.get('/api/learning/modules', (_req, res) => {
  const rows = db.prepare('SELECT * FROM learning_modules ORDER BY level, order_idx').all();
  res.json(rows.map((m) => ({
    ...m,
    key_points: safeParse(m.key_points, []),
    cases: safeParse(m.cases, []),
    resources: safeParse(m.resources, []),
  })));
});

app.get('/api/learning/plans', (req, res) => {
  const { persona } = req.query;
  let sql = 'SELECT * FROM learning_plans';
  const args = [];
  if (persona) { sql += ' WHERE persona = ?'; args.push(persona); }
  sql += ' ORDER BY persona, week';
  const rows = db.prepare(sql).all(...args);
  res.json(rows.map((p) => ({ ...p, tasks: safeParse(p.tasks, []) })));
});

app.get('/api/reports', (req, res) => {
  const { lang, tag } = req.query;
  let sql = 'SELECT * FROM reports WHERE 1=1';
  const args = [];
  if (lang) { sql += ' AND language = ?'; args.push(lang); }
  if (tag) { sql += ' AND tags LIKE ?'; args.push(`%${tag}%`); }
  sql += ' ORDER BY year DESC, id DESC';
  const rows = db.prepare(sql).all(...args);
  res.json(rows.map((r) => ({ ...r, tags: safeParse(r.tags, []) })));
});

app.post('/api/refresh', async (_req, res) => {
  try {
    const r = await fetchAllSources();
    res.json({ ok: true, ...r });
  } catch (e) {
    res.status(500).json({ ok: false, error: e.message });
  }
});

function safeParse(s, fallback) {
  try { return JSON.parse(s); } catch { return fallback; }
}

// —— 静态资源（生产：托管前端 dist） ——
const clientDist = path.resolve(__dirname, '../../client/dist');
if (fs.existsSync(clientDist)) {
  app.use(express.static(clientDist));
  app.get(/^\/(?!api).*/, (_req, res) => {
    res.sendFile(path.join(clientDist, 'index.html'));
  });
  console.log('[server] serving static from', clientDist);
}

const PORT = Number(process.env.PORT || 3001);
app.listen(PORT, '0.0.0.0', () => {
  console.log(`[server] Match3 Hub API listening on :${PORT}  (AI=${aiEnabled ? 'on' : 'off'})`);
  startCron();
});
