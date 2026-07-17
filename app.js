// ══════════════════════════════════════════════════════════════
// LUNA SKIN AESTHETIC — Full Cosmetic Portal Application Script
// ══════════════════════════════════════════════════════════════

// ─── Global State ─────────────────────────────────────────────
let patients = [];
let activePatient = null;
let currentYear = new Date().getFullYear();
let currentMonth = new Date().getMonth();
let allAppointments = []; // Doctor calendar: all patient appointments
let currentSession = null; // Auth session: { role, name, id, patientRef, patientRecord }

// ─── SPA ROUTER ───────────────────────────────────────────────
function showPage(pageId) {
    document.querySelectorAll('.page-section').forEach(p => p.style.display = 'none');
    const page = document.getElementById('page-' + pageId);
    if (page) {
        page.style.display = 'block';
        window.scrollTo(0, 0);
    }
}

// ─── AUTH MODULE ──────────────────────────────────────────────
let currentAuthRole = 'patient';

function setAuthRole(role) {
    currentAuthRole = role;
    document.getElementById('auth-role-patient').classList.toggle('active', role === 'patient');
    document.getElementById('auth-role-doctor').classList.toggle('active', role === 'doctor');

    const title = document.getElementById('auth-title');
    const subtitle = document.getElementById('auth-subtitle');
    const doctorHint = document.getElementById('doctor-demo-hint');
    const patientHint = document.getElementById('patient-demo-hint');
    const tabsWrap = document.getElementById('auth-tabs');

    if (role === 'doctor') {
        title.textContent = 'Doctor Sign In';
        subtitle.textContent = 'Access the cosmetic management portal';
        doctorHint.style.display = 'flex';
        if (patientHint) patientHint.style.display = 'none';
        tabsWrap.style.display = 'none'; // Doctors can't register here
        setAuthTab('login');
    } else {
        title.textContent = 'Welcome Back';
        subtitle.textContent = 'Sign in to access your patient portal';
        doctorHint.style.display = 'none';
        if (patientHint) patientHint.style.display = 'flex';
        tabsWrap.style.display = 'flex';
    }
}

function setAuthTab(tab) {
    const loginWrap = document.getElementById('auth-login-form-wrap');
    const registerWrap = document.getElementById('auth-register-form-wrap');
    const tabLogin = document.getElementById('tab-login');
    const tabReg = document.getElementById('tab-register');

    if (tab === 'login') {
        loginWrap.style.display = 'block';
        registerWrap.style.display = 'none';
        tabLogin.classList.add('active');
        tabReg.classList.remove('active');
    } else {
        loginWrap.style.display = 'none';
        registerWrap.style.display = 'block';
        tabReg.classList.add('active');
        tabLogin.classList.remove('active');
    }
}

async function handleLogin(e) {
    e.preventDefault();
    const email = document.getElementById('login-email').value.trim();
    const password = document.getElementById('login-password').value;
    const errEl = document.getElementById('login-error');
    const btn = document.getElementById('login-submit-btn');

    btn.textContent = 'Signing in...';
    btn.disabled = true;
    errEl.style.display = 'none';

    try {
        const res = await fetch('/api/auth/login', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ email, password })
        });

        const data = await res.json();

        if (!res.ok) {
            errEl.textContent = data.error || 'Login failed. Please try again.';
            errEl.style.display = 'block';
            return;
        }

        // Save session
        currentSession = data;
        localStorage.setItem('luna-session', JSON.stringify(data));

        showToast(`Welcome back, ${data.name}!`);

        if (data.role === 'doctor') {
            await initDoctorPortal(data);
            showPage('doctor');
        } else {
            initPatientPortal(data);
            showPage('patient');
        }

    } catch (err) {
        errEl.textContent = 'Unable to connect to the server. Please try again.';
        errEl.style.display = 'block';
    } finally {
        btn.textContent = 'Sign In';
        btn.disabled = false;
    }
}

async function handleRegister(e) {
    e.preventDefault();
    const name = document.getElementById('reg-name').value.trim();
    const email = document.getElementById('reg-email').value.trim();
    const password = document.getElementById('reg-password').value;
    const contact = document.getElementById('reg-contact').value.trim();
    const dob = document.getElementById('reg-dob').value;
    const gender = document.getElementById('reg-gender').value;
    const errEl = document.getElementById('register-error');

    errEl.style.display = 'none';

    try {
        const res = await fetch('/api/auth/register', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ name, email, password, contact, dob, gender })
        });

        const data = await res.json();

        if (!res.ok) {
            errEl.textContent = data.error || 'Registration failed. Please try again.';
            errEl.style.display = 'block';
            return;
        }

        currentSession = data;
        localStorage.setItem('luna-session', JSON.stringify(data));

        showToast(`Account created! Welcome, ${data.name}!`);
        initPatientPortal(data);
        showPage('patient');

    } catch (err) {
        errEl.textContent = 'Unable to connect. Please try again.';
        errEl.style.display = 'block';
    }
}

function handleLogout() {
    currentSession = null;
    localStorage.removeItem('luna-session');
    showToast('Signed out successfully.');
    showPage('landing');
}

// ─── PASSWORD VISIBILITY TOGGLE ───────────────────────────
function togglePasswordVisibility(inputId, btnId) {
    const input = document.getElementById(inputId);
    const btn = document.getElementById(btnId);
    if (!input || !btn) return;
    const isPassword = input.type === 'password';
    input.type = isPassword ? 'text' : 'password';
    const icon = btn.querySelector('.material-symbols-outlined');
    if (icon) icon.textContent = isPassword ? 'visibility_off' : 'visibility';
}

// ─── SESSION RESTORE ON PAGE LOAD ─────────────────────────────
async function restoreSession() {
    const saved = localStorage.getItem('luna-session');
    if (!saved) {
        showPage('landing');
        return;
    }

    try {
        currentSession = JSON.parse(saved);
        if (currentSession.role === 'doctor') {
            await initDoctorPortal(currentSession);
            showPage('doctor');
        } else {
            // Re-fetch patient record to get latest data
            const patients = await (await fetch('/api/patients')).json();
            const record = patients.find(p => p.refId === currentSession.patientRef);
            if (record) {
                currentSession.patientRecord = record;
            }
            initPatientPortal(currentSession);
            showPage('patient');
        }
    } catch (err) {
        console.error('Session restore failed:', err);
        showPage('landing');
    }
}

// ─── PATIENT PORTAL MODULE ────────────────────────────────────
let activePatientSection = 'overview';

function initPatientPortal(session) {
    let record = session.patientRecord;
    const name = session.name;

    // Update sidebar
    document.getElementById('patient-portal-name').textContent = name;
    document.getElementById('patient-portal-ref').textContent = record ? `Ref: ${record.refId}` : 'New Patient';

    // Update header date
    const now = new Date();
    const hour = now.getHours();
    const greeting = hour < 12 ? 'Good morning' : hour < 18 ? 'Good afternoon' : 'Good evening';
    document.getElementById('patient-section-date').textContent = now.toLocaleDateString('en-US', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' });

    // Fallback: If record is missing in session, query patients list by email and populate it
    if (!record && session.email) {
        fetch('/api/patients')
            .then(res => res.json())
            .then(patients => {
                const found = patients.find(p => p.email.toLowerCase() === session.email.toLowerCase());
                if (found) {
                    session.patientRecord = found;
                    session.patientRef = found.refId;
                    localStorage.setItem('luna-session', JSON.stringify(session));
                    
                    // Re-render components with latest record
                    document.getElementById('patient-portal-ref').textContent = `Ref: ${found.refId}`;
                    document.getElementById('pt-welcome-name').textContent = `${greeting}, ${name.split(' ')[0]}!`;
                    document.getElementById('pt-ref-display').textContent = found.refId;
                    
                    if (found.appointment && found.appointment.date) {
                        const apptDate = new Date(found.appointment.date);
                        document.getElementById('ov-next-appt').textContent = apptDate.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
                    } else {
                        document.getElementById('ov-next-appt').textContent = 'Not scheduled';
                    }
                    
                    document.getElementById('ov-concern').textContent = found.concern || '—';
                    document.getElementById('ov-skincare-count').textContent = `${(found.skincare || []).length} product(s)`;
                    document.getElementById('ov-status').textContent = found.status || 'Active';
                    
                    renderPatientTimeline(found);
                    renderPatientAppointment(found);
                    
                    document.getElementById('cs-concern').textContent = found.concern || '—';
                    document.getElementById('cs-skintype').textContent = found.skintype || '—';
                    document.getElementById('cs-allergies').textContent = found.allergies || 'None';
                    document.getElementById('cs-protocol').textContent = found.protocol || 'No treatment protocol assigned yet.';
                    document.getElementById('cs-routine').textContent = found.routine || 'No routine prescribed yet.';
                    
                    const pillsContainer = document.getElementById('cs-concerns-pills');
                    pillsContainer.innerHTML = '';
                    const concerns = found.concernsChecklist || {};
                    const concernLabels = { hyperpigmentation: 'Hyperpigmentation', acne: 'Acne', elasticity: 'Elasticity Loss', dehydration: 'Dehydration' };
                    let hasActive = false;
                    Object.entries(concerns).forEach(([key, val]) => {
                        if (val) {
                            hasActive = true;
                            const pill = document.createElement('span');
                            pill.className = 'concern-pill';
                            pill.innerHTML = `<span class="material-symbols-outlined" style="font-size:14px;">check</span>${concernLabels[key] || key}`;
                            pillsContainer.appendChild(pill);
                        }
                    });
                    if (!hasActive) {
                        pillsContainer.innerHTML = '<p class="font-body-md text-secondary" style="font-style:italic;">No specific concerns flagged.</p>';
                    }
                    
                    renderPatientSkincare(found);
                }
            })
            .catch(err => console.error('Error fetching patient fallback:', err));
    }

    if (record) {
        // Overview
        document.getElementById('pt-welcome-name').textContent = `${greeting}, ${name.split(' ')[0]}!`;
        document.getElementById('pt-ref-display').textContent = record.refId;

        if (record.appointment && record.appointment.date) {
            const apptDate = new Date(record.appointment.date);
            document.getElementById('ov-next-appt').textContent = apptDate.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
        } else {
            document.getElementById('ov-next-appt').textContent = 'Not scheduled';
        }

        document.getElementById('ov-concern').textContent = record.concern || '—';
        document.getElementById('ov-skincare-count').textContent = `${(record.skincare || []).length} product(s)`;
        document.getElementById('ov-status').textContent = record.status || 'Active';

        // Timeline
        renderPatientTimeline(record);

        // Appointment
        renderPatientAppointment(record);

        // Case Summary
        document.getElementById('cs-concern').textContent = record.concern || '—';
        document.getElementById('cs-skintype').textContent = record.skintype || '—';
        document.getElementById('cs-allergies').textContent = record.allergies || 'None';
        document.getElementById('cs-protocol').textContent = record.protocol || 'No treatment protocol assigned yet.';
        document.getElementById('cs-routine').textContent = record.routine || 'No routine prescribed yet.';

        // Concerns pills
        const pillsContainer = document.getElementById('cs-concerns-pills');
        pillsContainer.innerHTML = '';
        const concerns = record.concernsChecklist || {};
        const concernLabels = { hyperpigmentation: 'Hyperpigmentation', acne: 'Acne', elasticity: 'Elasticity Loss', dehydration: 'Dehydration' };
        let hasActive = false;
        Object.entries(concerns).forEach(([key, val]) => {
            if (val) {
                hasActive = true;
                const pill = document.createElement('span');
                pill.className = 'concern-pill';
                pill.innerHTML = `<span class="material-symbols-outlined" style="font-size:14px;">check</span>${concernLabels[key] || key}`;
                pillsContainer.appendChild(pill);
            }
        });
        if (!hasActive) {
            pillsContainer.innerHTML = '<p class="font-body-md text-secondary" style="font-style:italic;">No specific concerns flagged.</p>';
        }

        // Prescriptions
        renderPatientSkincare(record);

        // Gallery
        const beforeImg = document.getElementById('pt-before-img');
        const afterImg = document.getElementById('pt-after-img');
        const beforePh = document.getElementById('pt-before-placeholder');
        const afterPh = document.getElementById('pt-after-placeholder');

        if (record.beforeImg) {
            beforeImg.src = record.beforeImg;
            beforeImg.style.display = 'block';
            beforePh.style.display = 'none';
        }
        if (record.afterImg) {
            afterImg.src = record.afterImg;
            afterImg.style.display = 'block';
            afterPh.style.display = 'none';
        }
        document.getElementById('pt-before-date').textContent = record.beforeDate || '';
        document.getElementById('pt-after-date').textContent = record.afterDate || '';

    } else {
        document.getElementById('pt-welcome-name').textContent = `${greeting}, ${name.split(' ')[0]}!`;
        document.getElementById('pt-ref-display').textContent = 'New Registration';
        document.getElementById('ov-concern').textContent = 'Pending consultation';
        document.getElementById('ov-next-appt').textContent = 'Not scheduled';
    }

    switchPatientSection('overview');
}

function renderPatientTimeline(record) {
    const container = document.getElementById('pt-timeline');
    const logs = record.logs || [];
    if (logs.length === 0) {
        container.innerHTML = '<p class="text-secondary" style="text-align:center;font-style:italic;padding:24px 0;">No treatment logs recorded yet.</p>';
        return;
    }

    container.innerHTML = '';
    [...logs].reverse().forEach(log => {
        const date = new Date(log.date);
        const formatted = date.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
        const entry = document.createElement('div');
        entry.className = 'timeline-entry';
        entry.innerHTML = `
            <div class="timeline-dot"></div>
            <div class="timeline-content">
                <p class="timeline-date">${formatted}</p>
                <p class="timeline-treatment">${log.treatment}</p>
                <p class="timeline-notes">${log.notes || ''}</p>
            </div>
            <span class="status-badge" style="font-size:10px;align-self:flex-start;white-space:nowrap;">${log.reaction}</span>
        `;
        container.appendChild(entry);
    });
}

function renderPatientAppointment(record) {
    if (record.appointment && record.appointment.date) {
        const apptDate = new Date(record.appointment.date);
        document.getElementById('pt-appt-date-display').textContent = apptDate.toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric', year: 'numeric' });
        document.getElementById('pt-appt-time-display').textContent = record.appointment.time || '';

        const purposeEl = document.getElementById('pt-appt-purpose-display');
        purposeEl.textContent = record.appointment.purpose || '';
        purposeEl.style.display = record.appointment.purpose ? 'inline-block' : 'none';

        // Pre-fill booking form
        document.getElementById('pt-appt-date').value = record.appointment.date;
        const timeSelect = document.getElementById('pt-appt-time');
        for (let opt of timeSelect.options) {
            if (opt.value === record.appointment.time) opt.selected = true;
        }
        const purposeSelect = document.getElementById('pt-appt-purpose');
        for (let opt of purposeSelect.options) {
            if (opt.value === record.appointment.purpose) opt.selected = true;
        }
    } else {
        document.getElementById('pt-appt-date-display').textContent = 'Not scheduled';
        document.getElementById('pt-appt-time-display').textContent = 'Use the form below to request an appointment';
        document.getElementById('pt-appt-purpose-display').style.display = 'none';
    }
}

function renderPatientSkincare(record) {
    const container = document.getElementById('pt-skincare-list');
    const skincare = record.skincare || [];
    if (skincare.length === 0) {
        container.innerHTML = '<p class="text-secondary" style="text-align:center;font-style:italic;padding:24px 0;">No products prescribed yet.</p>';
        return;
    }
    container.innerHTML = '';
    container.className = 'pt-skincare-grid';
    skincare.forEach(product => {
        const card = document.createElement('div');
        card.className = 'skincare-product-card';
        card.innerHTML = `
            <p class="skincare-product-name">${product.name}</p>
            <p class="skincare-product-inst">${product.instructions}</p>
            <span class="skincare-product-qty">${product.qty} Unit(s)</span>
        `;
        container.appendChild(card);
    });
}

async function submitPatientAppointment(e) {
    e.preventDefault();
    let refId = currentSession?.patientRef;

    // Fallback: If refId is missing, query patients list by email and resolve it
    if (!refId && currentSession?.email) {
        try {
            const patientsList = await (await fetch('/api/patients')).json();
            const found = patientsList.find(p => p.email.toLowerCase() === currentSession.email.toLowerCase());
            if (found) {
                refId = found.refId;
                currentSession.patientRef = refId;
                currentSession.patientRecord = found;
                localStorage.setItem('luna-session', JSON.stringify(currentSession));
            }
        } catch (err) {
            console.error('Fallback resolution failed:', err);
        }
    }

    if (!refId) return showToast('No patient record found.', 'error');

    const date = document.getElementById('pt-appt-date').value;
    const time = document.getElementById('pt-appt-time').value;
    const purpose = document.getElementById('pt-appt-purpose').value;

    try {
        const res = await fetch(`/api/patients/${refId}/appointment`, {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ date, time, purpose })
        });

        if (!res.ok) throw new Error('Failed to book appointment');

        const updatedPatient = await res.json();
        if (currentSession) currentSession.patientRecord = updatedPatient;
        localStorage.setItem('luna-session', JSON.stringify(currentSession));

        renderPatientAppointment(updatedPatient);
        const apptDate = new Date(date);
        document.getElementById('ov-next-appt').textContent = apptDate.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });

        showToast('Appointment confirmed! We will send a reminder before your visit.');
        switchPatientSection('appointment');
    } catch (err) {
        showToast('Failed to book appointment. Please try again.', 'error');
    }
}

function switchPatientSection(section) {
    activePatientSection = section;
    document.querySelectorAll('.patient-section').forEach(s => s.classList.remove('active'));
    document.getElementById('ps-' + section)?.classList.add('active');

    document.querySelectorAll('[data-patient-section]').forEach(link => {
        link.classList.toggle('active', link.dataset.patientSection === section);
    });

    const titles = {
        'overview': 'Patient Overview',
        'appointment': 'My Appointment',
        'case-summary': 'Case Summary',
        'prescriptions': 'My Skincare',
        'gallery': 'Aesthetic Photos'
    };
    document.getElementById('patient-section-title').textContent = titles[section] || 'Patient Portal';
}

// ─── LANDING PAGE MODULE ──────────────────────────────────────
function submitLandingBooking(e) {
    e.preventDefault();
    const name = document.getElementById('bk-name').value;
    const phone = document.getElementById('bk-phone').value;
    showToast(`Thank you, ${name}! We'll contact you at ${phone} within 24 hours to confirm your appointment.`);
    document.getElementById('landing-booking-form').reset();
}

// Generate floating particles on hero section
function initHeroParticles() {
    const container = document.getElementById('hero-particles');
    if (!container) return;
    for (let i = 0; i < 30; i++) {
        const dot = document.createElement('div');
        dot.className = 'hero-particle';
        dot.style.left = Math.random() * 100 + '%';
        dot.style.top = Math.random() * 100 + '%';
        dot.style.setProperty('--dur', (5 + Math.random() * 8) + 's');
        dot.style.setProperty('--delay', (Math.random() * 5) + 's');
        dot.style.width = (1 + Math.random() * 3) + 'px';
        dot.style.height = dot.style.width;
        container.appendChild(dot);
    }
}

// ─── DOCTOR PORTAL MODULE ─────────────────────────────────────
async function initDoctorPortal(session) {
    // Update doctor name in sidebar
    if (session && session.name) {
        const nameEl = document.getElementById('doctor-sidebar-name');
        if (nameEl) nameEl.textContent = session.name;
    }

    await loadPatientsFromServer();
    await loadAllAppointments();
    await loadNotifications();
}

// Patient Database loading
async function loadPatientsFromServer() {
    try {
        const res = await fetch('/api/patients');
        patients = await res.json();

        const currentRef = activePatient ? activePatient.refId : null;
        if (currentRef) {
            activePatient = patients.find(p => p.refId === currentRef) || patients[0];
        } else {
            activePatient = patients[0];
        }

        if (activePatient) {
            loadPatientData(activePatient);
        }
    } catch (err) {
        console.error('Failed to load patients from server:', err);
        showToast('Error loading patients from database.', 'error');
    }
}

// Load ALL appointments for calendar
async function loadAllAppointments() {
    try {
        const res = await fetch('/api/appointments');
        allAppointments = await res.json();
        renderCalendar(); // Re-render calendar with appointment dots
    } catch (err) {
        console.error('Failed to load appointments:', err);
    }
}

async function savePatientToServer(patient) {
    if (!patient) return;
    try {
        const res = await fetch(`/api/patients/${patient.refId}`, {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(patient)
        });
        if (!res.ok) throw new Error('HTTP error ' + res.status);
        const updated = await res.json();
        const index = patients.findIndex(p => p.refId === patient.refId);
        if (index !== -1) patients[index] = updated;
        // Refresh appointment cache
        await loadAllAppointments();
    } catch (err) {
        console.error('Failed to save patient to server:', err);
        showToast('Failed to save updates to database.', 'error');
    }
}

// ─── TOAST NOTIFICATION SYSTEM ────────────────────────────────
function showToast(message, type = 'success') {
    let container = document.getElementById('toast-container');
    if (!container) {
        container = document.createElement('div');
        container.id = 'toast-container';
        container.style.cssText = 'position:fixed;bottom:32px;right:32px;z-index:9999;display:flex;flex-direction:column;gap:12px;';
        document.body.appendChild(container);
    }

    const toast = document.createElement('div');
    toast.className = `toast-message ${type === 'error' ? 'error-toast' : ''}`;
    const icon = type === 'error' ? 'error' : 'check_circle';
    toast.innerHTML = `
        <span class="material-symbols-outlined toast-icon">${icon}</span>
        <span>${message}</span>
    `;

    container.appendChild(toast);

    setTimeout(() => {
        toast.classList.add('toast-out');
        toast.addEventListener('animationend', () => toast.remove());
    }, 3500);
}

// ─── AUTOSAVE ─────────────────────────────────────────────────
let autosaveTimeout;
function triggerAutosave() {
    const indicator = document.getElementById('autosave-indicator');
    if (indicator) {
        indicator.textContent = 'Saving Draft...';
        indicator.style.color = 'var(--color-outline)';
    }

    clearTimeout(autosaveTimeout);
    autosaveTimeout = setTimeout(async () => {
        saveCurrentInputsToMemory();
        await savePatientToServer(activePatient);
        if (indicator) {
            indicator.textContent = 'Saved as Draft';
            indicator.style.color = 'var(--color-secondary)';
        }
    }, 1000);
}

// ─── LOAD PATIENT DATA INTO FORM ──────────────────────────────
function loadPatientData(patient) {
    activePatient = patient;

    document.getElementById('patient-banner-title').textContent = `Case Sheet: ${patient.name}`;
    document.getElementById('patient-banner-ref').textContent = `Ref ID: ${patient.refId}`;

    const bannerStatus = document.getElementById('patient-banner-status');
    bannerStatus.textContent = patient.status;
    bannerStatus.className = patient.status?.toLowerCase() === 'active' ? 'status-badge' : 'status-badge inactive';

    document.getElementById('patient-name').value = patient.name || '';
    document.getElementById('patient-age').value = patient.age || '';
    document.getElementById('patient-gender').value = patient.gender || '';
    document.getElementById('patient-contact').value = patient.contact || '';
    document.getElementById('patient-allergies').value = patient.allergies || '';
    document.getElementById('patient-medications').value = patient.medications || '';
    document.getElementById('patient-routine').value = patient.routine || '';
    document.getElementById('patient-skintype').value = patient.skintype || 'Normal';
    document.getElementById('patient-concern').value = patient.concern || '';

    document.getElementById('chk-hyperpigmentation').checked = patient.concernsChecklist?.hyperpigmentation || false;
    document.getElementById('chk-acne').checked = patient.concernsChecklist?.acne || false;
    document.getElementById('chk-elasticity').checked = patient.concernsChecklist?.elasticity || false;
    document.getElementById('chk-dehydration').checked = patient.concernsChecklist?.dehydration || false;

    document.getElementById('practitioner-notes').value = patient.observations || '';
    document.getElementById('protocol-summary-text').textContent = patient.protocol || 'No protocol set.';

    renderProceduresTable();
    renderProductsTable();
    renderLogsTable();

    // Appointment scheduler
    if (patient.appointment && patient.appointment.date) {
        const dateObj = new Date(patient.appointment.date);
        const options = { weekday: 'long', month: 'long', day: 'numeric' };
        document.getElementById('schedule-date-text').textContent = dateObj.toLocaleDateString('en-US', options);
        document.getElementById('schedule-time-text').textContent = `${patient.appointment.time} — ${patient.appointment.purpose}`;
        currentMonth = dateObj.getMonth();
        currentYear = dateObj.getFullYear();
    } else {
        document.getElementById('schedule-date-text').textContent = 'No appointment booked';
        document.getElementById('schedule-time-text').textContent = 'Select a date on the calendar to book';
    }

    renderCalendar();

    // Photography
    document.getElementById('patient-photo-before-date').textContent = patient.beforeDate || '';
    document.getElementById('patient-photo-after-date').textContent = patient.afterDate || '';

    const beforeImgs = document.querySelectorAll("img[alt='Before Treatment']");
    const afterImgs = document.querySelectorAll("img[alt='After Treatment (8 Weeks)'], img[alt='After Treatment']");
    if (patient.beforeImg) beforeImgs.forEach(img => img.src = patient.beforeImg);
    if (patient.afterImg) afterImgs.forEach(img => img.src = patient.afterImg);

    function parseToISODate(dateStr) {
        if (!dateStr || dateStr === 'N/A') return new Date().toISOString().slice(0, 10);
        const d = new Date(dateStr);
        return isNaN(d.getTime()) ? new Date().toISOString().slice(0, 10) : d.toISOString().slice(0, 10);
    }

    document.getElementById('upload-before-date').value = parseToISODate(patient.beforeDate);
    document.getElementById('upload-after-date').value = parseToISODate(patient.afterDate);

    updateSignatureUIState();
    lockInputsState(patient.signed);

    // Update day schedule for current patient's appointment
    if (patient.appointment && patient.appointment.date) {
        showDaySchedule(patient.appointment.date);
    }
}

function saveCurrentInputsToMemory() {
    if (!activePatient) return;
    activePatient.name = document.getElementById('patient-name').value;
    activePatient.age = document.getElementById('patient-age').value;
    activePatient.gender = document.getElementById('patient-gender').value;
    activePatient.contact = document.getElementById('patient-contact').value;
    activePatient.allergies = document.getElementById('patient-allergies').value;
    activePatient.medications = document.getElementById('patient-medications').value;
    activePatient.routine = document.getElementById('patient-routine').value;
    activePatient.skintype = document.getElementById('patient-skintype').value;
    activePatient.concern = document.getElementById('patient-concern').value;
    activePatient.observations = document.getElementById('practitioner-notes').value;

    if (!activePatient.concernsChecklist) activePatient.concernsChecklist = {};
    activePatient.concernsChecklist.hyperpigmentation = document.getElementById('chk-hyperpigmentation').checked;
    activePatient.concernsChecklist.acne = document.getElementById('chk-acne').checked;
    activePatient.concernsChecklist.elasticity = document.getElementById('chk-elasticity').checked;
    activePatient.concernsChecklist.dehydration = document.getElementById('chk-dehydration').checked;
}

function lockInputsState(isLocked) {
    const elementsToLock = [
        'patient-name', 'patient-age', 'patient-gender', 'patient-contact',
        'patient-allergies', 'patient-medications', 'patient-routine',
        'patient-skintype', 'patient-concern', 'practitioner-notes',
        'upload-before-date', 'upload-after-date'
    ];

    elementsToLock.forEach(id => {
        const el = document.getElementById(id);
        if (el) el.disabled = isLocked;
    });

    document.querySelectorAll('#concerns-checklist input[type="checkbox"]').forEach(chk => {
        chk.disabled = isLocked;
    });

    ['add-procedure-btn', 'add-product-btn', 'add-log-entry-btn', 'reschedule-btn', 'confirm-booking-btn'].forEach(id => {
        const el = document.getElementById(id);
        if (el) el.style.display = isLocked ? 'none' : 'inline-flex';
    });

    const beforeInput = document.getElementById('input-upload-before');
    const afterInput = document.getElementById('input-upload-after');
    if (beforeInput) beforeInput.disabled = isLocked;
    if (afterInput) afterInput.disabled = isLocked;

    document.querySelectorAll('.upload-zone').forEach(zone => {
        zone.classList.toggle('disabled', isLocked);
    });
}

function updateSignatureUIState() {
    if (!activePatient) return;
    const sigBlock = document.getElementById('signature-block');
    const sigStatus = document.getElementById('signature-status-text');
    const sigDesc = document.getElementById('signature-desc');
    const sigBtn = document.getElementById('verify-protocol-btn');
    const sigLine = document.getElementById('signature-stamp-line');
    const sigHash = document.getElementById('signature-hash-id');

    if (activePatient.signed) {
        sigBlock.classList.add('signed');
        sigBlock.style.backgroundColor = 'var(--color-primary)';
        sigBlock.style.color = 'var(--color-on-primary)';
        sigStatus.textContent = 'Protocol Verified';
        sigDesc.textContent = `This case sheet has been reviewed and digitally signed by the Lead Practitioner.`;
        sigBtn.style.display = 'none';
        sigLine.style.display = 'block';
        sigHash.textContent = activePatient.signatureId || '#LUNA-SIG';
    } else {
        sigBlock.classList.remove('signed');
        sigBlock.style.backgroundColor = 'var(--color-surface-container-low)';
        sigBlock.style.color = 'var(--color-on-surface)';
        sigStatus.textContent = 'Protocol Pending Signature';
        sigDesc.textContent = 'This case sheet draft is unverified. Review patient profiles, concerns, and protocols, then verify.';
        sigBtn.style.display = 'inline-flex';
        sigLine.style.display = 'none';
    }
}

// ─── TABLE RENDERERS ──────────────────────────────────────────
function renderProceduresTable() {
    const tbody = document.querySelector('#procedures-table tbody');
    if (!tbody) return;
    tbody.innerHTML = '';

    if (!activePatient?.procedures?.length) {
        tbody.innerHTML = '<tr><td colspan="3" class="text-secondary" style="text-align:center;font-style:italic;">No procedure history logged</td></tr>';
        return;
    }

    activePatient.procedures.forEach(proc => {
        const date = new Date(proc.date);
        const formatted = date.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
        const tr = document.createElement('tr');
        tr.innerHTML = `
            <td style="font-weight:600;color:var(--color-primary);">${proc.name}</td>
            <td class="text-secondary">${formatted}</td>
            <td class="text-secondary">${proc.clinic}</td>
        `;
        tbody.appendChild(tr);
    });
}

function renderLogsTable() {
    const tbody = document.querySelector('#treatment-log-table tbody');
    if (!tbody) return;
    tbody.innerHTML = '';

    if (!activePatient?.logs?.length) {
        tbody.innerHTML = '<tr><td colspan="4" class="text-secondary" style="text-align:center;font-style:italic;">No treatment entries logged</td></tr>';
        return;
    }

    activePatient.logs.forEach(log => {
        const date = new Date(log.date);
        const formatted = date.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
        const tr = document.createElement('tr');
        tr.innerHTML = `
            <td style="font-weight:600;white-space:nowrap;color:var(--color-primary);">${formatted}</td>
            <td>${log.treatment}</td>
            <td><span class="status-badge" style="font-size:10px;border-color:var(--color-outline);">${log.reaction}</span></td>
            <td class="text-secondary" style="font-size:14px;max-width:300px;">${log.notes}</td>
        `;
        tbody.appendChild(tr);
    });
}

function renderProductsTable() {
    const tbody = document.querySelector('#products-table tbody');
    if (!tbody) return;
    tbody.innerHTML = '';

    if (!activePatient?.skincare?.length) {
        tbody.innerHTML = '<tr><td colspan="3" class="text-secondary" style="text-align:center;font-style:italic;">No skincare products prescribed</td></tr>';
        return;
    }

    activePatient.skincare.forEach(product => {
        const tr = document.createElement('tr');
        tr.innerHTML = `
            <td style="font-weight:600;color:var(--color-primary);">${product.name}</td>
            <td class="text-secondary">${product.instructions}</td>
            <td style="text-align:right;font-weight:700;">${product.qty} Unit(s)</td>
        `;
        tbody.appendChild(tr);
    });
}

// ─── ENHANCED CALENDAR SYSTEM ─────────────────────────────────
const MONTH_NAMES = ['January', 'February', 'March', 'April', 'May', 'June',
                     'July', 'August', 'September', 'October', 'November', 'December'];

function renderCalendar() {
    const monthYear = document.getElementById('calendar-month-year');
    const grid = document.getElementById('calendar-grid');
    if (!monthYear || !grid) return;

    monthYear.textContent = `${MONTH_NAMES[currentMonth]} ${currentYear}`;
    grid.innerHTML = '';

    // Day Labels
    ['M', 'T', 'W', 'T', 'F', 'S', 'S'].forEach(day => {
        const div = document.createElement('div');
        div.className = 'calendar-day-label';
        div.textContent = day;
        grid.appendChild(div);
    });

    const firstDay = new Date(currentYear, currentMonth, 1);
    let startOffset = firstDay.getDay() - 1;
    if (startOffset < 0) startOffset = 6;

    const totalDays = new Date(currentYear, currentMonth + 1, 0).getDate();
    const today = new Date();

    for (let i = 0; i < startOffset; i++) {
        const div = document.createElement('div');
        div.className = 'calendar-day empty';
        grid.appendChild(div);
    }

    for (let dayNum = 1; dayNum <= totalDays; dayNum++) {
        const div = document.createElement('div');
        div.className = 'calendar-day';

        // Today highlight
        if (dayNum === today.getDate() && currentMonth === today.getMonth() && currentYear === today.getFullYear()) {
            div.classList.add('today');
        }

        // Active patient appointment highlight
        if (activePatient?.appointment) {
            const apptDate = new Date(activePatient.appointment.date);
            if (apptDate.getDate() === dayNum && apptDate.getMonth() === currentMonth && apptDate.getFullYear() === currentYear) {
                div.classList.add('active');
            }
        }

        // Find ALL appointments on this day
        const dateStr = `${currentYear}-${String(currentMonth + 1).padStart(2, '0')}-${String(dayNum).padStart(2, '0')}`;
        const dayAppts = allAppointments.filter(a => a.date === dateStr);

        // Render day number
        const dayNumSpan = document.createElement('span');
        dayNumSpan.textContent = dayNum;
        div.appendChild(dayNumSpan);

        // Render appointment dots
        if (dayAppts.length > 0) {
            const dotsContainer = document.createElement('div');
            dotsContainer.className = 'calendar-appt-dots';

            const showDots = Math.min(dayAppts.length, 3);
            for (let d = 0; d < showDots; d++) {
                const dot = document.createElement('div');
                dot.className = 'calendar-appt-dot';
                dotsContainer.appendChild(dot);
            }

            if (dayAppts.length > 3) {
                const moreDot = document.createElement('div');
                moreDot.className = 'calendar-appt-dot dot-more';
                moreDot.title = `+${dayAppts.length - 3} more`;
                dotsContainer.appendChild(moreDot);
            }

            div.appendChild(dotsContainer);
        }

        // Click to select day
        div.addEventListener('click', () => {
            document.querySelectorAll('.calendar-day.active').forEach(el => el.classList.remove('active'));
            div.classList.add('active');

            if (!activePatient?.signed) {
                if (!activePatient.appointment) {
                    activePatient.appointment = { date: dateStr, time: '10:30 AM', purpose: 'Consultation' };
                } else {
                    activePatient.appointment.date = dateStr;
                }

                const dateObj = new Date(dateStr);
                const options = { weekday: 'long', month: 'long', day: 'numeric' };
                document.getElementById('schedule-date-text').textContent = dateObj.toLocaleDateString('en-US', options);
                showToast(`Date set to ${dateObj.toLocaleDateString('en-US', { month: 'long', day: 'numeric' })}. Save case sheet to confirm.`);
            }

            // Always show day schedule panel
            showDaySchedule(dateStr);
        });

        grid.appendChild(div);
    }

    // Legend
    const legend = document.createElement('div');
    legend.className = 'calendar-legend';
    legend.style.gridColumn = '1 / -1';
    legend.innerHTML = `
        <div style="width:8px;height:8px;border-radius:50%;background:#9b7fe8;flex-shrink:0;"></div>
        <span>Appointment dot = patient scheduled on that day</span>
    `;
    grid.appendChild(legend);
}

// Show all patients scheduled on a given day
function showDaySchedule(dateStr) {
    const panel = document.getElementById('day-schedule-panel');
    const titleEl = document.getElementById('day-schedule-title');
    const countEl = document.getElementById('day-schedule-count');
    const listEl = document.getElementById('day-schedule-list');

    const dateObj = new Date(dateStr);
    const formatted = dateObj.toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric', year: 'numeric' });

    titleEl.textContent = `Schedule for ${formatted}`;

    const dayAppts = allAppointments.filter(a => a.date === dateStr);
    countEl.textContent = `${dayAppts.length} appointment${dayAppts.length !== 1 ? 's' : ''}`;

    if (dayAppts.length === 0) {
        listEl.innerHTML = '<p class="text-secondary" style="text-align:center;font-style:italic;padding:24px 0;">No appointments scheduled for this day.</p>';
        return;
    }

    // Sort by time
    const timeOrder = { 'AM': 0, 'PM': 12 };
    dayAppts.sort((a, b) => {
        const parseTime = t => {
            if (!t) return 0;
            const [timePart, period] = t.split(' ');
            const [h, m] = timePart.split(':').map(Number);
            return (period === 'PM' && h !== 12 ? h + 12 : h) * 60 + m;
        };
        return parseTime(a.time) - parseTime(b.time);
    });

    listEl.innerHTML = '';
    dayAppts.forEach(appt => {
        const entry = document.createElement('div');
        entry.className = 'day-schedule-entry';
        entry.innerHTML = `
            <div class="schedule-entry-left">
                <span class="schedule-entry-time">${appt.time || 'TBD'}</span>
                <div>
                    <p class="schedule-entry-name">${appt.patientName}</p>
                    <p class="schedule-entry-purpose">${appt.purpose}</p>
                </div>
            </div>
            <div style="display:flex;align-items:center;gap:12px;">
                <span class="status-badge ${appt.status?.toLowerCase() === 'inactive' ? 'inactive' : ''}">${appt.status || 'Active'}</span>
                <button class="btn-secondary font-label-sm" style="padding:6px 12px;font-size:10px;" data-ref="${appt.patientRef}">
                    Open Case Sheet
                </button>
            </div>
        `;

        // Click to open case sheet
        entry.querySelector('button').addEventListener('click', () => {
            const patient = patients.find(p => p.refId === appt.patientRef);
            if (patient) {
                loadPatientData(patient);
                switchToTab('caseSheets');
                showToast(`Loaded ${patient.name}'s Case Sheet`);
            }
        });

        listEl.appendChild(entry);
    });
}

// Calendar navigation
document.getElementById('cal-prev-btn')?.addEventListener('click', () => {
    currentMonth--;
    if (currentMonth < 0) { currentMonth = 11; currentYear--; }
    renderCalendar();
});

document.getElementById('cal-next-btn')?.addEventListener('click', () => {
    currentMonth++;
    if (currentMonth > 11) { currentMonth = 0; currentYear++; }
    renderCalendar();
});

// ─── IMAGE SPLIT DRAG SLIDER ──────────────────────────────────
const sliderContainer = document.getElementById('slider-container');
const sliderBeforeImg = document.getElementById('slider-before-img');
const sliderHandle = document.getElementById('slider-handle');

let isDragging = false;

function setSliderPosition(x) {
    if (!sliderContainer) return;
    const containerRect = sliderContainer.getBoundingClientRect();
    let position = ((x - containerRect.left) / containerRect.width) * 100;
    position = Math.max(0, Math.min(100, position));
    sliderBeforeImg.style.width = `${position}%`;
    sliderHandle.style.left = `${position}%`;
}

sliderHandle?.addEventListener('mousedown', e => { isDragging = true; e.preventDefault(); });
window.addEventListener('mouseup', () => { isDragging = false; });
window.addEventListener('mousemove', e => { if (isDragging) setSliderPosition(e.clientX); });
sliderHandle?.addEventListener('touchstart', () => { isDragging = true; });
window.addEventListener('touchend', () => { isDragging = false; });
window.addEventListener('touchmove', e => { if (isDragging) setSliderPosition(e.touches[0].clientX); });

// Photo view mode toggle
document.getElementById('photo-mode-split')?.addEventListener('click', () => {
    document.getElementById('photo-mode-split').classList.add('active');
    document.getElementById('photo-mode-side').classList.remove('active');
    document.getElementById('photo-view-split').classList.add('active');
    document.getElementById('photo-view-side').classList.remove('active');
});

document.getElementById('photo-mode-side')?.addEventListener('click', () => {
    document.getElementById('photo-mode-side').classList.add('active');
    document.getElementById('photo-mode-split').classList.remove('active');
    document.getElementById('photo-view-side').classList.add('active');
    document.getElementById('photo-view-split').classList.remove('active');
});

// ─── TAB NAVIGATION (Doctor Portal) ──────────────────────────
function switchToTab(tabName) {
    const tabs = {
        caseSheets: document.getElementById('tab-case-sheets'),
        patientList: document.getElementById('tab-patient-list')
    };
    const views = {
        caseSheet: document.getElementById('case-sheet-view'),
        patientList: document.getElementById('patient-list-view')
    };

    if (tabName === 'caseSheets') {
        tabs.caseSheets.classList.add('active');
        tabs.patientList.classList.remove('active');
        views.caseSheet.style.display = 'block';
        views.patientList.style.display = 'none';
        document.getElementById('sidebar-nav').style.display = 'flex';

        setTimeout(() => {
            if (sliderContainer) {
                const width = sliderContainer.getBoundingClientRect().width;
                const left = sliderContainer.getBoundingClientRect().left;
                setSliderPosition(width / 2 + left);
            }
        }, 50);
    } else {
        tabs.patientList.classList.add('active');
        tabs.caseSheets.classList.remove('active');
        views.caseSheet.style.display = 'none';
        views.patientList.style.display = 'block';
        document.getElementById('sidebar-nav').style.display = 'none';
        renderPatientDirectory();
    }
}

document.getElementById('tab-case-sheets')?.addEventListener('click', () => switchToTab('caseSheets'));
document.getElementById('tab-patient-list')?.addEventListener('click', () => switchToTab('patientList'));

// ─── PATIENT DIRECTORY ────────────────────────────────────────
function renderPatientDirectory(filteredSearch = '') {
    const tbody = document.querySelector('#patient-directory-table tbody');
    if (!tbody) return;
    tbody.innerHTML = '';

    const searchLow = filteredSearch.toLowerCase().trim();
    const filtered = patients.filter(p =>
        p.name.toLowerCase().includes(searchLow) ||
        p.refId.toLowerCase().includes(searchLow) ||
        p.concern.toLowerCase().includes(searchLow)
    );

    if (filtered.length === 0) {
        tbody.innerHTML = '<tr><td colspan="8" class="text-secondary" style="text-align:center;padding:32px;font-style:italic;">No patient records found</td></tr>';
        return;
    }

    filtered.forEach(p => {
        const apptStr = p.appointment?.date
            ? new Date(p.appointment.date).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })
            : '—';

        const tr = document.createElement('tr');
        tr.innerHTML = `
            <td style="font-weight:700;color:var(--color-primary);font-family:monospace;">${p.refId}</td>
            <td style="font-weight:600;">${p.name}</td>
            <td>${p.age || '—'}</td>
            <td>${p.gender || '—'}</td>
            <td>${p.concern || '—'}</td>
            <td style="white-space:nowrap;">${apptStr}</td>
            <td><span class="status-badge ${p.status?.toLowerCase() === 'inactive' ? 'inactive' : ''}">${p.status || 'Active'}</span></td>
            <td style="text-align:right;white-space:nowrap;">
                <button class="btn-secondary font-label-sm select-patient-btn" data-id="${p.refId}" style="padding:6px 12px;font-size:10px;">Open Case Sheet</button>
                <button class="btn-danger font-label-sm delete-patient-btn" data-id="${p.refId}" style="padding:6px 12px;font-size:10px;margin-left:8px;">Delete</button>
            </td>
        `;

        tr.querySelector('.select-patient-btn').addEventListener('click', () => {
            const pObj = patients.find(item => item.refId === p.refId);
            loadPatientData(pObj);
            switchToTab('caseSheets');
            showToast(`Loaded ${pObj.name}'s Case Sheet`);
        });

        tr.querySelector('.delete-patient-btn').addEventListener('click', async e => {
            e.stopPropagation();
            if (confirm(`Are you sure you want to permanently delete the patient record for ${p.name}?`)) {
                try {
                    const res = await fetch(`/api/patients/${p.refId}`, { method: 'DELETE' });
                    if (!res.ok) throw new Error('Failed to delete patient');
                    showToast(`Patient record for ${p.name} deleted successfully.`);
                    await loadPatientsFromServer();
                    renderPatientDirectory();
                } catch (err) {
                    showToast('Failed to delete patient.', 'error');
                }
            }
        });

        tbody.appendChild(tr);
    });
}

document.getElementById('patient-search-bar')?.addEventListener('input', e => {
    renderPatientDirectory(e.target.value);
});

// ─── DIGITAL SIGNATURE ────────────────────────────────────────
document.getElementById('verify-protocol-btn')?.addEventListener('click', () => {
    const dateTag = new Date().toISOString().slice(0, 10).replace(/-/g, '');
    const randCode = Math.floor(100 + Math.random() * 900);
    const generatedSigId = `#${randCode}-LUNA-SIG-${dateTag}`;

    const sigBlock = document.getElementById('signature-block');
    sigBlock.style.transform = 'scale(0.98)';

    setTimeout(async () => {
        activePatient.signed = true;
        activePatient.signatureId = generatedSigId;
        saveCurrentInputsToMemory();
        await savePatientToServer(activePatient);
        updateSignatureUIState();
        lockInputsState(true);
        renderCalendar();
        sigBlock.style.transform = 'scale(1)';
        showToast('Clinical Case Sheet locked and verified with Digital Stamp.', 'success');
    }, 300);
});

// ─── SIDEBAR SCROLLSPY ────────────────────────────────────────
const sections = document.querySelectorAll('.scroll-section');
const navLinks = document.querySelectorAll('.sidebar-link');

navLinks.forEach(link => {
    link.addEventListener('click', e => {
        e.preventDefault();
        const tabCaseSheets = document.getElementById('tab-case-sheets');
        if (!tabCaseSheets?.classList.contains('active')) {
            switchToTab('caseSheets');
        }

        const targetId = link.getAttribute('href')?.substring(1);
        const targetElement = document.getElementById(targetId);
        if (targetElement) {
            targetElement.scrollIntoView({ behavior: 'smooth', block: 'start' });
            navLinks.forEach(nav => nav.classList.remove('active'));
            link.classList.add('active');
        }
    });
});

window.addEventListener('scroll', () => {
    let current = '';
    sections.forEach(section => {
        if (pageYOffset >= section.offsetTop - 220) {
            current = section.getAttribute('id');
        }
    });
    if (current) {
        navLinks.forEach(link => {
            link.classList.remove('active');
            if (link.getAttribute('href')?.substring(1) === current) {
                link.classList.add('active');
            }
        });
    }
});

// ─── THEME TOGGLE ─────────────────────────────────────────────
// Always default to light theme on page load
let systemTheme = 'light';
localStorage.setItem('clinical-theme', 'light');
document.documentElement.setAttribute('data-theme', systemTheme);

function applyTheme(theme) {
    document.documentElement.setAttribute('data-theme', theme);
    localStorage.setItem('clinical-theme', theme);
    const icon = theme === 'dark' ? 'light_mode' : 'dark_mode';
    document.querySelectorAll('#theme-toggle, #theme-toggle-patient').forEach(el => {
        if (el) el.textContent = icon;
    });
}

applyTheme(systemTheme);

document.getElementById('theme-toggle')?.addEventListener('click', () => {
    const next = document.documentElement.getAttribute('data-theme') === 'light' ? 'dark' : 'light';
    applyTheme(next);
    showToast(`Switched to ${next === 'dark' ? 'Dark' : 'Light'} portal theme.`);
});

document.getElementById('theme-toggle-patient')?.addEventListener('click', () => {
    const next = document.documentElement.getAttribute('data-theme') === 'light' ? 'dark' : 'light';
    applyTheme(next);
});

// ─── MODAL SYSTEM ─────────────────────────────────────────────
function openModal(id) {
    const el = document.getElementById(id);
    if (!el) return;
    el.classList.add('active');
    document.body.style.overflow = 'hidden';
}

function closeModal(id) {
    const el = document.getElementById(id);
    if (!el) return;
    el.classList.remove('active');
    document.body.style.overflow = '';
}

document.querySelectorAll('.modal-overlay').forEach(overlay => {
    overlay.addEventListener('click', e => {
        if (e.target === overlay) closeModal(overlay.id);
    });
});

document.addEventListener('keydown', e => {
    if (e.key === 'Escape') {
        document.querySelectorAll('.modal-overlay.active').forEach(m => closeModal(m.id));
    }
});

document.querySelectorAll('.modal-close').forEach(btn => {
    btn.addEventListener('click', e => {
        const modal = e.target.closest('.modal-overlay');
        if (modal) closeModal(modal.id);
    });
});

['modal-cancel-btn', 'proc-cancel-btn', 'log-cancel-btn', 'presc-cancel-btn',
 'new-p-cancel-btn', 'setting-cancel-btn'].forEach(btnId => {
    const btn = document.getElementById(btnId);
    if (btn) {
        btn.addEventListener('click', () => {
            const modal = btn.closest('.modal-overlay');
            if (modal) closeModal(modal.id);
        });
    }
});

// ─── RESCHEDULE / BOOKING MODAL ───────────────────────────────
document.getElementById('reschedule-btn')?.addEventListener('click', () => {
    const modal = document.getElementById('reschedule-modal');
    const dateInput = document.getElementById('modal-date-input');
    const purposeInput = document.getElementById('modal-purpose-input');
    const timeSelect = document.getElementById('modal-time-select');

    if (activePatient?.appointment) {
        dateInput.value = activePatient.appointment.date || '';
        purposeInput.value = activePatient.appointment.purpose || '';
        for (let opt of timeSelect.options) {
            if (opt.value === activePatient.appointment.time) opt.selected = true;
        }
    }
    openModal('reschedule-modal');
});

document.getElementById('schedule-followup-header-btn')?.addEventListener('click', () => {
    openModal('reschedule-modal');
});

document.getElementById('confirm-booking-btn')?.addEventListener('click', async () => {
    if (!activePatient?.appointment) {
        showToast('Please select a date on the calendar first.', 'error');
        return;
    }
    saveCurrentInputsToMemory();
    await savePatientToServer(activePatient);
    showToast(`Appointment confirmed for ${activePatient.name}.`);
});

document.getElementById('modal-save-btn')?.addEventListener('click', async () => {
    const date = document.getElementById('modal-date-input').value;
    const time = document.getElementById('modal-time-select').value;
    const purpose = document.getElementById('modal-purpose-input').value;

    if (!date) { showToast('Please select a date.', 'error'); return; }

    if (!activePatient.appointment) {
        activePatient.appointment = { date, time, purpose };
    } else {
        activePatient.appointment.date = date;
        activePatient.appointment.time = time;
        activePatient.appointment.purpose = purpose;
    }

    currentMonth = new Date(date).getMonth();
    currentYear = new Date(date).getFullYear();

    const dateObj = new Date(date);
    document.getElementById('schedule-date-text').textContent = dateObj.toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric' });
    document.getElementById('schedule-time-text').textContent = `${time} — ${purpose}`;

    saveCurrentInputsToMemory();
    await savePatientToServer(activePatient);
    renderCalendar();
    showDaySchedule(date);
    closeModal('reschedule-modal');
    showToast(`Appointment scheduled for ${dateObj.toLocaleDateString('en-US', { month: 'long', day: 'numeric' })}.`);
});

// ─── ADD PROCEDURE MODAL ──────────────────────────────────────
document.getElementById('add-procedure-btn')?.addEventListener('click', () => {
    document.getElementById('proc-name-input').value = '';
    document.getElementById('proc-date-input').value = '';
    document.getElementById('proc-clinic-input').value = 'Luna Skin Aesthetic';
    openModal('procedure-modal');
});

document.getElementById('proc-save-btn')?.addEventListener('click', async () => {
    const name = document.getElementById('proc-name-input').value.trim();
    const date = document.getElementById('proc-date-input').value;
    const clinic = document.getElementById('proc-clinic-input').value.trim();

    if (!name || !date) { showToast('Procedure name and date are required.', 'error'); return; }

    activePatient.procedures.push({ name, date, clinic });
    await savePatientToServer(activePatient);
    renderProceduresTable();
    closeModal('procedure-modal');
    showToast(`Procedure "${name}" added to cosmetic history.`);
});

// ─── ADD LOG ENTRY MODAL ──────────────────────────────────────
document.getElementById('add-log-entry-btn')?.addEventListener('click', () => {
    document.getElementById('log-date-input').value = new Date().toISOString().slice(0, 10);
    document.getElementById('log-treatment-input').value = '';
    document.getElementById('log-reaction-input').value = '';
    document.getElementById('log-notes-input').value = '';
    openModal('log-modal');
});

document.getElementById('log-save-btn')?.addEventListener('click', async () => {
    const date = document.getElementById('log-date-input').value;
    const treatment = document.getElementById('log-treatment-input').value.trim();
    const reaction = document.getElementById('log-reaction-input').value.trim();
    const notes = document.getElementById('log-notes-input').value.trim();

    if (!date || !treatment || !reaction) { showToast('Date, treatment, and reaction fields are required.', 'error'); return; }

    activePatient.logs.push({ date, treatment, reaction, notes });
    await savePatientToServer(activePatient);
    renderLogsTable();
    closeModal('log-modal');
    showToast('Treatment log entry added successfully.');
});

// ─── PRESCRIBE SKINCARE MODAL ─────────────────────────────────
document.getElementById('add-product-btn')?.addEventListener('click', () => {
    document.getElementById('presc-name-input').value = '';
    document.getElementById('presc-inst-input').value = '';
    document.getElementById('presc-qty-input').value = '1';
    openModal('prescribe-modal');
});

document.getElementById('presc-save-btn')?.addEventListener('click', async () => {
    const name = document.getElementById('presc-name-input').value.trim();
    const instructions = document.getElementById('presc-inst-input').value.trim();
    const qty = parseInt(document.getElementById('presc-qty-input').value) || 1;

    if (!name) { showToast('Product name is required.', 'error'); return; }

    activePatient.skincare.push({ name, instructions, qty });
    await savePatientToServer(activePatient);
    renderProductsTable();
    closeModal('prescribe-modal');
    showToast(`${name} prescribed to patient.`);
});

// ─── EDIT PROTOCOL ────────────────────────────────────────────
document.getElementById('edit-protocol-btn')?.addEventListener('click', () => {
    const textarea = document.getElementById('protocol-edit-textarea');
    const editArea = document.getElementById('protocol-edit-area');
    const summaryText = document.getElementById('protocol-summary-text');
    const editBtn = document.getElementById('edit-protocol-btn');
    const saveBtn = document.getElementById('save-protocol-btn');

    textarea.value = activePatient.protocol || '';
    summaryText.style.display = 'none';
    editArea.style.display = 'block';
    editBtn.style.display = 'none';
    saveBtn.style.display = 'inline-flex';
});

document.getElementById('save-protocol-btn')?.addEventListener('click', async () => {
    const textarea = document.getElementById('protocol-edit-textarea');
    const editArea = document.getElementById('protocol-edit-area');
    const summaryText = document.getElementById('protocol-summary-text');
    const editBtn = document.getElementById('edit-protocol-btn');
    const saveBtn = document.getElementById('save-protocol-btn');

    activePatient.protocol = textarea.value;
    summaryText.textContent = activePatient.protocol;
    summaryText.style.display = 'block';
    editArea.style.display = 'none';
    editBtn.style.display = 'inline-flex';
    saveBtn.style.display = 'none';

    await savePatientToServer(activePatient);
    showToast('Treatment protocol updated successfully.');
});

// ─── SAVE CASE SHEET BUTTON ───────────────────────────────────
document.getElementById('save-case-sheet-btn')?.addEventListener('click', async () => {
    saveCurrentInputsToMemory();
    await savePatientToServer(activePatient);
    showToast(`Case sheet for ${activePatient.name} saved successfully.`);
});

// ─── CREATE NEW PATIENT MODAL ─────────────────────────────────
document.getElementById('btn-add-patient')?.addEventListener('click', () => {
    ['np-name', 'np-allergies'].forEach(id => document.getElementById(id).value = '');
    document.getElementById('np-age').value = '';
    document.getElementById('np-contact').value = '';
    openModal('new-patient-modal');
});

document.getElementById('new-p-save-btn')?.addEventListener('click', async () => {
    const name = document.getElementById('np-name').value.trim();
    const age = document.getElementById('np-age').value;
    const gender = document.getElementById('np-gender').value;
    const contact = document.getElementById('np-contact').value.trim();
    const skintype = document.getElementById('np-skintype').value;
    const concern = document.getElementById('np-concern').value.trim();
    const allergies = document.getElementById('np-allergies').value.trim();

    if (!name) { showToast('Patient name is required.', 'error'); return; }

    const year = new Date().getFullYear();
    const randCode = Math.floor(10000 + Math.random() * 90000);
    const refId = `LSA-${year}-${randCode}`;

    const newPatient = {
        refId, name, age: parseInt(age) || 0, gender, contact, allergies,
        medications: '', skintype, concern: concern || 'Initial Consultation',
        routine: '', observations: '', protocol: '', status: 'Active',
        signed: false, signatureId: '', beforeDate: '', afterDate: '',
        beforeImg: '', afterImg: '',
        procedures: [], logs: [], skincare: [],
        concernsChecklist: { hyperpigmentation: false, acne: false, elasticity: false, dehydration: false },
        appointment: null
    };

    try {
        const res = await fetch('/api/patients', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(newPatient)
        });
        if (!res.ok) throw new Error('Failed to create patient');
        const created = await res.json();
        await loadPatientsFromServer();
        loadPatientData(created);
        switchToTab('caseSheets');
        closeModal('new-patient-modal');
        showToast(`Patient record created for ${name}. Ref: ${refId}`);
    } catch (err) {
        showToast('Failed to create patient record.', 'error');
    }
});

// ─── SETTINGS MODAL ───────────────────────────────────────────
document.getElementById('settings-btn')?.addEventListener('click', async () => {
    try {
        const res = await fetch('/api/settings');
        const settings = await res.json();
        document.getElementById('setting-clinic-name').value = settings.clinicName || '';
        document.getElementById('setting-dermatologist').value = settings.dermatologist || '';
        document.getElementById('setting-license').value = settings.licenseId || '';
    } catch (e) {}
    openModal('settings-modal');
});

document.getElementById('setting-save-btn')?.addEventListener('click', async () => {
    const newSettings = {
        clinicName: document.getElementById('setting-clinic-name').value,
        dermatologist: document.getElementById('setting-dermatologist').value,
        licenseId: document.getElementById('setting-license').value
    };
    try {
        await fetch('/api/settings', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(newSettings)
        });
        closeModal('settings-modal');
        showToast('Portal settings saved successfully.');
    } catch (e) {
        showToast('Failed to save settings.', 'error');
    }
});

// ─── EXPORT PDF ───────────────────────────────────────────────
document.getElementById('export-pdf-btn')?.addEventListener('click', () => {
    window.print();
});

// ─── NOTIFICATIONS ────────────────────────────────────────────
async function loadNotifications() {
    try {
        const res = await fetch('/api/notifications');
        const notifs = await res.json();
        const unreadCount = notifs.filter(n => !n.read).length;
        const badge = document.getElementById('notif-badge');
        if (badge) {
            badge.textContent = unreadCount;
            badge.style.display = unreadCount > 0 ? 'flex' : 'none';
        }
    } catch (err) {
        console.error('Failed to load notifications:', err);
    }
}

async function openNotificationsModal() {
    try {
        const res = await fetch('/api/notifications');
        const notifs = await res.json();
        const container = document.getElementById('notifications-modal-body');
        if (!container) return;
        
        container.innerHTML = '';
        if (notifs.length === 0) {
            container.innerHTML = '<p class="text-secondary" style="text-align:center;font-style:italic;padding:20px 0;">No notifications found.</p>';
        } else {
            // Sort by timestamp descending
            const sorted = [...notifs].reverse();
            sorted.forEach(n => {
                const item = document.createElement('div');
                item.className = `notif-item ${n.read ? '' : 'unread'}`;
                item.style.cssText = `
                    display: flex;
                    align-items: flex-start;
                    gap: 12px;
                    padding: 12px;
                    border: 1px solid var(--color-outline-variant);
                    background-color: ${n.read ? 'transparent' : 'var(--color-surface-container-low)'};
                `;
                
                let icon = 'info';
                let iconColor = 'var(--color-primary)';
                if (n.type === 'sms') { icon = 'sms'; iconColor = '#ffb74d'; }
                else if (n.type === 'email') { icon = 'mail'; iconColor = '#4fc3f7'; }
                else if (n.type === 'appointment') { icon = 'calendar_month'; iconColor = 'var(--color-primary)'; }
                
                const timeStr = new Date(n.timestamp).toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' }) + ' ' + 
                                new Date(n.timestamp).toLocaleDateString('en-US', { month: 'short', day: 'numeric' });

                item.innerHTML = `
                    <span class="material-symbols-outlined" style="color:${iconColor};font-size:20px;margin-top:2px;">${icon}</span>
                    <div style="flex:1;">
                        <p class="font-body-md" style="font-weight:${n.read ? '400' : '600'};margin:0;font-size:13px;line-height:1.4;">${n.message}</p>
                        <span class="text-secondary" style="font-size:10px;display:block;margin-top:4px;">${timeStr}</span>
                    </div>
                `;
                container.appendChild(item);
            });
        }
        openModal('notifications-modal');
    } catch (err) {
        console.error('Failed to show notifications:', err);
    }
}

async function clearNotifications() {
    try {
        const res = await fetch('/api/notifications/clear', { method: 'POST' });
        if (res.ok) {
            showToast('All notifications marked as read.');
            await loadNotifications();
            // Re-render open modal content
            const container = document.getElementById('notifications-modal-body');
            if (container) {
                const items = container.querySelectorAll('.notif-item');
                items.forEach(item => {
                    item.style.backgroundColor = 'transparent';
                    const p = item.querySelector('p');
                    if (p) p.style.fontWeight = '400';
                });
            }
        }
    } catch (err) {
        showToast('Failed to clear notifications.', 'error');
    }
}

document.getElementById('notif-btn')?.addEventListener('click', () => {
    openNotificationsModal();
});

document.getElementById('close-notifications-btn')?.addEventListener('click', () => {
    closeModal('notifications-modal');
});

document.getElementById('notif-close-btn')?.addEventListener('click', () => {
    closeModal('notifications-modal');
});

document.getElementById('notif-clear-btn')?.addEventListener('click', () => {
    clearNotifications();
});

// ─── AUTOSAVE INPUT LISTENERS ─────────────────────────────────
['patient-name', 'patient-age', 'patient-gender', 'patient-contact',
 'patient-allergies', 'patient-medications', 'patient-routine',
 'patient-skintype', 'patient-concern', 'practitioner-notes'].forEach(id => {
    document.getElementById(id)?.addEventListener('input', triggerAutosave);
});

document.querySelectorAll('#concerns-checklist input[type="checkbox"]').forEach(chk => {
    chk.addEventListener('change', triggerAutosave);
});

// ─── IMAGE UPLOAD HANDLERS ────────────────────────────────────
function setupImageUpload(inputId, imageType) {
    const input = document.getElementById(inputId);
    if (!input) return;

    input.addEventListener('change', async e => {
        const file = e.target.files[0];
        if (!file) return;

        if (!activePatient) {
            showToast('No patient selected.', 'error');
            return;
        }

        const reader = new FileReader();
        reader.onload = async evt => {
            const base64Data = evt.target.result;
            const dateField = imageType === 'before' ? 'upload-before-date' : 'upload-after-date';
            const date = document.getElementById(dateField)?.value || '';

            try {
                const res = await fetch(`/api/patients/${activePatient.refId}/upload-image`, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ imageType, base64Data, date })
                });
                if (!res.ok) throw new Error('Upload failed');
                const updated = await res.json();
                Object.assign(activePatient, updated);
                loadPatientData(activePatient);
                showToast(`${imageType === 'before' ? 'Before' : 'After'} photo uploaded successfully.`);
            } catch (err) {
                showToast('Failed to upload image.', 'error');
            }
        };
        reader.readAsDataURL(file);
    });
}

setupImageUpload('input-upload-before', 'before');
setupImageUpload('input-upload-after', 'after');

// ─── LANDING PAGE SMOOTH SCROLL ───────────────────────────────
document.querySelectorAll('.landing-nav-links a[href^="#"]').forEach(link => {
    link.addEventListener('click', e => {
        e.preventDefault();
        const target = document.querySelector(link.getAttribute('href'));
        if (target) target.scrollIntoView({ behavior: 'smooth' });
    });
});

// ─── MOBILE RESPONSIVE SIDEBAR NAVIGATION ───────────────────
function setupMobileSidebar(menuBtnId, closeBtnId, sidebarId) {
    const menuBtn = document.getElementById(menuBtnId);
    const closeBtn = document.getElementById(closeBtnId);
    const sidebar = document.getElementById(sidebarId);
    const overlay = document.getElementById('mobile-sidebar-overlay');

    const openSidebar = () => {
        if (sidebar) sidebar.classList.add('mobile-active');
        if (overlay) overlay.classList.add('active');
    };

    const closeSidebar = () => {
        if (sidebar) sidebar.classList.remove('mobile-active');
        if (overlay) overlay.classList.remove('active');
    };

    menuBtn?.addEventListener('click', openSidebar);
    closeBtn?.addEventListener('click', closeSidebar);
    overlay?.addEventListener('click', closeSidebar);

    // Also close the sidebar when clicking any navigation links inside
    sidebar?.querySelectorAll('.sidebar-link').forEach(link => {
        link.addEventListener('click', closeSidebar);
    });
    sidebar?.querySelectorAll('.tab-nav span').forEach(btn => {
        btn.addEventListener('click', closeSidebar);
    });
}

// ─── INITIALIZE ───────────────────────────────────────────────
document.addEventListener('DOMContentLoaded', () => {
    initHeroParticles();
    restoreSession();
    
    // Set up both portal drawer navigations
    setupMobileSidebar('patient-mobile-menu-btn', 'patient-sidebar-close-btn', 'patient-sidebar');
    setupMobileSidebar('doctor-mobile-menu-btn', 'doctor-sidebar-close-btn', 'sidebar-nav');
});
