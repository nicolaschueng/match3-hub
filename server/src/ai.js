import 'dotenv/config';

const OPENAI_API_KEY = process.env.OPENAI_API_KEY;
const OPENAI_BASE_URL = process.env.OPENAI_BASE_URL || 'https://api.openai.com/v1';
const OPENAI_MODEL = process.env.OPENAI_MODEL || 'gpt-4o-mini';

export const aiEnabled = Boolean(OPENAI_API_KEY);

/** 规则摘要：截取首句 + 关键词打标（一句话 ≤ 60 字） */
function oneSentenceFallback(title, text) {
  let clean = (text || '').replace(/<[^>]+>/g, '').replace(/\s+/g, ' ').trim();
  // 去掉常见的署名/来源开头：作者丨X 编辑丨Y、文/X、图/X、撰文：X、By Author、硬氪获悉、36氪获悉、大公司：
  const NOISE_PATTERNS = [
    /^(作者|编辑|文|图|撰文|来源)[丨|｜/／:：]\s*[^ 。.!?！？]{1,20}\s*/g,
    /^(By|文|图)\s+[A-Za-z\u4e00-\u9fa5]{1,20}\s+/gi,
    /^(硬氪获悉|36氪获悉|IT之家获悉|钛媒体获悉|界面新闻获悉)[，,、]?/g,
    /^大公司[：:]\s*/g,
  ];
  // 反复剥离前缀
  let prev = null;
  while (prev !== clean) {
    prev = clean;
    for (const p of NOISE_PATTERNS) clean = clean.replace(p, '').trim();
  }
  // 取首句（> 6 字）
  let first = clean.split(/[。.!?！？\n]/).find((s) => s && s.trim().length > 6) || '';
  first = first.trim();
  if (!first) first = title || '';
  if (first.length > 60) first = first.slice(0, 58) + '…';
  return first;
}

function ruleTags(title, text, { match3 = false } = {}) {
  const source = `${title || ''} ${text || ''}`.toLowerCase();
  const kwMap = {
    'royal match': '#RoyalMatch',
    'candy crush': '#CandyCrush',
    'playrix': '#Playrix',
    'gardenscapes': '#Playrix',
    'homescapes': '#Playrix',
    'fishdom': '#Playrix',
    'dream games': '#RoyalMatch',
    'toon blast': '#Peak',
    'toy blast': '#Peak',
    'match masters': '#MatchMasters',
    '开心消消乐': '#开心消消乐',
    '三消': '#三消',
    'match-3': '#三消',
    'match 3': '#三消',
    '关卡设计': '#关卡设计',
    'ltv': '#变现',
    'arppu': '#变现',
    'a/b test': '#ABTest',
    'a/b 测试': '#ABTest',
    '出海': '#出海',
    '买量': '#买量',
    '小游戏': '#小游戏',
  };
  const tags = new Set();
  for (const [k, v] of Object.entries(kwMap)) {
    if (source.includes(k)) tags.add(v);
  }
  // 仅强相关文章才自动加 "消除" 大类标签
  if (match3) tags.add('#消除');
  return Array.from(tags).slice(0, 4);
}

function ruleSummary(title, text, opts) {
  const summary = oneSentenceFallback(title, text);
  const tags = ruleTags(title, text, opts);
  return { summary, tags };
}

export async function summarize(title, text, opts = {}) {
  if (!aiEnabled) return ruleSummary(title, text, opts);
  try {
    const prompt = `你是消除/休闲手游赛道的资深编辑。请基于以下标题和正文，输出：
1) 一句话中文总结（必须是单独一句、不超过 50 个汉字、必须是完整通顺的中文、不要出现英文、不要使用标点开头）。若原文是英文，请翻译为中文并浓缩。
2) 2-4 个相关话题标签（#前缀、无空格）。优先：#RoyalMatch #Playrix #King #三消 #消除 #买量 #IAP #变现 #A/B测试 #关卡设计 #出海 #LiveOps #小游戏。

仅输出严格 JSON：{"summary":"...","tags":["#..."]}

标题：${title}
正文：${(text || '').slice(0, 1500)}`;

    const resp = await fetch(`${OPENAI_BASE_URL}/chat/completions`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${OPENAI_API_KEY}`,
      },
      body: JSON.stringify({
        model: OPENAI_MODEL,
        messages: [{ role: 'user', content: prompt }],
        response_format: { type: 'json_object' },
        temperature: 0.3,
      }),
    });
    if (!resp.ok) throw new Error(`LLM ${resp.status}`);
    const json = await resp.json();
    const content = json.choices?.[0]?.message?.content || '{}';
    const parsed = JSON.parse(content);
    let summary = (parsed.summary || '').trim();
    if (summary.length > 60) summary = summary.slice(0, 58) + '…';
    if (!summary) summary = oneSentenceFallback(title, text);
    const tags = Array.isArray(parsed.tags) && parsed.tags.length
      ? parsed.tags.slice(0, 4)
      : ruleTags(title, text, opts);
    return { summary, tags };
  } catch (e) {
    console.warn('[ai] fallback to rule summary:', e.message);
    return ruleSummary(title, text, opts);
  }
}

/** 每日简报：给出 3-5 句话的中文一段。 */
export async function dailyBrief(articles) {
  if (!articles.length) return '今日暂无新增消除赛道动态。';
  const bullets = articles
    .slice(0, 15)
    .map((a, i) => `${i + 1}. [${a.source_name}] ${a.title} —— ${a.ai_summary || ''}`)
    .join('\n');
  if (!aiEnabled) {
    // 降级：直接拼接首句 + 精选 3 条标题
    const head = articles.length > 0 ? `今日共收录 ${articles.length} 条资讯。` : '';
    const picks = articles.slice(0, 3).map((a, i) => `（${i + 1}）${a.ai_summary || a.title}`).join('；');
    return `${head}${picks}。`;
  }
  try {
    const resp = await fetch(`${OPENAI_BASE_URL}/chat/completions`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${OPENAI_API_KEY}` },
      body: JSON.stringify({
        model: OPENAI_MODEL,
        messages: [
          {
            role: 'user',
            content: `你是消除赛道分析师。基于以下今日资讯清单，用中文撰写一段 3-5 句话、200 字左右的每日简报，聚焦：(a) 产品/数据/事件中最关键的 1-2 个信号、(b) 变现或买量动向、(c) 方法论或赛道格局、(d) 一条可执行洞察。不要使用标题、列表、Markdown，只输出自然段。\n\n${bullets}`,
          },
        ],
        temperature: 0.5,
      }),
    });
    if (!resp.ok) throw new Error(`brief ${resp.status}`);
    const json = await resp.json();
    return json.choices?.[0]?.message?.content?.trim() || bullets;
  } catch (e) {
    console.warn('[ai] daily brief fallback:', e.message);
    const head = articles.length > 0 ? `今日共收录 ${articles.length} 条资讯。` : '';
    const picks = articles.slice(0, 3).map((a, i) => `（${i + 1}）${a.ai_summary || a.title}`).join('；');
    return `${head}${picks}。`;
  }
}
