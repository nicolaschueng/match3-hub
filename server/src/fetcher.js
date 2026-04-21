import Parser from 'rss-parser';
import { db, setMeta } from './db.js';
import { summarize, dailyBrief } from './ai.js';

// 模拟浏览器 UA + 较长超时，尽量绕过 403
const parser = new Parser({
  timeout: 20000,
  headers: {
    'User-Agent':
      'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0 Safari/537.36',
    Accept: 'application/rss+xml,application/xml;q=0.9,*/*;q=0.8',
  },
});

// 原生 fetch 跟随重定向，手动解析，用于对付 GameLook 这类 301/302 站点
async function fetchFeedText(url) {
  const res = await fetch(url, {
    redirect: 'follow',
    headers: {
      'User-Agent':
        'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0 Safari/537.36',
      Accept: 'application/rss+xml,application/xml;q=0.9,*/*;q=0.8',
    },
    signal: AbortSignal.timeout(20000),
  });
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
  return res.text();
}

async function parseFeedAny(url) {
  // 先尝试 rss-parser 直连
  try {
    return await parser.parseURL(url);
  } catch (e1) {
    // 失败则用原生 fetch + parseString 再试一次
    try {
      const text = await fetchFeedText(url);
      return await parser.parseString(text);
    } catch (e2) {
      throw new Error(`${e1.message} | fallback: ${e2.message}`);
    }
  }
}

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
      const feed = await parseFeedAny(s.rss_url);
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
  // 只选「标题/摘要强命中消除关键词」的文章作为简报素材
  const WHERE_MATCH3 = `(
    LOWER(title) LIKE '%match-3%' OR LOWER(title) LIKE '%match 3%' OR LOWER(title) LIKE '%royal match%'
    OR LOWER(title) LIKE '%candy crush%' OR LOWER(title) LIKE '%playrix%' OR LOWER(title) LIKE '%gardenscapes%'
    OR LOWER(title) LIKE '%homescapes%' OR LOWER(title) LIKE '%fishdom%' OR LOWER(title) LIKE '%toon blast%'
    OR LOWER(title) LIKE '%toy blast%' OR LOWER(title) LIKE '%dream games%' OR LOWER(title) LIKE '%match masters%'
    OR title LIKE '%消除%' OR title LIKE '%三消%' OR title LIKE '%消消%'
    OR title LIKE '%开心消消乐%' OR title LIKE '%梦幻花园%' OR title LIKE '%梦幻家园%'
    OR LOWER(ai_summary) LIKE '%royal match%' OR LOWER(ai_summary) LIKE '%candy crush%'
    OR LOWER(ai_summary) LIKE '%playrix%' OR LOWER(ai_summary) LIKE '%gardenscapes%'
    OR ai_summary LIKE '%消除%' OR ai_summary LIKE '%三消%'
  )`;
  const briefPool = db
    .prepare(`SELECT source_name, title, ai_summary FROM articles WHERE substr(created_at,1,10)=? AND ${WHERE_MATCH3} ORDER BY id DESC LIMIT 40`)
    .all(today);
  // 兜底：近 7 天的消除相关
  const todays = briefPool.length > 0
    ? briefPool
    : db.prepare(`SELECT source_name, title, ai_summary FROM articles WHERE ${WHERE_MATCH3} ORDER BY published_at DESC LIMIT 15`).all();
  const brief = await dailyBrief(todays);
  setMeta('daily_brief', brief);
  setMeta('daily_brief_date', today);
  setMeta('last_fetch_at', new Date().toISOString());
  setMeta('last_fetch_inserted', String(inserted));
  setMeta('last_fetch_scanned', String(scanned));

  console.log(`[fetch] scanned=${scanned} inserted=${inserted}`);
  return { scanned, inserted, brief, perSource };
}
