const express = require('express');
const path = require('path');

const app = express();
const PORT = process.env.PORT || 3000;

// Body parser
app.use(express.json());

// Serve static files first (before SPA fallback)
app.use(express.static(path.join(__dirname, 'public')));

// Lazy-load API routes after DB init
let serverReady = false;

// SPA & API handler — single middleware that handles everything
app.use(async (req, res, next) => {
  if (!serverReady) {
    return res.status(503).json({ error: { code: 'INITIALIZING', message: '服务器启动中' } });
  }
  next();
});

// Error handling
app.use((err, req, res, next) => {
  console.error('Server error:', err);
  res.status(500).json({ error: { code: 'SERVER_ERROR', message: '服务器内部错误' } });
});

// Start async
async function start() {
  const db = require('./src/db');
  const result = await db.initDb();

  // Wire up module exports after init
  db.listActivities = result.listActivities;
  db.getById = result.getById;
  db.create = result.create;
  db.update = result.update;
  db.remove = result.remove;
  db.dailyStats = result.dailyStats;
  db.rangeStats = result.rangeStats;
  db.seedIfEmpty = () => {};

  // Mount API routes after DB is ready
  const activitiesRouter = require('./src/routes/activities');
  const statsRouter = require('./src/routes/stats');
  app.use('/api/activities', activitiesRouter);
  app.use('/api/stats', statsRouter);

  // SPA fallback
  app.use((req, res) => {
    if (req.path.startsWith('/api')) {
      return res.status(404).json({ error: { code: 'NOT_FOUND', message: '接口不存在' } });
    }
    if (path.extname(req.path)) return res.status(404).end();
    res.sendFile(path.join(__dirname, 'public', 'index.html'));
  });

  serverReady = true;

  app.listen(PORT, () => {
    console.log(`CuteBaby server running at http://localhost:${PORT}`);
    console.log(`Press Ctrl+C to stop`);
  });
}

start().catch(err => {
  console.error('Failed to start server:', err);
  process.exit(1);
});
