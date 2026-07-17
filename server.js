const express = require('express');
const cors = require('cors');
const fs = require('fs');
const path = require('path');

const app = express();
const PORT = process.env.PORT || 3000;

app.use(cors());
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ limit: '10mb', extended: true }));

// Paths to JSON storage
const DATA_DIR = path.join(__dirname, 'data');
const PATIENTS_FILE = path.join(DATA_DIR, 'patients.json');
const SETTINGS_FILE = path.join(DATA_DIR, 'settings.json');
const USERS_FILE = path.join(DATA_DIR, 'users.json');
const NOTIFICATIONS_FILE = path.join(DATA_DIR, 'notifications.json');
const UPLOADS_DIR = path.join(__dirname, 'uploads');

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
        protocol: "3-Month Corrective Plan:\nPhase 1 (Barrier Repair) 2-4 weeks.\nPhase 2 (Pigmentation Attack) with Q-Switched Laser & Advanced Cosmetic Chemical Exfoliation.\nPhase 3 (Maintenance) with SPF 50+ and Vitamin C infusion.",
        status: "Active",
        signed: true,
        signatureId: "#882-LUNA-SAFE-921",
        beforeDate: "May 02, 2024",
        afterDate: "June 27, 2024",
        beforeImg: "before_treatment.jpg",
        afterImg: "after_treatment.jpg",
        procedures: [
            { name: "Carbon Laser Peel", date: "2023-10-12", clinic: "Nova Aesthetic Center" },
            { name: "HydraFacial Deluxe", date: "2024-01-05", clinic: "Luna Skin Aesthetic" },
            { name: "Chemical Peel (TCA 15%)", date: "2024-03-14", clinic: "Luna Skin Aesthetic" }
        ],
        logs: [
            { date: "2024-05-02", treatment: "Laser Genesis (12J/cm2)", reaction: "Mild Erythema", notes: "Client felt minimal heat; no adverse response." },
            { date: "2024-05-16", treatment: "Barrier Rescue Facial", reaction: "Excellent", notes: "Skin hydration levels increased by 14% post-treat." }
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
            { date: "2024-04-18", treatment: "Blue LED (20 mins)", reaction: "Normal", notes: "Patient reported calming effect on redness." },
            { date: "2024-05-02", treatment: "Blue & Red LED + Soothing Mask", reaction: "Great", notes: "Inflammatory lesions decreased by 20%." }
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
            { date: "2024-03-15", treatment: "RF Face Lift (Temp 41C)", reaction: "Mild Erythema", notes: "Tightening effect observed immediately post-treatment." },
            { date: "2024-03-29", treatment: "RF Face Lift (Temp 42C)", reaction: "Normal", notes: "Nasolabial fold depth reduced slightly." }
        ],
        skincare: [
            { name: "Luminous Lift Peptide Cream", instructions: "Apply PM to face & neck", qty: 1 },
            { name: "Hyaluronic Boost Hydrator", instructions: "Apply AM & PM under moisturizer", qty: 2 }
        ],
        concernsChecklist: { hyperpigmentation: false, acne: false, elasticity: true, dehydration: false },
        appointment: { date: "2026-07-22", time: "11:45 AM", purpose: "Maintenance Consultation" }
    }
];

const INITIAL_SETTINGS = {
    clinicName: "Luna Skin Aesthetic",
    dermatologist: "Dr. Elena Vogt",
    licenseId: "#882-LUNA-SAFE-921"
};

const INITIAL_USERS = [
    {
        id: "doctor-001",
        name: "Dr. Elena Vogt",
        email: "dr.vogt@luna.com",
        password: "luna2024",
        role: "doctor",
        licenseId: "#882-LUNA-SAFE-921",
        specialization: "Lead Aesthetic Practitioner",
        avatar: "practitioner.jpg",
        phone: "+971 50 888 2921"
    }
];

// ─── Filesystem Setup ────────────────────────────────────────────────────────

if (!fs.existsSync(DATA_DIR)) fs.mkdirSync(DATA_DIR);
if (!fs.existsSync(UPLOADS_DIR)) fs.mkdirSync(UPLOADS_DIR);

function readDataFile(filepath, fallback) {
    if (!fs.existsSync(filepath)) {
        fs.writeFileSync(filepath, JSON.stringify(fallback, null, 2));
        return fallback;
    }
    try {
        return JSON.parse(fs.readFileSync(filepath, 'utf8'));
    } catch (err) {
        console.error(`Error reading ${filepath}:`, err);
        return fallback;
    }
}

function writeDataFile(filepath, data) {
    fs.writeFileSync(filepath, JSON.stringify(data, null, 2));
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
    const user = users.find(u => u.email.toLowerCase() === email.toLowerCase() && u.password === password && u.role === 'doctor');

    if (user) {
        return res.json({
            success: true,
            role: user.role,
            id: user.id,
            name: user.name,
            email: user.email,
            avatar: user.avatar || null,
            specialization: user.specialization || null,
            licenseId: user.licenseId || null
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
    let age = 0;
    if (dob) {
        const birthDate = new Date(dob);
        const today = new Date();
        age = today.getFullYear() - birthDate.getFullYear();
    }

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
        appointment: null
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

    if (!newPatient.refId) {
        const randCode = Math.floor(100 + Math.random() * 900);
        newPatient.refId = `LSA-${new Date().getFullYear()}-00${randCode}`;
    }

    newPatient.procedures = newPatient.procedures || [];
    newPatient.logs = newPatient.logs || [];
    newPatient.skincare = newPatient.skincare || [];
    newPatient.concernsChecklist = newPatient.concernsChecklist || {
        hyperpigmentation: false, acne: false, elasticity: false, dehydration: false
    };
    newPatient.status = newPatient.status || "Active";
    newPatient.signed = newPatient.signed || false;
    newPatient.signatureId = newPatient.signatureId || "";

    patientsList.push(newPatient);
    writeDataFile(PATIENTS_FILE, patientsList);
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
    const patientsList = readDataFile(PATIENTS_FILE, INITIAL_PATIENTS);
    const refId = req.params.refId;
    const index = patientsList.findIndex(p => p.refId === refId);

    if (index === -1) {
        return res.status(404).json({ error: "Patient record not found." });
    }

    patientsList.splice(index, 1);
    writeDataFile(PATIENTS_FILE, patientsList);
    res.json({ message: "Patient record deleted successfully.", refId });
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
    console.log(`   To: Dr. Elena Vogt (+971 50 888 2921)`);
    console.log(`   Message: "New appointment request by patient ${patientName} on ${date} at ${time} for ${purpose}."`);
    console.log(`================================================================================\n`);

    // Simulate Email notification
    console.log(`================================================================================`);
    console.log(`✉️ [EMAIL NOTIFICATION SENT]`);
    console.log(`   To: dr.vogt@luna.com`);
    console.log(`   Subject: New Appointment Booked - ${patientName}`);
    console.log(`   Body:`);
    console.log(`     Dear Dr. Elena Vogt,`);
    console.log(`     `);
    console.log(`     A new appointment has been scheduled in your calendar.`);
    console.log(`     - Patient: ${patientName}`);
    console.log(`     - Date: ${date}`);
    console.log(`     - Time: ${time}`);
    console.log(`     - Purpose: ${purpose}`);
    console.log(`     `);
    console.log(`     Please log in to the Doctor Portal to view the patient's full case sheet.`);
    console.log(`================================================================================\n`);

    addNotification(`New appointment booked by ${patientName} on ${date} at ${time} (${purpose})`, 'appointment');
    addNotification(`SMS alert sent to Dr. Elena Vogt at +971 50 888 2921`, 'sms');
    addNotification(`Email notification sent to dr.vogt@luna.com`, 'email');

    res.json(patientsList[index]);
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
        fs.writeFileSync(filePath, buffer);

        const relativeUrl = `uploads/${fileName}`;
        if (imageType === 'before') {
            patientsList[index].beforeImg = relativeUrl;
            if (date) patientsList[index].beforeDate = date;
        } else if (imageType === 'after') {
            patientsList[index].afterImg = relativeUrl;
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

app.use('/uploads', express.static(UPLOADS_DIR));
app.use(express.static(__dirname));

app.get('*', (req, res) => {
    res.sendFile(path.join(__dirname, 'index.html'));
});

app.listen(PORT, () => {
    console.log(`\n🌙 Luna Skin Aesthetic — Cosmetic Portal`);
    console.log(`   Server running at: http://localhost:${PORT}`);
    console.log(`   Doctor Login: dr.vogt@luna.com / luna2024\n`);
});
