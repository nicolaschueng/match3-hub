import { useEffect, useMemo, useState } from 'react';
import { ExternalLink, Filter, Globe2 } from 'lucide-react';
import { api, Report } from '../lib/api';

export default function Reports() {
  const [reports, setReports] = useState<Report[]>([]);
  const [lang, setLang] = useState('');
  const [tag, setTag] = useState('');

  useEffect(() => { api.reports({ lang: lang || undefined, tag: tag || undefined }).then(setReports); }, [lang, tag]);

  const allTags = useMemo(() => {
    const s = new Set<string>();
    reports.forEach((r) => r.tags?.forEach((t) => s.add(t)));
    return Array.from(s);
  }, [reports]);

  return (
    <div className="space-y-6">
      <header>
        <h1 className="text-3xl font-bold tracking-tight">深度报告</h1>
        <p className="muted mt-1">2024-2025 消除赛道可引用的权威报告与拆解文章（含原文链接）</p>
      </header>

      <div className="card p-4 flex flex-col md:flex-row md:items-center gap-3">
        <div className="flex items-center gap-2">
          <Globe2 className="h-4 w-4 text-slate-500" />
          <select value={lang} onChange={(e) => setLang(e.target.value)} className="bg-slate-900 border border-white/10 rounded-md px-2 py-1 text-sm">
            <option value="">全部语言</option>
            <option value="zh">中文</option>
            <option value="en">英文</option>
          </select>
        </div>
        <div className="flex items-center gap-2 flex-wrap flex-1">
          <Filter className="h-4 w-4 text-slate-500" />
          <button onClick={() => setTag('')} className={`chip ${!tag ? '!border-brand-500/60 !text-brand-300' : ''}`}>全部</button>
          {allTags.map((t) => (
            <button key={t} onClick={() => setTag(t)} className={`chip ${tag === t ? '!border-brand-500/60 !text-brand-300' : ''}`}>{t}</button>
          ))}
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
        {reports.map((r) => (
          <a key={r.id} href={r.url} target="_blank" rel="noreferrer" className="card card-hover p-5 block">
            <div className="flex items-center justify-between text-xs text-slate-500">
              <span>{r.publisher}</span>
              <span className="chip">{r.year}</span>
            </div>
            <h3 className="mt-2 text-base font-semibold leading-snug">{r.title}</h3>
            <p className="mt-2 text-sm text-slate-300 line-clamp-3">{r.summary}</p>
            <div className="mt-3 flex items-center gap-2 flex-wrap">
              {r.tags?.map((t) => <span key={t} className="chip">{t}</span>)}
              <span className="ml-auto text-xs text-brand-300 inline-flex items-center gap-1">
                打开 <ExternalLink className="h-3 w-3" />
              </span>
            </div>
          </a>
        ))}
      </div>
    </div>
  );
}
