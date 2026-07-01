const express = require('express');
const cors = require('cors');
const fs = require('fs');
const path = require('path');

const app = express();
const PORT = process.env.PORT || 3000;

app.use(cors());
app.use(express.json());

// Paths to JSON storage
const DATA_DIR = path.join(__dirname, 'data');
const PATIENTS_FILE = path.join(DATA_DIR, 'patients.json');
const SETTINGS_FILE = path.join(DATA_DIR, 'settings.json');

// Mock initial data
const INITIAL_PATIENTS = [
    {
        refId: "LSA-2024-00892",
        name: "Farook Al-Aziz",
        age: 34,
        gender: "Male",
        contact: "+971 50 123 4567",
        allergies: "None",
        medications: "None reported",
        skintype: "Combination",
        concern: "Post-Inflammatory Hyperpigmentation",
        routine: "Morning:\n1. Gentle Cleanser\n2. Hyaluronic Acid Serum\n3. Vitamin C (10%)\n4. Mineral Sunscreen SPF 50\n\nEvening:\n1. Oil Cleanser\n2. Hydrating Cleanser\n3. Niacinamide Serum (5%)\n4. Ceramide Cream",
        observations: "Client presents with localized PIH around the chin area. Skin barrier appears compromised in the perioral region. Recommended immediate cessation of physical exfoliants and initiation of ceramide-rich barrier repair. Subsequent sessions will focus on pigmentation correction once barrier is stabilized.",
        protocol: "3-Month Corrective Plan:\nPhase 1 (Barrier Repair) 2-4 weeks.\nPhase 2 (Pigmentation Attack) with Q-Switched Laser & Medical Grade Chemical Exfoliation.\nPhase 3 (Maintenance) with SPF 50+ and Vitamin C infusion.",
        status: "Active",
        signed: true,
        signatureId: "#882-LUNA-SAFE-921",
        beforeDate: "May 02, 2024",
        afterDate: "June 27, 2024",
        beforeImg: "before_treatment.jpg",
        afterImg: "after_treatment.jpg",
        procedures: [
            { name: "Carbon Laser Peel", date: "2023-10-12", clinic: "Nova Med Center" },
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
        concernsChecklist: {
            hyperpigmentation: true,
            acne: false,
            elasticity: false,
            dehydration: true
        },
        appointment: {
            date: "2024-06-12",
            time: "10:30 AM",
            purpose: "Chemical Peel Follow-up"
        }
    },
    {
        refId: "LSA-2024-00781",
        name: "Elena Rostova",
        age: 29,
        gender: "Female",
        contact: "+971 52 987 6543",
        allergies: "Salicylic Acid",
        medications: "Retinol 0.5% (stopped 1 week ago)",
        skintype: "Sensitive",
        concern: "Acne Grade 2-3 & Dehydration",
        routine: "Morning:\n1. Foaming Wash\n2. Clindamycin Gel\n3. Light Gel Moisturizer\n\nEvening:\n1. Micellar Water\n2. Foaming Wash\n3. Adapalene 0.1%\n4. Soothing Cream",
        observations: "Inflammatory papules and pustules on cheeks and jawline. Erythema present. Skin barrier shows moderate irritation from active topicals. Patient will focus strictly on soothing barrier repair for 14 days before initiating clinical treatments.",
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
        concernsChecklist: {
            hyperpigmentation: false,
            acne: true,
            elasticity: false,
            dehydration: true
        },
        appointment: {
            date: "2024-06-19",
            time: "03:00 PM",
            purpose: "LED Light Session"
        }
    },
    {
        refId: "LSA-2024-00910",
        name: "Marcus Vance",
        age: 45,
        gender: "Male",
        contact: "+1 415 555 0192",
        allergies: "Latex",
        medications: "None",
        skintype: "Dry",
        concern: "Loss of Elasticity & Fine Lines",
        routine: "Morning:\n1. Water rinse\n2. Heavy Cream Moisturizer\n\nEvening:\n1. Clay Cleanser\n2. Rich Anti-aging Balm",
        observations: "Loss of dermal density, specifically mid-face and nasolabial folds. Fine lines and mild photo-damage on forehead. Prescribed collagen-boosting clinic protocol with microcurrent and RF skin tightening.",
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
            { name: "Luminous Lift peptide Cream", instructions: "Apply PM to face & neck", qty: 1 },
            { name: "Hyaluronic Boost Hydrator", instructions: "Apply AM & PM under moisturizer", qty: 2 }
        ],
        concernsChecklist: {
            hyperpigmentation: false,
            acne: false,
            elasticity: true,
            dehydration: false
        },
        appointment: {
            date: "2024-06-26",
            time: "11:45 AM",
            purpose: "Maintenance Consultation"
        }
    }
];

const INITIAL_SETTINGS = {
    clinicName: "Luna Skin Aesthetic",
    dermatologist: "Dr. Elena Vogt",
    licenseId: "#882-LUNA-SAFE-921"
};

// Ensure data directory exists
if (!fs.existsSync(DATA_DIR)) {
    fs.mkdirSync(DATA_DIR);
}

// Initial storage helpers
function readDataFile(filepath, fallback) {
    if (!fs.existsSync(filepath)) {
        fs.writeFileSync(filepath, JSON.stringify(fallback, null, 2));
        return fallback;
    }
    try {
        const content = fs.readFileSync(filepath, 'utf8');
        return JSON.parse(content);
    } catch (err) {
        console.error(`Error reading ${filepath}:`, err);
        return fallback;
    }
}

function writeDataFile(filepath, data) {
    fs.writeFileSync(filepath, JSON.stringify(data, null, 2));
}

// REST API Routes
app.get('/api/patients', (req, res) => {
    const data = readDataFile(PATIENTS_FILE, INITIAL_PATIENTS);
    res.json(data);
});

app.post('/api/patients', (req, res) => {
    const patientsList = readDataFile(PATIENTS_FILE, INITIAL_PATIENTS);
    const newPatient = req.body;
    
    // Auto-generate refId if missing
    if (!newPatient.refId) {
        const randCode = Math.floor(100 + Math.random() * 900);
        newPatient.refId = `LSA-2024-00${randCode}`;
    }
    
    // Add default structures if missing
    newPatient.procedures = newPatient.procedures || [];
    newPatient.logs = newPatient.logs || [];
    newPatient.skincare = newPatient.skincare || [];
    newPatient.concernsChecklist = newPatient.concernsChecklist || {
        hyperpigmentation: false,
        acne: false,
        elasticity: false,
        dehydration: false
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
    
    // Update the patient object at the index
    patientsList[index] = { ...patientsList[index], ...req.body };
    writeDataFile(PATIENTS_FILE, patientsList);
    res.json(patientsList[index]);
});

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
    res.json({ message: "Database reset to defaults successfully." });
});

// Serve frontend static assets
app.use(express.static(__dirname));

// Catch-all route to serve index.html (fallback)
app.get('*', (req, res) => {
    res.sendFile(path.join(__dirname, 'index.html'));
});

app.listen(PORT, () => {
    console.log(`Luna Skin Aesthetic Backend Server running at http://localhost:${PORT}`);
});
