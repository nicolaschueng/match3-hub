import { useEffect, useMemo, useState } from 'react';
import { ExternalLink, Filter, Globe2, Search } from 'lucide-react';
import { api, Article, Source } from '../lib/api';

export default function News() {
  const [articles, setArticles] = useState<Article[]>([]);
  const [sources, setSources] = useState<Source[]>([]);
  const [lang, setLang] = useState('');
  const [q, setQ] = useState('');
  const [tag, setTag] = useState('');

  useEffect(() => {
    api.sources().then(setSources);
  }, []);

  useEffect(() => {
    api.articles({ lang: lang || undefined, q: q || undefined, tag: tag || undefined, limit: 100 }).then(setArticles);
  }, [lang, q, tag]);

  const allTags = useMemo(() => {
    const s = new Set<string>();
    articles.forEach((a) => a.tags?.forEach((t) => s.add(t)));
    return Array.from(s).slice(0, 16);
  }, [articles]);

  return (
    <div className="space-y-6">
      <header>
        <h1 className="text-3xl font-bold tracking-tight">新闻动态</h1>
        <p className="muted mt-1">全球 {sources.length} 个信源 · AI 每日自动摘要与打标 · 下次更新：07:00 / 19:00</p>
      </header>

      <div className="card p-4 flex flex-col md:flex-row md:items-center gap-3">
        <div className="flex items-center gap-2 flex-1">
          <Search className="h-4 w-4 text-slate-500" />
          <input
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder="搜索标题 / 摘要关键字：Royal Match、Playrix、买量…"
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
            暂无匹配资讯。后台会自动抓取，也可以点右上角「立即刷新」。
          </div>
        )}
        {articles.map((a) => (
          <a key={a.id} href={a.url} target="_blank" rel="noreferrer" className="card card-hover p-5 block">
            <div className="flex items-center gap-2 text-xs text-slate-500">
              <span>{a.source_name}</span>·
              <span>{new Date(a.published_at).toLocaleDateString('zh-CN')}</span>
              <span className="ml-auto chip">{a.lang === 'zh' ? '中文' : 'EN'}</span>
            </div>
            <h3 className="mt-2 text-base font-semibold leading-snug group-hover:text-brand-300">{a.title}</h3>
            <p className="mt-2 text-sm text-slate-300 line-clamp-3">{a.ai_summary}</p>
            <div className="mt-3 flex items-center gap-2 flex-wrap">
              {a.tags?.map((t) => <span key={t} className="chip">{t}</span>)}
              <span className="ml-auto text-xs text-brand-300 inline-flex items-center gap-1">
                阅读原文 <ExternalLink className="h-3 w-3" />
              </span>
            </div>
          </a>
        ))}
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
