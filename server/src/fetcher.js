import Parser from 'rss-parser';
import { db, setMeta } from './db.js';
import { summarize, dailyBrief } from './ai.js';

const parser = new Parser({
  timeout: 15000,
  headers: { 'User-Agent': 'Mozilla/5.0 Match3HubBot/0.2' },
});

/** 强相关：出现 = 必收 */
const STRONG_KW = [
  '消除', '三消', '消消', 'match-3', 'match 3', 'match3', 'puzzle',
  'royal match', 'candy crush', 'gardenscapes', 'homescapes',
  'toon blast', 'toy blast', 'match masters', 'playrix', 'dream games', 'king',
  '开心消消乐', '梦幻花园', '梦幻家园', '天天爱消除', '乐元素',
];
/** 弱相关（仅中文源生效）：手游/买量/变现/出海等行业话题纳入 */
const ZH_WEAK_KW = [
  '手游', '买量', '变现', '出海', 'liveops', '休闲游戏', '休闲手游',
  'iap', 'iaa', 'arppu', 'ltv', 'roi', '素材', '关卡', '发行',
  '腾讯', '网易', '莉莉丝', '米哈游', 'sensor tower', 'appmagic',
];

function lower(s) { return (s || '').toLowerCase(); }
function hasAny(text, keywords) {
  const t = lower(text);
  return keywords.some((k) => t.includes(k));
}

function classify(title, content, lang) {
  const text = `${title} ${content}`;
  if (hasAny(text, STRONG_KW)) return { keep: true, match3: true };
  // 中文弱相关：要求标题或内容前 300 字出现弱关键词，降低噪声
  if (lang === 'zh') {
    const narrow = `${title} ${(content || '').slice(0, 300)}`;
    if (hasAny(narrow, ZH_WEAK_KW)) return { keep: true, match3: false };
  }
  return { keep: false, match3: false };
}

export async function fetchAllSources({ force = false } = {}) {
  const sources = db.prepare("SELECT * FROM sources WHERE active=1 AND rss_url IS NOT NULL AND rss_url <> ''").all();
  let inserted = 0;
  let scanned = 0;
  const perSource = {};

  for (const s of sources) {
    perSource[s.name] = { scanned: 0, inserted: 0, error: null };
    try {
      const feed = await parser.parseURL(s.rss_url);
      for (const item of feed.items || []) {
        scanned += 1;
        perSource[s.name].scanned += 1;
        const title = item.title || '';
        const url = item.link || item.guid;
        if (!url) continue;
        const raw = item.contentSnippet || item.content || item.summary || '';
        const cls = classify(title, raw, s.lang);
        if (!force && !cls.keep) continue;

        const existed = db.prepare('SELECT id FROM articles WHERE url=?').get(url);
        if (existed) continue;

        const { summary, tags } = await summarize(title, raw, { match3: cls.match3 });
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
        perSource[s.name].inserted += 1;
      }
    } catch (e) {
      perSource[s.name].error = e.message;
      console.warn(`[fetch] ${s.name} failed: ${e.message}`);
    }
  }

  const today = new Date().toISOString().slice(0, 10);
  // 每日简报只选带消除/三消/头部产品标签的文章，避免综合媒体快讯污染
  const briefPool = db
    .prepare(
      `SELECT source_name, title, ai_summary FROM articles
       WHERE substr(created_at,1,10)=?
         AND (tags LIKE '%#消除%' OR tags LIKE '%#三消%' OR tags LIKE '%#RoyalMatch%' OR tags LIKE '%#CandyCrush%' OR tags LIKE '%#Playrix%' OR tags LIKE '%#King%')
       ORDER BY id DESC LIMIT 40`
    )
    .all(today);
  // 兜底：如果今日暂无消除相关，退回最近 7 天的消除相关
  const todays = briefPool.length > 0
    ? briefPool
    : db.prepare(
        `SELECT source_name, title, ai_summary FROM articles
         WHERE tags LIKE '%#消除%' OR tags LIKE '%#三消%' OR tags LIKE '%#RoyalMatch%' OR tags LIKE '%#CandyCrush%' OR tags LIKE '%#Playrix%' OR tags LIKE '%#King%'
         ORDER BY published_at DESC LIMIT 15`
      ).all();
  const brief = await dailyBrief(todays);
  setMeta('daily_brief', brief);
  setMeta('daily_brief_date', today);
  setMeta('last_fetch_at', new Date().toISOString());
  setMeta('last_fetch_inserted', String(inserted));
  setMeta('last_fetch_scanned', String(scanned));

  console.log(`[fetch] scanned=${scanned} inserted=${inserted}`);
  return { scanned, inserted, brief, perSource };
}
