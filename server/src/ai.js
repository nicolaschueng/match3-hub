import 'dotenv/config';

const OPENAI_API_KEY = process.env.OPENAI_API_KEY;
const OPENAI_BASE_URL = process.env.OPENAI_BASE_URL || 'https://api.openai.com/v1';
const OPENAI_MODEL = process.env.OPENAI_MODEL || 'gpt-4o-mini';

export const aiEnabled = Boolean(OPENAI_API_KEY);

/** 规则摘要：无 LLM 时的降级方案——截断 + 关键词打标 */
function ruleSummary(title, text) {
  const clean = (text || '').replace(/<[^>]+>/g, '').replace(/\s+/g, ' ').trim();
  const summary = clean.slice(0, 140) + (clean.length > 140 ? '…' : '');
  const kwMap = {
    'Royal Match': '#RoyalMatch',
    'Candy Crush': '#CandyCrush',
    'Playrix': '#Playrix',
    '三消': '#三消',
    '消除': '#消除',
    '买量': '#买量',
    'IAP': '#IAP',
    '变现': '#变现',
    'A/B': '#ABTest',
    '关卡': '#关卡设计',
    '出海': '#出海',
  };
  const source = `${title} ${clean}`;
  const tags = Object.entries(kwMap)
    .filter(([k]) => source.includes(k))
    .map(([, v]) => v);
  if (tags.length === 0) tags.push('#消除赛道');
  return { summary: summary || title, tags };
}

export async function summarize(title, text) {
  if (!aiEnabled) return ruleSummary(title, text);
  try {
    const prompt = `你是消除游戏赛道的资深编辑。请基于以下标题与正文，输出 80 字以内的中文摘要（突出产品/数据/方法论三类信息中的关键信息），并给出 2-4 个相关标签（#前缀、无空格，优先 #RoyalMatch #Playrix #King #三消 #买量 #IAP #变现 #A/B测试 #关卡设计 #出海 等）。\n严格 JSON：{"summary":"...","tags":["#..."]}\n\n标题：${title}\n正文：${(text || '').slice(0, 1500)}`;
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
    return {
      summary: parsed.summary || ruleSummary(title, text).summary,
      tags: Array.isArray(parsed.tags) && parsed.tags.length ? parsed.tags : ruleSummary(title, text).tags,
    };
  } catch (e) {
    console.warn('[ai] fallback to rule summary:', e.message);
    return ruleSummary(title, text);
  }
}

/** 生成每日简报：把当日新增文章做聚合 */
export async function dailyBrief(articles) {
  if (!articles.length) return '今日暂无新增消除赛道动态。';
  const bullets = articles
    .slice(0, 12)
    .map((a, i) => `${i + 1}. [${a.source_name}] ${a.title} —— ${a.ai_summary || ''}`)
    .join('\n');
  if (!aiEnabled) {
    return `今日共收录 ${articles.length} 条消除赛道资讯，精选如下：\n${bullets}`;
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
            content: `你是消除赛道的分析师。基于以下今日资讯清单，用中文撰写一段 250-350 字的每日简报，聚焦产品格局、重要数据、买量与变现信号、方法论观点，结尾给出 1 条可执行洞察。不要使用 Markdown 标题，仅写自然段。\n\n${bullets}`,
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
    return `今日共收录 ${articles.length} 条消除赛道资讯，精选如下：\n${bullets}`;
  }
}
