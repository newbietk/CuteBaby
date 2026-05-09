# CuteBaby 🍼

宝宝日常生活记录系统 — 记录喂奶、睡觉、尿布、拉屎等日常活动。

> [English Documentation](README.md)

## 功能

- 🍼 **喂奶** — 记录奶粉/母乳量 (ml)
- 💤 **睡觉** — 记录入睡和醒来时间，自动计算时长
- 💧 **尿尿** — 一键记录
- 💩 **拉屎** — 记录便便，可选备注颜色和性状
- 📊 **统计** — 每日汇总卡片 + 周/月柱状图
- 📱 **移动端优先** — 微信小程序风格 UI

## 技术栈

| 层级 | 选择 |
|---|---|
| 运行时 | Node.js 24 |
| 服务端 | Express 5 |
| 数据库 | sql.js (WASM SQLite) |
| 前端 | Vue 3 (CDN, 无构建步骤) |

## 快速开始

### 环境要求

- [Node.js](https://nodejs.org/) >= 18

### 安装运行

```bash
git clone https://github.com/newbietk/CuteBaby.git
cd CuteBaby
npm install
npm start
```

浏览器打开 `http://localhost:3000`，建议使用 Chrome 开发者工具的移动设备模拟（iPhone 12/13, 390×844）。

### 演示数据

首次启动会自动插入 8 条当天的示例记录，可以立即体验完整界面。

## API 接口

所有接口返回 JSON，可直接用于微信小程序对接。

| 方法 | 路径 | 说明 |
|---|---|---|
| `POST` | `/api/activities` | 创建记录 |
| `GET` | `/api/activities` | 查询记录列表 |
| `GET` | `/api/activities/:id` | 获取单条记录 |
| `PUT` | `/api/activities/:id` | 更新记录 |
| `DELETE` | `/api/activities/:id` | 删除记录 |
| `GET` | `/api/stats/daily?date=` | 每日统计 |
| `GET` | `/api/stats/range?start=&end=` | 时间段统计 |

`GET /api/activities` 支持查询参数: `date`、`start`、`end`、`type`、`page`、`limit`

## 微信小程序接入

1. 部署服务到云服务器并配置 HTTPS
2. 在小程序中通过 `wx.request()` 调用 `/api/*` 接口
3. 接入微信登录，将真实 openid 写入 users 表
4. Web 前端与小程序作为两个客户端并存

## 项目结构

```
CuteBaby/
├── server.js                 # 服务入口
├── package.json
├── src/
│   ├── db.js                 # 数据库层
│   └── routes/
│       ├── activities.js     # 活动记录路由
│       └── stats.js          # 统计路由
├── public/
│   ├── index.html            # 单页应用外壳
│   ├── css/app.css           # 样式
│   └── js/
│       ├── api.js            # API 封装
│       └── app.js            # Vue 3 应用
├── data/
│   └── .gitkeep              # 运行时数据目录
└── .gitignore
```

## License

ISC
