# CuteBaby 🍼

A baby daily activity tracker — record feedings, sleep, diaper changes, and more.

> [中文文档](README_CN.md)

## Features

- 🍼 **Feeding** — track formula/breast milk amount (ml)
- 💤 **Sleep** — track sleep duration with start and end time
- 💧 **Urination** — one-tap pee log
- 💩 **Bowel** — log bowel movements with optional notes (color, consistency)
- 📊 **Stats** — daily summary cards, weekly/monthly bar charts
- 📱 **Mobile-first** — WeChat Mini Program style UI

## Tech Stack

| Layer | Choice |
|---|---|
| Runtime | Node.js 24 |
| Server | Express 5 |
| Database | sql.js (WASM SQLite) |
| Frontend | Vue 3 (CDN, no build step) |

## Quick Start

### Prerequisites

- [Node.js](https://nodejs.org/) >= 18

### Install & Run

```bash
git clone https://github.com/newbietk/CuteBaby.git
cd CuteBaby
npm install
npm start
```

Open `http://localhost:3000` in your browser. For the best experience, use Chrome DevTools mobile device emulation (iPhone 12/13, 390×844).

### Demo Data

On first run, the app automatically inserts 8 sample records for today so you can see the UI in action immediately.

## API Endpoints

All endpoints return JSON. Ready for WeChat Mini Program integration.

| Method | Path | Description |
|---|---|---|
| `POST` | `/api/activities` | Create a record |
| `GET` | `/api/activities` | List records |
| `GET` | `/api/activities/:id` | Get a single record |
| `PUT` | `/api/activities/:id` | Update a record |
| `DELETE` | `/api/activities/:id` | Delete a record |
| `GET` | `/api/stats/daily?date=` | Daily summary |
| `GET` | `/api/stats/range?start=&end=` | Date range stats |

`GET /api/activities` supports query parameters: `date`, `start`, `end`, `type`, `page`, `limit`

## WeChat Mini Program Integration

1. Deploy the server to a cloud VPS with HTTPS
2. Call the `/api/*` endpoints via `wx.request()`
3. Add WeChat login to populate the `users` table with real `openid`
4. The web SPA and mini program can coexist as two clients

## Project Structure

```
CuteBaby/
├── server.js                 # Express entry point
├── package.json
├── src/
│   ├── db.js                 # SQLite init, schema, CRUD
│   └── routes/
│       ├── activities.js     # /api/activities routes
│       └── stats.js          # /api/stats routes
├── public/
│   ├── index.html            # SPA shell
│   ├── css/app.css           # Styles
│   └── js/
│       ├── api.js            # HTTP client wrapper
│       └── app.js            # Vue 3 application
├── data/
│   └── .gitkeep              # Runtime data directory
└── .gitignore
```

## License

ISC
