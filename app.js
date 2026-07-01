// Luminous Clinical Portal Application Script

// Patient Database (Loaded dynamically from Express backend API)
let patients = [];

// Active State Tracker
let activePatient = null;

// Async function to load patient data from server
async function loadPatientsFromServer() {
    try {
        const res = await fetch("/api/patients");
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
        console.error("Failed to load patients from server:", err);
        showToast("Error loading patients from database.", "error");
    }
}

// Async function to save patient updates to server
async function savePatientToServer(patient) {
    if (!patient) return;
    try {
        const res = await fetch(`/api/patients/${patient.refId}`, {
            method: "PUT",
            headers: {
                "Content-Type": "application/json"
            },
            body: JSON.stringify(patient)
        });
        if (!res.ok) {
            throw new Error("HTTP error " + res.status);
        }
        const updated = await res.json();
        const index = patients.findIndex(p => p.refId === patient.refId);
        if (index !== -1) {
            patients[index] = updated;
        }
    } catch (err) {
        console.error("Failed to save patient to server:", err);
        showToast("Failed to save updates to database.", "error");
    }
}

let currentYear = 2024;
let currentMonth = 5; // June (0-indexed represents January, so 5 is June)

// DOM Elements
const views = {
    caseSheet: document.getElementById("case-sheet-view"),
    patientList: document.getElementById("patient-list-view")
};

const tabs = {
    caseSheets: document.getElementById("tab-case-sheets"),
    patientList: document.getElementById("tab-patient-list")
};

// Initialize Toast System
function showToast(message, type = 'success') {
    const container = document.getElementById("toast-container");
    const toast = document.createElement("div");
    toast.className = `toast-message ${type === 'error' ? 'error-toast' : ''}`;
    
    const icon = type === 'error' ? 'error' : 'check_circle';
    toast.innerHTML = `
        <span class="material-symbols-outlined toast-icon">${icon}</span>
        <span>${message}</span>
    `;
    
    container.appendChild(toast);
    
    // Automatically fade out and remove
    setTimeout(() => {
        toast.classList.add("toast-out");
        toast.addEventListener("animationend", () => {
            toast.remove();
        });
    }, 3000);
}

// Autosave simulator
let autosaveTimeout;
function triggerAutosave() {
    const indicator = document.getElementById("autosave-indicator");
    indicator.textContent = "Saving Draft...";
    indicator.style.color = "var(--color-outline)";
    
    clearTimeout(autosaveTimeout);
    autosaveTimeout = setTimeout(async () => {
        // Collect current input data and save to active patient object
        saveCurrentInputsToMemory();
        await savePatientToServer(activePatient);
        indicator.textContent = "Saved as Draft";
        indicator.style.color = "var(--color-secondary)";
    }, 1000);
}

// Load patient details into form inputs
function loadPatientData(patient) {
    activePatient = patient;
    
    // Update Banner
    document.getElementById("patient-banner-title").textContent = `Case Sheet: ${patient.name}`;
    document.getElementById("patient-banner-ref").textContent = `Ref ID: ${patient.refId}`;
    
    const bannerStatus = document.getElementById("patient-banner-status");
    bannerStatus.textContent = patient.status;
    if (patient.status.toLowerCase() === 'active') {
        bannerStatus.className = "status-badge";
    } else {
        bannerStatus.className = "status-badge inactive";
    }

    // Update Personal & Health
    document.getElementById("patient-name").value = patient.name;
    document.getElementById("patient-age").value = patient.age;
    document.getElementById("patient-gender").value = patient.gender;
    document.getElementById("patient-contact").value = patient.contact;
    document.getElementById("patient-allergies").value = patient.allergies;
    document.getElementById("patient-medications").value = patient.medications;
    
    // Update Skincare Profile
    document.getElementById("patient-routine").value = patient.routine;
    document.getElementById("patient-skintype").value = patient.skintype;
    document.getElementById("patient-concern").value = patient.concern;
    
    // Checklists
    document.getElementById("chk-hyperpigmentation").checked = patient.concernsChecklist.hyperpigmentation;
    document.getElementById("chk-acne").checked = patient.concernsChecklist.acne;
    document.getElementById("chk-elasticity").checked = patient.concernsChecklist.elasticity;
    document.getElementById("chk-dehydration").checked = patient.concernsChecklist.dehydration;
    
    // Observations
    document.getElementById("practitioner-notes").value = patient.observations;
    
    // Protocols
    document.getElementById("protocol-summary-text").textContent = patient.protocol;
    
    // Load Tables
    renderProceduresTable();
    renderProductsTable();
    renderLogsTable();
    
    // Appointment Scheduler Dates
    if (patient.appointment) {
        // Format appointment date for display
        const dateObj = new Date(patient.appointment.date);
        const options = { weekday: 'long', month: 'long', day: 'numeric' };
        document.getElementById("schedule-date-text").textContent = dateObj.toLocaleDateString('en-US', options);
        document.getElementById("schedule-time-text").textContent = `${patient.appointment.time} — ${patient.appointment.purpose}`;
        
        // Update calendar grid selection variables
        const apptDate = new Date(patient.appointment.date);
        currentMonth = apptDate.getMonth();
        currentYear = apptDate.getFullYear();
    } else {
        document.getElementById("schedule-date-text").textContent = "No appointment booked";
        document.getElementById("schedule-time-text").textContent = "Select a date on the calendar to book";
    }
    
    // Load Calendar
    renderCalendar();

    // Clinical photography dates & images dynamically loaded
    document.getElementById("patient-photo-before-date").textContent = patient.beforeDate;
    document.getElementById("patient-photo-after-date").textContent = patient.afterDate;
    
    const beforeImgElements = document.querySelectorAll("img[alt='Before Treatment']");
    const afterImgElements = document.querySelectorAll("img[alt='After Treatment (8 Weeks)'], img[alt='After Treatment']");
    beforeImgElements.forEach(img => img.src = patient.beforeImg);
    afterImgElements.forEach(img => img.src = patient.afterImg);


    // Load Signature Verification state
    updateSignatureUIState();
    
    // Reset inputs lock status based on verification state
    lockInputsState(patient.signed);
}

// Saves current values from form elements into active patient memory
function saveCurrentInputsToMemory() {
    activePatient.name = document.getElementById("patient-name").value;
    activePatient.age = document.getElementById("patient-age").value;
    activePatient.gender = document.getElementById("patient-gender").value;
    activePatient.contact = document.getElementById("patient-contact").value;
    activePatient.allergies = document.getElementById("patient-allergies").value;
    activePatient.medications = document.getElementById("patient-medications").value;
    activePatient.routine = document.getElementById("patient-routine").value;
    activePatient.skintype = document.getElementById("patient-skintype").value;
    activePatient.concern = document.getElementById("patient-concern").value;
    activePatient.observations = document.getElementById("practitioner-notes").value;
    
    // Save checklists
    activePatient.concernsChecklist.hyperpigmentation = document.getElementById("chk-hyperpigmentation").checked;
    activePatient.concernsChecklist.acne = document.getElementById("chk-acne").checked;
    activePatient.concernsChecklist.elasticity = document.getElementById("chk-elasticity").checked;
    activePatient.concernsChecklist.dehydration = document.getElementById("chk-dehydration").checked;
}

// Locks or unlocks inputs based on signed status
function lockInputsState(isLocked) {
    const elementsToLock = [
        "patient-name", "patient-age", "patient-gender", "patient-contact",
        "patient-allergies", "patient-medications", "patient-routine",
        "patient-skintype", "patient-concern", "practitioner-notes"
    ];
    
    elementsToLock.forEach(id => {
        document.getElementById(id).disabled = isLocked;
    });
    
    const checkboxes = document.querySelectorAll("#concerns-checklist input[type='checkbox']");
    checkboxes.forEach(chk => {
        chk.disabled = isLocked;
    });

    // Disable table add action buttons
    document.getElementById("add-procedure-btn").style.display = isLocked ? "none" : "inline-flex";
    document.getElementById("add-product-btn").style.display = isLocked ? "none" : "inline-flex";
    document.getElementById("add-log-entry-btn").style.display = isLocked ? "none" : "inline-flex";
    document.getElementById("reschedule-btn").style.display = isLocked ? "none" : "inline-flex";
    document.getElementById("confirm-booking-btn").style.display = isLocked ? "none" : "inline-flex";
}

// Signature Block UI rendering
function updateSignatureUIState() {
    const sigBlock = document.getElementById("signature-block");
    const sigStatus = document.getElementById("signature-status-text");
    const sigDesc = document.getElementById("signature-desc");
    const sigBtn = document.getElementById("verify-protocol-btn");
    const sigLine = document.getElementById("signature-stamp-line");
    const sigHash = document.getElementById("signature-hash-id");

    if (activePatient.signed) {
        sigBlock.classList.add("signed");
        sigBlock.style.backgroundColor = "var(--color-primary)";
        sigBlock.style.color = "var(--color-on-primary)";
        sigStatus.textContent = "Protocol Verified";
        sigDesc.textContent = `This case sheet has been clinically reviewed and digitally signed by Lead Practitioner Dr. Elena Vogt.`;
        sigBtn.style.display = "none";
        sigLine.style.display = "block";
        sigHash.textContent = activePatient.signatureId || "#882-LUNA-SAFE-921";
    } else {
        sigBlock.classList.remove("signed");
        // Stylized warning/unsigned look
        sigBlock.style.backgroundColor = "var(--color-surface-container-low)";
        sigBlock.style.color = "var(--color-on-surface)";
        sigStatus.textContent = "Protocol Pending Signature";
        sigDesc.textContent = "This medical record draft is unverified. Review patient profiles, concerns, and protocols, then verify.";
        sigBtn.style.display = "inline-flex";
        sigLine.style.display = "none";
    }
}

// RENDER CLINICAL HISTORY PROCEDURES TABLE
function renderProceduresTable() {
    const tbody = document.querySelector("#procedures-table tbody");
    tbody.innerHTML = "";
    
    if (activePatient.procedures.length === 0) {
        tbody.innerHTML = `<tr><td colspan="3" class="text-secondary" style="text-align: center; font-style: italic;">No clinical history logged</td></tr>`;
        return;
    }
    
    activePatient.procedures.forEach(proc => {
        const tr = document.createElement("tr");
        
        // Format Date
        const date = new Date(proc.date);
        const formattedDate = date.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
        
        tr.innerHTML = `
            <td style="font-weight: 600; color: var(--color-primary);">${proc.name}</td>
            <td class="text-secondary">${formattedDate}</td>
            <td class="text-secondary">${proc.clinic}</td>
        `;
        tbody.appendChild(tr);
    });
}

// RENDER CHRONOLOGICAL TREATMENT LOG TABLE
function renderLogsTable() {
    const tbody = document.querySelector("#treatment-log-table tbody");
    tbody.innerHTML = "";
    
    if (activePatient.logs.length === 0) {
        tbody.innerHTML = `<tr><td colspan="4" class="text-secondary" style="text-align: center; font-style: italic;">No treatment entries logged</td></tr>`;
        return;
    }
    
    activePatient.logs.forEach(log => {
        const tr = document.createElement("tr");
        
        const date = new Date(log.date);
        const formattedDate = date.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
        
        tr.innerHTML = `
            <td style="font-weight: 600; white-space: nowrap; color: var(--color-primary);">${formattedDate}</td>
            <td>${log.treatment}</td>
            <td><span class="status-badge" style="font-size: 10px; border-color: var(--color-outline);">${log.reaction}</span></td>
            <td class="text-secondary" style="font-size: 14px; max-width: 300px;">${log.notes}</td>
        `;
        tbody.appendChild(tr);
    });
}

// RENDER PRESCRIBED SKINCARE PRODUCTS TABLE
function renderProductsTable() {
    const tbody = document.querySelector("#products-table tbody");
    tbody.innerHTML = "";
    
    if (activePatient.skincare.length === 0) {
        tbody.innerHTML = `<tr><td colspan="3" class="text-secondary" style="text-align: center; font-style: italic;">No skincare products prescribed</td></tr>`;
        return;
    }
    
    activePatient.skincare.forEach(product => {
        const tr = document.createElement("tr");
        tr.innerHTML = `
            <td style="font-weight: 600; color: var(--color-primary);">${product.name}</td>
            <td class="text-secondary">${product.instructions}</td>
            <td style="text-align: right; font-weight: 700;">${product.qty} Unit(s)</td>
        `;
        tbody.appendChild(tr);
    });
}

// CALENDAR SYSTEM
const MONTH_NAMES = ["January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"];

function renderCalendar() {
    const monthYear = document.getElementById("calendar-month-year");
    const grid = document.getElementById("calendar-grid");
    
    monthYear.textContent = `${MONTH_NAMES[currentMonth]} ${currentYear}`;
    grid.innerHTML = "";
    
    // Add Weekday labels
    const days = ["M", "T", "W", "T", "F", "S", "S"];
    days.forEach(day => {
        const div = document.createElement("div");
        div.className = "calendar-day-label";
        div.textContent = day;
        grid.appendChild(div);
    });
    
    // Date Calculations
    const firstDay = new Date(currentYear, currentMonth, 1);
    // Adjust first day offset for standard Monday start grid
    let startOffset = firstDay.getDay() - 1;
    if (startOffset < 0) startOffset = 6; // Sunday is 6th offset
    
    const lastDay = new Date(currentYear, currentMonth + 1, 0);
    const totalDays = lastDay.getDate();
    
    // Empty cells prior to 1st of month
    for (let i = 0; i < startOffset; i++) {
        const div = document.createElement("div");
        div.className = "calendar-day empty";
        grid.appendChild(div);
    }
    
    // Add Month Days
    for (let dayNum = 1; dayNum <= totalDays; dayNum++) {
        const div = document.createElement("div");
        div.className = "calendar-day";
        div.textContent = dayNum;
        
        // Active/Selected state check
        if (activePatient.appointment) {
            const apptDate = new Date(activePatient.appointment.date);
            if (apptDate.getDate() === dayNum && apptDate.getMonth() === currentMonth && apptDate.getFullYear() === currentYear) {
                div.classList.add("active");
            }
        }
        
        // Only add interaction if not locked
        if (!activePatient.signed) {
            div.addEventListener("click", () => {
                // Set Selected Date
                const selectedDateStr = `${currentYear}-${String(currentMonth + 1).padStart(2, '0')}-${String(dayNum).padStart(2, '0')}`;
                
                // Switch active calendar selection class
                document.querySelectorAll(".calendar-day.active").forEach(el => el.classList.remove("active"));
                div.classList.add("active");
                
                // Update active patient object
                if (!activePatient.appointment) {
                    activePatient.appointment = { date: selectedDateStr, time: "10:30 AM", purpose: "Consultation" };
                } else {
                    activePatient.appointment.date = selectedDateStr;
                }
                
                // Refresh Sidebar text
                const dateObj = new Date(selectedDateStr);
                const options = { weekday: 'long', month: 'long', day: 'numeric' };
                document.getElementById("schedule-date-text").textContent = dateObj.toLocaleDateString('en-US', options);
                
                showToast(`Date changed to ${dateObj.toLocaleDateString('en-US', { month: 'long', day: 'numeric' })}. Save case sheet to finalize.`);
            });
        } else {
            div.style.cursor = "default";
        }
        
        grid.appendChild(div);
    }
}

// Calendar Navigation
document.getElementById("cal-prev-btn").addEventListener("click", () => {
    currentMonth--;
    if (currentMonth < 0) {
        currentMonth = 11;
        currentYear--;
    }
    renderCalendar();
});

document.getElementById("cal-next-btn").addEventListener("click", () => {
    currentMonth++;
    if (currentMonth > 11) {
        currentMonth = 0;
        currentYear++;
    }
    renderCalendar();
});


// IMAGE SPLIT DRAG SLIDER HANDLERS
const sliderContainer = document.getElementById("slider-container");
const sliderBeforeImg = document.getElementById("slider-before-img");
const sliderHandle = document.getElementById("slider-handle");

let isDragging = false;

function setSliderPosition(x) {
    const containerRect = sliderContainer.getBoundingClientRect();
    let position = ((x - containerRect.left) / containerRect.width) * 100;
    
    // Boundaries
    if (position < 0) position = 0;
    if (position > 100) position = 100;
    
    // Set widths
    sliderBeforeImg.style.width = `${position}%`;
    sliderHandle.style.left = `${position}%`;
}

// Mouse Drag
sliderHandle.addEventListener("mousedown", (e) => {
    isDragging = true;
    e.preventDefault();
});

window.addEventListener("mouseup", () => {
    isDragging = false;
});

window.addEventListener("mousemove", (e) => {
    if (!isDragging) return;
    setSliderPosition(e.clientX);
});

// Touch Drag (Mobile responsiveness)
sliderHandle.addEventListener("touchstart", (e) => {
    isDragging = true;
});

window.addEventListener("touchend", () => {
    isDragging = false;
});

window.addEventListener("touchmove", (e) => {
    if (!isDragging) return;
    setSliderPosition(e.touches[0].clientX);
});

// Photo View mode toggle
const photoModeSplit = document.getElementById("photo-mode-split");
const photoModeSide = document.getElementById("photo-mode-side");
const photoViewSplit = document.getElementById("photo-view-split");
const photoViewSide = document.getElementById("photo-view-side");

photoModeSplit.addEventListener("click", () => {
    photoModeSplit.classList.add("active");
    photoModeSide.classList.remove("active");
    photoViewSplit.classList.add("active");
    photoViewSide.classList.remove("active");
});

photoModeSide.addEventListener("click", () => {
    photoModeSide.classList.add("active");
    photoModeSplit.classList.remove("active");
    photoViewSide.classList.add("active");
    photoViewSplit.classList.remove("active");
});


// TAB NAVIGATION (Case sheets vs Patient Directory)
function switchToTab(tabName) {
    if (tabName === "caseSheets") {
        tabs.caseSheets.classList.add("active");
        tabs.patientList.classList.remove("active");
        views.caseSheet.style.display = "block";
        views.patientList.style.display = "none";
        document.getElementById("sidebar-nav").style.display = "flex";
        
        // Force re-render of slider after display show to avoid clientRect width calculation errors
        setTimeout(() => {
            const width = sliderContainer.getBoundingClientRect().width;
            const left = sliderContainer.getBoundingClientRect().left;
            setSliderPosition(width / 2 + left);
        }, 50);
    } else {
        tabs.patientList.classList.add("active");
        tabs.caseSheets.classList.remove("active");
        views.caseSheet.style.display = "none";
        views.patientList.style.display = "block";
        
        // Hide Case sheet sidebar on directory list
        document.getElementById("sidebar-nav").style.display = "none";
        renderPatientDirectory();
    }
}

tabs.caseSheets.addEventListener("click", () => switchToTab("caseSheets"));
tabs.patientList.addEventListener("click", () => switchToTab("patientList"));


// PATIENT DIRECTORY RENDERING & LOGIC
function renderPatientDirectory(filteredSearch = "") {
    const tbody = document.querySelector("#patient-directory-table tbody");
    tbody.innerHTML = "";
    
    const searchLow = filteredSearch.toLowerCase().trim();
    const filtered = patients.filter(p => {
        return p.name.toLowerCase().includes(searchLow) ||
               p.refId.toLowerCase().includes(searchLow) ||
               p.concern.toLowerCase().includes(searchLow);
    });
    
    if (filtered.length === 0) {
        tbody.innerHTML = `<tr><td colspan="7" class="text-secondary" style="text-align: center; padding: 32px; font-style: italic;">No patient records found</td></tr>`;
        return;
    }

    filtered.forEach(p => {
        const tr = document.createElement("tr");
        tr.innerHTML = `
            <td style="font-weight: 700; color: var(--color-primary);">${p.refId}</td>
            <td style="font-weight: 600;">${p.name}</td>
            <td>${p.age}</td>
            <td>${p.gender}</td>
            <td>${p.concern}</td>
            <td>
                <span class="status-badge ${p.status.toLowerCase() === 'inactive' ? 'inactive' : ''}">
                    ${p.status}
                </span>
            </td>
            <td style="text-align: right;">
                <button class="btn-secondary font-label-sm select-patient-btn" data-id="${p.refId}" style="padding: 6px 12px; font-size: 10px;">
                    Open Case Sheet
                </button>
            </td>
        `;
        
        // Setup direct open click event
        tr.querySelector(".select-patient-btn").addEventListener("click", () => {
            const pObj = patients.find(item => item.refId === p.refId);
            loadPatientData(pObj);
            
            // Switch views
            switchToTab("caseSheets");
            showToast(`Loaded ${pObj.name}'s Case Sheet`);
        });
        
        tbody.appendChild(tr);
    });
}

// Directory Search Bar filter
document.getElementById("patient-search-bar").addEventListener("input", (e) => {
    renderPatientDirectory(e.target.value);
});


// ELECTRONIC DIGITAL SIGNATURE LOCK SYSTEM
document.getElementById("verify-protocol-btn").addEventListener("click", () => {
    // Generate signature hash
    const dateTag = new Date().toISOString().slice(0, 10).replace(/-/g, '');
    const randCode = Math.floor(100 + Math.random() * 900);
    const generatedSigId = `#${randCode}-LUNA-SIG-${dateTag}`;
    
    // Stamping animation
    const sigBlock = document.getElementById("signature-block");
    sigBlock.style.transform = "scale(0.98)";
    
    setTimeout(async () => {
        activePatient.signed = true;
        activePatient.signatureId = generatedSigId;
        
        // Update variables in forms
        saveCurrentInputsToMemory();
        
        // Sync to server
        await savePatientToServer(activePatient);
        
        // Re-load UI elements
        updateSignatureUIState();
        lockInputsState(true);
        renderCalendar();
        
        sigBlock.style.transform = "scale(1)";
        showToast("Clinical Case Sheet locked and verified with Digital Stamp.", "success");
    }, 300);
});


// SCROLLSPY / SIDEBAR NAVIGATION
const sections = document.querySelectorAll(".scroll-section");
const navLinks = document.querySelectorAll(".sidebar-link");

navLinks.forEach(link => {
    link.addEventListener("click", (e) => {
        e.preventDefault();
        
        // Check if we are in Case Sheets tab
        if (!tabs.caseSheets.classList.contains("active")) {
            tabs.caseSheets.click();
        }
        
        const targetId = link.getAttribute("href").substring(1);
        const targetElement = document.getElementById(targetId);
        
        if (targetElement) {
            targetElement.scrollIntoView({ behavior: 'smooth', block: 'start' });
            
            // Toggle classes manually
            navLinks.forEach(nav => nav.classList.remove("active"));
            link.classList.add("active");
        }
    });
});

window.addEventListener("scroll", () => {
    let current = "";
    sections.forEach(section => {
        const sectionTop = section.offsetTop;
        const sectionHeight = section.clientHeight;
        if (pageYOffset >= (sectionTop - 220)) {
            current = section.getAttribute("id");
        }
    });
    
    if (current) {
        navLinks.forEach(link => {
            link.classList.remove("active");
            if (link.getAttribute("href").substring(1) === current) {
                link.classList.add("active");
            }
        });
    }
});


// THEME SYSTEM (LIGHT/DARK MODE TOGGLE)
const themeToggle = document.getElementById("theme-toggle");
let systemTheme = localStorage.getItem("clinical-theme") || "light";

// Set Initial Theme
document.documentElement.setAttribute("data-theme", systemTheme);
themeToggle.textContent = systemTheme === "dark" ? "light_mode" : "dark_mode";

themeToggle.addEventListener("click", () => {
    const currentTheme = document.documentElement.getAttribute("data-theme");
    const nextTheme = currentTheme === "light" ? "dark" : "light";
    
    document.documentElement.setAttribute("data-theme", nextTheme);
    localStorage.setItem("clinical-theme", nextTheme);
    themeToggle.textContent = nextTheme === "dark" ? "light_mode" : "dark_mode";
    
    showToast(`Switched to Luminous ${nextTheme === 'dark' ? 'Dark' : 'Light'} Clinical theme.`);
});


// MODALS IMPLEMENTATION & DIALOG SUBMISSIONS
function openModal(id) {
    const el = document.getElementById(id);
    if (!el) { console.warn('Modal not found:', id); return; }
    el.classList.add("active");
    // Prevent background scroll
    document.body.style.overflow = 'hidden';
}
function closeModal(id) {
    const el = document.getElementById(id);
    if (!el) return;
    el.classList.remove("active");
    document.body.style.overflow = '';
}

// Close modal when clicking on the dark overlay backdrop
document.querySelectorAll(".modal-overlay").forEach(overlay => {
    overlay.addEventListener("click", (e) => {
        if (e.target === overlay) closeModal(overlay.id);
    });
});

// Close on Escape key
document.addEventListener("keydown", (e) => {
    if (e.key === "Escape") {
        document.querySelectorAll(".modal-overlay.active").forEach(m => closeModal(m.id));
    }
});

// Connect all .modal-close X icons to close their parent modal
document.querySelectorAll(".modal-close").forEach(closeBtn => {
    closeBtn.addEventListener("click", (e) => {
        const modal = e.target.closest(".modal-overlay");
        if (modal) closeModal(modal.id);
    });
});

// Connect explicit cancel buttons for each modal
["modal-cancel-btn", "proc-cancel-btn", "log-cancel-btn", "presc-cancel-btn",
 "new-p-cancel-btn", "setting-cancel-btn"].forEach(btnId => {
    const btn = document.getElementById(btnId);
    if (btn) {
        btn.addEventListener("click", () => {
            const modal = btn.closest(".modal-overlay");
            if (modal) closeModal(modal.id);
        });
    }
});

// Modal 1: Appointment reschedule
document.getElementById("reschedule-btn").addEventListener("click", () => {
    const dateInput = document.getElementById("modal-date-input");
    const purposeInput = document.getElementById("modal-purpose-input");
    const timeSelect = document.getElementById("modal-time-select");
    
    if (activePatient.appointment) {
        dateInput.value = activePatient.appointment.date;
        purposeInput.value = activePatient.appointment.purpose;
        timeSelect.value = activePatient.appointment.time;
    } else {
        dateInput.value = new Date().toISOString().slice(0, 10);
    }
    
    openModal("reschedule-modal");
});

document.getElementById("schedule-followup-header-btn").addEventListener("click", () => {
    if (activePatient.signed) {
        showToast("Cannot reschedule a verified protocol. Unlock or copy record to proceed.", "error");
        return;
    }
    document.getElementById("reschedule-btn").click();
});

document.getElementById("modal-save-btn").addEventListener("click", async () => {
    const newDate = document.getElementById("modal-date-input").value;
    const newTime = document.getElementById("modal-time-select").value;
    const newPurpose = document.getElementById("modal-purpose-input").value;
    
    activePatient.appointment = {
        date: newDate,
        time: newTime,
        purpose: newPurpose
    };
    
    // Sync to server
    await savePatientToServer(activePatient);
    
    // Refresh date text on scheduler panel
    const dateObj = new Date(newDate);
    const options = { weekday: 'long', month: 'long', day: 'numeric' };
    document.getElementById("schedule-date-text").textContent = dateObj.toLocaleDateString('en-US', options);
    document.getElementById("schedule-time-text").textContent = `${newTime} — ${newPurpose}`;
    
    // Force grid redraw
    renderCalendar();
    
    closeModal("reschedule-modal");
    showToast("Appointment scheduling confirmed.");
});

document.getElementById("confirm-booking-btn").addEventListener("click", () => {
    if (activePatient.appointment) {
        showToast(`Appointment confirmed on ${activePatient.appointment.date} at ${activePatient.appointment.time}.`);
    } else {
        showToast("No active date selected to confirm booking.", "error");
    }
});


// Modal 2: Add Clinical History Procedure Entry
document.getElementById("add-procedure-btn").addEventListener("click", () => {
    document.getElementById("proc-name-input").value = "";
    document.getElementById("proc-date-input").value = new Date().toISOString().slice(0, 10);
    openModal("procedure-modal");
});

document.getElementById("proc-save-btn").addEventListener("click", async () => {
    const name = document.getElementById("proc-name-input").value;
    const date = document.getElementById("proc-date-input").value;
    const clinic = document.getElementById("proc-clinic-input").value;
    
    if (!name || !date) {
        showToast("Please fill in all required procedure details", "error");
        return;
    }
    
    activePatient.procedures.push({ name, date, clinic });
    
    // Sync to server
    await savePatientToServer(activePatient);
    
    renderProceduresTable();
    closeModal("procedure-modal");
    showToast("Clinical procedure history log entry added.");
});


// Modal 3: Add Chronological Progress Log
document.getElementById("add-log-entry-btn").addEventListener("click", () => {
    document.getElementById("log-treatment-input").value = "";
    document.getElementById("log-reaction-input").value = "";
    document.getElementById("log-notes-input").value = "";
    document.getElementById("log-date-input").value = new Date().toISOString().slice(0, 10);
    openModal("log-modal");
});

document.getElementById("log-save-btn").addEventListener("click", async () => {
    const date = document.getElementById("log-date-input").value;
    const treatment = document.getElementById("log-treatment-input").value;
    const reaction = document.getElementById("log-reaction-input").value;
    const notes = document.getElementById("log-notes-input").value;
    
    if (!date || !treatment || !reaction) {
        showToast("Please enter log Date, Treatment type, and Reaction details.", "error");
        return;
    }
    
    activePatient.logs.push({ date, treatment, reaction, notes });
    
    // Sync to server
    await savePatientToServer(activePatient);
    
    renderLogsTable();
    closeModal("log-modal");
    showToast("Progress log entry added to timeline.");
});


// Modal 4: Prescribe Skincare Product
document.getElementById("add-product-btn").addEventListener("click", () => {
    document.getElementById("presc-name-input").value = "";
    document.getElementById("presc-inst-input").value = "";
    document.getElementById("presc-qty-input").value = "1";
    openModal("prescribe-modal");
});

document.getElementById("presc-save-btn").addEventListener("click", async () => {
    const name = document.getElementById("presc-name-input").value;
    const instructions = document.getElementById("presc-inst-input").value;
    const qty = parseInt(document.getElementById("presc-qty-input").value) || 1;
    
    if (!name || !instructions) {
        showToast("Please enter product details and instructions.", "error");
        return;
    }
    
    activePatient.skincare.push({ name, instructions, qty });
    
    // Sync to server
    await savePatientToServer(activePatient);
    
    renderProductsTable();
    closeModal("prescribe-modal");
    showToast("Skincare product added to prescription list.");
});


// Modal 5: Create a new Patient Record from Scratch
document.getElementById("btn-add-patient").addEventListener("click", () => {
    document.getElementById("new-p-name").value = "";
    document.getElementById("new-p-age").value = "";
    document.getElementById("new-p-concern").value = "";
    document.getElementById("new-p-contact").value = "";
    openModal("new-patient-modal");
});

document.getElementById("new-p-save-btn").addEventListener("click", async () => {
    const name = document.getElementById("new-p-name").value.trim();
    const age = parseInt(document.getElementById("new-p-age").value);
    const gender = document.getElementById("new-p-gender").value;
    const contact = document.getElementById("new-p-contact").value.trim();
    const concern = document.getElementById("new-p-concern").value.trim();
    
    if (!name || isNaN(age) || !contact || !concern) {
        showToast("Please fill in all new patient fields.", "error");
        return;
    }
    
    const newPatient = {
        name: name,
        age: age,
        gender: gender,
        contact: contact,
        allergies: "None reported",
        medications: "None reported",
        skintype: "Combination",
        concern: concern,
        routine: "Morning:\n1. Cleanser\n2. Sunscreen\n\nEvening:\n1. Cleanser\n2. Moisturizer",
        observations: "Initial consult sheet created. Formulate treatment plan and log skin assessment concerns.",
        protocol: "Plan Pending Formulation.\nConfigure detailed corrective steps during patient follow-up.",
        status: "Active",
        signed: false,
        signatureId: "",
        beforeDate: "Today",
        afterDate: "N/A",
        beforeImg: "before_treatment.jpg",
        afterImg: "after_treatment.jpg",
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
            date: new Date().toISOString().slice(0, 10),
            time: "10:30 AM",
            purpose: "Initial Consultation"
        }
    };
    
    try {
        const res = await fetch("/api/patients", {
            method: "POST",
            headers: {
                "Content-Type": "application/json"
            },
            body: JSON.stringify(newPatient)
        });
        if (!res.ok) throw new Error("Failed to create patient");
        const createdPatient = await res.json();
        
        patients.push(createdPatient);
        closeModal("new-patient-modal");
        
        loadPatientData(createdPatient);
        switchToTab("caseSheets");
        showToast(`Record created for ${name}.`);
    } catch (err) {
        console.error("Failed to create patient:", err);
        showToast("Failed to create patient on server.", "error");
    }
});


// Print/Export Case Sheet details action
document.getElementById("export-pdf-btn").addEventListener("click", () => {
    // Ensure we are on case sheet view
    if (!document.getElementById("case-sheet-view") ||
        document.getElementById("case-sheet-view").style.display === "none") {
        showToast("Please open a Case Sheet first before exporting.", "error");
        return;
    }

    // Close any open modals before printing
    document.querySelectorAll(".modal-overlay.active").forEach(m => closeModal(m.id));

    // Switch to side-by-side photo view for print (slider can't print)
    const splitView = document.getElementById("photo-view-split");
    const sideView = document.getElementById("photo-view-side");
    const splitBtn = document.getElementById("photo-mode-split");
    const sideBtn = document.getElementById("photo-mode-side");
    const wasSplit = splitView && splitView.classList.contains("active");
    if (wasSplit) {
        splitView.classList.remove("active");
        sideView.classList.add("active");
        splitBtn.classList.remove("active");
        sideBtn.classList.add("active");
    }

    // Set document title to patient name for the PDF filename
    const originalTitle = document.title;
    document.title = `CaseSheet_${activePatient.name.replace(/ /g, '_')}_${activePatient.refId}`;

    showToast("Preparing PDF export... Print dialog will open shortly.");

    setTimeout(() => {
        if (navigator.webdriver) {
            console.log("window.print() bypassed in automation.");
            showToast("PDF Export simulated in test mode.");
        } else {
            window.print();
        }

        // Restore title and photo view after print dialog closes
        setTimeout(() => {
            document.title = originalTitle;
            if (wasSplit) {
                sideView.classList.remove("active");
                splitView.classList.add("active");
                sideBtn.classList.remove("active");
                splitBtn.classList.add("active");
            }
        }, 500);
    }, 300);
});

// Save Case Sheet manual action button
document.getElementById("save-case-sheet-btn").addEventListener("click", async () => {
    saveCurrentInputsToMemory();
    await savePatientToServer(activePatient);
    showToast(`Case sheet details for ${activePatient.name} successfully saved to portal.`, "success");
});


// BIND FORM EVENTS FOR REALTIME AUTOSAVE
const autoSaveElements = [
    "patient-name", "patient-age", "patient-gender", "patient-contact",
    "patient-allergies", "patient-medications", "patient-routine",
    "patient-skintype", "patient-concern", "practitioner-notes"
];

autoSaveElements.forEach(id => {
    document.getElementById(id).addEventListener("input", triggerAutosave);
    document.getElementById(id).addEventListener("change", triggerAutosave);
});

document.querySelectorAll("#concerns-checklist input[type='checkbox']").forEach(chk => {
    chk.addEventListener("change", () => {
        triggerAutosave();
        // Dynamically toggle concerns description in observation or toast
        const concernType = chk.getAttribute("data-concern");
        if (chk.checked) {
            showToast(`Added ${concernType} to active diagnostic concerns checklist.`);
        }
    });
});


// PORTAL SETTINGS FUNCTIONS & EVENTS
const settingsBtn = document.getElementById("settings-btn");
if (settingsBtn) {
    settingsBtn.addEventListener("click", async (e) => {
        e.stopPropagation();
        const nameInput = document.getElementById("setting-clinic-name");
        const docInput = document.getElementById("setting-dermatologist");
        const licInput = document.getElementById("setting-license-id");
        
        try {
            const res = await fetch("/api/settings");
            const settings = await res.json();
            if (nameInput) nameInput.value = settings.clinicName || "Luna Skin Aesthetic";
            if (docInput) docInput.value = settings.dermatologist || "Dr. Elena Vogt";
            if (licInput) licInput.value = settings.licenseId || "#882-LUNA-SAFE-921";
        } catch (err) {
            console.error("Failed to fetch settings:", err);
        }
        openModal("settings-modal");
    });
}

const settingSaveBtn = document.getElementById("setting-save-btn");
if (settingSaveBtn) {
    settingSaveBtn.addEventListener("click", async () => {
        const clinicName = document.getElementById("setting-clinic-name").value.trim() || "Luna Skin Aesthetic";
        const docName = document.getElementById("setting-dermatologist").value.trim() || "Dr. Elena Vogt";
        const licId = document.getElementById("setting-license-id").value.trim() || "#882-LUNA-SAFE-921";
        
        try {
            const res = await fetch("/api/settings", {
                method: "POST",
                headers: {
                    "Content-Type": "application/json"
                },
                body: JSON.stringify({ clinicName, dermatologist: docName, licenseId: licId })
            });
            if (!res.ok) throw new Error("Failed to save settings");
            applySettings(clinicName, docName, licId);
            closeModal("settings-modal");
            showToast("Portal settings saved and updated.");
        } catch (err) {
            console.error("Failed to save settings:", err);
            showToast("Failed to save settings to server.", "error");
        }
    });
}

const settingResetBtn = document.getElementById("setting-reset-db-btn");
if (settingResetBtn) {
    settingResetBtn.addEventListener("click", async () => {
        if (confirm("Are you sure you want to reset the database? This will revert all patient records to defaults and erase new entries.")) {
            try {
                await fetch("/api/reset", { method: "POST" });
                location.reload();
            } catch (err) {
                console.error("Failed to reset database:", err);
                showToast("Failed to reset database on server.", "error");
            }
        }
    });
}

// NOTIFICATIONS PANEL
const notifBtn = document.getElementById("notif-btn");
if (notifBtn) {
    notifBtn.addEventListener("click", (e) => {
        e.stopPropagation();
        // Clear notification badge when opened
        const badge = document.getElementById("notif-badge");
        if (badge) badge.style.display = "none";
        openModal("notifications-modal");
    });
}

const notifDismissBtn = document.getElementById("notif-dismiss-btn");
if (notifDismissBtn) {
    notifDismissBtn.addEventListener("click", () => {
        closeModal("notifications-modal");
        showToast("All notifications dismissed.");
    });
}

// PROTOCOL EDITING
const editProtocolBtn = document.getElementById("edit-protocol-btn");
if (editProtocolBtn) {
    editProtocolBtn.addEventListener("click", () => {
        if (activePatient.signed) {
            showToast("Cannot edit protocol on a verified case sheet.", "error");
            return;
        }
        const textarea = document.getElementById("protocol-edit-textarea");
        const displayEl = document.getElementById("protocol-summary-text");
        const editArea = document.getElementById("protocol-edit-area");
        if (textarea && displayEl && editArea) {
            textarea.value = activePatient.protocol;
            displayEl.style.display = "none";
            editArea.style.display = "block";
            editProtocolBtn.style.display = "none";
            document.getElementById("save-protocol-btn").style.display = "inline-flex";
        }
    });
}

const saveProtocolBtn = document.getElementById("save-protocol-btn");
if (saveProtocolBtn) {
    saveProtocolBtn.addEventListener("click", () => {
        const textarea = document.getElementById("protocol-edit-textarea");
        const displayEl = document.getElementById("protocol-summary-text");
        const editArea = document.getElementById("protocol-edit-area");
        if (textarea && displayEl && editArea) {
            activePatient.protocol = textarea.value;
            displayEl.textContent = activePatient.protocol;
            displayEl.style.display = "";
            editArea.style.display = "none";
            document.getElementById("edit-protocol-btn").style.display = "inline-flex";
            saveProtocolBtn.style.display = "none";
            showToast("Treatment protocol updated and saved.");
            triggerAutosave();
        }
    });
}

function applySettings(clinicName, docName, licId) {
    document.querySelectorAll("header.app-header h1, footer.app-footer p.font-display-lg").forEach(el => {
        el.textContent = clinicName;
    });
    
    document.querySelectorAll(".sidebar-nav h4.font-label-sm").forEach(el => {
        el.textContent = docName;
    });
    
    patients.forEach(p => {
        if (p.refId === "LSA-2024-00892") {
            p.signatureId = licId;
        }
    });
    
    const sigDesc = document.getElementById("signature-desc");
    if (sigDesc && activePatient.signed) {
        sigDesc.textContent = `This case sheet has been clinically reviewed and digitally signed by Lead Practitioner ${docName}.`;
    }
    
    const sigHash = document.getElementById("signature-hash-id");
    if (sigHash && activePatient.signed && activePatient.refId === "LSA-2024-00892") {
        sigHash.textContent = licId;
    }
}

// APP INITIAL LOAD
window.addEventListener("DOMContentLoaded", async () => {
    // Apply Settings from server
    try {
        const res = await fetch("/api/settings");
        const settings = await res.json();
        applySettings(settings.clinicName, settings.dermatologist, settings.licenseId);
    } catch (err) {
        console.error("Failed to load settings:", err);
    }

    // Initial Load patients from server
    await loadPatientsFromServer();
    
    // Position comparison slider initially in center
    setTimeout(() => {
        const width = sliderContainer.getBoundingClientRect().width;
        const left = sliderContainer.getBoundingClientRect().left;
        setSliderPosition(width / 2 + left);
    }, 300);
});
