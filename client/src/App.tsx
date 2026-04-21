import { NavLink, Route, Routes, Navigate } from 'react-router-dom';
import { BarChart3, BookOpen, FileText, LayoutDashboard, Newspaper, Puzzle } from 'lucide-react';
import Dashboard from './pages/Dashboard';
import News from './pages/News';
import Data from './pages/Data';
import Academy from './pages/Academy';
import Reports from './pages/Reports';
import TopBar from './components/TopBar';

const NAV = [
  { to: '/dashboard', label: '概览', icon: LayoutDashboard },
  { to: '/news', label: '新闻动态', icon: Newspaper },
  { to: '/data', label: '数据查询', icon: BarChart3 },
  { to: '/academy', label: '设计学院', icon: BookOpen },
  { to: '/reports', label: '深度报告', icon: FileText },
];

export default function App() {
  return (
    <div className="min-h-screen flex">
      <aside className="hidden md:flex w-60 shrink-0 flex-col border-r border-white/10 bg-slate-950/60 backdrop-blur-sm">
        <div className="px-5 py-6 flex items-center gap-2">
          <div className="h-9 w-9 grid place-items-center rounded-xl bg-gradient-to-br from-brand-500 to-accent-500 shadow-lg">
            <Puzzle className="h-5 w-5 text-white" />
          </div>
          <div>
            <div className="text-sm text-slate-400">Match3</div>
            <div className="-mt-0.5 text-lg font-semibold tracking-tight">Hub</div>
          </div>
        </div>
        <nav className="px-3 mt-2 space-y-1">
          {NAV.map((n) => (
            <NavLink
              key={n.to}
              to={n.to}
              className={({ isActive }) =>
                `flex items-center gap-3 rounded-lg px-3 py-2 text-sm transition-colors ${
                  isActive
                    ? 'bg-brand-500/15 text-brand-300 border border-brand-500/30'
                    : 'text-slate-300 hover:bg-white/5 hover:text-white border border-transparent'
                }`
              }
            >
              <n.icon className="h-4 w-4" />
              {n.label}
            </NavLink>
          ))}
        </nav>
        <div className="mt-auto p-4 text-xs text-slate-500 leading-relaxed">
          Match3 Hub · 消除游戏设计学习平台
          <br />
          <span className="text-slate-600">为策划 / 制作人 / 发行运营打造</span>
        </div>
      </aside>

      <main className="flex-1 min-w-0 flex flex-col">
        <TopBar />
        <div className="px-6 md:px-10 py-6 md:py-8 max-w-[1400px] w-full mx-auto">
          <Routes>
            <Route path="/" element={<Navigate to="/dashboard" replace />} />
            <Route path="/dashboard" element={<Dashboard />} />
            <Route path="/news" element={<News />} />
            <Route path="/data" element={<Data />} />
            <Route path="/academy" element={<Academy />} />
            <Route path="/reports" element={<Reports />} />
          </Routes>
        </div>
      </main>
    </div>
  );
}
