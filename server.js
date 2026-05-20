// ═══════════════════════════════════════════════════════════════
//  NFC PATIENT MONITORING SYSTEM  –  server.js  (ENHANCED)
//  Features: bcrypt passwords · login count · patient registration
//            med/treatment timestamps · emergency alerts (no-scan)
// ═══════════════════════════════════════════════════════════════

const express  = require('express');
const { Pool } = require('pg');
const cors     = require('cors');
const path     = require('path');
const bcrypt   = require('bcrypt');          // npm install bcrypt
const cron     = require('node-cron');       // npm install node-cron

const SALT_ROUNDS = 10;

const app = express();
app.use(cors());
app.use(express.json());
app.use(express.static(path.join(__dirname, 'public')));

// ─────────────────────────────────────────────────────────────
//  DB CONNECTION  ► adjust to your pgAdmin setup
// ─────────────────────────────────────────────────────────────
const pool = new Pool({
  user:     'postgres',
  host:     'localhost',
  database: 'abcde_db',
  password: 'Shilpa@12',
  port:     5434,
});

// ─── Startup: connect + ensure hashed default users ──────────
pool.connect(async (err, client, release) => {
  if (err) {
    console.error('❌  Database connection FAILED:', err.message);
    return;
  }
  console.log('✅  PostgreSQL connected successfully');
  release();

  // Hash plain-text passwords for default users if not yet hashed
  try {
    const rows = (await pool.query('SELECT user_id, username, password FROM users')).rows;
    for (const u of rows) {
      // bcrypt hashes always start with $2b$ – if plain text, hash it
      if (!u.password.startsWith('$2b$')) {
        const hashed = await bcrypt.hash(u.password, SALT_ROUNDS);
        await pool.query('UPDATE users SET password=$1 WHERE user_id=$2', [hashed, u.user_id]);
        console.log(`🔐  Hashed password for user: ${u.username}`);
      }
    }
    console.log('✅  All user passwords are encrypted');
  } catch (e) {
    console.error('⚠   Password migration error:', e.message);
  }
});


// ═══════════════════════════════════════════════════════════════
//  AUTH ROUTES
// ═══════════════════════════════════════════════════════════════

// POST /api/login
app.post('/api/login', async (req, res) => {
  const { username, password } = req.body;
  if (!username || !password)
    return res.status(400).json({ error: 'Username and password are required' });

  console.log(`🔐  Login attempt → "${username}"`);

  try {
    const result = await pool.query(
      `SELECT user_id, username, role, password, login_count, last_login
         FROM users WHERE LOWER(username) = LOWER($1)`,
      [username.trim()]
    );

    if (result.rows.length === 0)
      return res.status(401).json({ error: 'Invalid username or password' });

    const user = result.rows[0];
    const match = await bcrypt.compare(password, user.password);

    if (!match)
      return res.status(401).json({ error: 'Invalid username or password' });

    // Record login
    const prevLogin = user.last_login;
    await pool.query(
      `UPDATE users SET login_count = login_count + 1, last_login = NOW()
        WHERE user_id = $1`,
      [user.user_id]
    );

    res.json({
      success: true,
      user: {
        user_id:     user.user_id,
        username:    user.username,
        role:        user.role,
        login_count: user.login_count + 1,
        last_login:  prevLogin,           // previous session's login time
      }
    });
  } catch (err) {
    console.error('❌  Login error:', err.message);
    res.status(500).json({ error: 'Database error: ' + err.message });
  }
});

// POST /api/change-password
app.post('/api/change-password', async (req, res) => {
  const { user_id, old_password, new_password } = req.body;
  if (!user_id || !old_password || !new_password)
    return res.status(400).json({ error: 'All fields required' });
  try {
    const r = await pool.query('SELECT password FROM users WHERE user_id=$1', [user_id]);
    if (!r.rows.length) return res.status(404).json({ error: 'User not found' });
    const ok = await bcrypt.compare(old_password, r.rows[0].password);
    if (!ok) return res.status(401).json({ error: 'Old password incorrect' });
    const hashed = await bcrypt.hash(new_password, SALT_ROUNDS);
    await pool.query('UPDATE users SET password=$1 WHERE user_id=$2', [hashed, user_id]);
    res.json({ success: true });
  } catch (err) { res.status(500).json({ error: err.message }); }
});


// ═══════════════════════════════════════════════════════════════
//  PATIENT ROUTES
// ═══════════════════════════════════════════════════════════════

// GET all patients (for registration page list)
app.get('/api/patients', async (req, res) => {
  try {
    const r = await pool.query('SELECT * FROM patients ORDER BY admitted_date DESC');
    res.json(r.rows);
  } catch (err) { res.status(500).json({ error: err.message }); }
});

// GET single patient
app.get('/api/patient/:patient_id', async (req, res) => {
  const { patient_id } = req.params;
  try {
    const patient = await pool.query(
      'SELECT * FROM patients WHERE patient_id = $1', [patient_id]
    );
    if (!patient.rows.length)
      return res.status(404).json({ error: `Patient "${patient_id}" not found` });

    const [medications, treatments, emergency] = await Promise.all([
      pool.query('SELECT * FROM medications WHERE patient_id=$1 ORDER BY prescribed_at DESC', [patient_id]),
      pool.query('SELECT * FROM treatment WHERE patient_id=$1 ORDER BY date DESC', [patient_id]),
      pool.query('SELECT * FROM emergency_contact WHERE patient_id=$1', [patient_id]),
    ]);

    res.json({
      patient:     patient.rows[0],
      medications: medications.rows,
      treatments:  treatments.rows,
      emergency:   emergency.rows,
    });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

// POST /api/patients  – register new patient
app.post('/api/patients', async (req, res) => {
  const { patient_id, name, age, gender, contact, address, blood_group, admitted_date } = req.body;
  if (!patient_id || !name)
    return res.status(400).json({ error: 'patient_id and name are required' });
  try {
    const r = await pool.query(
      `INSERT INTO patients (patient_id, name, age, gender, contact, address, blood_group, admitted_date)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8) RETURNING *`,
      [patient_id.toUpperCase(), name, age, gender, contact, address, blood_group,
       admitted_date || new Date().toISOString().split('T')[0]]
    );
    console.log(`🆕  New patient registered: ${patient_id}`);
    res.json(r.rows[0]);
  } catch (err) {
    if (err.code === '23505') return res.status(409).json({ error: 'Patient ID already exists' });
    res.status(500).json({ error: err.message });
  }
});

// DELETE /api/patients/:patient_id
app.delete('/api/patients/:patient_id', async (req, res) => {
  try {
    await pool.query('DELETE FROM patients WHERE patient_id=$1', [req.params.patient_id]);
    res.json({ success: true });
  } catch (err) { res.status(500).json({ error: err.message }); }
});


// ═══════════════════════════════════════════════════════════════
//  MEDICATION ROUTES  (with timestamps)
// ═══════════════════════════════════════════════════════════════

app.post('/api/medications', async (req, res) => {
  const { patient_id, medicine_name, dosage, frequency } = req.body;
  try {
    const r = await pool.query(
      `INSERT INTO medications (patient_id, medicine_name, dosage, frequency, prescribed_at)
       VALUES ($1,$2,$3,$4,NOW()) RETURNING *`,
      [patient_id, medicine_name, dosage, frequency]
    );
    res.json(r.rows[0]);
  } catch (err) { res.status(500).json({ error: err.message }); }
});

app.put('/api/medications/:med_id', async (req, res) => {
  const { medicine_name, dosage, frequency } = req.body;
  try {
    const r = await pool.query(
      `UPDATE medications SET medicine_name=$1, dosage=$2, frequency=$3, updated_at=NOW()
        WHERE med_id=$4 RETURNING *`,
      [medicine_name, dosage, frequency, req.params.med_id]
    );
    res.json(r.rows[0]);
  } catch (err) { res.status(500).json({ error: err.message }); }
});

app.delete('/api/medications/:med_id', async (req, res) => {
  try {
    await pool.query('DELETE FROM medications WHERE med_id=$1', [req.params.med_id]);
    res.json({ success: true });
  } catch (err) { res.status(500).json({ error: err.message }); }
});


// ═══════════════════════════════════════════════════════════════
//  TREATMENT ROUTES  (with timestamps)
// ═══════════════════════════════════════════════════════════════

app.post('/api/treatment', async (req, res) => {
  const { patient_id, diagnosis, treatment_plan, doctor_name } = req.body;
  try {
    const r = await pool.query(
      `INSERT INTO treatment (patient_id, diagnosis, treatment_plan, doctor_name, date)
       VALUES ($1,$2,$3,$4,CURRENT_DATE) RETURNING *`,
      [patient_id, diagnosis, treatment_plan, doctor_name]
    );
    res.json(r.rows[0]);
  } catch (err) { res.status(500).json({ error: err.message }); }
});

app.put('/api/treatment/:treatment_id', async (req, res) => {
  const { diagnosis, treatment_plan, doctor_name } = req.body;
  try {
    const r = await pool.query(
      `UPDATE treatment SET diagnosis=$1, treatment_plan=$2, doctor_name=$3, updated_at=NOW()
        WHERE treatment_id=$4 RETURNING *`,
      [diagnosis, treatment_plan, doctor_name, req.params.treatment_id]
    );
    res.json(r.rows[0]);
  } catch (err) { res.status(500).json({ error: err.message }); }
});

app.delete('/api/treatment/:treatment_id', async (req, res) => {
  try {
    await pool.query('DELETE FROM treatment WHERE treatment_id=$1', [req.params.treatment_id]);
    res.json({ success: true });
  } catch (err) { res.status(500).json({ error: err.message }); }
});


// ═══════════════════════════════════════════════════════════════
//  EMERGENCY CONTACT ROUTES
// ═══════════════════════════════════════════════════════════════

app.post('/api/emergency', async (req, res) => {
  const { patient_id, name, relation, phone } = req.body;
  try {
    const r = await pool.query(
      `INSERT INTO emergency_contact (patient_id, name, relation, phone)
       VALUES ($1,$2,$3,$4) RETURNING *`,
      [patient_id, name, relation, phone]
    );
    res.json(r.rows[0]);
  } catch (err) { res.status(500).json({ error: err.message }); }
});

app.put('/api/emergency/:contact_id', async (req, res) => {
  const { name, relation, phone } = req.body;
  try {
    await pool.query(
      `UPDATE emergency_contact SET name=$1, relation=$2, phone=$3 WHERE contact_id=$4`,
      [name, relation, phone, req.params.contact_id]
    );
    res.json({ success: true });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

app.delete('/api/emergency/:contact_id', async (req, res) => {
  try {
    await pool.query('DELETE FROM emergency_contact WHERE contact_id=$1', [req.params.contact_id]);
    res.json({ success: true });
  } catch (err) { res.status(500).json({ error: err.message }); }
});


// ═══════════════════════════════════════════════════════════════
//  EMERGENCY ALERTS ROUTES
// ═══════════════════════════════════════════════════════════════

// GET all active (unresolved) alerts
app.get('/api/alerts', async (req, res) => {
  try {
    const r = await pool.query(
      `SELECT a.*, p.name as patient_name
         FROM emergency_alerts a
         JOIN patients p ON a.patient_id = p.patient_id
        WHERE a.is_resolved = FALSE
        ORDER BY a.created_at DESC`
    );
    res.json(r.rows);
  } catch (err) { res.status(500).json({ error: err.message }); }
});

// PUT /api/alerts/:alert_id/resolve
app.put('/api/alerts/:alert_id/resolve', async (req, res) => {
  try {
    await pool.query(
      `UPDATE emergency_alerts SET is_resolved=TRUE, resolved_at=NOW() WHERE alert_id=$1`,
      [req.params.alert_id]
    );
    res.json({ success: true });
    broadcastAlerts();
  } catch (err) { res.status(500).json({ error: err.message }); }
});


// ═══════════════════════════════════════════════════════════════
//  SERVER-SENT EVENTS
// ═══════════════════════════════════════════════════════════════
let sseClients = [];

app.get('/api/events', (req, res) => {
  res.setHeader('Content-Type',  'text/event-stream');
  res.setHeader('Cache-Control', 'no-cache');
  res.setHeader('Connection',    'keep-alive');
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.flushHeaders();

  const ping = setInterval(() => res.write(': ping\n\n'), 25000);
  sseClients.push(res);
  console.log(`📡  SSE client connected  (total: ${sseClients.length})`);

  req.on('close', () => {
    clearInterval(ping);
    sseClients = sseClients.filter(c => c !== res);
  });
});

function broadcast(eventName, data) {
  const msg = `event: ${eventName}\ndata: ${JSON.stringify(data)}\n\n`;
  sseClients.forEach(c => c.write(msg));
}

async function broadcastAlerts() {
  try {
    const r = await pool.query(
      `SELECT a.*, p.name as patient_name
         FROM emergency_alerts a
         JOIN patients p ON a.patient_id = p.patient_id
        WHERE a.is_resolved = FALSE
        ORDER BY a.created_at DESC`
    );
    broadcast('alerts', r.rows);
  } catch (e) { console.error('broadcastAlerts error:', e.message); }
}


// ─── ESP32 NFC scan ───────────────────────────────────────────
app.post('/api/nfc-scan', async (req, res) => {
  const { patient_id } = req.body;
  if (!patient_id) return res.status(400).json({ error: 'patient_id required' });

  console.log(`🔖  NFC scanned: ${patient_id}`);

  try {
    const patient = await pool.query(
      'SELECT * FROM patients WHERE patient_id = $1', [patient_id]
    );
    if (!patient.rows.length)
      return res.status(404).json({ error: `Patient ${patient_id} not found` });

    // Log the scan
    await pool.query(
      `INSERT INTO scan_log (patient_id, scanned_at) VALUES ($1, NOW())`,
      [patient_id]
    );

    // Auto-resolve any open no-scan alerts for this patient
    const resolved = await pool.query(
      `UPDATE emergency_alerts SET is_resolved=TRUE, resolved_at=NOW()
        WHERE patient_id=$1 AND is_resolved=FALSE RETURNING alert_id`,
      [patient_id]
    );
    if (resolved.rowCount > 0) {
      console.log(`✅  Auto-resolved ${resolved.rowCount} alert(s) for ${patient_id}`);
      broadcastAlerts();
    }

    const [medications, treatments, emergency] = await Promise.all([
      pool.query('SELECT * FROM medications WHERE patient_id=$1 ORDER BY prescribed_at DESC', [patient_id]),
      pool.query('SELECT * FROM treatment WHERE patient_id=$1 ORDER BY date DESC', [patient_id]),
      pool.query('SELECT * FROM emergency_contact WHERE patient_id=$1', [patient_id]),
    ]);

    const payload = {
      patient:     patient.rows[0],
      medications: medications.rows,
      treatments:  treatments.rows,
      emergency:   emergency.rows,
    };

    broadcast('patient', payload);
    console.log(`📤  Pushed to ${sseClients.length} browser(s)`);

    res.json({ success: true, pushed_to: sseClients.length });
  } catch (err) {
    console.error('❌  nfc-scan error:', err.message);
    res.status(500).json({ error: err.message });
  }
});


// ═══════════════════════════════════════════════════════════════
//  EMERGENCY ALERT CRON  – runs every hour
//  Raises alert if admitted patient has NOT been scanned in 24 h
// ═══════════════════════════════════════════════════════════════
cron.schedule('0 * * * *', async () => {
  console.log('⏰  Checking for patients with no recent scan…');
  try {
    // Find admitted patients whose last scan is >24h ago (or never scanned)
    const r = await pool.query(`
      SELECT p.patient_id, p.name
        FROM patients p
        LEFT JOIN (
          SELECT patient_id, MAX(scanned_at) AS last_scan
            FROM scan_log
           GROUP BY patient_id
        ) s ON p.patient_id = s.patient_id
       WHERE s.last_scan IS NULL
          OR s.last_scan < NOW() - INTERVAL '24 hours'
    `);

    for (const row of r.rows) {
      // Don't duplicate open alerts
      const existing = await pool.query(
        `SELECT alert_id FROM emergency_alerts
          WHERE patient_id=$1 AND is_resolved=FALSE AND alert_type='no_scan'`,
        [row.patient_id]
      );
      if (existing.rows.length > 0) continue;

      await pool.query(
        `INSERT INTO emergency_alerts (patient_id, alert_type, message)
         VALUES ($1,'no_scan',$2)`,
        [row.patient_id, `Patient ${row.name} has not been scanned in the last 24 hours.`]
      );
      console.log(`🚨  Alert raised for patient: ${row.name} (${row.patient_id})`);
    }

    broadcastAlerts();
  } catch (e) {
    console.error('Cron error:', e.message);
  }
});

// Also run immediately on startup (after 5s to let DB settle)
setTimeout(async () => {
  console.log('🔍  Running initial no-scan check…');
  try {
    const r = await pool.query(`
      SELECT p.patient_id, p.name
        FROM patients p
        LEFT JOIN (
          SELECT patient_id, MAX(scanned_at) AS last_scan
            FROM scan_log GROUP BY patient_id
        ) s ON p.patient_id = s.patient_id
       WHERE s.last_scan IS NULL
          OR s.last_scan < NOW() - INTERVAL '24 hours'
    `);
    for (const row of r.rows) {
      const existing = await pool.query(
        `SELECT alert_id FROM emergency_alerts
          WHERE patient_id=$1 AND is_resolved=FALSE AND alert_type='no_scan'`,
        [row.patient_id]
      );
      if (existing.rows.length > 0) continue;
      await pool.query(
        `INSERT INTO emergency_alerts (patient_id, alert_type, message)
         VALUES ($1,'no_scan',$2)`,
        [row.patient_id, `Patient ${row.name} has not been scanned in the last 24 hours.`]
      );
    }
  } catch(e) { console.error(e.message); }
}, 5000);


// ─── Debug route ─────────────────────────────────────────────
app.get('/api/debug/users', async (req, res) => {
  try {
    const r = await pool.query('SELECT user_id, username, role, login_count, last_login FROM users');
    res.json(r.rows);
  } catch (err) { res.status(500).json({ error: err.message }); }
});


// ═══════════════════════════════════════════════════════════════
//  START SERVER
// ═══════════════════════════════════════════════════════════════
const PORT = 3000;
app.listen(PORT, () => {
  console.log(`\n🏥  NFC Patient Monitor  →  http://localhost:${PORT}`);
  console.log(`    Install new deps first:  npm install bcrypt node-cron`);
  console.log(`    Run schema:              pg_enhanced.sql in pgAdmin\n`);
});