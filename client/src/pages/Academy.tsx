import { useEffect, useMemo, useState } from 'react';
import { ExternalLink, GraduationCap, ListChecks, Target, UserCog } from 'lucide-react';
import { api, LearningModule, LearningPlan } from '../lib/api';

const PERSONAS = [
  { id: 'beginner', label: '零基础策划', desc: '刚接触消除品类的新人' },
  { id: 'level-designer', label: '关卡策划', desc: '3 年经验，想转制作人' },
  { id: 'producer', label: '消除制作人', desc: '想把产品打到海外市场' },
];

const LEVEL_META: Record<string, { title: string; desc: string }> = {
  L1: { title: 'L1 入门', desc: '演化史与核心循环' },
  L2: { title: 'L2 关卡设计', desc: '目标、难度、FTUE' },
  L3: { title: 'L3 元玩法 & LiveOps', desc: '装修/剧情/社交/赛季' },
  L4: { title: 'L4 经济 & 变现', desc: 'ARPPU / LTV / IAP+IAA' },
  L5: { title: 'L5 买量 & 长线运营', desc: '素材方法论 / A/B 测试' },
};

export default function Academy() {
  const [modules, setModules] = useState<LearningModule[]>([]);
  const [persona, setPersona] = useState('beginner');
  const [plans, setPlans] = useState<LearningPlan[]>([]);
  const [openId, setOpenId] = useState<number | null>(null);

  useEffect(() => { api.learningModules().then(setModules); }, []);
  useEffect(() => { api.learningPlans(persona).then(setPlans); }, [persona]);

  const grouped = useMemo(() => {
    const map: Record<string, LearningModule[]> = {};
    modules.forEach((m) => { (map[m.level] ||= []).push(m); });
    return map;
  }, [modules]);

  return (
    <div className="space-y-8">
      <header>
        <h1 className="text-3xl font-bold tracking-tight">设计学院</h1>
        <p className="muted mt-1">5 级学习路径 · 真实案例索引 · 3 类用户画像的 4 周定制计划</p>
      </header>

      {/* 定制学习计划 */}
      <section className="card p-6">
        <div className="flex items-center gap-2 mb-3">
          <UserCog className="h-5 w-5 text-brand-400" />
          <h2 className="section-title">为你定制的 4 周学习计划</h2>
        </div>
        <div className="flex flex-wrap gap-2">
          {PERSONAS.map((p) => (
            <button
              key={p.id}
              onClick={() => setPersona(p.id)}
              className={`rounded-lg border px-4 py-2 text-left transition-all ${
                persona === p.id
                  ? 'border-brand-500 bg-brand-500/15'
                  : 'border-white/10 bg-white/[0.02] hover:bg-white/5'
              }`}
            >
              <div className="text-sm font-medium">{p.label}</div>
              <div className="text-xs text-slate-400 mt-0.5">{p.desc}</div>
            </button>
          ))}
        </div>

        <div className="mt-5 grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-4">
          {plans.map((p) => (
            <div key={p.id} className="rounded-xl border border-white/10 bg-white/[0.03] p-4">
              <div className="flex items-center gap-2 text-xs text-brand-300 font-medium">
                <Target className="h-3.5 w-3.5" /> 第 {p.week} 周
              </div>
              <div className="mt-1 text-base font-semibold">{p.title}</div>
              <ul className="mt-3 space-y-1.5 text-sm text-slate-300">
                {p.tasks.map((t, i) => (
                  <li key={i} className="flex gap-2">
                    <ListChecks className="h-4 w-4 mt-0.5 text-slate-500 shrink-0" />
                    <span>{t}</span>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>
      </section>

      {/* 5 级学习路径 */}
      <section className="space-y-6">
        <div className="flex items-center gap-2">
          <GraduationCap className="h-5 w-5 text-brand-400" />
          <h2 className="section-title">5 级学习路径</h2>
        </div>

        {Object.keys(LEVEL_META).map((level) => (
          <div key={level} className="card p-5">
            <div className="flex items-center gap-3">
              <div className="h-9 w-9 grid place-items-center rounded-lg bg-gradient-to-br from-brand-500/30 to-accent-500/20 border border-white/10 font-bold">
                {level}
              </div>
              <div>
                <div className="text-base font-semibold">{LEVEL_META[level].title}</div>
                <div className="text-xs text-slate-400">{LEVEL_META[level].desc}</div>
              </div>
            </div>
            <div className="mt-4 grid grid-cols-1 md:grid-cols-2 gap-3">
              {(grouped[level] || []).map((m) => {
                const open = openId === m.id;
                return (
                  <div key={m.id} className={`rounded-xl border border-white/10 bg-white/[0.02] p-4 ${open ? 'md:col-span-2 border-brand-500/40 bg-brand-500/5' : ''}`}>
                    <button onClick={() => setOpenId(open ? null : m.id)} className="w-full text-left">
                      <div className="text-sm text-brand-300/80">课程 {m.order_idx}</div>
                      <div className="mt-0.5 text-base font-semibold">{m.title}</div>
                      <p className="mt-2 text-sm text-slate-300 leading-relaxed">{m.summary}</p>
                    </button>

                    {open && (
                      <div className="mt-4 space-y-4 text-sm">
                        <div>
                          <div className="text-xs uppercase tracking-wider text-slate-500 mb-1.5">核心知识点</div>
                          <ul className="list-disc list-inside space-y-1 text-slate-200">
                            {m.key_points.map((k, i) => <li key={i}>{k}</li>)}
                          </ul>
                        </div>
                        <div>
                          <div className="text-xs uppercase tracking-wider text-slate-500 mb-1.5">代表案例</div>
                          <ul className="list-disc list-inside space-y-1 text-slate-200">
                            {m.cases.map((k, i) => <li key={i}>{k}</li>)}
                          </ul>
                        </div>
                        <div>
                          <div className="text-xs uppercase tracking-wider text-slate-500 mb-1.5">推荐资料</div>
                          <ul className="space-y-1">
                            {m.resources.map((r) => (
                              <li key={r.url}>
                                <a href={r.url} target="_blank" rel="noreferrer" className="inline-flex items-center gap-1.5 text-brand-300 hover:text-brand-200">
                                  <ExternalLink className="h-3.5 w-3.5" />
                                  {r.label}
                                </a>
                              </li>
                            ))}
                          </ul>
                        </div>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        ))}
      </section>
    </div>
  );
}
