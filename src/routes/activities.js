const express = require('express');
const router = express.Router();
const db = require('../db');

const VALID_TYPES = ['feeding', 'urination', 'bowel', 'sleep'];

function validateActivity(body, isUpdate = false) {
  const errors = [];

  if (!isUpdate || body.type !== undefined) {
    if (!body.type || !VALID_TYPES.includes(body.type)) {
      errors.push({ field: 'type', reason: `类型必须是: ${VALID_TYPES.join(', ')}` });
    }
  }

  if (!isUpdate || body.start_time !== undefined) {
    if (!body.start_time || isNaN(Date.parse(body.start_time))) {
      errors.push({ field: 'start_time', reason: 'start_time 必须是有效的 ISO 8601 时间字符串' });
    }
  }

  if (body.type === 'sleep' && body.end_time !== undefined && body.end_time !== null) {
    if (isNaN(Date.parse(body.end_time))) {
      errors.push({ field: 'end_time', reason: 'end_time 必须是有效的 ISO 8601 时间字符串' });
    }
    if (body.start_time && body.end_time && new Date(body.end_time) <= new Date(body.start_time)) {
      errors.push({ field: 'end_time', reason: 'end_time 必须晚于 start_time' });
    }
  }

  if (body.type === 'feeding' && body.amount !== undefined && body.amount !== null) {
    if (!Number.isInteger(body.amount) || body.amount <= 0) {
      errors.push({ field: 'amount', reason: 'amount 必须是正整数' });
    }
  }

  return errors;
}

// POST /api/activities
router.post('/', (req, res) => {
  const errors = validateActivity(req.body);
  if (errors.length > 0) {
    return res.status(400).json({
      error: { code: 'VALIDATION_ERROR', message: '输入校验失败', details: errors },
    });
  }

  const record = db.create(req.body);
  res.status(201).json(record);
});

// GET /api/activities
router.get('/', (req, res) => {
  const { date, type, page = '1', limit = '50', start, end } = req.query;
  const pageNum = Math.max(1, parseInt(page) || 1);
  const limitNum = Math.min(200, Math.max(1, parseInt(limit) || 50));

  const opts = { page: pageNum, limit: limitNum };
  if (start || end) {
    if (start) opts.start = start;
    if (end) opts.end = end;
  } else {
    opts.date = date || db.getTodayStr();
  }
  if (type && VALID_TYPES.includes(type)) {
    opts.type = type;
  }

  const result = db.listActivities(opts);
  res.json(result);
});

// GET /api/activities/:id
router.get('/:id', (req, res) => {
  const id = parseInt(req.params.id);
  if (isNaN(id)) {
    return res.status(400).json({ error: { code: 'INVALID_ID', message: 'ID 必须是数字' } });
  }

  const record = db.getById(id);
  if (!record) {
    return res.status(404).json({ error: { code: 'NOT_FOUND', message: '记录不存在' } });
  }

  res.json(record);
});

// PUT /api/activities/:id
router.put('/:id', (req, res) => {
  const id = parseInt(req.params.id);
  if (isNaN(id)) {
    return res.status(400).json({ error: { code: 'INVALID_ID', message: 'ID 必须是数字' } });
  }

  const existing = db.getById(id);
  if (!existing) {
    return res.status(404).json({ error: { code: 'NOT_FOUND', message: '记录不存在' } });
  }

  const merged = { ...existing, ...req.body };
  const errors = validateActivity(merged, true);
  if (errors.length > 0) {
    return res.status(400).json({
      error: { code: 'VALIDATION_ERROR', message: '输入校验失败', details: errors },
    });
  }

  const updated = db.update(id, req.body);
  res.json(updated);
});

// DELETE /api/activities/:id
router.delete('/:id', (req, res) => {
  const id = parseInt(req.params.id);
  if (isNaN(id)) {
    return res.status(400).json({ error: { code: 'INVALID_ID', message: 'ID 必须是数字' } });
  }

  const deleted = db.remove(id);
  if (!deleted) {
    return res.status(404).json({ error: { code: 'NOT_FOUND', message: '记录不存在' } });
  }

  res.json({ deleted: true });
});

module.exports = router;
