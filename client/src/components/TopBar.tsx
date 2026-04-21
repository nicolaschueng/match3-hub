import { useEffect, useState } from 'react';
import { RefreshCw, Sparkles, CheckCircle2, AlertCircle } from 'lucide-react';
import { api } from '../lib/api';

export default function TopBar() {
  const [status, setStatus] = useState<{ ai: boolean; last_fetch_at: string | null } | null>(null);
  const [refreshing, setRefreshing] = useState(false);
  const [msg, setMsg] = useState('');

  async function load() {
    try {
      const h = await api.health();
      setStatus(h);
    } catch {
      setStatus(null);
    }
  }

  useEffect(() => {
    load();
    const t = setInterval(load, 60_000);
    return () => clearInterval(t);
  }, []);

  async function refresh() {
    setRefreshing(true);
    setMsg('');
    try {
      const r = await api.refresh();
      setMsg(`已扫描 ${r.scanned} 条，新增 ${r.inserted} 条`);
      load();
    } catch (e: any) {
      setMsg('刷新失败：' + e.message);
    } finally {
      setRefreshing(false);
    }
  }

  const last = status?.last_fetch_at ? new Date(status.last_fetch_at).toLocaleString('zh-CN') : '—';
  return (
    <div className="sticky top-0 z-20 border-b border-white/10 bg-slate-950/70 backdrop-blur">
      <div className="px-6 md:px-10 py-3 flex items-center gap-4 max-w-[1400px] mx-auto">
        <div className="text-sm text-slate-400">
          <span className="muted">上次更新：</span>
          <span className="text-slate-200">{last}</span>
        </div>
        <div className="hidden md:flex items-center gap-2 text-xs">
          <span className="chip">
            <Sparkles className="h-3 w-3 text-accent-400" />
            AI 摘要 {status?.ai ? <CheckCircle2 className="h-3 w-3 text-emerald-400" /> : <AlertCircle className="h-3 w-3 text-amber-400" />}
            <span className="text-slate-400 ml-0.5">{status?.ai ? '已启用' : '规则降级'}</span>
          </span>
          <span className="chip">每日 07:00 / 19:00 自动更新</span>
        </div>
        <div className="flex-1" />
        {msg && <span className="text-xs text-slate-400 mr-2">{msg}</span>}
        <button className="btn-primary" onClick={refresh} disabled={refreshing}>
          <RefreshCw className={`h-4 w-4 ${refreshing ? 'animate-spin' : ''}`} />
          立即刷新
        </button>
      </div>
    </div>
  );
}
