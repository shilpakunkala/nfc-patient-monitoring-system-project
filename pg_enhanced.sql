-- ═══════════════════════════════════════════════════════════════
--  NFC PATIENT MONITORING SYSTEM  –  ENHANCED SCHEMA
--  Run this in pgAdmin Query Tool on your database (abcde_db)
-- ═══════════════════════════════════════════════════════════════

-- ─── USERS ───────────────────────────────────────────────────
-- Drop and recreate with encryption + login tracking columns
DROP TABLE IF EXISTS users CASCADE;

CREATE TABLE users (
    user_id      SERIAL PRIMARY KEY,
    username     VARCHAR(50) UNIQUE NOT NULL,
    password     VARCHAR(255) NOT NULL,   -- bcrypt hash stored here
    role         VARCHAR(20) DEFAULT 'doctor',
    login_count  INT DEFAULT 0,
    last_login   TIMESTAMPTZ,
    created_at   TIMESTAMPTZ DEFAULT NOW()
);

-- Default users  (passwords are bcrypt of 'admin123' and '1234')
-- We let the server handle hashing on first boot via ON CONFLICT DO UPDATE
INSERT INTO users (username, password, role)
VALUES
  ('admin', 'admin123', 'doctor'),
  ('nurse', '1234',     'nurse')
ON CONFLICT (username) DO NOTHING;


-- ─── PATIENTS ────────────────────────────────────────────────
DROP TABLE IF EXISTS patients CASCADE;

CREATE TABLE patients (
    patient_id    VARCHAR(20) PRIMARY KEY,
    name          VARCHAR(100),
    age           INT,
    gender        VARCHAR(10),
    contact       VARCHAR(15),
    address       TEXT,
    blood_group   VARCHAR(10),
    admitted_date DATE DEFAULT CURRENT_DATE,
    created_at    TIMESTAMPTZ DEFAULT NOW()
);

-- ─── MEDICATIONS ─────────────────────────────────────────────
DROP TABLE IF EXISTS medications CASCADE;

CREATE TABLE medications (
    med_id        SERIAL PRIMARY KEY,
    patient_id    VARCHAR(20),
    medicine_name VARCHAR(100),
    dosage        VARCHAR(50),
    frequency     VARCHAR(50),
    prescribed_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at    TIMESTAMPTZ,
    FOREIGN KEY (patient_id) REFERENCES patients(patient_id) ON DELETE CASCADE
);

-- ─── TREATMENT ───────────────────────────────────────────────
DROP TABLE IF EXISTS treatment CASCADE;

CREATE TABLE treatment (
    treatment_id   SERIAL PRIMARY KEY,
    patient_id     VARCHAR(20),
    diagnosis      TEXT,
    treatment_plan TEXT,
    doctor_name    VARCHAR(100),
    date           DATE DEFAULT CURRENT_DATE,
    updated_at     TIMESTAMPTZ,
    FOREIGN KEY (patient_id) REFERENCES patients(patient_id) ON DELETE CASCADE
);

-- ─── EMERGENCY CONTACTS ──────────────────────────────────────
DROP TABLE IF EXISTS emergency_contact CASCADE;

CREATE TABLE emergency_contact (
    contact_id SERIAL PRIMARY KEY,
    patient_id VARCHAR(20),
    name       VARCHAR(100),
    relation   VARCHAR(50),
    phone      VARCHAR(15),
    FOREIGN KEY (patient_id) REFERENCES patients(patient_id) ON DELETE CASCADE
);

-- ─── NFC SCAN LOG (for emergency alert tracking) ─────────────
DROP TABLE IF EXISTS scan_log CASCADE;

CREATE TABLE scan_log (
    log_id      SERIAL PRIMARY KEY,
    patient_id  VARCHAR(20),
    scanned_at  TIMESTAMPTZ DEFAULT NOW(),
    scanned_by  VARCHAR(50) DEFAULT 'nfc_reader'
);

-- ─── EMERGENCY ALERTS ────────────────────────────────────────
DROP TABLE IF EXISTS emergency_alerts CASCADE;

CREATE TABLE emergency_alerts (
    alert_id    SERIAL PRIMARY KEY,
    patient_id  VARCHAR(20),
    alert_type  VARCHAR(50) DEFAULT 'no_scan',
    message     TEXT,
    is_resolved BOOLEAN DEFAULT FALSE,
    created_at  TIMESTAMPTZ DEFAULT NOW(),
    resolved_at TIMESTAMPTZ,
    FOREIGN KEY (patient_id) REFERENCES patients(patient_id) ON DELETE CASCADE
);


-- ─── SEED DATA ───────────────────────────────────────────────
INSERT INTO patients (patient_id, name, age, gender, contact, address, blood_group, admitted_date)
VALUES
  ('0ACF2107', 'Ravi Kumar',    45, 'Male',   '9876543210', 'Vijayawada', 'B+', CURRENT_DATE - 3),
  ('1BDE3208', 'Anitha Reddy',  32, 'Female', '9123456789', 'Guntur',     'O+', CURRENT_DATE - 1);

INSERT INTO medications (patient_id, medicine_name, dosage, frequency, prescribed_at)
VALUES
  ('0ACF2107', 'Paracetamol', '500mg',   'Twice a day', NOW() - INTERVAL '2 days'),
  ('0ACF2107', 'Vitamin D',   '1000IU',  'Once a day',  NOW() - INTERVAL '2 days'),
  ('1BDE3208', 'Amoxicillin', '250mg',   'Thrice a day',NOW() - INTERVAL '1 day');

INSERT INTO treatment (patient_id, diagnosis, treatment_plan, doctor_name, date)
VALUES
  ('0ACF2107', 'Fever & Viral Infection',  'Rest + Medication + Fluids', 'Dr. Anil',  CURRENT_DATE - 3),
  ('1BDE3208', 'Throat Infection',         'Antibiotics + Warm fluids',  'Dr. Meena', CURRENT_DATE - 1);

INSERT INTO emergency_contact (patient_id, name, relation, phone)
VALUES
  ('0ACF2107', 'Lakshmi', 'Mother', '9123456780'),
  ('1BDE3208', 'Ramesh',  'Father', '9000123456');


-- ─── VERIFY ──────────────────────────────────────────────────
SELECT * FROM users;
SELECT * FROM patients;
SELECT * FROM medications;
SELECT * FROM treatment;
SELECT * FROM emergency_contact;
SELECT * FROM scan_log;
SELECT * FROM emergency_alerts;
