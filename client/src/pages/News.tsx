import { useEffect, useMemo, useState } from 'react';
import { ExternalLink, Filter, Globe2, Search, Quote } from 'lucide-react';
import { api, Article, Source } from '../lib/api';

type Scope = 'match3' | 'casual' | 'all';

export default function News() {
  const [articles, setArticles] = useState<Article[]>([]);
  const [sources, setSources] = useState<Source[]>([]);
  const [lang, setLang] = useState('');
  const [q, setQ] = useState('');
  const [tag, setTag] = useState('');
  const [scope, setScope] = useState<Scope>('match3');

  useEffect(() => {
    api.sources().then(setSources);
  }, []);

  useEffect(() => {
    api
      .articles({
        lang: lang || undefined,
        q: q || undefined,
        tag: tag || undefined,
        limit: 120,
        match3: scope === 'match3' ? true : undefined,
        casual: scope === 'casual' ? true : undefined,
      })
      .then(setArticles);
  }, [lang, q, tag, scope]);

  const stat = useMemo(() => {
    const total = articles.length;
    const zh = articles.filter((a) => a.lang === 'zh').length;
    return { total, zh, en: total - zh };
  }, [articles]);

  const allTags = useMemo(() => {
    const s = new Set<string>();
    articles.forEach((a) => a.tags?.forEach((t) => s.add(t)));
    return Array.from(s).slice(0, 18);
  }, [articles]);

  return (
    <div className="space-y-6">
      <header>
        <h1 className="text-3xl font-bold tracking-tight">新闻动态</h1>
        <p className="muted mt-1">
          全球 {sources.length} 个信源 · 每条资讯由 AI / 规则生成一句话中文总结 · 每日 07:00 / 19:00 自动更新
        </p>
        <div className="mt-2 text-xs text-slate-500">
          共 <span className="text-slate-200">{stat.total}</span> 条 · 中文 <span className="text-slate-200">{stat.zh}</span> · 英文 <span className="text-slate-200">{stat.en}</span>
        </div>
      </header>

      {/* 范围切换 */}
      <div className="flex items-center gap-1 p-1 rounded-xl bg-white/5 border border-white/10 w-fit">
        {([
          { id: 'match3', label: '仅消除赛道', desc: 'Match-3 / 三消' },
          { id: 'casual', label: '消除 + 休闲', desc: '含休闲/益智/合成等' },
          { id: 'all', label: '全部游戏资讯', desc: '不做范围限制' },
        ] as { id: Scope; label: string; desc: string }[]).map((t) => (
          <button
            key={t.id}
            onClick={() => setScope(t.id)}
            className={`px-3.5 py-1.5 rounded-lg text-sm transition-all ${
              scope === t.id ? 'bg-brand-500 text-white shadow' : 'text-slate-300 hover:bg-white/5'
            }`}
            title={t.desc}
          >
            {t.label}
          </button>
        ))}
      </div>

      <div className="card p-4 flex flex-col md:flex-row md:items-center gap-3">
        <div className="flex items-center gap-2 flex-1">
          <Search className="h-4 w-4 text-slate-500" />
          <input
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder="搜索标题 / 总结关键字：Royal Match、Playrix、买量…"
            className="bg-transparent outline-none flex-1 text-sm placeholder:text-slate-500"
          />
        </div>
        <div className="flex items-center gap-2">
          <Globe2 className="h-4 w-4 text-slate-500" />
          <select value={lang} onChange={(e) => setLang(e.target.value)} className="bg-slate-900 border border-white/10 rounded-md px-2 py-1 text-sm">
            <option value="">全部语言</option>
            <option value="zh">中文</option>
            <option value="en">英文</option>
          </select>
        </div>
      </div>

      {allTags.length > 0 && (
        <div className="flex items-center gap-2 flex-wrap">
          <Filter className="h-4 w-4 text-slate-500" />
          <button onClick={() => setTag('')} className={`chip ${!tag ? '!border-brand-500/60 !text-brand-300' : ''}`}>全部</button>
          {allTags.map((t) => (
            <button key={t} onClick={() => setTag(t)} className={`chip ${tag === t ? '!border-brand-500/60 !text-brand-300' : ''}`}>{t}</button>
          ))}
        </div>
      )}

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {articles.length === 0 && (
          <div className="card p-8 text-center text-slate-400 md:col-span-2">
            当前范围下暂无匹配资讯。可以试试切换到 <button onClick={() => setScope('casual')} className="text-brand-300 hover:text-brand-200">消除 + 休闲</button> 或点右上角「立即刷新」。
          </div>
        )}
        {articles.map((a) => <NewsCard key={a.id} a={a} />)}
      </div>

      <section className="card p-5 mt-2">
        <h3 className="section-title mb-3">信源矩阵（{sources.length}）</h3>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
          {sources.map((s) => (
            <div key={s.id} className="rounded-lg border border-white/5 bg-white/[0.02] px-3 py-2 text-sm">
              <div className="flex items-center justify-between">
                <a href={s.url} target="_blank" rel="noreferrer" className="font-medium hover:text-brand-300">
                  {s.name}
                </a>
                <span className="chip">{s.lang === 'zh' ? '中' : 'EN'}</span>
              </div>
              <div className="muted text-xs mt-0.5">{s.focus}</div>
              {s.rss_url && <div className="text-[10px] text-emerald-400/80 mt-1">RSS 已接入</div>}
            </div>
          ))}
        </div>
      </section>
    </div>
  );
}

function NewsCard({ a }: { a: Article }) {
  const time = new Date(a.published_at).toLocaleDateString('zh-CN');
  return (
    <a href={a.url} target="_blank" rel="noreferrer" className="card card-hover p-5 block group">
      {/* 顶部：来源 + 时间 + 语言徽标 */}
      <div className="flex items-center gap-2 text-xs text-slate-500">
        <span className={`inline-flex items-center justify-center rounded px-1.5 py-0.5 text-[10px] font-semibold ${a.lang === 'zh' ? 'bg-brand-500/15 text-brand-300' : 'bg-accent-500/15 text-accent-400'}`}>
          {a.lang === 'zh' ? '中文' : 'EN'}
        </span>
        <span>{a.source_name}</span>
        <span>·</span>
        <span>{time}</span>
      </div>

      {/* 主体：一句话总结（主角） */}
      <div className="mt-3 flex gap-3">
        <Quote className="h-5 w-5 text-brand-400/70 shrink-0 mt-0.5" />
        <p className="text-[15px] md:text-base font-medium leading-snug text-slate-100 group-hover:text-brand-200 line-clamp-3">
          {a.ai_summary || a.title}
        </p>
      </div>

      {/* 次级：原标题 */}
      <div className="mt-3 text-xs text-slate-500 line-clamp-2 pl-8" title={a.title}>
        原文标题：{a.title}
      </div>

      {/* 底部：标签 + 跳转 */}
      <div className="mt-3 flex items-center gap-2 flex-wrap pl-8">
        {a.tags?.slice(0, 4).map((t) => <span key={t} className="chip">{t}</span>)}
        <span className="ml-auto text-xs text-brand-300 inline-flex items-center gap-1">
          阅读原文 <ExternalLink className="h-3 w-3" />
        </span>
      </div>
    </a>
  );
}
