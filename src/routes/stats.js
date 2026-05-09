const express = require('express');
const router = express.Router();
const db = require('../db');

// GET /api/stats/daily
router.get('/daily', (req, res) => {
  const date = req.query.date || db.getTodayStr();
  const stats = db.dailyStats(date);
  res.json(stats);
});

// GET /api/stats/range
router.get('/range', (req, res) => {
  const { start, end } = req.query;
  if (!start || !end) {
    return res.status(400).json({
      error: { code: 'MISSING_PARAMS', message: 'start 和 end 参数必填' },
    });
  }

  const data = db.rangeStats(start, end);
  res.json(data);
});

module.exports = router;
