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

// ─── DATE PARSING HELPERS ──────────────────────────────────────
function parseApptDate(dateStr) {
    if (!dateStr || typeof dateStr !== 'string') return null;
    const trimmed = dateStr.trim();
    if (!trimmed || trimmed === 'N/A' || trimmed === '—') return null;

    const isoMatch = trimmed.match(/^(\d{4})-(\d{2})-(\d{2})$/);
    if (isoMatch) {
        const year = parseInt(isoMatch[1], 10);
        const month = parseInt(isoMatch[2], 10) - 1;
        const day = parseInt(isoMatch[3], 10);
        return new Date(year, month, day);
    }

    const d = new Date(trimmed);
    return isNaN(d.getTime()) ? null : d;
}

function formatApptDate(dateStr, options = { month: 'short', day: 'numeric', year: 'numeric' }) {
    const d = parseApptDate(dateStr);
    if (!d) return '—';
    return d.toLocaleDateString('en-US', options);
}

// ─── CLINIC METADATA & CALENDAR UTILITIES ───────────────────────
const CLINIC_ADDRESS = "200K/5, Seyad plaza, Tiruchendur main road, palayamkottai, Tirunelveli, Tamil Nadu 627002";
const CLINIC_PHONE = "9025676090";
const CLINIC_EMAIL = "lunaskinaesthetics24@gmail.com";

function generateGoogleCalendarUrl({ title, description, location, date, time }) {
    let startDT, endDT;
    try {
        const d = date || new Date().toISOString().slice(0, 10);
        let hour = 10, min = 0;
        if (time) {
            const [tPart, period] = time.split(' ');
            if (tPart) {
                const parts = tPart.split(':');
                hour = parseInt(parts[0]) || 10;
                min = parseInt(parts[1]) || 0;
                if (period === 'PM' && hour < 12) hour += 12;
                if (period === 'AM' && hour === 12) hour = 0;
            }
        }
        const startDateObj = new Date(`${d}T${String(hour).padStart(2, '0')}:${String(min).padStart(2, '0')}:00`);
        const endDateObj = new Date(startDateObj.getTime() + 60 * 60 * 1000);
        
        startDT = startDateObj.toISOString().replace(/-|:|\.\d\d\d/g, '');
        endDT = endDateObj.toISOString().replace(/-|:|\.\d\d\d/g, '');
    } catch (e) {
        const now = new Date();
        startDT = now.toISOString().replace(/-|:|\.\d\d\d/g, '');
        endDT = new Date(now.getTime() + 3600000).toISOString().replace(/-|:|\.\d\d\d/g, '');
    }

    const eventTitle = title || "Luna Skin Aesthetic Appointment";
    const details = description || `Appointment booked with Luna Skin Aesthetics.\nClinic Email: ${CLINIC_EMAIL}\nClinic Phone: ${CLINIC_PHONE}\nLocation: ${CLINIC_ADDRESS}`;
    const loc = location || CLINIC_ADDRESS;

    return `https://calendar.google.com/calendar/render?action=TEMPLATE&text=${encodeURIComponent(eventTitle)}&dates=${startDT}/${endDT}&details=${encodeURIComponent(details)}&location=${encodeURIComponent(loc)}&add=${encodeURIComponent(CLINIC_EMAIL)}`;
}

function downloadICSFile({ title, description, location, date, time }) {
    let startDT, endDT;
    try {
        const d = date || new Date().toISOString().slice(0, 10);
        let hour = 10, min = 0;
        if (time) {
            const [tPart, period] = time.split(' ');
            if (tPart) {
                const parts = tPart.split(':');
                hour = parseInt(parts[0]) || 10;
                min = parseInt(parts[1]) || 0;
                if (period === 'PM' && hour < 12) hour += 12;
                if (period === 'AM' && hour === 12) hour = 0;
            }
        }
        const startDateObj = new Date(`${d}T${String(hour).padStart(2, '0')}:${String(min).padStart(2, '0')}:00`);
        const endDateObj = new Date(startDateObj.getTime() + 60 * 60 * 1000);
        
        startDT = startDateObj.toISOString().replace(/-|:|\.\d\d\d/g, '');
        endDT = endDateObj.toISOString().replace(/-|:|\.\d\d\d/g, '');
    } catch (e) {
        const now = new Date();
        startDT = now.toISOString().replace(/-|:|\.\d\d\d/g, '');
        endDT = new Date(now.getTime() + 3600000).toISOString().replace(/-|:|\.\d\d\d/g, '');
    }

    const eventTitle = title || "Luna Skin Aesthetic Appointment";
    const eventDetails = (description || `Appointment booked with Luna Skin Aesthetics. Phone: ${CLINIC_PHONE}`).replace(/\n/g, '\\n');
    const loc = location || CLINIC_ADDRESS;

    const icsData = [
        'BEGIN:VCALENDAR',
        'VERSION:2.0',
        'PRODID:-//Luna Skin Aesthetics//Appointment Scheduler//EN',
        'CALSCALE:GREGORIAN',
        'METHOD:REQUEST',
        'BEGIN:VEVENT',
        `SUMMARY:${eventTitle}`,
        `DESCRIPTION:${eventDetails}`,
        `LOCATION:${loc}`,
        `DTSTART:${startDT}`,
        `DTEND:${endDT}`,
        `ORGANIZER;CN=Luna Skin Aesthetics:mailto:${CLINIC_EMAIL}`,
        `ATTENDEE;CUTYPE=INDIVIDUAL;ROLE=REQ-PARTICIPANT;PARTSTAT=ACCEPTED;CN=Luna Clinic:mailto:${CLINIC_EMAIL}`,
        'STATUS:CONFIRMED',
        'END:VEVENT',
        'END:VCALENDAR'
    ].join('\r\n');

    const blob = new Blob([icsData], { type: 'text/calendar;charset=utf-8' });
    const link = document.createElement('a');
    link.href = window.URL.createObjectURL(blob);
    link.setAttribute('download', `appointment_${Date.now()}.ics`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
}

function openBookingSuccessModal({ title, patientName, date, time, purpose }) {
    const successText = document.getElementById('booking-success-text');
    if (successText) {
        successText.innerHTML = `Your appointment for <strong>${patientName || 'Patient'}</strong> on <strong>${date} ${time ? 'at ' + time : ''}</strong> (${purpose || 'Consultation'}) has been recorded. Email notification & calendar update dispatched to <strong>${CLINIC_EMAIL}</strong>.`;
    }

    const gcalBtn = document.getElementById('btn-add-gcal');
    if (gcalBtn) {
        gcalBtn.href = generateGoogleCalendarUrl({
            title: `Luna Skin Appointment - ${patientName || 'Client'} (${purpose || 'Consultation'})`,
            description: `Patient Appointment with Luna Skin Aesthetics.\nPatient Name: ${patientName || 'Client'}\nTherapy: ${purpose || 'Consultation'}\nDate: ${date}\nTime: ${time || 'TBD'}\nClinic Email: ${CLINIC_EMAIL}\nClinic Phone: ${CLINIC_PHONE}`,
            location: CLINIC_ADDRESS,
            date,
            time
        });
    }

    const icsBtn = document.getElementById('btn-download-ics');
    if (icsBtn) {
        icsBtn.onclick = () => {
            downloadICSFile({
                title: `Luna Skin Appointment - ${patientName || 'Client'} (${purpose || 'Consultation'})`,
                description: `Patient Appointment with Luna Skin Aesthetics.\nPatient Name: ${patientName || 'Client'}\nTherapy: ${purpose || 'Consultation'}\nDate: ${date}\nTime: ${time || 'TBD'}\nClinic Email: ${CLINIC_EMAIL}\nClinic Phone: ${CLINIC_PHONE}`,
                location: CLINIC_ADDRESS,
                date,
                time
            });
        };
    }

    openModal('booking-success-modal');
}

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
        title.textContent = 'Specialist Sign In';
        subtitle.textContent = 'Access the clinical cosmetology portal';
        if (doctorHint) doctorHint.style.display = 'flex';
        if (patientHint) patientHint.style.display = 'none';
        tabsWrap.style.display = 'none'; // Doctors can't register here
        setAuthTab('login');
    } else {
        title.textContent = 'Welcome Back';
        subtitle.textContent = 'Sign in to access your patient portal';
        if (doctorHint) doctorHint.style.display = 'none';
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

        if (data.patientRecord) {
            saveCustomPatientToLocalStorage(data.patientRecord);
        }

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
                    document.getElementById('cs-protocol').textContent = found.protocol || 'No therapy protocol assigned yet.';
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
        document.getElementById('cs-protocol').textContent = record.protocol || 'No therapy protocol assigned yet.';
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
        container.innerHTML = '<p class="text-secondary" style="text-align:center;font-style:italic;padding:24px 0;">No therapy logs recorded yet.</p>';
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
                <p class="timeline-therapy">${log.therapy || log.treatment || ''}</p>
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

        showToast('Appointment confirmed! Updated via email & Google Calendar.');
        switchPatientSection('appointment');

        // Show Google Calendar & ICS Modal
        openBookingSuccessModal({
            patientName: updatedPatient.name,
            date,
            time,
            purpose
        });
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
async function submitLandingBooking(e) {
    e.preventDefault();
    const name = document.getElementById('bk-name').value;
    const phone = document.getElementById('bk-phone').value;
    const email = document.getElementById('bk-email')?.value || '';
    const service = document.getElementById('bk-service')?.value || '';
    const date = document.getElementById('bk-date')?.value || '';
    const message = document.getElementById('bk-message')?.value || '';

    try {
        const res = await fetch('/api/appointments/request', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ name, phone, email, service, date, message })
        });
        if (!res.ok) throw new Error('Failed to post appointment request');

        showToast(`Thank you, ${name}! Your appointment request has been sent to ${CLINIC_EMAIL}.`);
        document.getElementById('landing-booking-form').reset();

        // Open modal with Google Calendar link
        openBookingSuccessModal({
            patientName: name,
            date: date || new Date().toISOString().slice(0, 10),
            time: '10:00 AM',
            purpose: service || 'Consultation'
        });
    } catch (err) {
        showToast(`Thank you, ${name}! We'll contact you at ${phone} to confirm your appointment.`);
        document.getElementById('landing-booking-form').reset();

        openBookingSuccessModal({
            patientName: name,
            date: date || new Date().toISOString().slice(0, 10),
            time: '10:00 AM',
            purpose: service || 'Consultation'
        });
    }
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

    // Default to Patient List view on entry unless a specific tab was previously selected
    const savedTab = localStorage.getItem('luna-active-tab') || 'patientList';
    switchToTab(savedTab);
}

function getCustomPatientsFromLocalStorage() {
    try {
        const saved = localStorage.getItem('luna-custom-patients');
        return saved ? JSON.parse(saved) : [];
    } catch (e) {
        return [];
    }
}

function saveCustomPatientToLocalStorage(patientRecord) {
    if (!patientRecord || !patientRecord.refId) return;
    try {
        const list = getCustomPatientsFromLocalStorage();
        const index = list.findIndex(p => p.refId === patientRecord.refId);
        if (index !== -1) list[index] = patientRecord;
        else list.push(patientRecord);
        localStorage.setItem('luna-custom-patients', JSON.stringify(list));
    } catch (e) {}
}

function removeCustomPatientFromLocalStorage(refId) {
    if (!refId) return;
    try {
        let list = getCustomPatientsFromLocalStorage();
        list = list.filter(p => p && p.refId !== refId);
        localStorage.setItem('luna-custom-patients', JSON.stringify(list));
    } catch (e) {}
}

function getDeletedPatientRefsFromLocalStorage() {
    try {
        const saved = localStorage.getItem('luna-deleted-patients');
        return saved ? JSON.parse(saved) : [];
    } catch (e) {
        return [];
    }
}

function markPatientAsDeletedInLocalStorage(refId) {
    if (!refId) return;
    try {
        const list = getDeletedPatientRefsFromLocalStorage();
        if (!list.includes(refId)) {
            list.push(refId);
            localStorage.setItem('luna-deleted-patients', JSON.stringify(list));
        }
    } catch (e) {}
}

// Patient Database loading
async function loadPatientsFromServer() {
    try {
        const res = await fetch('/api/patients');
        if (res.ok) {
            patients = await res.json();
        }
    } catch (err) {
        console.warn('Backend fetch failed, using local/cache state:', err);
    }

    if (!Array.isArray(patients)) patients = [];

    // Merge locally registered patients from localStorage (ensures serverless consistency)
    const customPatients = getCustomPatientsFromLocalStorage();
    customPatients.forEach(cp => {
        if (cp && cp.refId && !patients.some(p => p.refId === cp.refId)) {
            patients.push(cp);
        }
    });

    // Purge any patients marked deleted in localStorage
    const deletedRefs = getDeletedPatientRefsFromLocalStorage();
    if (deletedRefs.length > 0) {
        patients = patients.filter(p => p && p.refId && !deletedRefs.includes(p.refId));
    }

    const savedRef = localStorage.getItem('luna-active-patient-ref');
    const currentRef = activePatient ? activePatient.refId : (savedRef || null);
    if (currentRef) {
        activePatient = patients.find(p => p.refId === currentRef) || patients[0] || null;
    } else {
        activePatient = patients[0] || null;
    }

    if (activePatient) {
        loadPatientData(activePatient);
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
        indicator.style.display = 'inline-flex';
        indicator.textContent = 'Saving...';
        indicator.style.borderColor = 'var(--color-tertiary)';
    }

    clearTimeout(autosaveTimeout);
    autosaveTimeout = setTimeout(async () => {
        saveCurrentInputsToMemory();
        await savePatientToServer(activePatient);
        saveCustomPatientToLocalStorage(activePatient);
        if (indicator) {
            indicator.textContent = 'Draft Saved';
            indicator.style.borderColor = 'var(--color-outline)';
        }
    }, 800);
}

// ─── LOAD PATIENT DATA INTO FORM ──────────────────────────────
function loadPatientData(patient) {
    activePatient = patient;
    if (patient.refId) {
        localStorage.setItem('luna-active-patient-ref', patient.refId);
    }

    document.getElementById('patient-banner-title').textContent = `Case Sheet: ${patient.name}`;
    document.getElementById('patient-banner-ref').textContent = `Ref ID: ${patient.refId}`;

    const bannerStatus = document.getElementById('patient-banner-status');
    bannerStatus.textContent = patient.status;
    bannerStatus.className = patient.status?.toLowerCase() === 'active' ? 'status-badge' : 'status-badge inactive';

    if (document.getElementById('patient-refid')) document.getElementById('patient-refid').value = patient.refId || '';
    document.getElementById('patient-name').value = patient.name || '';
    if (document.getElementById('patient-email')) document.getElementById('patient-email').value = patient.email || '';
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
        const apptParsed = parseApptDate(patient.appointment.date);
        if (apptParsed) {
            document.getElementById('schedule-date-text').textContent = formatApptDate(patient.appointment.date, { weekday: 'long', month: 'long', day: 'numeric' });
            document.getElementById('schedule-time-text').textContent = `${patient.appointment.time || ''} — ${patient.appointment.purpose || ''}`;
            currentMonth = apptParsed.getMonth();
            currentYear = apptParsed.getFullYear();
        } else {
            document.getElementById('schedule-date-text').textContent = 'No appointment booked';
            document.getElementById('schedule-time-text').textContent = 'Select a date on the calendar to book';
        }
    } else {
        document.getElementById('schedule-date-text').textContent = 'No appointment booked';
        document.getElementById('schedule-time-text').textContent = 'Select a date on the calendar to book';
    }

    renderCalendar();

    // Photography
    document.getElementById('patient-photo-before-date').textContent = patient.beforeDate || '';
    document.getElementById('patient-photo-after-date').textContent = patient.afterDate || '';

    const beforeImgs = document.querySelectorAll("img[alt='Before Therapy']");
    const afterImgs = document.querySelectorAll("img[alt='After Therapy (8 Weeks)'], img[alt='After Therapy']");
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
    if (document.getElementById('patient-email')) activePatient.email = document.getElementById('patient-email').value.trim();
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
        'patient-name', 'patient-email', 'patient-age', 'patient-gender', 'patient-contact',
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
    const tbody = document.querySelector('#therapy-log-table tbody');
    if (!tbody) return;
    tbody.innerHTML = '';

    if (!activePatient?.logs?.length) {
        tbody.innerHTML = '<tr><td colspan="4" class="text-secondary" style="text-align:center;font-style:italic;">No therapy entries logged</td></tr>';
        return;
    }

    activePatient.logs.forEach(log => {
        const date = new Date(log.date);
        const formatted = date.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
        const tr = document.createElement('tr');
        tr.innerHTML = `
            <td style="font-weight:600;white-space:nowrap;color:var(--color-primary);">${formatted}</td>
            <td>${log.therapy || log.treatment || ''}</td>
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
        if (activePatient?.appointment?.date) {
            const apptDate = parseApptDate(activePatient.appointment.date);
            if (apptDate && apptDate.getDate() === dayNum && apptDate.getMonth() === currentMonth && apptDate.getFullYear() === currentYear) {
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

    const formatted = formatApptDate(dateStr, { weekday: 'long', month: 'long', day: 'numeric', year: 'numeric' });
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

sliderHandle?.addEventListener('touchstart', e => { 
    isDragging = true; 
    if (e.cancelable) e.preventDefault(); 
}, { passive: false });

window.addEventListener('touchend', () => { isDragging = false; });
window.addEventListener('touchcancel', () => { isDragging = false; });
window.addEventListener('touchmove', e => { 
    if (isDragging && e.touches && e.touches[0]) {
        if (e.cancelable) e.preventDefault();
        setSliderPosition(e.touches[0].clientX);
    }
}, { passive: false });

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
let currentSidebarFilter = 'all';

function updateSidebarMetrics() {
    const totalCount = patients.length;
    const pendingCount = patients.filter(p => !p.signed).length;

    // Today's appointments count
    const todayStr = new Date().toISOString().slice(0, 10);
    const todayAppts = patients.filter(p => {
        if (!p.appointment || !p.appointment.date) return false;
        const parsed = parseApptDate(p.appointment.date);
        return parsed && parsed.toISOString().slice(0, 10) === todayStr;
    }).length;

    const sbCountEl = document.getElementById('sb-patient-count');
    const sbTotalEl = document.getElementById('sb-metric-total');
    const sbApptsEl = document.getElementById('sb-metric-appts');
    const sbPendingEl = document.getElementById('sb-metric-pending');

    if (sbCountEl) sbCountEl.textContent = totalCount;
    if (sbTotalEl) sbTotalEl.textContent = totalCount;
    if (sbApptsEl) sbApptsEl.textContent = todayAppts;
    if (sbPendingEl) sbPendingEl.textContent = pendingCount;
}

function filterDirectoryBySidebar(filter) {
    currentSidebarFilter = filter;
    ['all', 'active', 'inactive'].forEach(f => {
        const btn = document.getElementById(`sb-filter-${f}`);
        if (btn) btn.classList.toggle('active', f === filter);
    });

    const searchInput = document.getElementById('patient-search-bar');
    const searchTerm = searchInput ? searchInput.value : '';
    renderPatientDirectory(searchTerm);
}

function switchToTab(tabName) {
    localStorage.setItem('luna-active-tab', tabName);
    const tabs = {
        caseSheets: document.getElementById('tab-case-sheets'),
        patientList: document.getElementById('tab-patient-list')
    };
    const views = {
        caseSheet: document.getElementById('case-sheet-view'),
        patientList: document.getElementById('patient-list-view')
    };
    const sbDirectory = document.getElementById('sidebar-nav-directory');
    const sbCaseSheet = document.getElementById('sidebar-nav-casesheet');
    const sbCaseSections = document.getElementById('sidebar-casesheet-sections');
    const sbDirFilters = document.getElementById('sidebar-directory-filters');
    const sidebarNav = document.getElementById('sidebar-nav');

    // Ensure sidebar is always flex layout in desktop Doctor Portal view
    if (sidebarNav) sidebarNav.style.display = 'flex';

    if (tabName === 'caseSheets') {
        if (tabs.caseSheets) tabs.caseSheets.classList.add('active');
        if (tabs.patientList) tabs.patientList.classList.remove('active');
        if (views.caseSheet) views.caseSheet.style.display = 'block';
        if (views.patientList) views.patientList.style.display = 'none';

        if (sbCaseSheet) sbCaseSheet.classList.add('active');
        if (sbDirectory) sbDirectory.classList.remove('active');
        if (sbCaseSections) sbCaseSections.style.display = 'block';
        if (sbDirFilters) sbDirFilters.style.display = 'none';

        setTimeout(() => {
            if (sliderContainer) {
                const width = sliderContainer.getBoundingClientRect().width;
                const left = sliderContainer.getBoundingClientRect().left;
                setSliderPosition(width / 2 + left);
            }
        }, 50);
    } else {
        if (tabs.patientList) tabs.patientList.classList.add('active');
        if (tabs.caseSheets) tabs.caseSheets.classList.remove('active');
        if (views.caseSheet) views.caseSheet.style.display = 'none';
        if (views.patientList) views.patientList.style.display = 'block';

        if (sbDirectory) sbDirectory.classList.add('active');
        if (sbCaseSheet) sbCaseSheet.classList.remove('active');
        if (sbCaseSections) sbCaseSections.style.display = 'none';
        if (sbDirFilters) sbDirFilters.style.display = 'block';

        loadPatientsFromServer().then(() => {
            renderPatientDirectory();
            updateSidebarMetrics();
        });
    }
    updateSidebarMetrics();
}

document.getElementById('tab-case-sheets')?.addEventListener('click', () => switchToTab('caseSheets'));
document.getElementById('tab-patient-list')?.addEventListener('click', () => switchToTab('patientList'));

// ─── PATIENT DIRECTORY ────────────────────────────────────────
function renderPatientDirectory(filteredSearch = '') {
    const tbody = document.querySelector('#patient-directory-table tbody');
    if (!tbody) return;
    tbody.innerHTML = '';

    const searchLow = filteredSearch.toLowerCase().trim();
    const filtered = patients.filter(p => {
        const matchesSearch = p.name.toLowerCase().includes(searchLow) ||
            p.refId.toLowerCase().includes(searchLow) ||
            (p.email || '').toLowerCase().includes(searchLow) ||
            (p.concern || '').toLowerCase().includes(searchLow);
        
        let matchesStatus = true;
        if (currentSidebarFilter === 'active') {
            matchesStatus = (p.status || 'Active').toLowerCase() === 'active';
        } else if (currentSidebarFilter === 'inactive') {
            matchesStatus = (p.status || 'Active').toLowerCase() === 'inactive';
        }
        return matchesSearch && matchesStatus;
    });

    if (filtered.length === 0) {
        tbody.innerHTML = '<tr><td colspan="9" class="text-secondary" style="text-align:center;padding:32px;font-style:italic;">No patient records found</td></tr>';
        return;
    }

    filtered.forEach(p => {
        const apptStr = p.appointment?.date ? formatApptDate(p.appointment.date) : '—';

        const parsedAge = parseInt(p.age, 10);
        const ageDisplay = (!isNaN(parsedAge) && parsedAge >= 1 && parsedAge <= 115) ? parsedAge : '—';

        const tr = document.createElement('tr');
        tr.innerHTML = `
            <td style="font-weight:700;color:var(--color-primary);font-family:monospace;">${p.refId}</td>
            <td style="font-weight:600;">${p.name}</td>
            <td style="font-size:12px;color:var(--color-secondary);">${p.email || '—'}</td>
            <td>${ageDisplay}</td>
            <td>${p.gender || '—'}</td>
            <td>${p.concern || '—'}</td>
            <td style="white-space:nowrap;">${apptStr}</td>
            <td><span class="status-badge ${p.status?.toLowerCase() === 'inactive' ? 'inactive' : ''}">${p.status || 'Active'}</span></td>
            <td style="text-align:right;white-space:nowrap;">
                <button class="btn-secondary font-label-sm select-patient-btn" data-id="${p.refId}" style="padding:6px 12px;font-size:10px;">Open Case Sheet</button>
                <button class="btn-secondary font-label-sm cred-patient-btn" data-id="${p.refId}" style="padding:6px 12px;font-size:10px;margin-left:6px;" title="View & Copy Login Credentials">Credentials</button>
                <button class="btn-danger font-label-sm delete-patient-btn" data-id="${p.refId}" style="padding:6px 12px;font-size:10px;margin-left:6px;">Delete</button>
            </td>
        `;

        tr.querySelector('.select-patient-btn').addEventListener('click', () => {
            const pObj = patients.find(item => item.refId === p.refId);
            loadPatientData(pObj);
            switchToTab('caseSheets');
            showToast(`Loaded ${pObj.name}'s Case Sheet`);
        });

        tr.querySelector('.cred-patient-btn').addEventListener('click', e => {
            e.stopPropagation();
            const pObj = patients.find(item => item.refId === p.refId);
            openCredentialsModal(pObj || p);
        });

        tr.querySelector('.delete-patient-btn').addEventListener('click', async e => {
            e.stopPropagation();
            if (confirm(`Are you sure you want to permanently delete the patient record for ${p.name}?`)) {
                const targetRef = p.refId;

                // 1. Mark as deleted in localStorage immediately
                markPatientAsDeletedInLocalStorage(targetRef);
                removeCustomPatientFromLocalStorage(targetRef);

                // 2. Remove from local patients array
                patients = patients.filter(item => item.refId !== targetRef);

                // 3. Update active patient if deleted
                if (activePatient && activePatient.refId === targetRef) {
                    activePatient = patients[0] || null;
                    if (activePatient) {
                        localStorage.setItem('luna-active-patient-ref', activePatient.refId);
                        loadPatientData(activePatient);
                    } else {
                        localStorage.removeItem('luna-active-patient-ref');
                    }
                }

                // 4. Update UI directory table immediately
                renderPatientDirectory();
                showToast(`Patient record for ${p.name} deleted successfully.`);

                // 5. Send delete API request to backend asynchronously
                try {
                    await fetch(`/api/patients/${encodeURIComponent(targetRef)}`, { method: 'DELETE' });
                } catch (err) {
                    console.warn('Backend delete sync note:', err);
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
// Load saved theme or default to light
let systemTheme = localStorage.getItem('clinical-theme') || 'light';
document.documentElement.setAttribute('data-theme', systemTheme);

function applyTheme(theme) {
    document.documentElement.setAttribute('data-theme', theme);
    localStorage.setItem('clinical-theme', theme);
    const icon = theme === 'dark' ? 'light_mode' : 'dark_mode';
    document.querySelectorAll('#theme-toggle, #theme-toggle-patient, #theme-toggle-landing').forEach(el => {
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

document.getElementById('theme-toggle-landing')?.addEventListener('click', () => {
    const next = document.documentElement.getAttribute('data-theme') === 'light' ? 'dark' : 'light';
    applyTheme(next);
    showToast(`Switched page to ${next === 'dark' ? 'Dark' : 'Light'} mode.`);
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
        document.querySelectorAll('.portal-sidebar.mobile-active, .sidebar-nav.mobile-active').forEach(sb => sb.classList.remove('mobile-active'));
        document.getElementById('mobile-sidebar-overlay')?.classList.remove('active');
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
    saveCustomPatientToLocalStorage(activePatient);
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

    const parsed = parseApptDate(date);
    if (parsed) {
        currentMonth = parsed.getMonth();
        currentYear = parsed.getFullYear();
    }

    document.getElementById('schedule-date-text').textContent = formatApptDate(date, { weekday: 'long', month: 'long', day: 'numeric' });
    document.getElementById('schedule-time-text').textContent = `${time} — ${purpose}`;

    saveCurrentInputsToMemory();
    await savePatientToServer(activePatient);
    saveCustomPatientToLocalStorage(activePatient);
    renderCalendar();
    showDaySchedule(date);
    closeModal('reschedule-modal');
    showToast(`Appointment scheduled for ${formatApptDate(date, { month: 'long', day: 'numeric' })}.`);
});

// Helper for selecting 1 of 4 core service cards in modal
function selectModalServiceCard(cardEl, serviceName) {
    document.querySelectorAll('#modal-service-cards .service-option-card').forEach(c => c.classList.remove('selected'));
    cardEl.classList.add('selected');
    const input = document.getElementById('modal-purpose-input');
    if (input) input.value = serviceName;
}

// Configurable time slot generator based on duration selection
function updateModalTimeSlots() {
    const duration = parseInt(document.getElementById('modal-duration-select')?.value) || 60;
    const select = document.getElementById('modal-time-select');
    if (!select) return;

    select.innerHTML = '';
    const baseSlots = ['09:00 AM', '10:00 AM', '11:00 AM', '12:00 PM', '02:00 PM', '03:00 PM', '04:00 PM', '05:00 PM'];

    baseSlots.forEach((slotTime, idx) => {
        const opt = document.createElement('option');
        opt.value = slotTime;
        opt.textContent = `${slotTime} (${duration} mins slot)`;
        if (idx === 1) opt.selected = true;
        select.appendChild(opt);
    });
}

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
    document.getElementById('log-therapy-input').value = '';
    document.getElementById('log-reaction-input').value = '';
    document.getElementById('log-notes-input').value = '';
    openModal('log-modal');
});

document.getElementById('log-save-btn')?.addEventListener('click', async () => {
    const date = document.getElementById('log-date-input').value;
    const therapy = document.getElementById('log-therapy-input').value.trim();
    const reaction = document.getElementById('log-reaction-input').value.trim();
    const notes = document.getElementById('log-notes-input').value.trim();

    if (!date || !therapy || !reaction) { showToast('Date, therapy, and reaction fields are required.', 'error'); return; }

    activePatient.logs.push({ date, therapy, reaction, notes });
    await savePatientToServer(activePatient);
    renderLogsTable();
    closeModal('log-modal');
    showToast('Therapy log entry added successfully.');
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
    showToast('Therapy protocol updated successfully.');
});

// ─── SAVE CASE SHEET BUTTON ───────────────────────────────────
document.getElementById('save-case-sheet-btn')?.addEventListener('click', async () => {
    saveCurrentInputsToMemory();
    await savePatientToServer(activePatient);
    showToast(`Case sheet for ${activePatient.name} saved successfully.`);
});

// ─── CREATE NEW PATIENT MODAL ─────────────────────────────────
document.getElementById('btn-add-patient')?.addEventListener('click', () => {
    ['np-name', 'np-email', 'np-allergies', 'np-contact', 'np-age', 'np-concern'].forEach(id => {
        const el = document.getElementById(id);
        if (el) el.value = '';
    });
    openModal('new-patient-modal');
});

document.getElementById('new-p-save-btn')?.addEventListener('click', async () => {
    const name = document.getElementById('np-name').value.trim();
    const email = (document.getElementById('np-email')?.value || '').trim();
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
        refId, name, email: email.toLowerCase(), age: parseInt(age) || 0, gender, contact, allergies,
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
        saveCustomPatientToLocalStorage(created);
        await loadPatientsFromServer();
        loadPatientData(created);
        switchToTab('caseSheets');
        closeModal('new-patient-modal');
        showToast(`Patient record created for ${name}. Ref: ${created.refId}`);

        // Launch Credentials Modal immediately for staff to share login details
        setTimeout(() => {
            openCredentialsModal(created);
        }, 400);
    } catch (err) {
        showToast('Failed to create patient record.', 'error');
    }
});

// ─── CLIENT ACCOUNT CREDENTIALS WORKFLOW ──────────────────────
function openCredentialsModal(patient) {
    if (!patient) return;
    const name = patient.name || 'Client';
    const ref = patient.refId || '—';
    const email = patient.email || 'N/A (No email specified)';
    const password = patient.password || (email && email.includes('@') ? (email.split('@')[0] + '2026') : 'password123');

    document.getElementById('cred-display-name').textContent = name;
    document.getElementById('cred-display-ref').textContent = ref;
    document.getElementById('cred-display-email').textContent = email;
    document.getElementById('cred-display-password').textContent = password;
    
    const copySuccess = document.getElementById('cred-copy-success');
    if (copySuccess) copySuccess.style.display = 'none';

    const copyText = `LUNA SKIN AESTHETICS — Patient Portal Login Credentials\n\nClient Name: ${name}\nClient ID (Ref ID): ${ref}\nLogin Email (Mail ID): ${email}\nLogin Password: ${password}\nPortal Link: https://lunaskinaesthetics.com\n\nPlease sign in to access your clinical case summary and manage appointments.`;

    const copyBtn = document.getElementById('cred-copy-btn');
    if (copyBtn) {
        copyBtn.onclick = () => {
            navigator.clipboard.writeText(copyText).then(() => {
                if (copySuccess) copySuccess.style.display = 'block';
                showToast('Credentials copied to clipboard!');
            }).catch(() => {
                showToast('Credentials ready: ' + email + ' / ' + password);
            });
        };
    }

    const alertBtn = document.getElementById('cred-send-alert-btn');
    if (alertBtn) {
        alertBtn.onclick = () => {
            showToast(`Notification alert sent for ${name} (${email}).`);
            closeModal('credentials-modal');
        };
    }

    openModal('credentials-modal');
}

document.getElementById('share-credentials-btn')?.addEventListener('click', () => {
    if (activePatient) {
        openCredentialsModal(activePatient);
    } else {
        showToast('No active patient loaded.', 'error');
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
        if (document.getElementById('setting-address')) document.getElementById('setting-address').value = settings.address || CLINIC_ADDRESS;
        if (document.getElementById('setting-phone')) document.getElementById('setting-phone').value = settings.phone || CLINIC_PHONE;
        if (document.getElementById('setting-email')) document.getElementById('setting-email').value = settings.email || CLINIC_EMAIL;
    } catch (e) {}
    openModal('settings-modal');
});

document.getElementById('setting-save-btn')?.addEventListener('click', async () => {
    const newSettings = {
        clinicName: document.getElementById('setting-clinic-name').value,
        dermatologist: document.getElementById('setting-dermatologist').value,
        licenseId: document.getElementById('setting-license').value,
        address: document.getElementById('setting-address')?.value || CLINIC_ADDRESS,
        phone: document.getElementById('setting-phone')?.value || CLINIC_PHONE,
        email: document.getElementById('setting-email')?.value || CLINIC_EMAIL
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

let currentNotifFilter = 'all';
let cachedNotifications = [];

function filterNotifications(channel) {
    currentNotifFilter = channel;
    ['all', 'sms', 'email', 'appointment'].forEach(ch => {
        const btn = document.getElementById('notif-filter-' + ch);
        if (btn) btn.classList.toggle('active', ch === channel);
    });
    renderNotificationsList();
}

async function openNotificationsModal() {
    try {
        const res = await fetch('/api/notifications');
        cachedNotifications = await res.json();
        renderNotificationsList();
        openModal('notifications-modal');
    } catch (err) {
        console.error('Failed to show notifications:', err);
    }
}

function renderNotificationsList() {
    const container = document.getElementById('notifications-modal-body');
    if (!container) return;

    container.innerHTML = '';
    let notifs = cachedNotifications;

    if (currentNotifFilter !== 'all') {
        notifs = notifs.filter(n => n.type === currentNotifFilter);
    }

    if (notifs.length === 0) {
        container.innerHTML = `<p class="text-secondary" style="text-align:center;font-style:italic;padding:24px 0;">No ${currentNotifFilter !== 'all' ? currentNotifFilter.toUpperCase() : ''} notifications found.</p>`;
        return;
    }

    const sorted = [...notifs].reverse();
    sorted.forEach(n => {
        const item = document.createElement('div');
        item.className = `notif-item ${n.read ? '' : 'unread'}`;
        item.style.cssText = `
            display: flex;
            align-items: flex-start;
            gap: 12px;
            padding: 14px;
            border: 1px solid var(--color-outline-variant);
            border-radius: 8px;
            background-color: ${n.read ? 'transparent' : 'var(--color-surface-container-low)'};
        `;

        let icon = 'info';
        let iconColor = 'var(--color-primary)';
        if (n.type === 'sms') { icon = 'sms'; iconColor = '#ffb74d'; }
        else if (n.type === 'email') { icon = 'mail'; iconColor = '#4fc3f7'; }
        else if (n.type === 'appointment') { icon = 'calendar_month'; iconColor = '#d97706'; }

        const timeStr = new Date(n.timestamp).toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' }) + ' · ' + 
                        new Date(n.timestamp).toLocaleDateString('en-US', { month: 'short', day: 'numeric' });

        item.innerHTML = `
            <span class="material-symbols-outlined" style="color:${iconColor};font-size:22px;margin-top:2px;">${icon}</span>
            <div style="flex:1;">
                <p class="font-body-md" style="font-weight:${n.read ? '400' : '600'};margin:0;font-size:13px;line-height:1.4;">${n.message}</p>
                <span class="text-secondary" style="font-size:10px;display:block;margin-top:4px;">${timeStr}</span>
            </div>
        `;
        container.appendChild(item);
    });
}

async function clearNotifications() {
    try {
        const res = await fetch('/api/notifications/clear', { method: 'POST' });
        if (res.ok) {
            showToast('All notifications marked as read.');
            cachedNotifications.forEach(n => n.read = true);
            renderNotificationsList();
            await loadNotifications();
        }
    } catch (err) {
        showToast('Failed to clear notifications.', 'error');
    }
}

document.getElementById('notif-btn')?.addEventListener('click', (e) => {
    e.stopPropagation();
    openNotificationsModal();
});

document.getElementById('notif-wrapper')?.addEventListener('click', (e) => {
    e.stopPropagation();
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
['patient-name', 'patient-email', 'patient-age', 'patient-gender', 'patient-contact',
 'patient-allergies', 'patient-medications', 'patient-routine',
 'patient-skintype', 'patient-concern', 'practitioner-notes'].forEach(id => {
    document.getElementById(id)?.addEventListener('input', triggerAutosave);
});

document.querySelectorAll('#concerns-checklist input[type="checkbox"]').forEach(chk => {
    chk.addEventListener('change', triggerAutosave);
});

window.addEventListener('beforeunload', () => {
    if (activePatient) {
        saveCurrentInputsToMemory();
        saveCustomPatientToLocalStorage(activePatient);
    }
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
                if (res.ok) {
                    const updated = await res.json();
                    Object.assign(activePatient, updated);
                } else {
                    if (imageType === 'before') {
                        activePatient.beforeImg = base64Data;
                        if (date) activePatient.beforeDate = date;
                    } else {
                        activePatient.afterImg = base64Data;
                        if (date) activePatient.afterDate = date;
                    }
                    await savePatientToServer(activePatient);
                }
                saveCustomPatientToLocalStorage(activePatient);
                loadPatientData(activePatient);
                showToast(`${imageType === 'before' ? 'Before' : 'After'} photo updated.`);
            } catch (err) {
                if (imageType === 'before') {
                    activePatient.beforeImg = base64Data;
                    if (date) activePatient.beforeDate = date;
                } else {
                    activePatient.afterImg = base64Data;
                    if (date) activePatient.afterDate = date;
                }
                saveCustomPatientToLocalStorage(activePatient);
                loadPatientData(activePatient);
                showToast(`${imageType === 'before' ? 'Before' : 'After'} photo updated.`);
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

// ─── DYNAMIC HERO SLOTS ──────────────────────────────────────────
function updateDynamicNextSlot() {
    const el = document.getElementById('dynamic-next-slot');
    if (!el) return;
}

function formatSlotTime(date) {
    let hours = date.getHours();
    let minutes = date.getMinutes();
    const ampm = hours >= 12 ? 'PM' : 'AM';
    hours = hours % 12;
    hours = hours ? hours : 12; 
    minutes = minutes < 10 ? '0'+minutes : minutes;
    return `${hours}:${minutes} ${ampm}`;
}

// ─── SKIN & HAIR ASSESSOR MODULE ────────────────────────────────
let assessorAnswers = {
    category: null,
    subCategory: null,
    recommendationName: null
};

const assessorData = {
    face: {
        title: "2. Choose your specific skin concern:",
        options: [
            { key: "dullness", label: "Dullness & Dryness", desc: "Dehydrated skin, rough texture, or lack of radiance" },
            { key: "pigment", label: "Hyperpigmentation & Melasma", desc: "Sun damage, melasma, dark spots, or uneven tone" },
            { key: "scars", label: "Acne Scars & Texture", desc: "Indentations, large pores, or post-acne marks" },
            { key: "bright", label: "Age Spots & Fine Lines", desc: "Wrinkles, sagging, or age spots" }
        ],
        recommendations: {
            dullness: {
                name: "HydraFacial",
                desc: "A multi-step vortex infusion that deeply cleanses, extracts impurities, and hydrates with active peptides and antioxidants. Ideal for dull, dry, and tired-looking skin."
            },
            pigment: {
                name: "Chemical Peel",
                desc: "An advanced formulation of glycolic, lactic, and salicylic acids to exfoliate damaged skin layers, promote rapid cellular turnover, and dramatically fade hyperpigmentation."
            },
            scars: {
                name: "Microneedling",
                desc: "Precision collagen induction therapy that stimulates natural skin healing, reducing the depth of acne scars, refining pores, and tightening texture."
            },
            bright: {
                name: "Skin Brightening Therapy",
                desc: "Targeted cosmetic brightening infusions combined with soothing serums to diminish melasma, age spots, and balance skin tone."
            }
        }
    },
    hair: {
        title: "2. Select your hair or scalp concern:",
        options: [
            { key: "thinning", label: "Scalp Thinning & Hair Fall", desc: "Decreasing hair density or active hair shedding" },
            { key: "flakes", label: "Flaky Scalp & Dandruff", desc: "Persistent scaling, itching, or excess sebum" },
            { key: "length", label: "Volume & Length Enhancement", desc: "Desire for thicker or longer locks instantly" }
        ],
        recommendations: {
            thinning: {
                name: "Hair Regrowth Therapy",
                desc: "Scalp micro-circulation stimulation and active nutrient cocktails infused directly to revitalize dormant hair follicles and boost density."
            },
            flakes: {
                name: "Dandruff Therapy",
                desc: "Scalp exfoliation and anti-fungal botanical therapies to regulate sebum, clarify the scalp, and prevent future flaking."
            },
            length: {
                name: "Hair Extension",
                desc: "Premium, seamless application of high-quality human hair extensions customized to blend naturally with your hair type and style."
            }
        }
    },
    makeup: {
        title: "2. Choose your semi-permanent makeup goals:",
        options: [
            { key: "spmu", label: "Eyebrow Shaping & Lip Blush", desc: "Desire for defined semi-permanent brows or soft tinted lips" }
        ],
        recommendations: {
            spmu: {
                name: "SPMU for Eyebrows & Lips",
                desc: "Semi-permanent artistic lip blush contouring or eyebrow microblading/shading to maintain pristine makeup looks 24/7."
            }
        }
    }
};

function selectAssessorOption(step, value, label) {
    if (step === 1) {
        assessorAnswers.category = value;
        
        // Populate Step 2 options
        const step2Data = assessorData[value];
        document.getElementById('assessor-q2').textContent = step2Data.title;
        
        const grid = document.getElementById('assessor-options-q2');
        grid.innerHTML = '';
        step2Data.options.forEach(opt => {
            const btn = document.createElement('button');
            btn.className = 'assessor-opt-btn';
            btn.onclick = () => selectAssessorOption(2, opt.key, opt.label);
            btn.innerHTML = `
                <span class="material-symbols-outlined" style="font-size:32px;color:var(--color-primary);">done</span>
                <div>
                    <p style="font-weight:700;font-size:15px;">${opt.label}</p>
                    <p style="font-size:12px;opacity:0.7;margin-top:2px;">${opt.desc}</p>
                </div>
            `;
            grid.appendChild(btn);
        });

        // Go to Step 2
        document.getElementById('assessor-step-1').style.display = 'none';
        document.getElementById('assessor-step-2').style.display = 'block';
        document.getElementById('assessor-progress').style.width = '66%';
    } else if (step === 2) {
        assessorAnswers.subCategory = value;
        
        // Show recommendation
        const categoryData = assessorData[assessorAnswers.category];
        const rec = categoryData.recommendations[value];
        
        const box = document.getElementById('assessor-recommendation-box');
        box.innerHTML = `
            <h4>${rec.name}</h4>
            <p>${rec.desc}</p>
        `;
        
        // Store selected recommendation in a temporary global variable to prefill booking
        assessorAnswers.recommendationName = rec.name;

        // Go to Step 3
        document.getElementById('assessor-step-2').style.display = 'none';
        document.getElementById('assessor-step-3').style.display = 'block';
        document.getElementById('assessor-progress').style.width = '100%';
    }
}

function prevAssessorStep() {
    // Back to Step 1
    document.getElementById('assessor-step-2').style.display = 'none';
    document.getElementById('assessor-step-1').style.display = 'block';
    document.getElementById('assessor-progress').style.width = '33%';
}

function resetAssessor() {
    assessorAnswers = { category: null, subCategory: null, recommendationName: null };
    document.getElementById('assessor-step-3').style.display = 'none';
    document.getElementById('assessor-step-2').style.display = 'none';
    document.getElementById('assessor-step-1').style.display = 'block';
    document.getElementById('assessor-progress').style.width = '33%';
}

function bookAssessorRecommendation() {
    if (assessorAnswers.recommendationName) {
        const select = document.getElementById('bk-service');
        if (select) {
            // Find and match selection option
            for (let opt of select.options) {
                if (opt.textContent.trim().toLowerCase() === assessorAnswers.recommendationName.trim().toLowerCase() ||
                    opt.value.trim().toLowerCase() === assessorAnswers.recommendationName.trim().toLowerCase()) {
                    opt.selected = true;
                    break;
                }
            }
        }
        
        // Smooth scroll to booking
        document.getElementById('booking-section')?.scrollIntoView({ behavior: 'smooth' });
        showToast(`Selected ${assessorAnswers.recommendationName} in the booking form!`);
    }
}

// ─── INITIALIZE ───────────────────────────────────────────────
document.addEventListener('DOMContentLoaded', () => {
    initHeroParticles();
    restoreSession();
    updateDynamicNextSlot();
    
    // Set up both portal drawer navigations
    setupMobileSidebar('patient-mobile-menu-btn', 'patient-sidebar-close-btn', 'patient-sidebar');
    setupMobileSidebar('doctor-mobile-menu-btn', 'doctor-sidebar-close-btn', 'sidebar-nav');
});
