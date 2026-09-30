require('dotenv').config();


console.log('🔍 DATABASE_URL loaded:', !!process.env.DATABASE_URL);
console.log('🔍 DATABASE_URL prefix:', process.env.DATABASE_URL?.substring(0, 25));



const express = require('express');
const cors = require('cors');
const fs = require('fs');
const path = require('path');
const os = require('os');
const bcrypt = require('bcryptjs');
const { Pool } = require('pg');
const nodemailer = require('nodemailer');

const app = express();
const PORT = process.env.PORT || 3000;


const pool = new Pool({
    connectionString: process.env.DATABASE_URL,
    max: 5,
    idleTimeoutMillis: 30000,
    connectionTimeoutMillis: 10000,
});

// SMTP email transporter
const mailTransporter = nodemailer.createTransport({
    service: 'gmail',
    auth: {
        user: process.env.SMTP_USER,
        pass: process.env.SMTP_PASS,
    },
});

app.use(cors());
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ limit: '10mb', extended: true }));



// ─── Appointment Email Helper ─────────────────────────────────
async function sendAppointmentEmail({
    to,
    subject,
    patientName,
    patientPhone,
    patientEmail,
    date,
    time,
    purpose,
    message = '',
    action = 'Appointment Scheduled'
}) {
    if (!to) {
        console.log('📧 Email skipped: no recipient email address.');
        return { sent: false, skipped: true };
    }

    const mailOptions = {
        from: `"Luna Skin Aesthetic" <${process.env.SMTP_USER}>`,
        to,
        subject,
        text: `
Luna Skin Aesthetic
Appointment Notification

${action}

Patient Name: ${patientName || 'N/A'}
Phone: ${patientPhone || 'N/A'}
Patient Email: ${patientEmail || 'N/A'}

Appointment Date: ${date || 'Not specified'}
Appointment Time: ${time || 'Not specified'}
Service / Purpose: ${purpose || 'Consultation'}

${message ? `Message: ${message}` : ''}

Regards,
Luna Skin Aesthetic
Tirunelveli
        `.trim()
    };

    try {
        const info = await mailTransporter.sendMail(mailOptions);

        console.log(
            `📧 Appointment email sent to ${to} | Message ID: ${info.messageId}`
        );

        return {
            sent: true,
            messageId: info.messageId
        };

    } catch (error) {
        console.error(`❌ Failed to send appointment email to ${to}:`, error);

        return {
            sent: false,
            error: error.message
        };
    }
}

// Dynamic writable directory setup (safe for Vercel / serverless read-only filesystems)
function getWritableDir(dirName) {
    const primaryPath = path.join(__dirname, dirName);
    try {
        if (!fs.existsSync(primaryPath)) {
            fs.mkdirSync(primaryPath, { recursive: true });
        }
        // Test write permissions
        const testFile = path.join(primaryPath, `.test_write_${Date.now()}`);
        fs.writeFileSync(testFile, 'test');
        fs.unlinkSync(testFile);
        return primaryPath;
    } catch (e) {
        const fallbackPath = path.join(os.tmpdir(), 'luna-skin-app', dirName);
        try {
            if (!fs.existsSync(fallbackPath)) {
                fs.mkdirSync(fallbackPath, { recursive: true });
            }
        } catch (err) {
            console.error(`Failed to create fallback directory ${fallbackPath}:`, err);
        }
        return fallbackPath;
    }
}

const DATA_DIR = getWritableDir('data');
const UPLOADS_DIR = getWritableDir('uploads');

const PATIENTS_FILE = 'patients.json';
const SETTINGS_FILE = 'settings.json';
const USERS_FILE = 'users.json';
const NOTIFICATIONS_FILE = 'notifications.json';

// ─── Initial Seed Data ──────────────────────────────────────────────────────

const INITIAL_PATIENTS = [
    {
        refId: "LSA-2024-00892",
        name: "Farook Al-Aziz",
        age: 34,
        gender: "Male",
        contact: "+971 50 123 4567",
        email: "farook@example.com",
        allergies: "None",
        medications: "None reported",
        skintype: "Combination",
        concern: "Post-Inflammatory Hyperpigmentation",
        routine: "Morning:\n1. Gentle Cleanser\n2. Hyaluronic Acid Serum\n3. Vitamin C (10%)\n4. Mineral Sunscreen SPF 50\n\nEvening:\n1. Oil Cleanser\n2. Hydrating Cleanser\n3. Niacinamide Serum (5%)\n4. Ceramide Cream",
        observations: "Client presents with localized PIH around the chin area. Skin barrier appears compromised in the perioral region. Recommended immediate cessation of physical exfoliants and initiation of ceramide-rich barrier repair.",
        protocol: "3-Month Corrective Plan:\nPhase 1 (Barrier Repair) 2-4 weeks.\nPhase 2 (Pigmentation Attack) with Advanced Cosmetic Chemical Exfoliation.\nPhase 3 (Maintenance) with SPF 50+ and Vitamin C infusion.",
        status: "Active",
        signed: true,
        signatureId: "#882-LUNA-SAFE-921",
        beforeDate: "May 02, 2024",
        afterDate: "June 27, 2024",
        beforeImg: "before_treatment.jpg",
        afterImg: "after_treatment.jpg",
        procedures: [
            { name: "Mandelic Acid Peel", date: "2023-10-12", clinic: "Nova Aesthetic Center" },
            { name: "HydraFacial Deluxe", date: "2024-01-05", clinic: "Luna Skin Aesthetic" },
            { name: "Chemical Peel (TCA 15%)", date: "2024-03-14", clinic: "Luna Skin Aesthetic" }
        ],
        logs: [
            { date: "2024-05-02", therapy: "Skin Brightening Therapy", reaction: "Mild Erythema", notes: "Client felt minimal warmth; no adverse response." },
            { date: "2024-05-16", therapy: "Barrier Rescue Facial", reaction: "Excellent", notes: "Skin hydration levels increased by 14% post-treat." }
        ],
        skincare: [
            { name: "Luna Barrier Repair Serum", instructions: "2 drops, AM & PM after cleansing", qty: 1 },
            { name: "Mineral Shield SPF 50", instructions: "Apply liberally every 4 hours", qty: 2 }
        ],
        concernsChecklist: { hyperpigmentation: true, acne: false, elasticity: false, dehydration: true },
        appointment: { date: "2026-07-15", time: "10:30 AM", purpose: "Chemical Peel Follow-up" }
    },
    {
        refId: "LSA-2024-00781",
        name: "Elena Rostova",
        age: 29,
        gender: "Female",
        contact: "+971 52 987 6543",
        email: "elena@example.com",
        allergies: "Salicylic Acid",
        medications: "Retinol 0.5% (stopped 1 week ago)",
        skintype: "Sensitive",
        concern: "Acne Grade 2-3 & Dehydration",
        routine: "Morning:\n1. Foaming Wash\n2. Clindamycin Gel\n3. Light Gel Moisturizer\n\nEvening:\n1. Micellar Water\n2. Foaming Wash\n3. Adapalene 0.1%\n4. Soothing Cream",
        observations: "Inflammatory papules and pustules on cheeks and jawline. Erythema present. Skin barrier shows moderate irritation from active topicals.",
        protocol: "Soothe & Clear Strategy:\nPhase 1: Hydrating Soothing Facials weekly + barrier support.\nPhase 2: LED Light Therapy (Blue/Red) to target acne bacteria.\nPhase 3: Mild Mandelic Acid peels for cell turnover.",
        status: "Active",
        signed: false,
        signatureId: "",
        beforeDate: "April 10, 2024",
        afterDate: "June 01, 2024",
        beforeImg: "before_treatment.jpg",
        afterImg: "after_treatment.jpg",
        procedures: [
            { name: "LED Blue Light Session", date: "2024-04-18", clinic: "Luna Skin Aesthetic" },
            { name: "Soothe & Hydrate Facial", date: "2024-04-25", clinic: "Luna Skin Aesthetic" }
        ],
        logs: [
            { date: "2024-04-18", therapy: "Blue LED (20 mins)", reaction: "Normal", notes: "Patient reported calming effect on redness." },
            { date: "2024-05-02", therapy: "Blue & Red LED + Soothing Mask", reaction: "Great", notes: "Inflammatory lesions decreased by 20%." }
        ],
        skincare: [
            { name: "Soothe Calming Cleanser", instructions: "Use AM & PM, rinse with cool water", qty: 1 },
            { name: "Barrier Balance Gel", instructions: "Apply generously twice daily", qty: 1 }
        ],
        concernsChecklist: { hyperpigmentation: false, acne: true, elasticity: false, dehydration: true },
        appointment: { date: "2026-07-15", time: "03:00 PM", purpose: "LED Light Session" }
    },
    {
        refId: "LSA-2024-00910",
        name: "Marcus Vance",
        age: 45,
        gender: "Male",
        contact: "+1 415 555 0192",
        email: "marcus@example.com",
        allergies: "Latex",
        medications: "None",
        skintype: "Dry",
        concern: "Loss of Elasticity & Fine Lines",
        routine: "Morning:\n1. Water rinse\n2. Heavy Cream Moisturizer\n\nEvening:\n1. Clay Cleanser\n2. Rich Anti-aging Balm",
        observations: "Loss of dermal density, specifically mid-face and nasolabial folds. Fine lines and mild photo-damage on forehead.",
        protocol: "Sculpt & Firm Regimen:\nPhase 1: Radiofrequency (RF) Skin Tightening (4 sessions, bi-weekly).\nPhase 2: Microcurrent tone therapy.\nPhase 3: Hyaluronic Acid filler injection maintenance.",
        status: "Inactive",
        signed: false,
        signatureId: "",
        beforeDate: "March 01, 2024",
        afterDate: "May 20, 2024",
        beforeImg: "before_treatment.jpg",
        afterImg: "after_treatment.jpg",
        procedures: [
            { name: "RF Skin Tightening", date: "2024-03-15", clinic: "Luna Skin Aesthetic" },
            { name: "RF Skin Tightening", date: "2024-03-29", clinic: "Luna Skin Aesthetic" },
            { name: "Microcurrent Sculpting", date: "2024-04-12", clinic: "Luna Skin Aesthetic" }
        ],
        logs: [
            { date: "2024-03-15", therapy: "RF Face Lift (Temp 41C)", reaction: "Mild Erythema", notes: "Tightening effect observed immediately post-treatment." },
            { date: "2024-03-29", therapy: "RF Face Lift (Temp 42C)", reaction: "Normal", notes: "Nasolabial fold depth reduced slightly." }
        ],
        skincare: [
            { name: "Luminous Lift Peptide Cream", instructions: "Apply PM to face & neck", qty: 1 },
            { name: "Hyaluronic Boost Hydrator", instructions: "Apply AM & PM under moisturizer", qty: 2 }
        ],
        concernsChecklist: { hyperpigmentation: false, acne: false, elasticity: true, dehydration: false },
        appointment: { date: "2026-07-22", time: "11:45 AM", purpose: "Maintenance Consultation" },
        assignedDoctor: "Dr. Krithika SK"
    },
    {
        refId: "LSA-2026-61201",
        name: "John",
        age: 30,
        gender: "Male",
        contact: "9025676090",
        email: "john@example.com",
        allergies: "None",
        medications: "None",
        skintype: "Normal",
        concern: "Initial Consultation",
        routine: "",
        observations: "New client registration.",
        protocol: "Initial consultation & skin health assessment.",
        status: "Active",
        signed: false,
        signatureId: "",
        beforeDate: "",
        afterDate: "",
        beforeImg: "",
        afterImg: "",
        procedures: [],
        logs: [],
        skincare: [],
        concernsChecklist: { hyperpigmentation: false, acne: false, elasticity: false, dehydration: false },
        appointment: null,
        assignedDoctor: "Dr. Krithika SK"
    }
];

const INITIAL_SETTINGS = {
    clinicName: "Luna Skin Aesthetics",
    dermatologist: "Mrs. Krithika SK",
    licenseId: "#882-LUNA-SAFE-921",
    address: "200K/5, Seyad plaza, Tiruchendur main road, palayamkottai, Tirunelveli, Tamil Nadu 627002",
    phone: "9025676090",
    email: "lunaskinaesthetics24@gmail.com"
};

const INITIAL_USERS = [
    {
        id: "doctor-001",
        name: "Mrs. Krithika SK",
        email: "lunaskinaesthetics24@gmail.com",
        password: "krithika2026",
        role: "doctor",
        licenseId: "#882-LUNA-SAFE-921",
        specialization: "Lead Clinical Cosmetologist & Founder",
        avatar: "practitioner.jpg",
        phone: "9025676090"
    },
    { id: "patient-1783771615168", name: "Sarah Chen", email: "sarah@test.com", password: "test123", role: "patient", patientRef: "LSA-2026-16892" },
    { id: "patient-1784103484789", name: "Jane Doe", email: "jane.doe@example.com", password: "password123", role: "patient", patientRef: "LSA-2026-39960" },
    { id: "patient-1784103990767", name: "Jane Smith", email: "jane.smith@example.com", password: "password123", role: "patient", patientRef: "LSA-2026-26848" },
    { id: "patient-priya-001", name: "Priya Sharma", email: "priya@patient.com", password: "patient123", role: "patient", patientRef: "LSA-2026-PRIYA" },
    { id: "patient-john-61201", name: "John", email: "john@example.com", password: "password123", role: "patient", patientRef: "LSA-2026-61201" }
];

// ─── Filesystem Setup & Data Helpers ─────────────────────────────────────────

const memoryCache = {};

function sanitizeAge(val, dob) {
    if (dob) {
        const birthDate = new Date(dob);
        if (!isNaN(birthDate.getTime())) {
            const today = new Date();
            let calcAge = today.getFullYear() - birthDate.getFullYear();
            const monthDiff = today.getMonth() - birthDate.getMonth();
            if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < birthDate.getDate())) {
                calcAge--;
            }
            if (calcAge >= 1 && calcAge <= 115) return calcAge;
        }
    }

    const parsed = parseInt(val, 10);
    if (!isNaN(parsed) && parsed >= 1 && parsed <= 115) {
        return parsed;
    }

    return 28;
}

function readDataFile(filename, fallback) {
    let data = null;

    // 1. Read dynamic writable DATA_DIR
    const writablePath = path.join(DATA_DIR, filename);
    if (fs.existsSync(writablePath)) {
        try {
            data = JSON.parse(fs.readFileSync(writablePath, 'utf8'));
        } catch (err) {
            console.error(`Error reading ${writablePath}:`, err);
        }
    }

    // 2. Read bundled data dir if writable file does not exist
    if (!data) {
        const bundledPath = path.join(__dirname, 'data', filename);
        if (fs.existsSync(bundledPath)) {
            try {
                data = JSON.parse(fs.readFileSync(bundledPath, 'utf8'));
            } catch (err) {
                console.error(`Error reading bundled file ${bundledPath}:`, err);
            }
        }
    }

    if (!data) {
        data = memoryCache[filename] || fallback;
    }

    // Ensure all patients are assigned to Dr. Krithika SK, have sanitized valid ages, and have matching passwords attached
    if (filename === 'patients.json' && Array.isArray(data)) {
        let usersList = [];
        try {
            const usersPath = path.join(DATA_DIR, USERS_FILE);
            if (fs.existsSync(usersPath)) {
                usersList = JSON.parse(fs.readFileSync(usersPath, 'utf8'));
            } else {
                const bundledUsersPath = path.join(__dirname, 'data', USERS_FILE);
                if (fs.existsSync(bundledUsersPath)) {
                    usersList = JSON.parse(fs.readFileSync(bundledUsersPath, 'utf8'));
                }
            }
        } catch (e) {}

        data.forEach(p => {
            if (!p) return;
            if (!p.assignedDoctor) p.assignedDoctor = "Dr. Krithika SK";
            p.age = sanitizeAge(p.age, p.dob);
            if (Array.isArray(usersList)) {
                const u = usersList.find(usr => usr && (
                    (usr.patientRef && p.refId && usr.patientRef === p.refId) ||
                    (p.email && usr.email && typeof p.email === 'string' && typeof usr.email === 'string' && usr.email.toLowerCase() === p.email.toLowerCase() && usr.role === 'patient')
                ));
                if (u && u.password) {
                    p.password = u.password;
                }
            }
        });
    }

    memoryCache[filename] = data;
    return data;
}

function writeDataFile(filename, data) {
    memoryCache[filename] = data;
    const writablePath = path.join(DATA_DIR, filename);
    try {
        fs.writeFileSync(writablePath, JSON.stringify(data, null, 2));
    } catch (err) {
        console.warn(`Warning: Could not write to ${writablePath}: ${err.message}`);
    }

    const bundledPath = path.join(__dirname, 'data', filename);
    if (bundledPath !== writablePath) {
        try {
            fs.writeFileSync(bundledPath, JSON.stringify(data, null, 2));
        } catch (err) {
            // Ignore in read-only systems
        }
    }
}

// function addNotification(message, type = 'info') {
//     const notifs = readDataFile(NOTIFICATIONS_FILE, []);
//     notifs.push({
//         id: `notif-${Date.now()}-${Math.floor(Math.random() * 1000)}`,
//         message,
//         type,
//         timestamp: new Date().toISOString(),
//         read: false
//     });
//     writeDataFile(NOTIFICATIONS_FILE, notifs);
// }
async function addNotification(message, type = 'info') {
    try {
        const id = `notif-${Date.now()}-${Math.floor(Math.random() * 1000)}`;

        await pool.query(
            `
            INSERT INTO notifications (
                id,
                message,
                type,
                timestamp,
                read
            )
            VALUES ($1, $2, $3, NOW(), FALSE)
            `,
            [id, message, type]
        );

        return id;
    } catch (error) {
        console.error('❌ Failed to save notification:', error.message);
        throw error;
    }
}
// ─── AUTH ROUTES ─────────────────────────────────────────────────────────────

// POST /api/auth/login — Doctor or Patient login
// app.post('/api/auth/login', (req, res) => {
//     const { email, password } = req.body;

//     if (!email || !password) {
//         return res.status(400).json({ error: "Email and password are required." });
//     }

//     // Check users (doctor accounts)
//     const users = readDataFile(USERS_FILE, INITIAL_USERS);
//     let user = users.find(u => u.role === 'doctor' && u.email.toLowerCase() === email.toLowerCase() && u.password === password);

//     // Fallback support for Mrs. Krithika SK logins
//     if (!user && (email.toLowerCase() === 'lunaskinaesthetics24@gmail.com' || email.toLowerCase() === 'dr.krithika@lunaskin.com')) {
//         const doctorAcc = users.find(u => u.role === 'doctor') || INITIAL_USERS[0];
//         if (password === doctorAcc.password || password === 'krithika2026' || password === 'luna2026' || password === 'luna2024') {
//             user = doctorAcc;
//         }
//     }

//     if (user) {
//         return res.json({
//             success: true,
//             role: user.role,
//             id: user.id,
//             name: user.name || "Mrs. Krithika SK",
//             email: user.email,
//             avatar: user.avatar || null,
//             specialization: user.specialization || "Lead Clinical Cosmetologist & Dermatologist",
//             licenseId: user.licenseId || "#882-LUNA-SAFE-921"
//         });
//     }

//     // Check patient accounts (patients have email stored in their record + a password in users file)
//     const patients = readDataFile(PATIENTS_FILE, INITIAL_PATIENTS);
//     const patientUser = users.find(u => u.email.toLowerCase() === email.toLowerCase() && u.password === password && u.role === 'patient');

//     if (patientUser) {
//         const patientRecord = patients.find(p => p.refId === patientUser.patientRef);
//         return res.json({
//             success: true,
//             role: 'patient',
//             id: patientUser.id,
//             name: patientUser.name,
//             email: patientUser.email,
//             patientRef: patientUser.patientRef,
//             patientRecord: patientRecord || null
//         });
//     }

//     return res.status(401).json({ error: "Invalid credentials. Please check your email and password." });
// });

// POST /api/auth/login — Doctor or Patient login
app.post('/api/auth/login', async (req, res) => {
    const { email, password } = req.body;

    if (!email || !password) {
        return res.status(400).json({
            error: "Email and password are required."
        });
    }

    try {
        const result = await pool.query(
            `
            SELECT
                id,
                name,
                email,
                password_hash,
                role,
                patient_ref,
                license_id,
                specialization,
                avatar,
                phone
            FROM users
            WHERE LOWER(email) = LOWER($1)
            LIMIT 1
            `,
            [email.trim()]
        );

        if (result.rows.length === 0) {
            return res.status(401).json({
                error: "Invalid credentials. Please check your email and password."
            });
        }

        const user = result.rows[0];

        const passwordMatches = await bcrypt.compare(
            password,
            user.password_hash
        );

        if (!passwordMatches) {
            return res.status(401).json({
                error: "Invalid credentials. Please check your email and password."
            });
        }

        // Doctor login
        if (user.role === 'doctor') {
            return res.json({
                success: true,
                role: user.role,
                id: user.id,
                name: user.name || "Mrs. Krithika SK",
                email: user.email,
                avatar: user.avatar || null,
                specialization:
                    user.specialization ||
                    "Lead Clinical Cosmetologist & Dermatologist",
                licenseId:
                    user.license_id ||
                    "#882-LUNA-SAFE-921"
            });
        }

        // Patient login
        // if (user.role === 'patient') {
        //     let patientRecord = null;

        //     if (user.patient_ref) {
        //         const patientResult = await pool.query(
        //             `
        //             SELECT *
        //             FROM patients
        //             WHERE ref_id = $1
        //             LIMIT 1
        //             `,
        //             [user.patient_ref]
        //         );

        //         if (patientResult.rows.length > 0) {
        //             patientRecord = patientResult.rows[0];
        //         }
        //     }

        //     return res.json({
        //         success: true,
        //         role: 'patient',
        //         id: user.id,
        //         name: user.name,
        //         email: user.email,
        //         patientRef: user.patient_ref,
        //         patientRecord
        //     });
        // }
        // Patient login
if (user.role === 'patient') {
    let patientRecord = null;

    if (user.patient_ref) {
        const patientResult = await pool.query(
            `
            SELECT *
            FROM patients
            WHERE ref_id = $1
            LIMIT 1
            `,
            [user.patient_ref]
        );

        if (patientResult.rows.length > 0) {
            const patient = patientResult.rows[0];

            const proceduresResult = await pool.query(
                `
                SELECT name, procedure_date, clinic
                FROM patient_procedures
                WHERE patient_ref = $1
                ORDER BY procedure_date ASC, id ASC
                `,
                [user.patient_ref]
            );

            const logsResult = await pool.query(
                `
                SELECT log_date, therapy, reaction, notes
                FROM patient_treatment_logs
                WHERE patient_ref = $1
                ORDER BY log_date ASC, id ASC
                `,
                [user.patient_ref]
            );

            const skincareResult = await pool.query(
                `
                SELECT name, instructions, qty
                FROM patient_skincare
                WHERE patient_ref = $1
                ORDER BY id ASC
                `,
                [user.patient_ref]
            );

            const concernsResult = await pool.query(
                `
                SELECT
                    hyperpigmentation,
                    acne,
                    elasticity,
                    dehydration
                FROM patient_concerns
                WHERE patient_ref = $1
                `,
                [user.patient_ref]
            );

            const appointmentResult = await pool.query(
                `
                SELECT TO_CHAR(appointment_date, 'YYYY-MM-DD') AS appointment_date, appointment_time, purpose
                FROM appointments
                WHERE patient_ref = $1
                ORDER BY created_at DESC
                LIMIT 1
                `,
                [user.patient_ref]
            );

            const concerns = concernsResult.rows[0];

            patientRecord = {
                refId: patient.ref_id,
                name: patient.name,
                age: patient.age,
                gender: patient.gender,
                contact: patient.contact,
                email: patient.email,
                allergies: patient.allergies || "",
                medications: patient.medications || "",
                skintype: patient.skintype || "Normal",
                concern: patient.concern || "",
                routine: patient.routine || "",
                observations: patient.observations || "",
                protocol: patient.protocol || "",
                status: patient.status || "Active",
                signed: patient.signed || false,
                signatureId: patient.signature_id || "",
                beforeDate: patient.before_date || "",
                afterDate: patient.after_date || "",
                beforeImg: patient.before_img || "",
                afterImg: patient.after_img || "",

                procedures: proceduresResult.rows.map(row => ({
                    name: row.name || "",
                    date: row.procedure_date
                        ? row.procedure_date.toISOString().split('T')[0]
                        : "",
                    clinic: row.clinic || ""
                })),

                logs: logsResult.rows.map(row => ({
                    date: row.log_date
                        ? row.log_date.toISOString().split('T')[0]
                        : "",
                    therapy: row.therapy || "",
                    reaction: row.reaction || "",
                    notes: row.notes || ""
                })),

                skincare: skincareResult.rows.map(row => ({
                    name: row.name || "",
                    instructions: row.instructions || "",
                    qty: row.qty ?? 1
                })),

                concernsChecklist: concerns
                    ? {
                        hyperpigmentation: concerns.hyperpigmentation || false,
                        acne: concerns.acne || false,
                        elasticity: concerns.elasticity || false,
                        dehydration: concerns.dehydration || false
                    }
                    : {
                        hyperpigmentation: false,
                        acne: false,
                        elasticity: false,
                        dehydration: false
                    },

                appointment: appointmentResult.rows[0]
                    ? {
                       date: appointmentResult.rows[0].appointment_date || "",
                        time: appointmentResult.rows[0].appointment_time || "",
                        purpose: appointmentResult.rows[0].purpose || ""
                    }
                    : null,

                assignedDoctor: patient.assigned_doctor || ""
            };
        }
    }

    return res.json({
        success: true,
        role: 'patient',
        id: user.id,
        name: user.name,
        email: user.email,
        patientRef: user.patient_ref,
        patientRecord
    });
}

        return res.status(403).json({
            error: "This account type is not supported."
        });

    } catch (error) {
        console.error('❌ Login error:', error);

        return res.status(500).json({
            error: "Unable to process login."
        });
    }
});     

// POST /api/auth/register — Patient self-registration
// app.post('/api/auth/register', (req, res) => {
//     const { name, email, password, contact, dob, gender } = req.body;

//     if (!name || !email || !password) {
//         return res.status(400).json({ error: "Name, email, and password are required." });
//     }

//     const users = readDataFile(USERS_FILE, INITIAL_USERS);
    
//     // Check if email already exists
//     const existingUser = users.find(u => u.email.toLowerCase() === email.toLowerCase());
//     if (existingUser) {
//         return res.status(409).json({ error: "An account with this email already exists." });
//     }

//     // Generate patient refId
//     const year = new Date().getFullYear();
//     const randCode = Math.floor(10000 + Math.random() * 90000);
//     const refId = `LSA-${year}-${randCode}`;

//     // Calculate age from DOB
//     const age = sanitizeAge(null, dob);

//     // Create patient record
//     const newPatient = {
//         refId,
//         name,
//         age,
//         gender: gender || "Not specified",
//         contact: contact || "",
//         email: email.toLowerCase(),
//         allergies: "",
//         medications: "",
//         skintype: "Normal",
//         concern: "Initial Consultation",
//         routine: "",
//         observations: "",
//         protocol: "",
//         status: "Active",
//         signed: false,
//         signatureId: "",
//         beforeDate: "",
//         afterDate: "",
//         beforeImg: "",
//         afterImg: "",
//         procedures: [],
//         logs: [],
//         skincare: [],
//         concernsChecklist: { hyperpigmentation: false, acne: false, elasticity: false, dehydration: false },
//         appointment: null,
//         assignedDoctor: "Dr. Krithika SK"
//     };

//     // Create user account
//     const newUser = {
//         id: `patient-${Date.now()}`,
//         name,
//         email: email.toLowerCase(),
//         password,
//         role: 'patient',
//         patientRef: refId
//     };

//     const patients = readDataFile(PATIENTS_FILE, INITIAL_PATIENTS);
//     patients.push(newPatient);
//     writeDataFile(PATIENTS_FILE, patients);

//     users.push(newUser);
//     writeDataFile(USERS_FILE, users);

//     res.status(201).json({
//         success: true,
//         role: 'patient',
//         id: newUser.id,
//         name: newUser.name,
//         email: newUser.email,
//         patientRef: refId,
//         patientRecord: newPatient
//     });
// });

app.post('/api/auth/register', async (req, res) => {
    const { name, email, password, contact, dob, gender } = req.body;

    if (!name || !email || !password) {
        return res.status(400).json({
            error: "Name, email, and password are required."
        });
    }

    const client = await pool.connect();

    try {
        // Check if email already exists in PostgreSQL
        const existingUserResult = await client.query(
            `
            SELECT id
            FROM users
            WHERE LOWER(email) = LOWER($1)
            LIMIT 1
            `,
            [email.trim()]
        );

        if (existingUserResult.rows.length > 0) {
            return res.status(409).json({
                error: "An account with this email already exists."
            });
        }

        // Generate a unique patient reference ID
        let refId;
        let refIdExists = true;

        while (refIdExists) {
            const year = new Date().getFullYear();
            const randCode = Math.floor(10000 + Math.random() * 90000);
            refId = `LSA-${year}-${randCode}`;

            const refCheck = await client.query(
                `
                SELECT ref_id
                FROM patients
                WHERE ref_id = $1
                LIMIT 1
                `,
                [refId]
            );

            refIdExists = refCheck.rows.length > 0;
        }

        // Calculate age from DOB
        const age = sanitizeAge(null, dob);

        const patientId = `patient-${Date.now()}`;

        // Hash password before storing it
        const passwordHash = await bcrypt.hash(password, 12);

        await client.query('BEGIN');

        // Create patient record
        await client.query(
            `
            INSERT INTO patients (
                ref_id,
                name,
                age,
                gender,
                contact,
                email,
                allergies,
                medications,
                skintype,
                concern,
                routine,
                observations,
                protocol,
                status,
                signed,
                signature_id,
                before_date,
                after_date,
                before_img,
                after_img,
                assigned_doctor
            )
            VALUES (
                $1, $2, $3, $4, $5, $6,
                '', '', 'Normal', 'Initial Consultation',
                '', '', '', 'Active', FALSE, '',
                '', '', '', '',
                'Dr. Krithika SK'
            )
            `,
            [
                refId,
                name.trim(),
                age,
                gender || "Not specified",
                contact || "",
                email.trim().toLowerCase()
            ]
        );

        // Create default concerns checklist
        await client.query(
            `
            INSERT INTO patient_concerns (
                patient_ref,
                hyperpigmentation,
                acne,
                elasticity,
                dehydration
            )
            VALUES ($1, FALSE, FALSE, FALSE, FALSE)
            `,
            [refId]
        );

        // Create patient login account
        await client.query(
            `
            INSERT INTO users (
                id,
                name,
                email,
                password_hash,
                role,
                patient_ref
            )
            VALUES ($1, $2, $3, $4, 'patient', $5)
            `,
            [
                patientId,
                name.trim(),
                email.trim().toLowerCase(),
                passwordHash,
                refId
            ]
        );

        await client.query('COMMIT');
        // Send appointment notification to the patient after the database update succeeds
let emailResult = null;

if (appointmentAction && email) {
    emailResult = await sendAppointmentEmail({
        to: email,
        subject: `${appointmentAction} - Luna Skin Aesthetic`,
        patientName: name,
        patientPhone: contact,
        patientEmail: email,
        date: appointment.date,
        time: appointment.time || 'Not specified',
        purpose: appointment.purpose || 'Consultation',
        message: previousAppointment
            ? `Previous appointment: ${previousAppointment.appointment_date} at ${previousAppointment.appointment_time || 'Not specified'} (${previousAppointment.purpose || 'Consultation'})`
            : '',
        action: appointmentAction
    });

    console.log(
        `📧 Doctor appointment email result for ${email}:`,
        emailResult
    );
} 

        // Return the same structure expected by the frontend
        const patientRecord = {
            refId,
            name: name.trim(),
            age,
            gender: gender || "Not specified",
            contact: contact || "",
            email: email.trim().toLowerCase(),
            allergies: "",
            medications: "",
            skintype: "Normal",
            concern: "Initial Consultation",
            routine: "",
            observations: "",
            protocol: "",
            status: "Active",
            signed: false,
            signatureId: "",
            beforeDate: "",
            afterDate: "",
            beforeImg: "",
            afterImg: "",
            procedures: [],
            logs: [],
            skincare: [],
            concernsChecklist: {
                hyperpigmentation: false,
                acne: false,
                elasticity: false,
                dehydration: false
            },
            appointment: null,
            assignedDoctor: "Dr. Krithika SK"
        };

        return res.status(201).json({
            success: true,
            role: 'patient',
            id: patientId,
            name: name.trim(),
            email: email.trim().toLowerCase(),
            patientRef: refId,
            patientRecord
        });

    } catch (error) {
        try {
            await client.query('ROLLBACK');
        } catch (rollbackError) {
            console.error('❌ Rollback error:', rollbackError.message);
        }

        console.error('❌ Registration error:', error);

        // Handle PostgreSQL duplicate email/refId race conditions
        if (error.code === '23505') {
            return res.status(409).json({
                error: "An account with this email already exists."
            });
        }

        return res.status(500).json({
            error: "Unable to create patient account."
        });

    } finally {
        client.release();
    }
});



// ─── ALL APPOINTMENTS ROUTE (For Doctor Calendar) ────────────────────────────

// GET /api/appointments — Aggregate all patient appointments
// ─── ALL APPOINTMENTS ROUTE (For Doctor Calendar) ────────────────────────────

// GET /api/appointments — Read all appointments from PostgreSQL
app.get('/api/appointments', async (req, res) => {
    try {
        const result = await pool.query(`
            SELECT
                a.id,
                a.patient_ref,
                p.name AS patient_name,
                p.status,
                TO_CHAR(a.appointment_date, 'YYYY-MM-DD') AS appointment_date,
                a.appointment_time,
                a.purpose,
                a.created_at
            FROM appointments a
            INNER JOIN patients p
                ON p.ref_id = a.patient_ref
            ORDER BY a.appointment_date ASC, a.created_at ASC
        `);

        const appointments = result.rows.map(row => ({
            id: row.id,
            patientName: row.patient_name,
            patientRef: row.patient_ref,
            date: row.appointment_date || "",
            time: row.appointment_time || "TBD",
            purpose: row.purpose || "Consultation",
            status: row.status || "Active"
        }));

        console.log(`📅 Doctor calendar loaded ${appointments.length} appointment(s)`);

        return res.json(appointments);

    } catch (error) {
        console.error('❌ Failed to load appointments:', error);

        return res.status(500).json({
            error: "Unable to load appointments."
        });
    }
});

// ─── PATIENT ROUTES ──────────────────────────────────────────────────────────

// app.get('/api/patients', (req, res) => {
//     const data = readDataFile(PATIENTS_FILE, INITIAL_PATIENTS);
//     res.json(data);
// });

app.get('/api/patients', async (req, res) => {
    try {
        const patientsResult = await pool.query(`
            SELECT *
            FROM patients
            ORDER BY created_at DESC
        `);

        const patients = [];

        for (const patient of patientsResult.rows) {
            const proceduresResult = await pool.query(`
                SELECT
                    name,
                    procedure_date,
                    clinic
                FROM patient_procedures
                WHERE patient_ref = $1
                ORDER BY procedure_date ASC, id ASC
            `, [patient.ref_id]);

            const logsResult = await pool.query(`
                SELECT
                    log_date,
                    therapy,
                    reaction,
                    notes
                FROM patient_treatment_logs
                WHERE patient_ref = $1
                ORDER BY log_date ASC, id ASC
            `, [patient.ref_id]);

            const skincareResult = await pool.query(`
                SELECT
                    name,
                    instructions,
                    qty
                FROM patient_skincare
                WHERE patient_ref = $1
                ORDER BY id ASC
            `, [patient.ref_id]);

            const concernsResult = await pool.query(`
                SELECT
                    hyperpigmentation,
                    acne,
                    elasticity,
                    dehydration
                FROM patient_concerns
                WHERE patient_ref = $1
            `, [patient.ref_id]);

            const appointmentResult = await pool.query(`
                SELECT TO_CHAR(appointment_date, 'YYYY-MM-DD') AS appointment_date, appointment_time, purpose
                FROM appointments
                WHERE patient_ref = $1
                ORDER BY created_at DESC
                LIMIT 1
            `, [patient.ref_id]);

            patients.push({
                refId: patient.ref_id,
                name: patient.name,
                age: patient.age,
                gender: patient.gender,
                contact: patient.contact,
                email: patient.email,
                allergies: patient.allergies || "",
                medications: patient.medications || "",
                skintype: patient.skintype || "Normal",
                concern: patient.concern || "",
                routine: patient.routine || "",
                observations: patient.observations || "",
                protocol: patient.protocol || "",
                status: patient.status || "Active",
                signed: patient.signed || false,
                signatureId: patient.signature_id || "",
                beforeDate: patient.before_date || "",
                afterDate: patient.after_date || "",
                beforeImg: patient.before_img || "",
                afterImg: patient.after_img || "",

                procedures: proceduresResult.rows.map(row => ({
                    name: row.name || "",
                    date: row.procedure_date
                        ? row.procedure_date.toISOString().split('T')[0]
                        : "",
                    clinic: row.clinic || ""
                })),

                logs: logsResult.rows.map(row => ({
                    date: row.log_date
                        ? row.log_date.toISOString().split('T')[0]
                        : "",
                    therapy: row.therapy || "",
                    reaction: row.reaction || "",
                    notes: row.notes || ""
                })),

                skincare: skincareResult.rows.map(row => ({
                    name: row.name || "",
                    instructions: row.instructions || "",
                    qty: row.qty ?? 1
                })),

                concernsChecklist: concernsResult.rows[0]
                    ? {
                        hyperpigmentation: concernsResult.rows[0].hyperpigmentation || false,
                        acne: concernsResult.rows[0].acne || false,
                        elasticity: concernsResult.rows[0].elasticity || false,
                        dehydration: concernsResult.rows[0].dehydration || false
                    }
                    : {
                        hyperpigmentation: false,
                        acne: false,
                        elasticity: false,
                        dehydration: false
                    },

                appointment: appointmentResult.rows[0]
                    ? {
                       date: appointmentResult.rows[0].appointment_date || "",
                        time: appointmentResult.rows[0].appointment_time || "",
                        purpose: appointmentResult.rows[0].purpose || ""
                    }
                    : null,

                assignedDoctor: patient.assigned_doctor || ""
            });
        }

        res.json(patients);

    } catch (error) {
        console.error('❌ Error fetching patients:', error);

        res.status(500).json({
            error: "Unable to fetch patients."
        });
    }
});



// app.post('/api/patients', (req, res) => {
//     const patientsList = readDataFile(PATIENTS_FILE, INITIAL_PATIENTS);
//     const newPatient = req.body;

//     if (!newPatient.name) {
//         return res.status(400).json({ error: "Patient name is required." });
//     }

//     if (!newPatient.refId) {
//         const year = new Date().getFullYear();
//         const randCode = Math.floor(10000 + Math.random() * 90000);
//         newPatient.refId = `LSA-${year}-${randCode}`;
//     }

//     newPatient.email = (newPatient.email || '').toLowerCase().trim();
//     newPatient.procedures = newPatient.procedures || [];
//     newPatient.logs = newPatient.logs || [];
//     newPatient.skincare = newPatient.skincare || [];
//     newPatient.concernsChecklist = newPatient.concernsChecklist || {
//         hyperpigmentation: false, acne: false, elasticity: false, dehydration: false
//     };
//     newPatient.status = newPatient.status || "Active";
//     newPatient.signed = newPatient.signed || false;
//     newPatient.signatureId = newPatient.signatureId || "";
//     newPatient.assignedDoctor = newPatient.assignedDoctor || "Dr. Krithika SK";

//     patientsList.push(newPatient);
//     writeDataFile(PATIENTS_FILE, patientsList);

//     // Auto-create matching patient user account if email is provided and doesn't exist
//     if (newPatient.email) {
//         const usersList = readDataFile(USERS_FILE, INITIAL_USERS);
//         const existingUser = usersList.find(u => u.email.toLowerCase() === newPatient.email.toLowerCase());
//         if (!existingUser) {
//             // Generate a unique PIN password for each newly created client account
//             const randPass = 'Luna' + Math.floor(1000 + Math.random() * 9000);
//             const newUser = {
//                 id: `patient-${Date.now()}`,
//                 name: newPatient.name,
//                 email: newPatient.email.toLowerCase(),
//                 password: randPass,
//                 role: 'patient',
//                 patientRef: newPatient.refId
//             };
//             usersList.push(newUser);
//             writeDataFile(USERS_FILE, usersList);
//             newPatient.password = randPass;
//         } else {
//             newPatient.password = existingUser.password;
//         }
//     }

//     res.status(201).json(newPatient);
// });

app.post('/api/patients', async (req, res) => {
    const newPatient = { ...req.body };

    if (!newPatient.name) {
        return res.status(400).json({
            error: "Patient name is required."
        });
    }

    const client = await pool.connect();

    try {
        newPatient.email = (newPatient.email || '').toLowerCase().trim();

        // Generate a unique patient reference if one was not provided
        if (!newPatient.refId) {
            let refIdExists = true;

            while (refIdExists) {
                const year = new Date().getFullYear();
                const randCode = Math.floor(10000 + Math.random() * 90000);
                newPatient.refId = `LSA-${year}-${randCode}`;

                const refCheck = await client.query(
                    `
                    SELECT ref_id
                    FROM patients
                    WHERE ref_id = $1
                    LIMIT 1
                    `,
                    [newPatient.refId]
                );

                refIdExists = refCheck.rows.length > 0;
            }
        } else {
            const refCheck = await client.query(
                `
                SELECT ref_id
                FROM patients
                WHERE ref_id = $1
                LIMIT 1
                `,
                [newPatient.refId]
            );

            if (refCheck.rows.length > 0) {
                return res.status(409).json({
                    error: "A patient with this reference ID already exists."
                });
            }
        }

        newPatient.procedures = Array.isArray(newPatient.procedures)
            ? newPatient.procedures
            : [];

        newPatient.logs = Array.isArray(newPatient.logs)
            ? newPatient.logs
            : [];

        newPatient.skincare = Array.isArray(newPatient.skincare)
            ? newPatient.skincare
            : [];

        newPatient.concernsChecklist = newPatient.concernsChecklist || {
            hyperpigmentation: false,
            acne: false,
            elasticity: false,
            dehydration: false
        };

        newPatient.status = newPatient.status || "Active";
        newPatient.signed = newPatient.signed || false;
        newPatient.signatureId = newPatient.signatureId || "";
        newPatient.assignedDoctor =
            newPatient.assignedDoctor || "Dr. Krithika SK";

        await client.query('BEGIN');

        // Create main patient record
        await client.query(
            `
            INSERT INTO patients (
                ref_id,
                name,
                age,
                gender,
                contact,
                email,
                allergies,
                medications,
                skintype,
                concern,
                routine,
                observations,
                protocol,
                status,
                signed,
                signature_id,
                before_date,
                after_date,
                before_img,
                after_img,
                assigned_doctor
            )
            VALUES (
                $1, $2, $3, $4, $5, $6,
                $7, $8, $9, $10, $11, $12,
                $13, $14, $15, $16, $17, $18,
                $19, $20, $21
            )
            `,
            [
                newPatient.refId,
                newPatient.name.trim(),
                sanitizeAge(newPatient.age, newPatient.dob),
                newPatient.gender || "Not specified",
                newPatient.contact || "",
                newPatient.email || "",
                newPatient.allergies || "",
                newPatient.medications || "",
                newPatient.skintype || "Normal",
                newPatient.concern || "Initial Consultation",
                newPatient.routine || "",
                newPatient.observations || "",
                newPatient.protocol || "",
                newPatient.status,
                newPatient.signed,
                newPatient.signatureId,
                newPatient.beforeDate || "",
                newPatient.afterDate || "",
                newPatient.beforeImg || "",
                newPatient.afterImg || "",
                newPatient.assignedDoctor
            ]
        );

        // Procedures
        for (const procedure of newPatient.procedures) {
            await client.query(
                `
                INSERT INTO patient_procedures (
                    patient_ref,
                    name,
                    procedure_date,
                    clinic
                )
                VALUES ($1, $2, $3, $4)
                `,
                [
                    newPatient.refId,
                    procedure.name || "",
                    procedure.date || null,
                    procedure.clinic || ""
                ]
            );
        }

        // Treatment logs
        for (const log of newPatient.logs) {
            await client.query(
                `
                INSERT INTO patient_treatment_logs (
                    patient_ref,
                    log_date,
                    therapy,
                    reaction,
                    notes
                )
                VALUES ($1, $2, $3, $4, $5)
                `,
                [
                    newPatient.refId,
                    log.date || null,
                    log.therapy || "",
                    log.reaction || "",
                    log.notes || ""
                ]
            );
        }

        // Skincare
        for (const item of newPatient.skincare) {
            await client.query(
                `
                INSERT INTO patient_skincare (
                    patient_ref,
                    name,
                    instructions,
                    qty
                )
                VALUES ($1, $2, $3, $4)
                `,
                [
                    newPatient.refId,
                    item.name || "",
                    item.instructions || "",
                    item.qty ?? 1
                ]
            );
        }

        // Concerns checklist
        await client.query(
            `
            INSERT INTO patient_concerns (
                patient_ref,
                hyperpigmentation,
                acne,
                elasticity,
                dehydration
            )
            VALUES ($1, $2, $3, $4, $5)
            `,
            [
                newPatient.refId,
                !!newPatient.concernsChecklist.hyperpigmentation,
                !!newPatient.concernsChecklist.acne,
                !!newPatient.concernsChecklist.elasticity,
                !!newPatient.concernsChecklist.dehydration
            ]
        );

        // Create patient login account when email is provided
        let generatedPassword = null;

        if (newPatient.email) {
            const existingUserResult = await client.query(
                `
                SELECT id
                FROM users
                WHERE LOWER(email) = LOWER($1)
                LIMIT 1
                `,
                [newPatient.email]
            );

            if (existingUserResult.rows.length === 0) {
                generatedPassword =
                    'Luna' + Math.floor(1000 + Math.random() * 9000);

                const passwordHash = await bcrypt.hash(
                    generatedPassword,
                    12
                );

                await client.query(
                    `
                    INSERT INTO users (
                        id,
                        name,
                        email,
                        password_hash,
                        role,
                        patient_ref
                    )
                    VALUES ($1, $2, $3, $4, 'patient', $5)
                    `,
                    [
                        `patient-${Date.now()}`,
                        newPatient.name.trim(),
                        newPatient.email,
                        passwordHash,
                        newPatient.refId
                    ]
                );
            }
        }

        await client.query('COMMIT');

        const patientRecord = {
            refId: newPatient.refId,
            name: newPatient.name.trim(),
            age: sanitizeAge(newPatient.age, newPatient.dob),
            gender: newPatient.gender || "Not specified",
            contact: newPatient.contact || "",
            email: newPatient.email || "",
            allergies: newPatient.allergies || "",
            medications: newPatient.medications || "",
            skintype: newPatient.skintype || "Normal",
            concern: newPatient.concern || "Initial Consultation",
            routine: newPatient.routine || "",
            observations: newPatient.observations || "",
            protocol: newPatient.protocol || "",
            status: newPatient.status,
            signed: newPatient.signed,
            signatureId: newPatient.signatureId,
            beforeDate: newPatient.beforeDate || "",
            afterDate: newPatient.afterDate || "",
            beforeImg: newPatient.beforeImg || "",
            afterImg: newPatient.afterImg || "",
            procedures: newPatient.procedures,
            logs: newPatient.logs,
            skincare: newPatient.skincare,
            concernsChecklist: newPatient.concernsChecklist,
            appointment: null,
            assignedDoctor: newPatient.assignedDoctor
        };

        return res.status(201).json({
            ...patientRecord,
            ...(generatedPassword ? { password: generatedPassword } : {})
        });

    } catch (error) {
        try {
            await client.query('ROLLBACK');
        } catch (rollbackError) {
            console.error(
                '❌ Rollback error:',
                rollbackError.message
            );
        }

        console.error('❌ Error creating patient:', error);

        if (error.code === '23505') {
            return res.status(409).json({
                error: "A patient or account with these details already exists."
            });
        }

        return res.status(500).json({
            error: "Unable to create patient."
        });

    } finally {
        client.release();
    }
});



// app.put('/api/patients/:refId', (req, res) => {
//     const patientsList = readDataFile(PATIENTS_FILE, INITIAL_PATIENTS);
//     const refId = req.params.refId;
//     const index = patientsList.findIndex(p => p.refId === refId);

//     if (index === -1) {
//         return res.status(404).json({ error: "Patient record not found." });
//     }

//     patientsList[index] = { ...patientsList[index], ...req.body };
//     writeDataFile(PATIENTS_FILE, patientsList);
//     res.json(patientsList[index]);
// });

app.put('/api/patients/:refId', async (req, res) => {
    const refId = req.params.refId;

    const client = await pool.connect();

    try {
        // Check that the patient exists
        const existingPatientResult = await client.query(
            `
            SELECT *
            FROM patients
            WHERE ref_id = $1
            LIMIT 1
            `,
            [refId]
        );

        if (existingPatientResult.rows.length === 0) {
            return res.status(404).json({
                error: "Patient record not found."
            });
        }

        const existingPatient = existingPatientResult.rows[0];
        const updatedPatient = {
            ...req.body
        };

        // Keep existing values when a field was not supplied
        const name = updatedPatient.name ?? existingPatient.name;
        const age = sanitizeAge(
            updatedPatient.age ?? existingPatient.age,
            updatedPatient.dob
        );
        const gender = updatedPatient.gender ?? existingPatient.gender;
        const contact = updatedPatient.contact ?? existingPatient.contact;
        const email = updatedPatient.email !== undefined
            ? String(updatedPatient.email).toLowerCase().trim()
            : existingPatient.email;

        const allergies = updatedPatient.allergies ?? existingPatient.allergies ?? "";
        const medications = updatedPatient.medications ?? existingPatient.medications ?? "";
        const skintype = updatedPatient.skintype ?? existingPatient.skintype ?? "Normal";
        const concern = updatedPatient.concern ?? existingPatient.concern ?? "";
        const routine = updatedPatient.routine ?? existingPatient.routine ?? "";
        const observations = updatedPatient.observations ?? existingPatient.observations ?? "";
        const protocol = updatedPatient.protocol ?? existingPatient.protocol ?? "";
        const status = updatedPatient.status ?? existingPatient.status ?? "Active";
        const signed = updatedPatient.signed ?? existingPatient.signed ?? false;
        const signatureId = updatedPatient.signatureId ?? existingPatient.signature_id ?? "";
        const beforeDate = updatedPatient.beforeDate ?? existingPatient.before_date ?? "";
        const afterDate = updatedPatient.afterDate ?? existingPatient.after_date ?? "";
        const beforeImg = updatedPatient.beforeImg ?? existingPatient.before_img ?? "";
        const afterImg = updatedPatient.afterImg ?? existingPatient.after_img ?? "";
        const assignedDoctor =
            updatedPatient.assignedDoctor ??
            existingPatient.assigned_doctor ??
            "";

        const procedures = Array.isArray(updatedPatient.procedures)
            ? updatedPatient.procedures
            : null;

        const logs = Array.isArray(updatedPatient.logs)
            ? updatedPatient.logs
            : null;

        const skincare = Array.isArray(updatedPatient.skincare)
            ? updatedPatient.skincare
            : null;

        const appointment = updatedPatient.appointment && typeof updatedPatient.appointment === "object"
            ? updatedPatient.appointment
            : null;

        const concernsChecklist =
            updatedPatient.concernsChecklist &&
            typeof updatedPatient.concernsChecklist === "object"
                ? updatedPatient.concernsChecklist
                : null;

        await client.query('BEGIN');

        // Update main patient record
        await client.query(
            `
            UPDATE patients
            SET
                name = $1,
                age = $2,
                gender = $3,
                contact = $4,
                email = $5,
                allergies = $6,
                medications = $7,
                skintype = $8,
                concern = $9,
                routine = $10,
                observations = $11,
                protocol = $12,
                status = $13,
                signed = $14,
                signature_id = $15,
                before_date = $16,
                after_date = $17,
                before_img = $18,
                after_img = $19,
                assigned_doctor = $20,
                updated_at = NOW()
            WHERE ref_id = $21
            `,
            [
                name,
                age,
                gender,
                contact,
                email,
                allergies,
                medications,
                skintype,
                concern,
                routine,
                observations,
                protocol,
                status,
                signed,
                signatureId,
                beforeDate,
                afterDate,
                beforeImg,
                afterImg,
                assignedDoctor,
                refId
            ]
        );

        // Replace procedures only when the request supplied procedures
        if (procedures !== null) {
            await client.query(
                `
                DELETE FROM patient_procedures
                WHERE patient_ref = $1
                `,
                [refId]
            );

            for (const procedure of procedures) {
                await client.query(
                    `
                    INSERT INTO patient_procedures (
                        patient_ref,
                        name,
                        procedure_date,
                        clinic
                    )
                    VALUES ($1, $2, $3, $4)
                    `,
                    [
                        refId,
                        procedure.name || "",
                        procedure.date || null,
                        procedure.clinic || ""
                    ]
                );
            }
        }

        // Replace treatment logs only when supplied
        if (logs !== null) {
            await client.query(
                `
                DELETE FROM patient_treatment_logs
                WHERE patient_ref = $1
                `,
                [refId]
            );

            for (const log of logs) {
                await client.query(
                    `
                    INSERT INTO patient_treatment_logs (
                        patient_ref,
                        log_date,
                        therapy,
                        reaction,
                        notes
                    )
                    VALUES ($1, $2, $3, $4, $5)
                    `,
                    [
                        refId,
                        log.date || null,
                        log.therapy || "",
                        log.reaction || "",
                        log.notes || ""
                    ]
                );
            }
        }

        // Replace skincare only when supplied
        if (skincare !== null) {
            await client.query(
                `
                DELETE FROM patient_skincare
                WHERE patient_ref = $1
                `,
                [refId]
            );

            for (const item of skincare) {
                await client.query(
                    `
                    INSERT INTO patient_skincare (
                        patient_ref,
                        name,
                        instructions,
                        qty
                    )
                    VALUES ($1, $2, $3, $4)
                    `,
                    [
                        refId,
                        item.name || "",
                        item.instructions || "",
                        item.qty ?? 1
                    ]
                );
            }
        }

               // Update concerns checklist only when supplied
        if (concernsChecklist !== null) {
            await client.query(
                `
                INSERT INTO patient_concerns (
                    patient_ref,
                    hyperpigmentation,
                    acne,
                    elasticity,
                    dehydration
                )
                VALUES ($1, $2, $3, $4, $5)
                ON CONFLICT (patient_ref)
                DO UPDATE SET
                    hyperpigmentation = EXCLUDED.hyperpigmentation,
                    acne = EXCLUDED.acne,
                    elasticity = EXCLUDED.elasticity,
                    dehydration = EXCLUDED.dehydration
                `,
                [
                    refId,
                    !!concernsChecklist.hyperpigmentation,
                    !!concernsChecklist.acne,
                    !!concernsChecklist.elasticity,
                    !!concernsChecklist.dehydration
                ]
            );
        }


        let appointmentAction = null;
        let previousAppointment = null;
        // Update the patient's existing appointment when supplied
        if (appointment !== null && appointment.date) {
            const latestAppointmentResult = await client.query(
    `
    SELECT
        id,
        TO_CHAR(appointment_date, 'YYYY-MM-DD') AS appointment_date,
        appointment_time,
        purpose
    FROM appointments
    WHERE patient_ref = $1
    ORDER BY created_at DESC, id DESC
    LIMIT 1
    `,
    [refId]
);

if (latestAppointmentResult.rows.length > 0) {
    // Reschedule: update the existing/latest appointment
    previousAppointment = latestAppointmentResult.rows[0];
    appointmentAction = 'Appointment Rescheduled';

    await client.query(
        `
        UPDATE appointments
        SET
            appointment_date = $1,
            appointment_time = $2,
            purpose = $3
        WHERE id = $4
        `,
        [
            appointment.date,
            appointment.time || "",
            appointment.purpose || "Consultation",
            previousAppointment.id
        ]
    );
} else {
    // No appointment exists yet: create one
    appointmentAction = 'New Appointment';

    await client.query(
        `
        INSERT INTO appointments (
            patient_ref,
            appointment_date,
            appointment_time,
            purpose
        )
        VALUES ($1, $2, $3, $4)
        `,
        [
            refId,
            appointment.date,
            appointment.time || "",
            appointment.purpose || "Consultation"
        ]
    );
}
        }

        await client.query('COMMIT');



        // Return the same frontend-friendly structure used by GET /api/patients
        const proceduresResult = await pool.query(
            `
            SELECT name, procedure_date, clinic
            FROM patient_procedures
            WHERE patient_ref = $1
            ORDER BY procedure_date ASC, id ASC
            `,
            [refId]
        );

        const logsResult = await pool.query(
            `
            SELECT log_date, therapy, reaction, notes
            FROM patient_treatment_logs
            WHERE patient_ref = $1
            ORDER BY log_date ASC, id ASC
            `,
            [refId]
        );

        const skincareResult = await pool.query(
            `
            SELECT name, instructions, qty
            FROM patient_skincare
            WHERE patient_ref = $1
            ORDER BY id ASC
            `,
            [refId]
        );

        const concernsResult = await pool.query(
            `
            SELECT
                hyperpigmentation,
                acne,
                elasticity,
                dehydration
            FROM patient_concerns
            WHERE patient_ref = $1
            `,
            [refId]
        );
        const appointmentResult = await pool.query(
            `
            SELECT
            TO_CHAR(appointment_date, 'YYYY-MM-DD') AS appointment_date,
            appointment_time,
            purpose
            FROM appointments
            WHERE patient_ref = $1
            ORDER BY created_at DESC
    
            LIMIT 1
            `,
    
            [refId]
        );

        const patientResult = await pool.query(
            `
            SELECT *
            FROM patients
            WHERE ref_id = $1
            `,
            [refId]
        );

        const patient = patientResult.rows[0];
        const concerns = concernsResult.rows[0];

        const patientRecord = {
            refId: patient.ref_id,
            name: patient.name,
            age: patient.age,
            gender: patient.gender,
            contact: patient.contact,
            email: patient.email,
            allergies: patient.allergies || "",
            medications: patient.medications || "",
            skintype: patient.skintype || "Normal",
            concern: patient.concern || "",
            routine: patient.routine || "",
            observations: patient.observations || "",
            protocol: patient.protocol || "",
            status: patient.status || "Active",
            signed: patient.signed || false,
            signatureId: patient.signature_id || "",
            beforeDate: patient.before_date || "",
            afterDate: patient.after_date || "",
            beforeImg: patient.before_img || "",
            afterImg: patient.after_img || "",

            procedures: proceduresResult.rows.map(row => ({
                name: row.name || "",
                date: row.procedure_date
                    ? row.procedure_date.toISOString().split('T')[0]
                    : "",
                clinic: row.clinic || ""
            })),

            logs: logsResult.rows.map(row => ({
                date: row.log_date
                    ? row.log_date.toISOString().split('T')[0]
                    : "",
                therapy: row.therapy || "",
                reaction: row.reaction || "",
                notes: row.notes || ""
            })),

            skincare: skincareResult.rows.map(row => ({
                name: row.name || "",
                instructions: row.instructions || "",
                qty: row.qty ?? 1
            })),

            concernsChecklist: concerns
                ? {
                    hyperpigmentation: concerns.hyperpigmentation || false,
                    acne: concerns.acne || false,
                    elasticity: concerns.elasticity || false,
                    dehydration: concerns.dehydration || false
                }
                : {
                    hyperpigmentation: false,
                    acne: false,
                    elasticity: false,
                    dehydration: false
                },

            appointment: appointmentResult.rows[0]
                ? {
                    date: appointmentResult.rows[0].appointment_date || "",
                    time: appointmentResult.rows[0].appointment_time || "",
                    purpose: appointmentResult.rows[0].purpose || ""
                }
                : null,

            assignedDoctor: patient.assigned_doctor || ""
        };

        return res.json(patientRecord);

    } catch (error) {
        try {
            await client.query('ROLLBACK');
        } catch (rollbackError) {
            console.error(
                '❌ Rollback error:',
                rollbackError.message
            );
        }

        console.error('❌ Error updating patient:', error);

        if (error.code === '23505') {
            return res.status(409).json({
                error: "A patient with these details already exists."
            });
        }

        return res.status(500).json({
            error: "Unable to update patient."
        });

    } finally {
        client.release();
    }
});

// app.delete('/api/patients/:refId', (req, res) => {
//     let patientsList = readDataFile(PATIENTS_FILE, INITIAL_PATIENTS);
//     const rawRef = req.params.refId || '';
//     let refId = rawRef.trim().toLowerCase();
//     try { refId = decodeURIComponent(rawRef).trim().toLowerCase(); } catch (e) {}

//     const index = patientsList.findIndex(p => p.refId && p.refId.trim().toLowerCase() === refId);

//     let deletedPatient = null;
//     if (index !== -1) {
//         deletedPatient = patientsList.splice(index, 1)[0];
//     } else {
//         const altIndex = patientsList.findIndex(p => p.name && p.name.trim().toLowerCase() === refId);
//         if (altIndex !== -1) {
//             deletedPatient = patientsList.splice(altIndex, 1)[0];
//         }
//     }

//     if (deletedPatient) {
//         writeDataFile(PATIENTS_FILE, patientsList);
//         const usersList = readDataFile(USERS_FILE, INITIAL_USERS);
//         const userIndex = usersList.findIndex(u =>
//             (u.patientRef && u.patientRef.trim().toLowerCase() === refId) ||
//             (deletedPatient.email && u.email && u.email.toLowerCase() === deletedPatient.email.toLowerCase() && u.role === 'patient')
//         );
//         if (userIndex !== -1) {
//             usersList.splice(userIndex, 1);
//             writeDataFile(USERS_FILE, usersList);
//         }
//     }

//     res.json({ message: "Patient record deleted successfully.", refId: rawRef });
// });


app.delete('/api/patients/:refId', async (req, res) => {
    const rawRef = req.params.refId || '';
    let refId = rawRef.trim();

    try {
        refId = decodeURIComponent(rawRef).trim();
    } catch (e) {
        // Keep the original trimmed refId if decoding fails.
    }

    if (!refId) {
        return res.status(400).json({
            error: "Patient reference is required."
        });
    }

    const client = await pool.connect();

    try {
        await client.query('BEGIN');

        // Confirm the patient exists in PostgreSQL.
        const patientResult = await client.query(
            `
            SELECT ref_id, name, email
            FROM patients
            WHERE LOWER(ref_id) = LOWER($1)
            LIMIT 1
            `,
            [refId]
        );

        if (patientResult.rows.length === 0) {
            await client.query('ROLLBACK');

            return res.status(404).json({
                error: "Patient not found.",
                refId
            });
        }

        const patient = patientResult.rows[0];
        const patientRef = patient.ref_id;

        // Delete related records first.
        await client.query(
            `DELETE FROM patient_procedures WHERE patient_ref = $1`,
            [patientRef]
        );

        await client.query(
            `DELETE FROM patient_treatment_logs WHERE patient_ref = $1`,
            [patientRef]
        );

        await client.query(
            `DELETE FROM patient_skincare WHERE patient_ref = $1`,
            [patientRef]
        );

        await client.query(
            `DELETE FROM patient_concerns WHERE patient_ref = $1`,
            [patientRef]
        );

        await client.query(
            `DELETE FROM appointments WHERE patient_ref = $1`,
            [patientRef]
        );


        // Delete the patient login account.
await client.query(
    `
    DELETE FROM users
    WHERE LOWER(role) = 'patient'
      AND (
          LOWER(patient_ref) = LOWER($1)
          OR (
              $2::text IS NOT NULL
              AND LOWER(email) = LOWER($2::text)
          )
      )
    `,
    [patientRef, patient.email || null]
);

        // Finally delete the patient itself.
        await client.query(
            `DELETE FROM patients WHERE ref_id = $1`,
            [patientRef]
        );

        await client.query('COMMIT');

        console.log(
            `🗑️ Patient permanently deleted from PostgreSQL: ${patient.name} (${patientRef})`
        );

        return res.json({
            message: "Patient record deleted successfully.",
            refId: patientRef
        });

    } catch (error) {
        await client.query('ROLLBACK');

        console.error('❌ Failed to delete patient:', error);

        return res.status(500).json({
            error: "Unable to delete patient record."
        });

    } finally {
        client.release();
    }
});


// Patient self-service appointment booking (Patient Portal)
app.put('/api/patients/:refId/appointment', async (req, res) => {
    const { refId } = req.params;
    const { date, time, purpose } = req.body;

    if (!date || !time || !purpose) {
        return res.status(400).json({
            error: "Date, time and purpose are required."
        });
    }

    try {
        // Verify that the patient exists in PostgreSQL
        const patientResult = await pool.query(
            `
            SELECT
                ref_id,
                name,
                age,
                gender,
                contact,
                email,
                allergies,
                medications,
                skintype,
                concern,
                routine,
                observations,
                protocol,
                status,
                signed,
                signature_id,
                before_date,
                after_date,
                before_img,
                after_img,
                assigned_doctor
            FROM patients
            WHERE ref_id = $1
            LIMIT 1
            `,
            [refId]
        );

        if (patientResult.rows.length === 0) {
            return res.status(404).json({
                error: "Patient record not found."
            });
        }

        const patient = patientResult.rows[0];

        const existingAppointmentResult = await pool.query(
            `
            SELECT
                id,
                TO_CHAR(appointment_date, 'YYYY-MM-DD') AS appointment_date,
                appointment_time,
                purpose
            FROM appointments
            WHERE patient_ref = $1
            ORDER BY created_at DESC, id DESC
            LIMIT 1
            `,
            [refId]
        );

        let appointmentAction = 'New Appointment';

        if (existingAppointmentResult.rows.length > 0) {
            const previousAppointment =
                existingAppointmentResult.rows[0];

            appointmentAction = 'Appointment Rescheduled';

            await pool.query(
                `
                UPDATE appointments
                SET
                    appointment_date = $1,
                    appointment_time = $2,
                    purpose = $3
                WHERE id = $4
                `,
                [
                    date,
                    time,
                    purpose,
                    previousAppointment.id
                ]
            );

            console.log(
                `📅 [APPOINTMENT RESCHEDULED] ${patient.name} → ${date} ${time}`
            );

            await sendAppointmentEmail({
                to: process.env.SMTP_USER,
                subject: `Appointment Rescheduled - ${patient.name}`,
                patientName: patient.name,
                patientPhone: patient.contact,
                patientEmail: patient.email,
                date,
                time,
                purpose,
                message:
                    `Previous appointment: ${previousAppointment.appointment_date} at ${previousAppointment.appointment_time || 'Not specified'}`
                    + ` (${previousAppointment.purpose || 'Consultation'})`,
                action: appointmentAction
            });

        } else {
            await pool.query(
                `
                INSERT INTO appointments (
                    patient_ref,
                    appointment_date,
                    appointment_time,
                    purpose
                )
                VALUES ($1, $2, $3, $4)
                `,
                [refId, date, time, purpose]
            );

            console.log(
                `📅 [APPOINTMENT CREATED] ${patient.name} → ${date} ${time}`
            );

            await sendAppointmentEmail({
                to: process.env.SMTP_USER,
                subject: `New Appointment - ${patient.name}`,
                patientName: patient.name,
                patientPhone: patient.contact,
                patientEmail: patient.email,
                date,
                time,
                purpose,
                action: appointmentAction
            });
        }

        console.log(`\n================================================================================`);
        console.log(`📅 [APPOINTMENT BOOKED]`);
        console.log(`   Patient: ${patient.name}`);
        console.log(`   Ref ID: ${refId}`);
        console.log(`   Date: ${date}`);
        console.log(`   Time: ${time}`);
        console.log(`   Purpose: ${purpose}`);
        console.log(`================================================================================\n`);

        // Keep the existing notification behavior for now
        addNotification(
            `New appointment booked by ${patient.name} on ${date} at ${time} (${purpose})`,
            'appointment'
        );

        addNotification(
            `SMS alert sent to Clinic at +91 90256 76090`,
            'sms'
        );

        addNotification(
            `Email & Calendar update sent to lunaskinaesthetics24@gmail.com`,
            'email'
        );

        // Return the patient in the format expected by the frontend
        res.json({
            refId: patient.ref_id,
            name: patient.name,
            age: patient.age,
            gender: patient.gender,
            contact: patient.contact,
            email: patient.email,
            allergies: patient.allergies || "",
            medications: patient.medications || "",
            skintype: patient.skintype || "Normal",
            concern: patient.concern || "",
            routine: patient.routine || "",
            observations: patient.observations || "",
            protocol: patient.protocol || "",
            status: patient.status || "Active",
            signed: patient.signed || false,
            signatureId: patient.signature_id || "",
            beforeDate: patient.before_date || "",
            afterDate: patient.after_date || "",
            beforeImg: patient.before_img || "",
            afterImg: patient.after_img || "",
            procedures: [],
            logs: [],
            skincare: [],
            concernsChecklist: {
                hyperpigmentation: false,
                acne: false,
                elasticity: false,
                dehydration: false
            },
            appointment: {
                date,
                time,
                purpose
            },
            assignedDoctor: patient.assigned_doctor || ""
        });

    } catch (error) {
        console.error('❌ Appointment booking error:', error);

        return res.status(500).json({
            error: "Unable to book appointment."
        });
    }
});

// POST /api/appointments/request — Public landing page booking request
// app.post('/api/appointments/request', (req, res) => {
//     const { name, phone, email, service, date, message } = req.body;

//     if (!name || !phone) {
//         return res.status(400).json({ error: "Name and phone number are required." });
//     }

//     const bookingDate = date || new Date().toISOString().slice(0, 10);
//     const purpose = service || "Initial Consultation";

//     console.log(`\n================================================================================`);
//     console.log(`📅 [PUBLIC APPOINTMENT REQUEST RECEIVED]`);
//     console.log(`   Patient Name: ${name}`);
//     console.log(`   Phone: ${phone}`);
//     console.log(`   Email: ${email || 'N/A'}`);
//     console.log(`   Service Requested: ${purpose}`);
//     console.log(`   Preferred Date: ${bookingDate}`);
//     console.log(`   Message: ${message || 'None'}`);
//     console.log(`   Target Email: lunaskinaesthetics24@gmail.com`);
//     console.log(`   Target SMS: +91 90256 76090`);
//     console.log(`================================================================================\n`);

//     addNotification(`Public booking request from ${name} (${phone}) for ${purpose} on ${bookingDate}`, 'appointment');
//     addNotification(`Email notification dispatched to lunaskinaesthetics24@gmail.com`, 'email');

//     res.status(201).json({
//         success: true,
//         message: `Appointment request submitted! Clinic notified at lunaskinaesthetics24@gmail.com and 9025676090.`,
//         booking: { name, phone, email, service: purpose, date: bookingDate, message }
//     });
// });
// POST /api/appointments/request — Public landing page booking request
// POST /api/appointments/request — Public landing page booking request

app.post('/api/appointments/request', async (req, res) => {
    const {
        name,
        phone,
        email,
        service,
        date,
        message
    } = req.body;

    if (!name || !phone) {
        return res.status(400).json({
            error: "Name and phone number are required."
        });
    }

    const bookingDate =
        date || new Date().toISOString().slice(0, 10);

    const purpose =
        service || "Initial Consultation";

    try {
        // Save public booking to PostgreSQL.
        const appointmentResult = await pool.query(
            `
            INSERT INTO appointments (
                name,
                phone,
                email,
                service,
                appointment_date,
                appointment_time,
                purpose,
                message,
                status
            )
            VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
            RETURNING
                id,
                name,
                phone,
                email,
                service,
                appointment_date,
                appointment_time,
                purpose,
                message,
                status
            `,
            [
                name.trim(),
                phone.trim(),
                email ? email.trim() : null,
                service || null,
                bookingDate,
                null,
                purpose,
                message ? message.trim() : null,
                'Pending'
            ]
        );

        const appointment = appointmentResult.rows[0];

        console.log(
            `📅 [PUBLIC APPOINTMENT SAVED] ${name} → ${bookingDate}`
        );

        // Send appointment request email to the clinic/doctor.
        const emailResult = await sendAppointmentEmail({
            to: process.env.SMTP_USER,
            subject: `New Appointment Request - ${name}`,
            patientName: name,
            patientPhone: phone,
            patientEmail: email,
            date: bookingDate,
            time: 'To be confirmed',
            purpose,
            message,
            action: 'New Appointment Request'
        });

        // Keep the existing internal notification.
        addNotification(
            `New public booking from ${name} (${phone}) for ${purpose} on ${bookingDate}`,
            'appointment'
        );

        return res.status(201).json({
            success: true,
            message: "Appointment request submitted successfully.",
            emailSent: emailResult.sent,
            booking: {
                id: appointment.id,
                name: appointment.name,
                phone: appointment.phone,
                email: appointment.email,
                service: appointment.service,
                date: bookingDate,
                time: appointment.appointment_time || "To be confirmed",
                purpose: appointment.purpose,
                message: appointment.message,
                status: appointment.status
            }
        });

    } catch (error) {
        console.error(
            '❌ Failed to process public appointment request:',
            error
        );

        return res.status(500).json({
            error: "Unable to submit appointment request."
        });
    }
});
// Notifications routes
app.get('/api/notifications', (req, res) => {
    const notifs = readDataFile(NOTIFICATIONS_FILE, []);
    res.json(notifs);
});

app.post('/api/notifications/clear', (req, res) => {
    const notifs = readDataFile(NOTIFICATIONS_FILE, []);
    notifs.forEach(n => n.read = true);
    writeDataFile(NOTIFICATIONS_FILE, notifs);
    res.json({ success: true, count: notifs.length });
});

app.post('/api/patients/:refId/upload-image', (req, res) => {
    const refId = req.params.refId;
    const { imageType, base64Data, date } = req.body;

    if (!base64Data || !imageType) {
        return res.status(400).json({ error: "Missing image data or type." });
    }

    const patientsList = readDataFile(PATIENTS_FILE, INITIAL_PATIENTS);
    const index = patientsList.findIndex(p => p.refId === refId);
    if (index === -1) {
        return res.status(404).json({ error: "Patient record not found." });
    }

    try {
        const matches = base64Data.match(/^data:([A-Za-z-+\/]+);base64,(.+)$/);
        if (!matches || matches.length !== 3) {
            return res.status(400).json({ error: "Invalid base64 image format." });
        }

        const mimeType = matches[1];
        const buffer = Buffer.from(matches[2], 'base64');

        let extension = 'jpg';
        if (mimeType === 'image/png') extension = 'png';
        else if (mimeType === 'image/webp') extension = 'webp';

        const fileName = `${imageType}_${refId}_${Date.now()}.${extension}`;
        const filePath = path.join(UPLOADS_DIR, fileName);
        let savedPath = `uploads/${fileName}`;

        try {
            fs.writeFileSync(filePath, buffer);
        } catch (err) {
            savedPath = base64Data;
        }

        if (imageType === 'before') {
            patientsList[index].beforeImg = savedPath;
            if (date) patientsList[index].beforeDate = date;
        } else if (imageType === 'after') {
            patientsList[index].afterImg = savedPath;
            if (date) patientsList[index].afterDate = date;
        }

        writeDataFile(PATIENTS_FILE, patientsList);
        res.json(patientsList[index]);
    } catch (err) {
        console.error("Error saving uploaded image:", err);
        res.status(500).json({ error: "Failed to save image file on server." });
    }
});

// ─── SETTINGS ────────────────────────────────────────────────────────────────

app.get('/api/settings', (req, res) => {
    const settings = readDataFile(SETTINGS_FILE, INITIAL_SETTINGS);
    res.json(settings);
});

app.post('/api/settings', (req, res) => {
    const newSettings = req.body;
    writeDataFile(SETTINGS_FILE, newSettings);
    res.json(newSettings);
});

app.post('/api/reset', (req, res) => {
    writeDataFile(PATIENTS_FILE, INITIAL_PATIENTS);
    writeDataFile(SETTINGS_FILE, INITIAL_SETTINGS);
    writeDataFile(USERS_FILE, INITIAL_USERS);
    res.json({ message: "Database reset to defaults successfully." });
});

// ─── STATIC ASSETS ───────────────────────────────────────────────────────────

// Direct static string literal paths so @vercel/nft dependency tracer includes all static assets in serverless zip
function readTextAsset(filename) {
    try {
        if (filename === 'index.html') return fs.readFileSync(path.join(__dirname, 'index.html'), 'utf8');
        if (filename === 'style.css')  return fs.readFileSync(path.join(__dirname, 'style.css'), 'utf8');
        if (filename === 'app.js')     return fs.readFileSync(path.join(__dirname, 'app.js'), 'utf8');
        if (filename === 'logo.svg')   return fs.readFileSync(path.join(__dirname, 'logo.svg'), 'utf8');
    } catch (e) {}
    return null;
}

function readBinaryAsset(filename) {
    try {
        if (filename === 'logo.png')             return fs.readFileSync(path.join(__dirname, 'logo.png'));
        if (filename === 'logo_white.png')       return fs.readFileSync(path.join(__dirname, 'logo_white.png'));
        if (filename === 'practitioner.jpg')     return fs.readFileSync(path.join(__dirname, 'practitioner.jpg'));
        if (filename === 'before_treatment.jpg') return fs.readFileSync(path.join(__dirname, 'before_treatment.jpg'));
        if (filename === 'after_treatment.jpg')  return fs.readFileSync(path.join(__dirname, 'after_treatment.jpg'));
    } catch (e) {}
    return null;
}

const fileCache = {
    '/index.html':           { content: readTextAsset('index.html'),           mime: 'text/html; charset=utf-8' },
    '/style.css':            { content: readTextAsset('style.css'),            mime: 'text/css; charset=utf-8' },
    '/app.js':               { content: readTextAsset('app.js'),               mime: 'application/javascript; charset=utf-8' },
    '/logo.svg':             { content: readTextAsset('logo.svg'),             mime: 'image/svg+xml' },
    '/logo.png':             { content: readBinaryAsset('logo.png'),           mime: 'image/png' },
    '/logo_white.png':       { content: readBinaryAsset('logo_white.png'),     mime: 'image/png' },
    '/practitioner.jpg':     { content: readBinaryAsset('practitioner.jpg'),   mime: 'image/jpeg' },
    '/before_treatment.jpg': { content: readBinaryAsset('before_treatment.jpg'), mime: 'image/jpeg' },
    '/after_treatment.jpg':  { content: readBinaryAsset('after_treatment.jpg'),  mime: 'image/jpeg' }
};

app.use('/uploads', express.static(UPLOADS_DIR));
try {
    const localUploads = path.join(__dirname, 'uploads');
    if (localUploads !== UPLOADS_DIR) app.use('/uploads', express.static(localUploads));
} catch(e) {}

// Serve pre-cached static assets
Object.keys(fileCache).forEach(route => {
    const asset = fileCache[route];
    app.get(route, (req, res) => {
        if (asset.content) {
            res.setHeader('Content-Type', asset.mime);
            res.setHeader('Cache-Control', 'public, max-age=3600');
            return res.send(asset.content);
        }
        res.status(404).send(`File not found: ${route}`);
    });
});

app.use(express.static(__dirname));

// SPA catch-all: serve index.html for any unmatched non-API route
app.get('*', (req, res) => {
    if (req.path.startsWith('/api/')) {
        return res.status(404).json({ error: `API route ${req.path} not found.` });
    }

    res.setHeader('Content-Type', 'text/html; charset=utf-8');

    if (fileCache['/index.html'] && fileCache['/index.html'].content) {
        return res.send(fileCache['/index.html'].content);
    }

    const html = readTextAsset('index.html');
    if (html) {
        return res.send(html);
    }

    res.status(500).send(`Server Error: Cannot find index.html in serverless environment.`);
});

// Global Express Error Handler
app.use((err, req, res, next) => {
    console.error("[Luna Server Error]:", err);
    res.status(500).json({ error: "An unexpected internal server error occurred.", message: err.message });
});

if (require.main === module) {
    app.listen(PORT, () => {
        console.log(`\n🌙 Luna Skin Aesthetic — Cosmetic Portal`);
        console.log(`   Server running at: http://localhost:${PORT}\n`);
    });
}

module.exports = app;
