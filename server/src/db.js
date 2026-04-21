import Database from 'better-sqlite3';
import path from 'node:path';
import fs from 'node:fs';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const dataDir = path.resolve(__dirname, '../data');
if (!fs.existsSync(dataDir)) fs.mkdirSync(dataDir, { recursive: true });

export const db = new Database(path.join(dataDir, 'match3.db'));
db.pragma('journal_mode = WAL');

db.exec(`
CREATE TABLE IF NOT EXISTS sources (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  name TEXT NOT NULL,
  url TEXT NOT NULL,
  rss_url TEXT,
  lang TEXT NOT NULL,
  focus TEXT,
  notes TEXT,
  active INTEGER DEFAULT 1
);

CREATE TABLE IF NOT EXISTS articles (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  source_id INTEGER,
  source_name TEXT,
  lang TEXT,
  title TEXT NOT NULL,
  url TEXT NOT NULL UNIQUE,
  published_at TEXT,
  raw_summary TEXT,
  ai_summary TEXT,
  tags TEXT,
  created_at TEXT DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS games (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  title TEXT NOT NULL,
  publisher TEXT,
  region TEXT,
  released_year INTEGER,
  downloads TEXT,
  revenue_monthly_usd TEXT,
  revenue_timestamp TEXT,
  dau TEXT,
  mau TEXT,
  chart_rank_us_ios TEXT,
  chart_rank_cn_ios TEXT,
  ua_intensity TEXT,
  monetization TEXT,
  sources TEXT,
  note TEXT
);

CREATE TABLE IF NOT EXISTS learning_modules (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  level TEXT NOT NULL,
  order_idx INTEGER,
  title TEXT NOT NULL,
  summary TEXT,
  key_points TEXT,
  cases TEXT,
  resources TEXT
);

CREATE TABLE IF NOT EXISTS learning_plans (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  persona TEXT NOT NULL,
  week INTEGER NOT NULL,
  title TEXT,
  tasks TEXT
);

CREATE TABLE IF NOT EXISTS reports (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  title TEXT NOT NULL,
  publisher TEXT,
  year INTEGER,
  language TEXT,
  url TEXT,
  summary TEXT,
  tags TEXT
);

CREATE TABLE IF NOT EXISTS meta (
  key TEXT PRIMARY KEY,
  value TEXT
);
`);

export function setMeta(key, value) {
  db.prepare('INSERT INTO meta(key,value) VALUES (?,?) ON CONFLICT(key) DO UPDATE SET value=excluded.value')
    .run(key, value);
}
export function getMeta(key) {
  const row = db.prepare('SELECT value FROM meta WHERE key=?').get(key);
  return row?.value || null;
}
