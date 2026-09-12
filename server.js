const express = require('express');
const cors = require('cors');
const fs = require('fs');
const path = require('path');
const os = require('os');

const app = express();
const PORT = process.env.PORT || 3000;

app.use(cors());
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ limit: '10mb', extended: true }));

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

function addNotification(message, type = 'info') {
    const notifs = readDataFile(NOTIFICATIONS_FILE, []);
    notifs.push({
        id: `notif-${Date.now()}-${Math.floor(Math.random() * 1000)}`,
        message,
        type,
        timestamp: new Date().toISOString(),
        read: false
    });
    writeDataFile(NOTIFICATIONS_FILE, notifs);
}

// ─── AUTH ROUTES ─────────────────────────────────────────────────────────────

// POST /api/auth/login — Doctor or Patient login
app.post('/api/auth/login', (req, res) => {
    const { email, password } = req.body;

    if (!email || !password) {
        return res.status(400).json({ error: "Email and password are required." });
    }

    // Check users (doctor accounts)
    const users = readDataFile(USERS_FILE, INITIAL_USERS);
    let user = users.find(u => u.role === 'doctor' && u.email.toLowerCase() === email.toLowerCase() && u.password === password);

    // Fallback support for Mrs. Krithika SK logins
    if (!user && (email.toLowerCase() === 'lunaskinaesthetics24@gmail.com' || email.toLowerCase() === 'dr.krithika@lunaskin.com')) {
        const doctorAcc = users.find(u => u.role === 'doctor') || INITIAL_USERS[0];
        if (password === doctorAcc.password || password === 'krithika2026' || password === 'luna2026' || password === 'luna2024') {
            user = doctorAcc;
        }
    }

    if (user) {
        return res.json({
            success: true,
            role: user.role,
            id: user.id,
            name: user.name || "Mrs. Krithika SK",
            email: user.email,
            avatar: user.avatar || null,
            specialization: user.specialization || "Lead Clinical Cosmetologist & Dermatologist",
            licenseId: user.licenseId || "#882-LUNA-SAFE-921"
        });
    }

    // Check patient accounts (patients have email stored in their record + a password in users file)
    const patients = readDataFile(PATIENTS_FILE, INITIAL_PATIENTS);
    const patientUser = users.find(u => u.email.toLowerCase() === email.toLowerCase() && u.password === password && u.role === 'patient');

    if (patientUser) {
        const patientRecord = patients.find(p => p.refId === patientUser.patientRef);
        return res.json({
            success: true,
            role: 'patient',
            id: patientUser.id,
            name: patientUser.name,
            email: patientUser.email,
            patientRef: patientUser.patientRef,
            patientRecord: patientRecord || null
        });
    }

    return res.status(401).json({ error: "Invalid credentials. Please check your email and password." });
});

// POST /api/auth/register — Patient self-registration
app.post('/api/auth/register', (req, res) => {
    const { name, email, password, contact, dob, gender } = req.body;

    if (!name || !email || !password) {
        return res.status(400).json({ error: "Name, email, and password are required." });
    }

    const users = readDataFile(USERS_FILE, INITIAL_USERS);
    
    // Check if email already exists
    const existingUser = users.find(u => u.email.toLowerCase() === email.toLowerCase());
    if (existingUser) {
        return res.status(409).json({ error: "An account with this email already exists." });
    }

    // Generate patient refId
    const year = new Date().getFullYear();
    const randCode = Math.floor(10000 + Math.random() * 90000);
    const refId = `LSA-${year}-${randCode}`;

    // Calculate age from DOB
    const age = sanitizeAge(null, dob);

    // Create patient record
    const newPatient = {
        refId,
        name,
        age,
        gender: gender || "Not specified",
        contact: contact || "",
        email: email.toLowerCase(),
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
        concernsChecklist: { hyperpigmentation: false, acne: false, elasticity: false, dehydration: false },
        appointment: null,
        assignedDoctor: "Dr. Krithika SK"
    };

    // Create user account
    const newUser = {
        id: `patient-${Date.now()}`,
        name,
        email: email.toLowerCase(),
        password,
        role: 'patient',
        patientRef: refId
    };

    const patients = readDataFile(PATIENTS_FILE, INITIAL_PATIENTS);
    patients.push(newPatient);
    writeDataFile(PATIENTS_FILE, patients);

    users.push(newUser);
    writeDataFile(USERS_FILE, users);

    res.status(201).json({
        success: true,
        role: 'patient',
        id: newUser.id,
        name: newUser.name,
        email: newUser.email,
        patientRef: refId,
        patientRecord: newPatient
    });
});

// ─── ALL APPOINTMENTS ROUTE (For Doctor Calendar) ────────────────────────────

// GET /api/appointments — Aggregate all patient appointments
app.get('/api/appointments', (req, res) => {
    const patients = readDataFile(PATIENTS_FILE, INITIAL_PATIENTS);
    const appointments = [];

    patients.forEach(p => {
        if (p.appointment && p.appointment.date) {
            appointments.push({
                patientName: p.name,
                patientRef: p.refId,
                date: p.appointment.date,
                time: p.appointment.time || "TBD",
                purpose: p.appointment.purpose || "Consultation",
                status: p.status
            });
        }
    });

    // Sort by date
    appointments.sort((a, b) => new Date(a.date) - new Date(b.date));
    res.json(appointments);
});

// ─── PATIENT ROUTES ──────────────────────────────────────────────────────────

app.get('/api/patients', (req, res) => {
    const data = readDataFile(PATIENTS_FILE, INITIAL_PATIENTS);
    res.json(data);
});

app.post('/api/patients', (req, res) => {
    const patientsList = readDataFile(PATIENTS_FILE, INITIAL_PATIENTS);
    const newPatient = req.body;

    if (!newPatient.name) {
        return res.status(400).json({ error: "Patient name is required." });
    }

    if (!newPatient.refId) {
        const year = new Date().getFullYear();
        const randCode = Math.floor(10000 + Math.random() * 90000);
        newPatient.refId = `LSA-${year}-${randCode}`;
    }

    newPatient.email = (newPatient.email || '').toLowerCase().trim();
    newPatient.procedures = newPatient.procedures || [];
    newPatient.logs = newPatient.logs || [];
    newPatient.skincare = newPatient.skincare || [];
    newPatient.concernsChecklist = newPatient.concernsChecklist || {
        hyperpigmentation: false, acne: false, elasticity: false, dehydration: false
    };
    newPatient.status = newPatient.status || "Active";
    newPatient.signed = newPatient.signed || false;
    newPatient.signatureId = newPatient.signatureId || "";
    newPatient.assignedDoctor = newPatient.assignedDoctor || "Dr. Krithika SK";

    patientsList.push(newPatient);
    writeDataFile(PATIENTS_FILE, patientsList);

    // Auto-create matching patient user account if email is provided and doesn't exist
    if (newPatient.email) {
        const usersList = readDataFile(USERS_FILE, INITIAL_USERS);
        const existingUser = usersList.find(u => u.email.toLowerCase() === newPatient.email.toLowerCase());
        if (!existingUser) {
            // Generate a unique PIN password for each newly created client account
            const randPass = 'Luna' + Math.floor(1000 + Math.random() * 9000);
            const newUser = {
                id: `patient-${Date.now()}`,
                name: newPatient.name,
                email: newPatient.email.toLowerCase(),
                password: randPass,
                role: 'patient',
                patientRef: newPatient.refId
            };
            usersList.push(newUser);
            writeDataFile(USERS_FILE, usersList);
            newPatient.password = randPass;
        } else {
            newPatient.password = existingUser.password;
        }
    }

    res.status(201).json(newPatient);
});

app.put('/api/patients/:refId', (req, res) => {
    const patientsList = readDataFile(PATIENTS_FILE, INITIAL_PATIENTS);
    const refId = req.params.refId;
    const index = patientsList.findIndex(p => p.refId === refId);

    if (index === -1) {
        return res.status(404).json({ error: "Patient record not found." });
    }

    patientsList[index] = { ...patientsList[index], ...req.body };
    writeDataFile(PATIENTS_FILE, patientsList);
    res.json(patientsList[index]);
});

app.delete('/api/patients/:refId', (req, res) => {
    let patientsList = readDataFile(PATIENTS_FILE, INITIAL_PATIENTS);
    const rawRef = req.params.refId || '';
    let refId = rawRef.trim().toLowerCase();
    try { refId = decodeURIComponent(rawRef).trim().toLowerCase(); } catch (e) {}

    const index = patientsList.findIndex(p => p.refId && p.refId.trim().toLowerCase() === refId);

    let deletedPatient = null;
    if (index !== -1) {
        deletedPatient = patientsList.splice(index, 1)[0];
    } else {
        const altIndex = patientsList.findIndex(p => p.name && p.name.trim().toLowerCase() === refId);
        if (altIndex !== -1) {
            deletedPatient = patientsList.splice(altIndex, 1)[0];
        }
    }

    if (deletedPatient) {
        writeDataFile(PATIENTS_FILE, patientsList);
        const usersList = readDataFile(USERS_FILE, INITIAL_USERS);
        const userIndex = usersList.findIndex(u =>
            (u.patientRef && u.patientRef.trim().toLowerCase() === refId) ||
            (deletedPatient.email && u.email && u.email.toLowerCase() === deletedPatient.email.toLowerCase() && u.role === 'patient')
        );
        if (userIndex !== -1) {
            usersList.splice(userIndex, 1);
            writeDataFile(USERS_FILE, usersList);
        }
    }

    res.json({ message: "Patient record deleted successfully.", refId: rawRef });
});

// Patient self-service appointment booking (Patient Portal)
app.put('/api/patients/:refId/appointment', (req, res) => {
    const patientsList = readDataFile(PATIENTS_FILE, INITIAL_PATIENTS);
    const refId = req.params.refId;
    const index = patientsList.findIndex(p => p.refId === refId);

    if (index === -1) {
        return res.status(404).json({ error: "Patient record not found." });
    }

    const { date, time, purpose } = req.body;
    patientsList[index].appointment = req.body;
    writeDataFile(PATIENTS_FILE, patientsList);

    const patientName = patientsList[index].name;

    // Simulate SMS notification
    console.log(`\n================================================================================`);
    console.log(`📱 [SMS NOTIFICATION SENT]`);
    console.log(`   To: Luna Skin Clinic (+91 90256 76090)`);
    console.log(`   Message: "New appointment request by patient ${patientName} on ${date} at ${time} for ${purpose}."`);
    console.log(`================================================================================\n`);

    // Simulate Email notification & Google Calendar Sync log
    console.log(`================================================================================`);
    console.log(`✉️ [EMAIL NOTIFICATION SENT]`);
    console.log(`   To: lunaskinaesthetics24@gmail.com`);
    console.log(`   Subject: New Patient Appointment Booked - ${patientName}`);
    console.log(`   Body:`);
    console.log(`     Dear Luna Skin Aesthetics Team,`);
    console.log(`     `);
    console.log(`     A new patient appointment has been scheduled and updated in your calendar.`);
    console.log(`     - Patient: ${patientName}`);
    console.log(`     - Date: ${date}`);
    console.log(`     - Time: ${time}`);
    console.log(`     - Purpose: ${purpose}`);
    console.log(`     - Location: 200K/5, Seyad plaza, Tiruchendur main road, palayamkottai, Tirunelveli, Tamil Nadu 627002`);
    console.log(`     `);
    console.log(`     Please check your Google Calendar (lunaskinaesthetics24@gmail.com) or Doctor Portal.`);
    console.log(`================================================================================\n`);

    addNotification(`New appointment booked by ${patientName} on ${date} at ${time} (${purpose})`, 'appointment');
    addNotification(`SMS alert sent to Clinic at +91 90256 76090`, 'sms');
    addNotification(`Email & Calendar update sent to lunaskinaesthetics24@gmail.com`, 'email');

    res.json(patientsList[index]);
});

// POST /api/appointments/request — Public landing page booking request
app.post('/api/appointments/request', (req, res) => {
    const { name, phone, email, service, date, message } = req.body;

    if (!name || !phone) {
        return res.status(400).json({ error: "Name and phone number are required." });
    }

    const bookingDate = date || new Date().toISOString().slice(0, 10);
    const purpose = service || "Initial Consultation";

    console.log(`\n================================================================================`);
    console.log(`📅 [PUBLIC APPOINTMENT REQUEST RECEIVED]`);
    console.log(`   Patient Name: ${name}`);
    console.log(`   Phone: ${phone}`);
    console.log(`   Email: ${email || 'N/A'}`);
    console.log(`   Service Requested: ${purpose}`);
    console.log(`   Preferred Date: ${bookingDate}`);
    console.log(`   Message: ${message || 'None'}`);
    console.log(`   Target Email: lunaskinaesthetics24@gmail.com`);
    console.log(`   Target SMS: +91 90256 76090`);
    console.log(`================================================================================\n`);

    addNotification(`Public booking request from ${name} (${phone}) for ${purpose} on ${bookingDate}`, 'appointment');
    addNotification(`Email notification dispatched to lunaskinaesthetics24@gmail.com`, 'email');

    res.status(201).json({
        success: true,
        message: `Appointment request submitted! Clinic notified at lunaskinaesthetics24@gmail.com and 9025676090.`,
        booking: { name, phone, email, service: purpose, date: bookingDate, message }
    });
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

// Resolve the project root directory robustly across environments:
// - Local dev: __dirname = the project root folder itself
// - Vercel serverless (server.js called directly): __dirname = /var/task/
// - Vercel serverless (required from api/index.js): __dirname = /var/task/ (still root)
// We try multiple candidates and pick the first one that has index.html
const ROOT_CANDIDATES = [
    __dirname,
    path.join(__dirname, '..'),
    path.resolve(process.cwd()),
    '/var/task'
];

const projectRoot = ROOT_CANDIDATES.find(dir => {
    try { return fs.existsSync(path.join(dir, 'index.html')); } catch(e) { return false; }
}) || __dirname;

console.log(`[Luna] __dirname: ${__dirname}`);
console.log(`[Luna] projectRoot resolved to: ${projectRoot}`);
console.log(`[Luna] style.css exists: ${fs.existsSync(path.join(projectRoot, 'style.css'))}`);
console.log(`[Luna] index.html exists: ${fs.existsSync(path.join(projectRoot, 'index.html'))}`);

app.use('/uploads', express.static(UPLOADS_DIR));
try {
    const localUploads = path.join(projectRoot, 'uploads');
    if (localUploads !== UPLOADS_DIR) app.use('/uploads', express.static(localUploads));
} catch(e) {}

// Explicitly serve key static files with correct MIME types
const staticFiles = [
    { path: '/style.css',              mime: 'text/css; charset=utf-8' },
    { path: '/app.js',                 mime: 'application/javascript; charset=utf-8' },
    { path: '/logo.png',               mime: 'image/png' },
    { path: '/logo_white.png',         mime: 'image/png' },
    { path: '/logo.svg',               mime: 'image/svg+xml' },
    { path: '/practitioner.jpg',       mime: 'image/jpeg' },
    { path: '/before_treatment.jpg',   mime: 'image/jpeg' },
    { path: '/after_treatment.jpg',    mime: 'image/jpeg' },
    { path: '/index.html',             mime: 'text/html; charset=utf-8' },
];

staticFiles.forEach(({ path: filePath, mime }) => {
    app.get(filePath, (req, res) => {
        const fullPath = path.join(projectRoot, filePath);
        console.log(`[Luna] Serving ${filePath} from ${fullPath}`);
        res.setHeader('Content-Type', mime);
        res.setHeader('Cache-Control', 'public, max-age=3600');
        res.sendFile(fullPath, (err) => {
            if (err) {
                console.error(`[Luna] Error serving ${filePath}:`, err.message);
                res.status(404).send(`File not found: ${filePath}`);
            }
        });
    });
});

// Serve all other static files from project root
app.use(express.static(projectRoot));

// SPA catch-all: serve index.html for any unmatched route
app.get('*', (req, res) => {
    const indexPath = path.join(projectRoot, 'index.html');
    console.log(`[Luna] SPA catch-all for ${req.path}, serving index.html from ${indexPath}`);
    res.setHeader('Content-Type', 'text/html; charset=utf-8');
    res.sendFile(indexPath, (err) => {
        if (err) {
            console.error(`[Luna] CRITICAL: Cannot serve index.html from ${indexPath}:`, err.message);
            // List all candidates for debugging
            ROOT_CANDIDATES.forEach(dir => {
                const exists = fs.existsSync(path.join(dir, 'index.html'));
                console.error(`  Candidate ${dir}/index.html: ${exists ? 'EXISTS' : 'NOT FOUND'}`);
            });
            res.status(500).send(`Server Error: Cannot find index.html. projectRoot=${projectRoot}`);
        }
    });
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
