-- Luna Skin Aesthetic PostgreSQL Schema
-- Safe to run on a new/empty Neon database.

CREATE TABLE IF NOT EXISTS users (
    id VARCHAR(100) PRIMARY KEY,
    name VARCHAR(255) NOT NULL,
    email VARCHAR(255) NOT NULL UNIQUE,
    password_hash TEXT NOT NULL,
    role VARCHAR(50) NOT NULL,
    patient_ref VARCHAR(50),
    license_id VARCHAR(255),
    specialization VARCHAR(255),
    avatar VARCHAR(500),
    phone VARCHAR(50),
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS patients (
    ref_id VARCHAR(50) PRIMARY KEY,
    name VARCHAR(255) NOT NULL,
    age INTEGER,
    gender VARCHAR(50),
    contact VARCHAR(100),
    email VARCHAR(255),
    allergies TEXT,
    medications TEXT,
    skintype VARCHAR(100),
    concern TEXT,
    routine TEXT,
    observations TEXT,
    protocol TEXT,
    status VARCHAR(50) DEFAULT 'Active',
    signed BOOLEAN DEFAULT FALSE,
    signature_id VARCHAR(255),
    before_date VARCHAR(100),
    after_date VARCHAR(100),
    before_img TEXT,
    after_img TEXT,
    assigned_doctor VARCHAR(255),
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS patient_procedures (
    id BIGSERIAL PRIMARY KEY,
    patient_ref VARCHAR(50) NOT NULL REFERENCES patients(ref_id) ON DELETE CASCADE,
    name VARCHAR(255),
    procedure_date DATE,
    clinic VARCHAR(255)
);

CREATE TABLE IF NOT EXISTS patient_treatment_logs (
    id BIGSERIAL PRIMARY KEY,
    patient_ref VARCHAR(50) NOT NULL REFERENCES patients(ref_id) ON DELETE CASCADE,
    log_date DATE,
    therapy VARCHAR(255),
    reaction VARCHAR(255),
    notes TEXT
);

CREATE TABLE IF NOT EXISTS patient_skincare (
    id BIGSERIAL PRIMARY KEY,
    patient_ref VARCHAR(50) NOT NULL REFERENCES patients(ref_id) ON DELETE CASCADE,
    name VARCHAR(255),
    instructions TEXT,
    qty INTEGER DEFAULT 1
);

CREATE TABLE IF NOT EXISTS patient_concerns (
    patient_ref VARCHAR(50) PRIMARY KEY REFERENCES patients(ref_id) ON DELETE CASCADE,
    hyperpigmentation BOOLEAN DEFAULT FALSE,
    acne BOOLEAN DEFAULT FALSE,
    elasticity BOOLEAN DEFAULT FALSE,
    dehydration BOOLEAN DEFAULT FALSE
);

CREATE TABLE IF NOT EXISTS appointments (
    id BIGSERIAL PRIMARY KEY,
    patient_ref VARCHAR(50) REFERENCES patients(ref_id) ON DELETE CASCADE,
    name VARCHAR(255),
    phone VARCHAR(100),
    email VARCHAR(255),
    service VARCHAR(255),
    appointment_date DATE,
    appointment_time VARCHAR(100),
    purpose VARCHAR(255),
    message TEXT,
    status VARCHAR(50) DEFAULT 'Pending',
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS notifications (
    id VARCHAR(150) PRIMARY KEY,
    message TEXT NOT NULL,
    type VARCHAR(50),
    timestamp TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    read BOOLEAN DEFAULT FALSE
);

CREATE TABLE IF NOT EXISTS settings (
    id INTEGER PRIMARY KEY DEFAULT 1,
    clinic_name VARCHAR(255),
    dermatologist VARCHAR(255),
    license_id VARCHAR(255),
    address TEXT,
    phone VARCHAR(100),
    email VARCHAR(255),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);