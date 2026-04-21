import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { BarChart3, BookOpen, FileText, Newspaper, Sparkles, TrendingUp } from 'lucide-react';
import { api, Article, Game } from '../lib/api';
import { Bar, BarChart, CartesianGrid, Legend, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';

export default function Dashboard() {
  const [brief, setBrief] = useState<{ date: string | null; brief: string; last_fetch_at: string | null } | null>(null);
  const [articles, setArticles] = useState<Article[]>([]);
  const [games, setGames] = useState<Game[]>([]);

  useEffect(() => {
    api.brief().then(setBrief);
    api.articles({ limit: 6 }).then(setArticles);
    api.games().then(setGames);
  }, []);

  // 将 revenue_monthly_usd 文本粗略转为数字（用于图表），仅做可视化参考
  const revData = games
    .map((g) => {
      const m = g.revenue_monthly_usd?.match(/\$?([\d.]+)\s*M/i);
      return { name: g.title.length > 12 ? g.title.slice(0, 12) + '…' : g.title, revenue: m ? Number(m[1]) : 0 };
    })
    .filter((x) => x.revenue > 0)
    .sort((a, b) => b.revenue - a.revenue)
    .slice(0, 8);

  return (
    <div className="space-y-8">
      <header className="flex flex-col md:flex-row md:items-end md:justify-between gap-3">
        <div>
          <div className="text-xs uppercase tracking-[0.3em] text-brand-400/80 font-medium">Match3 Hub · 消除游戏学习平台</div>
          <h1 className="mt-2 text-3xl md:text-4xl font-bold tracking-tight">
            看见消除赛道的<span className="text-brand-400">每一个</span>关键信号
          </h1>
          <p className="mt-2 text-slate-400 max-w-2xl">
            AI 每日自动抓取全球 20+ 信源，沉淀头部产品真实数据、设计方法论与深度报告，帮你在三消这条看似固化的赛道里找到差异化路径。
          </p>
        </div>
      </header>

      {/* Daily Brief */}
      <section className="card p-6">
        <div className="flex items-center gap-2 mb-3">
          <Sparkles className="h-5 w-5 text-accent-400" />
          <h2 className="section-title">每日 AI 简报</h2>
          <span className="chip ml-2">{brief?.date || '—'}</span>
        </div>
        <p className="text-slate-200 leading-relaxed whitespace-pre-wrap">
          {brief?.brief || '正在生成每日简报……'}
        </p>
      </section>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Quick entries */}
        <Link to="/news" className="card card-hover p-5">
          <Newspaper className="h-6 w-6 text-brand-400" />
          <div className="mt-3 text-lg font-semibold">新闻动态</div>
          <div className="mt-1 muted text-sm">聚合全球 20+ 消除赛道信源</div>
        </Link>
        <Link to="/data" className="card card-hover p-5">
          <BarChart3 className="h-6 w-6 text-brand-400" />
          <div className="mt-3 text-lg font-semibold">数据查询</div>
          <div className="mt-1 muted text-sm">头部产品 DAU / 收入 / 买量快照</div>
        </Link>
        <Link to="/academy" className="card card-hover p-5">
          <BookOpen className="h-6 w-6 text-brand-400" />
          <div className="mt-3 text-lg font-semibold">设计学院</div>
          <div className="mt-1 muted text-sm">5 级学习路径 + 3 类定制计划</div>
        </Link>
      </div>

      {/* Chart + Latest */}
      <div className="grid grid-cols-1 lg:grid-cols-5 gap-6">
        <div className="card p-5 lg:col-span-3">
          <div className="flex items-center gap-2 mb-4">
            <TrendingUp className="h-5 w-5 text-brand-400" />
            <h3 className="section-title">头部消除产品月流水（美元，公开口径）</h3>
          </div>
          {revData.length ? (
            <div className="h-72">
              <ResponsiveContainer>
                <BarChart data={revData}>
                  <CartesianGrid stroke="rgba(255,255,255,0.06)" vertical={false} />
                  <XAxis dataKey="name" stroke="#94a3b8" fontSize={12} interval={0} angle={-20} height={60} />
                  <YAxis stroke="#94a3b8" fontSize={12} tickFormatter={(v) => `$${v}M`} />
                  <Tooltip
                    contentStyle={{ background: '#0f172a', border: '1px solid rgba(255,255,255,0.1)', borderRadius: 8 }}
                    formatter={(v: number) => `$${v}M / 月`}
                  />
                  <Legend />
                  <Bar dataKey="revenue" name="月流水（百万美元）" fill="url(#g1)" radius={[8, 8, 0, 0]} />
                  <defs>
                    <linearGradient id="g1" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="0%" stopColor="#ff3366" />
                      <stop offset="100%" stopColor="#c80d4a" />
                    </linearGradient>
                  </defs>
                </BarChart>
              </ResponsiveContainer>
            </div>
          ) : (
            <div className="text-slate-400 text-sm">数据加载中……</div>
          )}
          <p className="mt-3 text-xs text-slate-500">
            数据来源：Business of Apps / Sensor Tower / AppMagic / PocketGamer.biz 公开披露，时效以各产品卡片为准。
          </p>
        </div>

        <div className="card p-5 lg:col-span-2 flex flex-col">
          <div className="flex items-center gap-2 mb-3">
            <FileText className="h-5 w-5 text-brand-400" />
            <h3 className="section-title">最新资讯</h3>
            <Link to="/news" className="ml-auto text-xs text-brand-300 hover:text-brand-200">查看全部 →</Link>
          </div>
          <ul className="space-y-3">
            {articles.length === 0 && <li className="text-sm text-slate-400">后台正在抓取最新资讯，请稍候或点击右上角「立即刷新」。</li>}
            {articles.map((a) => (
              <li key={a.id} className="group">
                <a href={a.url} target="_blank" rel="noreferrer" className="block">
                  <div className="text-sm text-slate-100 group-hover:text-brand-300 line-clamp-2">{a.title}</div>
                  <div className="mt-1 text-xs text-slate-500 flex items-center gap-2">
                    <span>{a.source_name}</span>·
                    <span>{new Date(a.published_at).toLocaleDateString('zh-CN')}</span>
                    {a.tags?.slice(0, 2).map((t) => <span key={t} className="chip !py-0">{t}</span>)}
                  </div>
                </a>
              </li>
            ))}
          </ul>
        </div>
      </div>
    </div>
  );
}
