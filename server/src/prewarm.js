/**
 * 构建期预热：seed 种子 -> 抓取一轮 RSS -> 生成首日 AI 简报 -> 把 match3.db 烤进镜像。
 * 失败不阻断构建（例如构建机无外网），只打印 warning。
 */
import { fetchAllSources } from './fetcher.js';

console.log('[prewarm] start fetching ...');
fetchAllSources()
  .then((r) => {
    console.log(`[prewarm] done. scanned=${r.scanned} inserted=${r.inserted}`);
    process.exit(0);
  })
  .catch((e) => {
    console.warn('[prewarm] failed (non-fatal):', e.message);
    process.exit(0);
  });
