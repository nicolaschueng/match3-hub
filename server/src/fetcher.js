import Parser from 'rss-parser';
import { db, setMeta } from './db.js';
import { summarize, dailyBrief } from './ai.js';

const parser = new Parser({
  timeout: 15000,
  headers: { 'User-Agent': 'Mozilla/5.0 Match3HubBot/0.1' },
});

const MATCH3_KEYWORDS = [
  '消除', '三消', 'Match-3', 'Match 3', 'Match3',
  'Royal Match', 'Candy Crush', 'Gardenscapes', 'Homescapes',
  'Toon Blast', 'Match Masters', 'Playrix', 'Dream Games', 'King',
  '开心消消乐', '梦幻花园', 'puzzle',
];

function isMatch3Relevant(title, content) {
  const hay = `${title || ''} ${content || ''}`.toLowerCase();
  return MATCH3_KEYWORDS.some((k) => hay.includes(k.toLowerCase()));
}

export async function fetchAllSources({ force = false } = {}) {
  const sources = db.prepare("SELECT * FROM sources WHERE active=1 AND rss_url IS NOT NULL AND rss_url <> ''").all();
  let inserted = 0;
  let scanned = 0;

  for (const s of sources) {
    try {
      const feed = await parser.parseURL(s.rss_url);
      for (const item of feed.items || []) {
        scanned += 1;
        const title = item.title || '';
        const url = item.link || item.guid;
        if (!url) continue;
        const raw = item.contentSnippet || item.content || item.summary || '';
        if (!force && !isMatch3Relevant(title, raw)) continue;

        const existed = db.prepare('SELECT id FROM articles WHERE url=?').get(url);
        if (existed) continue;

        const { summary, tags } = await summarize(title, raw);
        db.prepare(
          `INSERT INTO articles(source_id, source_name, lang, title, url, published_at, raw_summary, ai_summary, tags)
           VALUES (?,?,?,?,?,?,?,?,?)`
        ).run(
          s.id,
          s.name,
          s.lang,
          title,
          url,
          item.isoDate || item.pubDate || new Date().toISOString(),
          raw.slice(0, 800),
          summary,
          JSON.stringify(tags)
        );
        inserted += 1;
      }
    } catch (e) {
      console.warn(`[fetch] ${s.name} failed: ${e.message}`);
    }
  }

  const today = new Date().toISOString().slice(0, 10);
  const todays = db
    .prepare(
      `SELECT source_name, title, ai_summary FROM articles
       WHERE substr(created_at,1,10)=? ORDER BY id DESC LIMIT 30`
    )
    .all(today);
  const brief = await dailyBrief(todays);
  setMeta('daily_brief', brief);
  setMeta('daily_brief_date', today);
  setMeta('last_fetch_at', new Date().toISOString());
  setMeta('last_fetch_inserted', String(inserted));
  setMeta('last_fetch_scanned', String(scanned));

  console.log(`[fetch] scanned=${scanned} inserted=${inserted}`);
  return { scanned, inserted, brief };
}
