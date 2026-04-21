# Match3 Hub · 消除游戏设计学习平台

> 🎮 **在线 Demo**: **https://match3-hub.onrender.com**
> （Render 免费层，15 分钟无访问会休眠，首次唤醒约 30 秒。每天 07:00 / 19:00 自动抓取最新资讯）

一个围绕 **消除（Match-3）赛道** 的垂直学习与情报站点，为策划、制作人、发行运营提供每日更新的情报、数据、方法论与深度报告。

## 四大模块
1. **News Hub · 新闻动态** —— 聚合中英文消除赛道资讯，每日 AI 简报
2. **Data Explorer · 数据查询** —— 头部消除产品的下载量、收入、DAU/MAU、畅销榜、买量强度、变现模式
3. **Design Academy · 设计学院** —— 消除游戏设计方法论 5 级学习路径 + 3 类用户画像的定制学习计划 + 案例库
4. **Deep Reports · 深度报告** —— 2024-2025 消除赛道的可引用权威报告库

## 技术栈
- 前端：Vite + React 18 + TypeScript + TailwindCSS + Recharts + lucide-react
- 后端：Node + Express + better-sqlite3 + node-cron + rss-parser
- AI：可选接入 OpenAI 兼容接口，设置环境变量 `OPENAI_API_KEY` 与 `OPENAI_BASE_URL` / `OPENAI_MODEL` 启用每日简报摘要；无 key 时使用规则摘要。

## 安装与启动

```bash
# 在仓库根目录
npm run install:all        # 安装 root / server / client 依赖
npm run seed               # 导入种子数据到 SQLite（首次运行必跑）
npm run dev                # 同时启动后端(3001) 与前端(5173)
```

打开 http://localhost:5173 即可访问。

## 24 小时自动更新
后端启动后会：
- 启动时触发一次抓取
- 每天 07:00 / 19:00（Asia/Shanghai）执行定时任务：
  1. 从 RSS 源抓取最新消除赛道文章
  2. 调用 LLM（若配置）或规则算法为每篇文章生成中文摘要 + 标签
  3. 写入 SQLite，并生成「每日 AI 简报」
- 前端每 60 秒轮询刷新最近更新时间戳

## 目录结构
```
match3-hub/
├── server/                 # Node 后端 + SQLite + cron + AI 摘要
│   ├── src/
│   │   ├── index.js        # Express 入口
│   │   ├── db.js           # SQLite & schema
│   │   ├── fetcher.js      # RSS 抓取
│   │   ├── ai.js           # LLM 摘要（可选）
│   │   ├── cron.js         # 定时任务
│   │   └── seed.js         # 种子数据导入
│   └── data/               # 种子 JSON（新闻源、游戏数据、学习路径、报告）
└── client/                 # React 前端
    └── src/
        ├── pages/          # 4 个主模块 + Dashboard
        ├── components/     # UI 基础组件
        └── lib/            # API / 工具
```
