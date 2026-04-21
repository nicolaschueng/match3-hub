import { useEffect, useMemo, useState } from 'react';
import { Search, Globe, ExternalLink } from 'lucide-react';
import { api, Game } from '../lib/api';
import { Bar, BarChart, CartesianGrid, Legend, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';

export default function Data() {
  const [games, setGames] = useState<Game[]>([]);
  const [q, setQ] = useState('');
  const [region, setRegion] = useState('');
  const [active, setActive] = useState<Game | null>(null);

  useEffect(() => {
    api.games({ q: q || undefined, region: region || undefined }).then((gs) => {
      setGames(gs);
      if (!active && gs[0]) setActive(gs[0]);
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [q, region]);

  const revData = useMemo(() => {
    return games
      .map((g) => {
        const m = g.revenue_monthly_usd?.match(/\$?([\d.]+)\s*M/i);
        return { name: g.title.length > 10 ? g.title.slice(0, 10) + '…' : g.title, revenue: m ? Number(m[1]) : 0 };
      })
      .filter((x) => x.revenue > 0)
      .sort((a, b) => b.revenue - a.revenue);
  }, [games]);

  return (
    <div className="space-y-6">
      <header>
        <h1 className="text-3xl font-bold tracking-tight">数据查询</h1>
        <p className="muted mt-1">基于 Sensor Tower / AppMagic / Business of Apps / 点点数据 等公开披露的可引用数据快照</p>
      </header>

      <div className="card p-4 flex flex-col md:flex-row md:items-center gap-3">
        <div className="flex items-center gap-2 flex-1">
          <Search className="h-4 w-4 text-slate-500" />
          <input
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder="搜索游戏：Royal Match、开心消消乐、Gardenscapes…"
            className="bg-transparent outline-none flex-1 text-sm placeholder:text-slate-500"
          />
        </div>
        <div className="flex items-center gap-2">
          <Globe className="h-4 w-4 text-slate-500" />
          <select value={region} onChange={(e) => setRegion(e.target.value)} className="bg-slate-900 border border-white/10 rounded-md px-2 py-1 text-sm">
            <option value="">全部地区</option>
            <option value="Global">海外</option>
            <option value="China">中国大陆</option>
          </select>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="card p-5">
          <h3 className="section-title mb-4">月流水对比（百万美元）</h3>
          <div className="h-72">
            <ResponsiveContainer>
              <BarChart data={revData} layout="vertical" margin={{ left: 10 }}>
                <CartesianGrid stroke="rgba(255,255,255,0.06)" horizontal={false} />
                <XAxis type="number" stroke="#94a3b8" fontSize={12} tickFormatter={(v) => `$${v}M`} />
                <YAxis type="category" dataKey="name" stroke="#94a3b8" fontSize={12} width={110} />
                <Tooltip
                  contentStyle={{ background: '#0f172a', border: '1px solid rgba(255,255,255,0.1)', borderRadius: 8 }}
                  formatter={(v: number) => `$${v}M / 月`}
                />
                <Legend />
                <Bar dataKey="revenue" name="月流水" fill="#ff3366" radius={[0, 8, 8, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
          <p className="mt-2 text-xs text-slate-500">仅收录披露月流水的产品；国内头部（开心消消乐等）未披露具体月流水，详见下方卡片。</p>
        </div>

        <div className="card p-5">
          <h3 className="section-title mb-4">关键洞察</h3>
          <ul className="space-y-3 text-sm text-slate-300 leading-relaxed">
            <li>▸ 2024 年 <b className="text-brand-300">Royal Match</b> 独占 Match-3 品类 IAP 收入 <b className="text-brand-300">51%</b>，全年流水 $1.46B。剔除 Royal Match 后，Match-3 品类反而同比下滑 8%。</li>
            <li>▸ <b>Playrix</b> 维持 Gardenscapes / Homescapes / Fishdom / Township 四大支柱，全系累计收入已突破 $120 亿，全线采用 IAP+IAA 混合。</li>
            <li>▸ <b>Royal Match</b> 50-60% 下载来自买量，显著高于 Candy Crush 的 15-25%，买量效率通过每年 60 次 A/B 测试持续打磨。</li>
            <li>▸ 国内赛道仍由 <b>开心消消乐</b>（女性占 66.9%、35+ 岁占 61.96%）断层领先，但莉莉丝 / 网易 / 麦吉太文等厂商已重新下注。</li>
          </ul>
        </div>
      </div>

      <section className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {games.map((g) => (
          <button
            key={g.id}
            onClick={() => setActive(g)}
            className={`text-left card card-hover p-5 ${active?.id === g.id ? '!border-brand-500/60 !bg-brand-500/10' : ''}`}
          >
            <div className="flex items-start justify-between">
              <div>
                <div className="text-xs text-slate-400">{g.publisher} · {g.region === 'China' ? '中国' : '海外'} · {g.released_year}</div>
                <h3 className="text-lg font-semibold mt-0.5">{g.title}</h3>
              </div>
              <span className="chip">{g.monetization}</span>
            </div>
            <div className="mt-3 grid grid-cols-2 gap-2 text-xs">
              <Field label="下载量" value={g.downloads} />
              <Field label="月流水" value={g.revenue_monthly_usd} />
              <Field label="MAU" value={g.mau} />
              <Field label="买量强度" value={g.ua_intensity} />
              <Field label="US iOS 榜" value={g.chart_rank_us_ios} />
              <Field label="CN iOS 榜" value={g.chart_rank_cn_ios} />
            </div>
          </button>
        ))}
      </section>

      {active && (
        <section className="card p-6">
          <div className="flex items-center gap-3">
            <h2 className="section-title">{active.title} · 详细档案</h2>
            <span className="chip">{active.publisher}</span>
            <span className="chip">{active.region === 'China' ? '中国' : '海外'}</span>
          </div>
          <p className="mt-3 text-slate-300 text-sm leading-relaxed">{active.note}</p>
          <div className="mt-4 grid grid-cols-2 md:grid-cols-3 gap-3 text-sm">
            <Detail label="发行年份" value={String(active.released_year)} />
            <Detail label="累计下载" value={active.downloads} />
            <Detail label="月流水" value={active.revenue_monthly_usd} />
            <Detail label="DAU" value={active.dau} />
            <Detail label="MAU" value={active.mau} />
            <Detail label="US iOS 畅销" value={active.chart_rank_us_ios} />
            <Detail label="CN iOS 畅销" value={active.chart_rank_cn_ios} />
            <Detail label="买量强度" value={active.ua_intensity} />
            <Detail label="变现模式" value={active.monetization} />
          </div>

          {active.sources?.length > 0 && (
            <div className="mt-5">
              <div className="text-sm text-slate-300 font-medium mb-2">数据出处（可点击核验）</div>
              <ul className="space-y-1.5 text-sm">
                {active.sources.map((s) => (
                  <li key={s.url}>
                    <a href={s.url} target="_blank" rel="noreferrer" className="text-brand-300 hover:text-brand-200 inline-flex items-center gap-1.5">
                      <ExternalLink className="h-3.5 w-3.5" />
                      {s.label}
                    </a>
                  </li>
                ))}
              </ul>
            </div>
          )}
        </section>
      )}
    </div>
  );
}

function Field({ label, value }: { label: string; value: string }) {
  return (
    <div className="bg-white/[0.02] border border-white/5 rounded-md px-2.5 py-1.5">
      <div className="text-[10px] uppercase tracking-wider text-slate-500">{label}</div>
      <div className="text-slate-200 mt-0.5 truncate" title={value}>{value || '—'}</div>
    </div>
  );
}

function Detail({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-lg border border-white/5 bg-white/[0.03] p-3">
      <div className="text-xs text-slate-500 uppercase tracking-wider">{label}</div>
      <div className="mt-1 text-slate-100 text-[13px]">{value || '—'}</div>
    </div>
  );
}
