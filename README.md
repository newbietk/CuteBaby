# CuteBaby 🍼

A baby daily activity tracker — record feedings, sleep, diaper changes, and more.  
宝宝日常生活记录系统 — 记录喂奶、睡觉、尿布、拉屎等日常活动。

## Features / 功能

- 🍼 **Feeding** — track formula/breast milk amount (ml)  
  **喂奶** — 记录奶粉/母乳量 (ml)
- 💤 **Sleep** — track sleep duration (start + end time)  
  **睡觉** — 记录入睡和醒来时间，自动计算时长
- 💧 **Urination** — one-tap pee log  
  **尿尿** — 一键记录
- 💩 **Bowel** — log bowel movements with optional notes  
  **拉屎** — 记录便便，可选备注颜色/性状
- 📊 **Stats** — daily summary, weekly/monthly charts  
  **统计** — 每日汇总卡片 + 周/月柱状图
- 📱 **Mobile-first** — designed like a WeChat Mini Program  
  **移动端优先** — 微信小程序风格 UI

## Screenshots / 截图

| Home / 首页 | History / 记录 | Stats / 统计 |
|:---:|:---:|:---:|
| Today's summary + quick record + timeline | Date filter + type filter + edit/delete | Range selector + bar charts |

## Tech Stack / 技术栈

| Layer / 层级 | Choice / 选择 |
|---|---|
| Runtime / 运行时 | Node.js 24 |
| Server / 服务端 | Express 5 |
| Database / 数据库 | sql.js (WASM SQLite) |
| Frontend / 前端 | Vue 3 (CDN, no build step) |

## Quick Start / 快速开始

### Prerequisites / 环境要求

- [Node.js](https://nodejs.org/) >= 18

### Install & Run / 安装运行

```bash
# Clone the repo / 克隆仓库
git clone https://github.com/newbietk/CuteBaby.git
cd CuteBaby

# Install dependencies / 安装依赖
npm install

# Start the server / 启动服务
npm start
```

Open `http://localhost:3000` in your browser. For the best experience, use Chrome DevTools mobile device emulation (iPhone 12/13, 390×844).  
浏览器打开 `http://localhost:3000`，建议使用 Chrome 开发者工具的移动设备模拟（iPhone 12/13）。

### Demo Data / 演示数据

On first run, the app automatically inserts 8 sample records for today, so you can see the UI in action immediately.  
首次启动会自动插入 8 条当天的示例记录，可以立即体验完整界面。

## API Endpoints / API 接口

All endpoints return JSON. Ready for WeChat Mini Program integration.  
所有接口返回 JSON，可直接用于微信小程序对接。

| Method | Path | Description / 说明 |
|---|---|---|
| `POST` | `/api/activities` | Create a record / 创建记录 |
| `GET` | `/api/activities` | List records / 查询记录列表 |
| `GET` | `/api/activities/:id` | Get single record / 获取单条记录 |
| `PUT` | `/api/activities/:id` | Update a record / 更新记录 |
| `DELETE` | `/api/activities/:id` | Delete a record / 删除记录 |
| `GET` | `/api/stats/daily?date=` | Daily summary / 每日统计 |
| `GET` | `/api/stats/range?start=&end=` | Date range stats / 时间段统计 |

### Query Parameters / 查询参数

`GET /api/activities` supports: `date`, `start`, `end`, `type`, `page`, `limit`

## WeChat Mini Program Integration / 微信小程序接入

1. Deploy the server to a cloud VPS with HTTPS / 部署服务到云服务器并配置 HTTPS
2. Call the same `/api/*` endpoints via `wx.request()` / 在小程序中通过 `wx.request()` 调用接口
3. Add WeChat login to populate the `users` table with real `openid` / 接入微信登录，将真实 openid 写入 users 表
4. The frontend SPA and mini program can coexist as two clients / Web 前端与小程序作为两个客户端并存

## Project Structure / 项目结构

```
CuteBaby/
├── server.js                 # Express entry point / 服务入口
├── package.json
├── src/
│   ├── db.js                 # SQLite init, schema, CRUD / 数据库层
│   └── routes/
│       ├── activities.js     # /api/activities routes / 活动记录路由
│       └── stats.js          # /api/stats routes / 统计路由
├── public/
│   ├── index.html            # SPA shell / 单页应用外壳
│   ├── css/app.css           # Styles / 样式
│   └── js/
│       ├── api.js            # HTTP client / API 封装
│       └── app.js            # Vue 3 application / Vue 3 应用
├── data/
│   └── .gitkeep              # Runtime data directory / 运行时数据目录
└── .gitignore
```

## License

ISC
