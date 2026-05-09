const fs = require('fs');
const path = require('path');
const initSqlJs = require('sql.js');

const DATA_DIR = path.join(__dirname, '..', 'data');
const DB_FILE = path.join(DATA_DIR, 'cutebaby.db');

let db = null; // SQLite database instance

// ===== Time Helpers =====
function getTimestamp() {
  const now = new Date();
  const offset = 8 * 60; // CST +08:00
  const local = new Date(now.getTime() + offset * 60000);
  return local.toISOString().replace('Z', '+08:00');
}

function getTodayStr() {
  const now = new Date();
  const y = now.getFullYear();
  const m = String(now.getMonth() + 1).padStart(2, '0');
  const d = String(now.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
}

// ===== Persistence =====
function ensureDataDir() {
  if (!fs.existsSync(DATA_DIR)) {
    fs.mkdirSync(DATA_DIR, { recursive: true });
  }
}

function saveDb() {
  ensureDataDir();
  const buffer = db.export();
  fs.writeFileSync(DB_FILE, Buffer.from(buffer));
}

// ===== Schema =====
function createSchema() {
  db.run(`
    CREATE TABLE IF NOT EXISTS users (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      openid TEXT UNIQUE,
      nickname TEXT,
      created_at TEXT NOT NULL
    )
  `);

  db.run(`
    CREATE TABLE IF NOT EXISTS activities (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      user_id INTEGER NOT NULL DEFAULT 1,
      type TEXT NOT NULL CHECK(type IN ('feeding','urination','bowel','sleep')),
      start_time TEXT NOT NULL,
      end_time TEXT,
      amount INTEGER,
      note TEXT DEFAULT '',
      created_at TEXT NOT NULL,
      updated_at TEXT NOT NULL,
      FOREIGN KEY (user_id) REFERENCES users(id)
    )
  `);

  // Indexes
  db.run(`CREATE INDEX IF NOT EXISTS idx_activities_type ON activities(type)`);
  db.run(`CREATE INDEX IF NOT EXISTS idx_activities_start ON activities(start_time)`);
  db.run(`CREATE INDEX IF NOT EXISTS idx_activities_user_date ON activities(user_id, start_time)`);
  db.run(`CREATE INDEX IF NOT EXISTS idx_activities_user_type ON activities(user_id, type, start_time)`);
}

// ===== Row Mapping =====
function rowToActivity(row) {
  return {
    id: row.id,
    user_id: row.user_id,
    type: row.type,
    start_time: row.start_time,
    end_time: row.end_time,
    amount: row.amount,
    note: row.note,
    created_at: row.created_at,
    updated_at: row.updated_at,
  };
}

function queryAll(sql, params = {}) {
  const stmt = db.prepare(sql);
  stmt.bind(params);
  const rows = [];
  while (stmt.step()) {
    rows.push(stmt.getAsObject());
  }
  stmt.free();
  return rows;
}

function queryOne(sql, params = {}) {
  const rows = queryAll(sql, params);
  return rows.length > 0 ? rows[0] : null;
}

// ===== Seed Data =====
function seedIfEmpty() {
  const countRow = queryOne('SELECT COUNT(*) as cnt FROM activities');
  if (countRow && countRow.cnt > 0) return;

  // Ensure default anonymous user exists
  const userRow = queryOne("SELECT id FROM users WHERE openid = 'anonymous'");
  const userId = userRow ? userRow.id : createDefaultUser();

  const today = getTodayStr();
  const seeds = [
    { type: 'urination', start_time: `${today}T08:00:00+08:00`, end_time: null, amount: null, note: '' },
    { type: 'feeding', start_time: `${today}T08:30:00+08:00`, end_time: null, amount: 120, note: '配方奶' },
    { type: 'bowel', start_time: `${today}T09:30:00+08:00`, end_time: null, amount: null, note: '黄色糊状' },
    { type: 'sleep', start_time: `${today}T10:00:00+08:00`, end_time: `${today}T10:45:00+08:00`, amount: null, note: '' },
    { type: 'feeding', start_time: `${today}T12:00:00+08:00`, end_time: null, amount: 150, note: '配方奶' },
    { type: 'urination', start_time: `${today}T14:30:00+08:00`, end_time: null, amount: null, note: '' },
    { type: 'feeding', start_time: `${today}T15:30:00+08:00`, end_time: null, amount: 180, note: '配方奶' },
    { type: 'bowel', start_time: `${today}T18:00:00+08:00`, end_time: null, amount: null, note: '少量' },
  ];

  const now = getTimestamp();
  const stmt = db.prepare(`
    INSERT INTO activities (user_id, type, start_time, end_time, amount, note, created_at, updated_at)
    VALUES (:user_id, :type, :start_time, :end_time, :amount, :note, :created_at, :updated_at)
  `);

  for (const seed of seeds) {
    stmt.bind({
      ':user_id': userId,
      ':type': seed.type,
      ':start_time': seed.start_time,
      ':end_time': seed.end_time,
      ':amount': seed.amount,
      ':note': seed.note,
      ':created_at': now,
      ':updated_at': now,
    });
    stmt.step();
    stmt.reset();
  }
  stmt.free();
  saveDb();
}

function createDefaultUser() {
  const now = getTimestamp();
  db.run('INSERT INTO users (openid, nickname, created_at) VALUES (?, ?, ?)', ['anonymous', '宝宝', now]);
  const row = queryOne("SELECT id FROM users WHERE openid = 'anonymous'");
  return row.id;
}

// ===== CRUD Operations =====

// list({ date?, type?, start?, end?, page?, limit?, userId? })
function listActivities(opts = {}) {
  const userId = opts.userId || 1;
  const conditions = ['a.user_id = :userId'];
  const params = { ':userId': userId };

  if (opts.start && opts.end) {
    conditions.push("a.start_time >= :start", "a.start_time <= :endRange");
    params[':start'] = opts.start;
    params[':endRange'] = opts.end + 'T23:59:59+08:00';
  } else if (opts.date) {
    conditions.push("a.start_time >= :dateStart", "a.start_time <= :dateEnd");
    params[':dateStart'] = opts.date + 'T00:00:00+08:00';
    params[':dateEnd'] = opts.date + 'T23:59:59+08:00';
  }
  if (opts.type) {
    conditions.push('a.type = :type');
    params[':type'] = opts.type;
  }

  const where = conditions.join(' AND ');
  const page = opts.page || 1;
  const limit = opts.limit || 50;
  const offset = (page - 1) * limit;

  // Count total
  const countSql = `SELECT COUNT(*) as cnt FROM activities a WHERE ${where}`;
  const countRow = queryOne(countSql, params);
  const total = countRow ? countRow.cnt : 0;

  // Query data
  const dataSql = `SELECT a.* FROM activities a WHERE ${where} ORDER BY a.start_time DESC LIMIT :limit OFFSET :offset`;
  params[':limit'] = limit;
  params[':offset'] = offset;
  const rows = queryAll(dataSql, params).map(rowToActivity);

  return {
    data: rows,
    pagination: {
      page,
      limit,
      total,
      totalPages: Math.ceil(total / limit),
    },
  };
}

function getById(id) {
  const row = queryOne('SELECT * FROM activities WHERE id = :id', { ':id': id });
  return row ? rowToActivity(row) : null;
}

function create(activity, userId = 1) {
  const now = getTimestamp();
  const result = db.run(
    `INSERT INTO activities (user_id, type, start_time, end_time, amount, note, created_at, updated_at)
     VALUES (:userId, :type, :start_time, :end_time, :amount, :note, :created_at, :updated_at)`,
    {
      ':userId': userId,
      ':type': activity.type,
      ':start_time': activity.start_time,
      ':end_time': activity.end_time || null,
      ':amount': activity.amount || null,
      ':note': activity.note || '',
      ':created_at': now,
      ':updated_at': now,
    }
  );
  saveDb();
  return getById(db.getRowsModified() > 0 ? result : 0) || getLastInserted();
}

function getLastInserted() {
  const rows = queryAll('SELECT * FROM activities ORDER BY id DESC LIMIT 1');
  return rows.length > 0 ? rowToActivity(rows[0]) : null;
}

function update(id, updates) {
  const existing = getById(id);
  if (!existing) return null;

  const now = getTimestamp();
  const merged = { ...existing, ...updates };
  db.run(
    `UPDATE activities SET type=:type, start_time=:start_time, end_time=:end_time,
     amount=:amount, note=:note, updated_at=:updated_at WHERE id=:id`,
    {
      ':type': merged.type,
      ':start_time': merged.start_time,
      ':end_time': merged.end_time || null,
      ':amount': merged.amount || null,
      ':note': merged.note || '',
      ':updated_at': now,
      ':id': id,
    }
  );
  saveDb();
  return getById(id);
}

function remove(id) {
  const existing = getById(id);
  if (!existing) return false;
  db.run('DELETE FROM activities WHERE id = :id', { ':id': id });
  saveDb();
  return true;
}

// ===== Stats =====
function dailyStats(date, userId = 1) {
  const rows = queryAll(
    `SELECT type, COUNT(*) as count,
            SUM(amount) as total_amount,
            SUM(
              CASE WHEN end_time IS NOT NULL
              THEN (strftime('%s', end_time) - strftime('%s', start_time)) / 60
              ELSE 0 END
            ) as total_minutes
     FROM activities
     WHERE user_id = :userId AND start_time >= :start AND start_time <= :end
     GROUP BY type`,
    {
      ':userId': userId,
      ':start': date + 'T00:00:00+08:00',
      ':end': date + 'T23:59:59+08:00',
    }
  );

  const stats = {
    date,
    feeding: { count: 0, totalAmount: 0 },
    urination: { count: 0 },
    bowel: { count: 0 },
    sleep: { count: 0, totalMinutes: 0 },
  };

  for (const r of rows) {
    if (stats[r.type]) {
      stats[r.type].count = r.count;
      if (r.type === 'feeding') stats[r.type].totalAmount = r.total_amount || 0;
      if (r.type === 'sleep') stats[r.type].totalMinutes = Math.round(r.total_minutes || 0);
    }
  }

  return stats;
}

function rangeStats(start, end, userId = 1) {
  const rows = queryAll(
    `SELECT date(start_time) as date, type,
            COUNT(*) as count,
            SUM(amount) as total_amount,
            SUM(
              CASE WHEN end_time IS NOT NULL
              THEN (strftime('%s', end_time) - strftime('%s', start_time)) / 60
              ELSE 0 END
            ) as total_minutes
     FROM activities
     WHERE user_id = :userId AND date(start_time) >= :start AND date(start_time) <= :end
     GROUP BY date(start_time), type
     ORDER BY date ASC`,
    { ':userId': userId, ':start': start, ':end': end }
  );

  const dailyMap = {};
  for (const r of rows) {
    if (!dailyMap[r.date]) {
      dailyMap[r.date] = {
        date: r.date,
        feeding: { count: 0, totalAmount: 0 },
        urination: { count: 0 },
        bowel: { count: 0 },
        sleep: { count: 0, totalMinutes: 0 },
      };
    }
    const day = dailyMap[r.date];
    if (day[r.type]) {
      day[r.type].count = r.count;
      if (r.type === 'feeding') day[r.type].totalAmount = r.total_amount || 0;
      if (r.type === 'sleep') day[r.type].totalMinutes = Math.round(r.total_minutes || 0);
    }
  }

  return Object.values(dailyMap);
}

// ===== Initialization =====
async function initDb() {
  ensureDataDir();

  const SQL = await initSqlJs();

  // Load existing database or create new one
  if (fs.existsSync(DB_FILE)) {
    const buffer = fs.readFileSync(DB_FILE);
    db = new SQL.Database(buffer);
  } else {
    db = new SQL.Database();
  }

  // Enable WAL-like persistence (save after every write)
  db.run('PRAGMA journal_mode=OFF');
  db.run('PRAGMA synchronous=NORMAL');
  db.run('PRAGMA foreign_keys=ON');

  createSchema();
  saveDb();

  // Ensure default user exists
  const userRow = queryOne("SELECT id FROM users WHERE openid = 'anonymous'");
  if (!userRow) {
    createDefaultUser();
    saveDb();
  }

  seedIfEmpty();

  return { db, listActivities, getById, create, update, remove, dailyStats, rangeStats };
}

module.exports = {
  initDb,
  getTodayStr,
  getTimestamp,
  // These are set after initDb completes
  listActivities: null,
  getById: null,
  create: null,
  update: null,
  remove: null,
  dailyStats: null,
  rangeStats: null,
  seedIfEmpty: null,
};
