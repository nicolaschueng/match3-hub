import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { db } from './db.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const dataDir = path.resolve(__dirname, '../data');

function read(file) {
  return JSON.parse(fs.readFileSync(path.join(dataDir, file), 'utf-8'));
}

console.log('[seed] clearing tables...');
db.exec(`
  DELETE FROM sources;
  DELETE FROM games;
  DELETE FROM learning_modules;
  DELETE FROM learning_plans;
  DELETE FROM reports;
  DELETE FROM articles;
`);

console.log('[seed] inserting sources...');
const sources = read('sources.json');
const insSource = db.prepare(`INSERT INTO sources(name,url,rss_url,lang,focus,notes,active) VALUES (?,?,?,?,?,?,1)`);
sources.forEach((s) => insSource.run(s.name, s.url, s.rss_url || '', s.lang, s.focus, s.notes));

console.log('[seed] inserting games...');
const games = read('games.json');
const insGame = db.prepare(`INSERT INTO games(title,publisher,region,released_year,downloads,revenue_monthly_usd,revenue_timestamp,dau,mau,chart_rank_us_ios,chart_rank_cn_ios,ua_intensity,monetization,sources,note) VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)`);
games.forEach((g) => insGame.run(
  g.title, g.publisher, g.region, g.released_year, g.downloads,
  g.revenue_monthly_usd, g.revenue_timestamp, g.dau, g.mau,
  g.chart_rank_us_ios, g.chart_rank_cn_ios, g.ua_intensity, g.monetization,
  JSON.stringify(g.sources || []), g.note || ''
));

console.log('[seed] inserting learning modules...');
const mods = read('learning_modules.json');
const insMod = db.prepare(`INSERT INTO learning_modules(level,order_idx,title,summary,key_points,cases,resources) VALUES (?,?,?,?,?,?,?)`);
mods.forEach((m) => insMod.run(m.level, m.order_idx, m.title, m.summary, JSON.stringify(m.key_points), JSON.stringify(m.cases), JSON.stringify(m.resources)));

console.log('[seed] inserting learning plans...');
const plans = read('learning_plans.json');
const insPlan = db.prepare(`INSERT INTO learning_plans(persona,week,title,tasks) VALUES (?,?,?,?)`);
plans.forEach((p) => insPlan.run(p.persona, p.week, p.title, JSON.stringify(p.tasks)));

console.log('[seed] inserting reports...');
const reports = read('reports.json');
const insRep = db.prepare(`INSERT INTO reports(title,publisher,year,language,url,summary,tags) VALUES (?,?,?,?,?,?,?)`);
reports.forEach((r) => insRep.run(r.title, r.publisher, r.year, r.language, r.url, r.summary, JSON.stringify(r.tags || [])));

// 给前端一个初始的「每日简报」占位，避免首屏空态
db.prepare('INSERT INTO meta(key,value) VALUES (?,?) ON CONFLICT(key) DO UPDATE SET value=excluded.value')
  .run('daily_brief', '数据种子已载入，后台正在拉取最新消除赛道资讯。随后 AI 每日简报将自动生成，你可以通过顶部的「立即刷新」手动触发。');
db.prepare('INSERT INTO meta(key,value) VALUES (?,?) ON CONFLICT(key) DO UPDATE SET value=excluded.value')
  .run('daily_brief_date', new Date().toISOString().slice(0, 10));

console.log('[seed] done.');
