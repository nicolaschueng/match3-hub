import cron from 'node-cron';
import { fetchAllSources } from './fetcher.js';

export function startCron() {
  // 每天 07:00 与 19:00 执行
  cron.schedule('0 7,19 * * *', () => {
    console.log('[cron] scheduled fetch at', new Date().toISOString());
    fetchAllSources().catch((e) => console.error('[cron] error:', e));
  }, { timezone: 'Asia/Shanghai' });

  // 启动后延迟 10s 触发一次
  setTimeout(() => {
    console.log('[cron] initial fetch triggered');
    fetchAllSources().catch((e) => console.error('[cron] initial error:', e));
  }, 10_000);
}
