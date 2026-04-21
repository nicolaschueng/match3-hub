const BASE = '/api';

async function j<T>(path: string, init?: RequestInit): Promise<T> {
  const r = await fetch(BASE + path, init);
  if (!r.ok) throw new Error(`${r.status} ${r.statusText}`);
  return r.json();
}

export const api = {
  health: () => j<{ ok: boolean; ai: boolean; last_fetch_at: string | null; last_fetch_inserted: string | null; last_fetch_scanned: string | null }>('/health'),
  brief: () => j<{ date: string | null; brief: string; last_fetch_at: string | null }>('/brief'),
  refresh: () => j<{ ok: boolean; scanned: number; inserted: number }>('/refresh', { method: 'POST' }),
  articles: (p: { lang?: string; q?: string; tag?: string; limit?: number; match3?: boolean; casual?: boolean } = {}) => {
    const q = new URLSearchParams(
      Object.entries(p)
        .filter(([, v]) => v !== undefined && v !== '' && v !== false)
        .map(([k, v]) => [k, String(v)])
    ).toString();
    return j<Article[]>(`/articles${q ? `?${q}` : ''}`);
  },
  sources: () => j<Source[]>('/sources'),
  games: (p: { region?: string; q?: string } = {}) => {
    const q = new URLSearchParams(Object.entries(p).filter(([, v]) => v !== undefined && v !== '') as any).toString();
    return j<Game[]>(`/games${q ? `?${q}` : ''}`);
  },
  learningModules: () => j<LearningModule[]>('/learning/modules'),
  learningPlans: (persona?: string) => j<LearningPlan[]>(`/learning/plans${persona ? `?persona=${persona}` : ''}`),
  reports: (p: { lang?: string; tag?: string } = {}) => {
    const q = new URLSearchParams(Object.entries(p).filter(([, v]) => v !== undefined && v !== '') as any).toString();
    return j<Report[]>(`/reports${q ? `?${q}` : ''}`);
  },
};

export type Article = {
  id: number; source_name: string; lang: string; title: string; url: string;
  published_at: string; raw_summary: string; ai_summary: string; tags: string[]; created_at: string;
};
export type Source = {
  id: number; name: string; url: string; rss_url: string | null; lang: string; focus: string; notes: string; active: number;
};
export type Game = {
  id: number; title: string; publisher: string; region: string; released_year: number;
  downloads: string; revenue_monthly_usd: string; revenue_timestamp: string;
  dau: string; mau: string; chart_rank_us_ios: string; chart_rank_cn_ios: string;
  ua_intensity: string; monetization: string; sources: { label: string; url: string }[]; note: string;
};
export type LearningModule = {
  id: number; level: string; order_idx: number; title: string; summary: string;
  key_points: string[]; cases: string[]; resources: { label: string; url: string }[];
};
export type LearningPlan = {
  id: number; persona: string; week: number; title: string; tasks: string[];
};
export type Report = {
  id: number; title: string; publisher: string; year: number; language: string; url: string; summary: string; tags: string[];
};
