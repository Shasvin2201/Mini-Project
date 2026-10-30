/* =========================================
   MANAGEMENT AUTHENTICATION & INITIALIZATION
========================================= */

if (window.authGuard) {
    authGuard.requireRole("management");
}

const loggedInUser = window.authGuard 
    ? authGuard.getLoggedInUser() 
    : (() => {
        try { return JSON.parse(localStorage.getItem("loggedInUser") || "null"); } catch (e) { return null; }
    })();

const API_URL = "http://localhost:5000/api";
let spaces = [];
let requests = [];
let currentOptFilter = "ALL";

function getLocalDateString(d = new Date()) {
    const year = d.getFullYear();
    const month = String(d.getMonth() + 1).padStart(2, "0");
    const day = String(d.getDate()).padStart(2, "0");
    return `${year}-${month}-${day}`;
}

function getLocalMonthString(d = new Date()) {
    const year = d.getFullYear();
    const month = String(d.getMonth() + 1).padStart(2, "0");
    return `${year}-${month}`;
}

// Time-based utilization state
let currentTimeView = "daily";
let selectedDate = getLocalDateString();
let selectedWeek = "";
let selectedMonth = getLocalMonthString();
let selectedTimeSpaceType = "ALL";
let selectedTimeBlock = "ALL";

/* =========================================
   DOM EVENT LISTENERS
========================================= */

document.addEventListener("DOMContentLoaded", async () => {
    const managementName = document.getElementById("managementName");
    if (managementName && loggedInUser) {
        managementName.textContent = loggedInUser.name || "Management";
    }

    setupNavigation();
    setupOptimizationFilters();
    setupTimeUtilizationControls();

    await loadSpaces();
    await loadRequests();
});

/* =========================================
   NAVIGATION & TAB SWITCHING
========================================= */

function navigateToPage(pageName) {
    if (pageName === "schedule") {
        const utilMenu = document.querySelector(`.menu[data-page="utilization"]`);
        if (utilMenu) utilMenu.click();
        switchUtilSubtab("schedule");
        return;
    }
    const menu = document.querySelector(`.menu[data-page="${pageName}"]`);
    if (menu) {
        menu.click();
    }
}
window.navigateToPage = navigateToPage;

function switchUtilSubtab(subtabName) {
    const buttons = document.querySelectorAll(".util-subtab-btn");
    const overviewContent = document.getElementById("utilOverviewTabContent");
    const scheduleContent = document.getElementById("utilScheduleTabContent");

    buttons.forEach(btn => {
        if (btn.dataset.subtab === subtabName) {
            btn.classList.add("active");
        } else {
            btn.classList.remove("active");
        }
    });

    if (subtabName === "schedule") {
        if (overviewContent) overviewContent.style.display = "none";
        if (scheduleContent) scheduleContent.style.display = "block";
        renderTimeUtilization();
    } else {
        if (overviewContent) overviewContent.style.display = "block";
        if (scheduleContent) scheduleContent.style.display = "none";
        updateUtilization();
    }
}
window.switchUtilSubtab = switchUtilSubtab;

function setupNavigation() {
    const menuItems = document.querySelectorAll(".menu");
    const pages = {
        dashboard: document.getElementById("dashboardPage"),
        utilization: document.getElementById("utilizationPage")
    };

    menuItems.forEach(menu => {
        menu.addEventListener("click", (event) => {
            event.preventDefault();
            const pageName = menu.dataset.page;

            Object.values(pages).forEach(page => {
                if (page) page.style.display = "none";
            });

            if (pages[pageName]) {
                pages[pageName].style.display = "block";
            }

            menuItems.forEach(item => item.classList.remove("active"));
            menu.classList.add("active");

            if (pageName === "dashboard") updateDashboard();
            if (pageName === "utilization") {
                const activeSubtab = document.querySelector(".util-subtab-btn.active")?.dataset.subtab || "overview";
                switchUtilSubtab(activeSubtab);
            }
        });
    });

    // Sub-tab switching listeners inside Utilization page
    document.querySelectorAll(".util-subtab-btn").forEach(btn => {
        btn.addEventListener("click", () => {
            switchUtilSubtab(btn.dataset.subtab);
        });
    });

    const logoutBtn = document.getElementById("logoutBtn");
    if (logoutBtn) {
        logoutBtn.addEventListener("click", () => {
            if (confirm("Are you sure you want to log out of Management Portal?")) {
                if (window.authGuard) {
                    authGuard.logout();
                } else {
                    localStorage.removeItem("loggedInUser");
                    window.location.replace("login.html");
                }
            }
        });
    }
}

function setupOptimizationFilters() {
    const filterBtns = document.querySelectorAll(".opt-filter-btn");
    filterBtns.forEach(btn => {
        btn.addEventListener("click", () => {
            filterBtns.forEach(b => b.classList.remove("active"));
            btn.classList.add("active");
            currentOptFilter = btn.dataset.filter;
            renderIndividualSpaces();
        });
    });
}

/* =========================================
   DATA LOADING
========================================= */

async function loadSpaces() {
    try {
        const response = await fetch(`${API_URL}/spaces`);
        if (!response.ok) throw new Error("Failed to load spaces");

        spaces = await response.json();
        populateTimeBlockDropdown();
        updateDashboard();
        updateUtilization();
    } catch (error) {
        console.error(error);
        showError("Unable to connect to server to load space data.");
    }
}

function populateTimeBlockDropdown() {
    const timeBlockFilter = document.getElementById("timeBlockFilter");
    if (!timeBlockFilter) return;

    const currentVal = timeBlockFilter.value || "ALL";
    const activeSpaces = spaces.filter(s => s.status !== "Inactive");
    const blocks = Array.from(new Set(
        activeSpaces.map(s => String(s.block || "").trim()).filter(Boolean)
    )).sort((a, b) => a.localeCompare(b, undefined, { numeric: true, sensitivity: "base" }));

    timeBlockFilter.innerHTML = `<option value="ALL">All Blocks</option>`;
    blocks.forEach(block => {
        const opt = document.createElement("option");
        opt.value = block;
        opt.textContent = block;
        timeBlockFilter.appendChild(opt);
    });

    if (blocks.includes(currentVal)) {
        timeBlockFilter.value = currentVal;
    } else {
        timeBlockFilter.value = "ALL";
    }
}

async function loadRequests() {
    try {
        const response = await fetch(`${API_URL}/requests`);
        if (!response.ok) throw new Error("Failed to load requests");

        const data = await response.json();
        requests = data.map(req => {
            const dateStr = req.request_date ? String(req.request_date).split("T")[0] : "";
            const startTimeStr = req.start_time ? String(req.start_time).slice(0, 5) : "";
            const endTimeStr = req.end_time ? String(req.end_time).slice(0, 5) : "";
            const statusUpper = String(req.status || "").toUpperCase();

            return {
                id: req.id,
                faculty: req.faculty_name || "Faculty",
                faculty_name: req.faculty_name || "Faculty",
                faculty_id: req.faculty_id,
                space: req.space_name || "",
                space_name: req.space_name || "",
                space_id: req.space_id,
                spaceId: req.space_id,
                block: req.block || "",
                type: req.type || "",
                date: dateStr,
                request_date: dateStr,
                startTime: startTimeStr,
                start_time: startTimeStr,
                endTime: endTimeStr,
                end_time: endTimeStr,
                capacity: req.required_capacity,
                required_capacity: req.required_capacity,
                purpose: req.purpose || "",
                status: statusUpper
            };
        });

        updateDashboard();
        updateUtilization();
        updateRequestSummary();
    } catch (error) {
        console.error(error);
        updateRequestSummary();
    }
}

/* =========================================
   DASHBOARD CALCULATIONS
========================================= */

function isBookingOccupiedNow(req) {
    if (String(req.status || "").toUpperCase() !== "APPROVED") return false;
    const today = getLocalDateString();
    const reqDate = req.date || req.request_date;
    if (reqDate !== today) return false;

    const now = new Date();
    const curTime = String(now.getHours()).padStart(2, "0") + ":" + String(now.getMinutes()).padStart(2, "0");
    const start = String(req.startTime || req.start_time || "").slice(0, 5);
    const end = String(req.endTime || req.end_time || "").slice(0, 5);
    return curTime >= start && curTime <= end;
}

function isBookingReservedFuture(req) {
    if (String(req.status || "").toUpperCase() !== "APPROVED") return false;
    const today = getLocalDateString();
    const reqDate = req.date || req.request_date;
    return reqDate > today;
}

// Backward-compatible alias
function isBookingActiveNow(req) {
    return isBookingOccupiedNow(req);
}

function updateDashboard() {
    const activeSpaces = spaces.filter(s => s.status !== "Inactive");
    const total = activeSpaces.length;

    // Currently booked spaces = active approved bookings right now
    const bookedSpaces = activeSpaces.filter(s => 
        requests.some(r => Number(r.space_id || r.spaceId) === Number(s.id) && isBookingOccupiedNow(r))
    );
    const currentlyBooked = bookedSpaces.length;

    // Available spaces = spaces ready for allocation (status === 'Available' and not booked right now)
    const available = activeSpaces.filter(s => 
        s.status === "Available" && !bookedSpaces.some(b => Number(b.id) === Number(s.id))
    ).length;

    // Operational utilization: approved booked hours / total operational capacity (8 hrs/room)
    let totalBookedHoursToday = 0;
    activeSpaces.forEach(s => {
        const util = calculateSpaceUtilization(s.id);
        totalBookedHoursToday += util.bookedHours;
    });

    const totalOperationalHours = total * 8;
    const percentage = totalOperationalHours > 0 
        ? Math.min(100, Math.round((totalBookedHoursToday / totalOperationalHours) * 100)) 
        : 0;

    const totalEl = document.getElementById("totalSpaces");
    const availEl = document.getElementById("availableSpaces");
    const unavailEl = document.getElementById("unavailableSpaces");
    const utilEl = document.getElementById("overallUtilization");

    if (totalEl) totalEl.textContent = total;
    if (availEl) availEl.textContent = available;
    if (unavailEl) unavailEl.textContent = currentlyBooked;
    if (utilEl) utilEl.textContent = `${percentage}%`;

    renderBlockCards();
}

function renderBlockCards() {
    const blocksGrid = document.getElementById("blocksGrid");
    if (!blocksGrid) return;

    const activeSpaces = spaces.filter(s => s.status !== "Inactive");
    const blocks = Array.from(new Set(
        activeSpaces.map(s => String(s.block || "").trim()).filter(b => b !== "")
    )).sort();

    if (blocks.length === 0) {
        blocksGrid.innerHTML = `<div class="block-card"><p>No campus blocks found.</p></div>`;
        return;
    }

    blocksGrid.innerHTML = "";

    blocks.forEach(block => {
        const blockSpaces = activeSpaces.filter(s => String(s.block).trim().toLowerCase() === block.toLowerCase());
        const total = blockSpaces.length;
        let bookedHours = 0;
        let bookedNow = 0;

        blockSpaces.forEach(s => {
            const util = calculateSpaceUtilization(s.id);
            bookedHours += util.bookedHours;
            if (requests.some(r => Number(r.space_id || r.spaceId) === Number(s.id) && isBookingOccupiedNow(r))) {
                bookedNow++;
            }
        });

        const available = blockSpaces.filter(s => s.status === "Available" && !requests.some(r => Number(r.space_id || r.spaceId) === Number(s.id) && isBookingOccupiedNow(r))).length;
        const cr = blockSpaces.filter(s => String(s.type).toLowerCase() === "classroom").length;
        const sh = blockSpaces.filter(s => String(s.type).toLowerCase() === "seminar hall").length;
        const lab = blockSpaces.filter(s => String(s.type).toLowerCase() === "lab").length;

        const operationalHours = total * 8;
        const utilization = operationalHours > 0 ? Math.min(100, Math.round((bookedHours / operationalHours) * 100)) : 0;

        blocksGrid.innerHTML += `
            <div class="block-card">
                <div class="block-top">
                    <div class="block-icon">🏢</div>
                    <div class="block-info">
                        <h3>${escapeHTML(block)}</h3>
                        <p>${cr} CR • ${sh} SH • ${lab} LAB</p>
                        <small>${available} Available / ${bookedNow} Booked</small>
                    </div>
                </div>
                <div class="block-progress-label">
                    <span>Utilization</span>
                    <strong>${utilization}%</strong>
                </div>
                <div class="progress-track">
                    <div class="progress-bar" style="width: ${utilization}%"></div>
                </div>
            </div>
        `;
    });
}

/* =========================================
   UTILIZATION & OPTIMIZATION ANALYTICS
========================================= */

function updateUtilization() {
    const activeSpaces = spaces.filter(s => s.status !== "Inactive");
    const total = activeSpaces.length;

    let totalBookedHoursToday = 0;
    activeSpaces.forEach(s => {
        const util = calculateSpaceUtilization(s.id);
        totalBookedHoursToday += util.bookedHours;
    });

    const totalOperationalHours = total * 8;
    const percentage = totalOperationalHours > 0 
        ? Math.min(100, Math.round((totalBookedHoursToday / totalOperationalHours) * 100)) 
        : 0;

    const pctEl = document.getElementById("utilizationPercentage");
    const barEl = document.getElementById("overallProgress");

    if (pctEl) pctEl.textContent = `${percentage}%`;
    if (barEl) barEl.style.width = `${percentage}%`;

    renderTypeCards();
    renderBlockUtilization();
    renderIndividualSpaces();
    renderTimeUtilization();
}

function calculateSpaceUtilization(spaceId) {
    const space = spaces.find(s => Number(s.id) === Number(spaceId));
    if (!space) return { percentage: 0, bookedHours: 0, status: "Available" };

    const today = getLocalDateString();
    // Daily calculation: approved bookings for today
    const todayApprovedRequests = requests.filter(r => 
        Number(r.space_id || r.spaceId) === Number(spaceId) &&
        String(r.status).toUpperCase() === "APPROVED" &&
        (r.date === today || r.request_date === today)
    );

    let bookedHours = 0;
    todayApprovedRequests.forEach(req => {
        const start = req.startTime || req.start_time;
        const end = req.endTime || req.end_time;
        if (start && end) {
            const [sh, sm] = String(start).split(":").map(Number);
            const [eh, em] = String(end).split(":").map(Number);
            const duration = (eh + em / 60) - (sh + sm / 60);
            if (duration > 0) bookedHours += duration;
        }
    });

    const isOccupiedNow = todayApprovedRequests.some(r => isBookingOccupiedNow(r));
    let displayStatus = space.status;
    if (space.status === "Inactive") {
        displayStatus = "Inactive";
    } else if (isOccupiedNow) {
        displayStatus = "In Use";
    }

    // Operational basis: 8 standard class hours per working day (09:00 - 17:00)
    const pct = Math.min(100, Math.round((bookedHours / 8) * 100));
    return { percentage: pct, bookedHours: Number(bookedHours.toFixed(1)), status: displayStatus };
}

function renderTypeCards() {
    const typeGrid = document.getElementById("typeGrid");
    if (!typeGrid) return;

    const activeSpaces = spaces.filter(s => s.status !== "Inactive");
    const types = [
        { key: "classroom", name: "Classrooms" },
        { key: "seminar hall", name: "Seminar Halls" },
        { key: "lab", name: "Labs" }
    ];

    typeGrid.innerHTML = "";

    types.forEach(t => {
        const typeSpaces = activeSpaces.filter(s => String(s.type).toLowerCase() === t.key);
        const total = typeSpaces.length;
        let bookedHours = 0;
        let bookedNow = 0;

        typeSpaces.forEach(s => {
            const util = calculateSpaceUtilization(s.id);
            bookedHours += util.bookedHours;
            if (requests.some(r => Number(r.space_id || r.spaceId) === Number(s.id) && isBookingOccupiedNow(r))) {
                bookedNow++;
            }
        });

        const available = typeSpaces.filter(s => s.status === "Available" && !requests.some(r => Number(r.space_id || r.spaceId) === Number(s.id) && isBookingOccupiedNow(r))).length;
        const operationalHours = total * 8;
        const utilization = operationalHours > 0 ? Math.min(100, Math.round((bookedHours / operationalHours) * 100)) : 0;

        typeGrid.innerHTML += `
            <div class="type-card">
                <h3>${t.name}</h3>
                <p>${total} Total Spaces</p>
                <div class="type-details"><span>Available</span><strong>${available}</strong></div>
                <div class="type-details"><span>Currently Booked</span><strong>${bookedNow}</strong></div>
                <div class="type-details"><span>Utilization</span><strong>${utilization}%</strong></div>
                <div class="progress-track"><div class="progress-bar" style="width:${utilization}%"></div></div>
            </div>
        `;
    });
}

function renderBlockUtilization() {
    const container = document.getElementById("blockUtilizationGrid");
    if (!container) return;

    const activeSpaces = spaces.filter(s => s.status !== "Inactive");
    const blocks = Array.from(new Set(
        activeSpaces.map(s => String(s.block || "").trim()).filter(b => b !== "")
    )).sort();

    container.innerHTML = "";

    blocks.forEach(block => {
        const blockSpaces = activeSpaces.filter(s => String(s.block).trim().toLowerCase() === block.toLowerCase());
        const total = blockSpaces.length;
        let bookedHours = 0;
        let bookedNow = 0;

        blockSpaces.forEach(s => {
            const util = calculateSpaceUtilization(s.id);
            bookedHours += util.bookedHours;
            if (requests.some(r => Number(r.space_id || r.spaceId) === Number(s.id) && isBookingOccupiedNow(r))) {
                bookedNow++;
            }
        });

        const operationalHours = total * 8;
        const utilization = operationalHours > 0 ? Math.min(100, Math.round((bookedHours / operationalHours) * 100)) : 0;

        let badgeClass = "badge-opt-high";
        let badgeLabel = "High Utilization";
        if (utilization < 40) {
            badgeClass = "badge-opt-warn";
            badgeLabel = "Underutilized";
        } else if (utilization < 75) {
            badgeClass = "badge-opt-mid";
            badgeLabel = "Moderate";
        }

        container.innerHTML += `
            <div class="block-utilization-card">
                <div style="display:flex; justify-content:space-between; align-items:flex-start;">
                    <div>
                        <h3>${escapeHTML(block)}</h3>
                        <p>${total} rooms (${bookedNow} currently booked)</p>
                    </div>
                    <span class="status-pill ${badgeClass}">${badgeLabel}</span>
                </div>
                <div class="block-progress-label" style="margin-top:12px;"><span>Block Usage</span> <strong>${utilization}%</strong></div>
                <div class="progress-track"><div class="progress-bar" style="width:${utilization}%"></div></div>
            </div>
        `;
    });
}

function renderIndividualSpaces() {
    const container = document.getElementById("individualSpaceGrid");
    if (!container) return;

    container.innerHTML = "";
    let lowUtilizedCount = 0;

    const spaceMetrics = spaces.map(space => {
        const util = calculateSpaceUtilization(space.id);
        if (util.percentage < 50) lowUtilizedCount++;
        return { space, ...util };
    });

    const underutilizedText = document.getElementById("underutilizedCountText");
    if (underutilizedText) {
        underutilizedText.textContent = `${lowUtilizedCount} out of ${spaces.length} Spaces Need Optimization`;
    }

    const filtered = spaceMetrics.filter(item => {
        if (currentOptFilter === "LOW") return item.percentage < 50;
        if (currentOptFilter === "MODERATE") return item.percentage >= 50 && item.percentage < 80;
        if (currentOptFilter === "HIGH") return item.percentage >= 80;
        return true;
    });

    if (filtered.length === 0) {
        container.innerHTML = `<div class="empty-opt-state" style="grid-column:1/-1; padding:32px; text-align:center; background:#fff; border-radius:12px; border:1px solid #e2e8f0;"><p>No spaces match the selected optimization filter.</p></div>`;
        return;
    }

    filtered.forEach(item => {
        const { space, percentage, bookedHours } = item;
        const isLowUtilized = percentage < 50;
        const isHighUtilized = percentage >= 80;

        let badgeClass = "opt-badge-low";
        let badgeLabel = "⚡ Needs Optimization (Low Usage)";
        let cardClass = "space-opt-card low-usage";
        let progressGradient = "linear-gradient(90deg, #f59e0b, #fbbf24)";

        if (isHighUtilized) {
            badgeClass = "opt-badge-high";
            badgeLabel = "🟢 High Utilization";
            cardClass = "space-opt-card high-usage";
            progressGradient = "linear-gradient(90deg, #10b981, #059669)";
        } else if (!isLowUtilized) {
            badgeClass = "opt-badge-mod";
            badgeLabel = "🟡 Moderate Usage";
            cardClass = "space-opt-card mod-usage";
            progressGradient = "linear-gradient(90deg, #0284c7, #38bdf8)";
        }

        const card = document.createElement("div");
        card.className = cardClass;
        card.innerHTML = `
            <div class="opt-card-header">
                <div>
                    <h3>${escapeHTML(space.space_name)}</h3>
                    <div class="opt-space-meta">${escapeHTML(space.block)} • ${escapeHTML(space.type)} • ${space.capacity} Seats</div>
                </div>
                <span class="${badgeClass}">${badgeLabel}</span>
            </div>

            <div class="opt-metrics-row">
                <div>
                    <span>Occupancy Rate</span>
                    <strong>${percentage}%</strong>
                </div>
                <div>
                    <span>Booked Duration</span>
                    <strong>${bookedHours.toFixed(1)} hrs / day</strong>
                </div>
                <div>
                    <span>Status</span>
                    <strong class="${item.status === 'Available' ? 'text-success' : 'text-danger'}">${item.status}</strong>
                </div>
            </div>

            <div class="progress-track" style="margin: 12px 0;">
                <div class="progress-bar" style="width:${percentage}%; background: ${progressGradient}"></div>
            </div>
        `;
        container.appendChild(card);
    });
}

function updateRequestSummary() {
    const total = requests.length;
    const pending = requests.filter(r => String(r.status).toUpperCase() === "PENDING").length;
    const approved = requests.filter(r => String(r.status).toUpperCase() === "APPROVED").length;
    const rejected = requests.filter(r => String(r.status).toUpperCase() === "REJECTED").length;

    const totalEl = document.getElementById("totalRequests");
    const pendingEl = document.getElementById("pendingRequests");
    const approvedEl = document.getElementById("approvedRequests");
    const rejectedEl = document.getElementById("rejectedRequests");

    if (totalEl) totalEl.textContent = total;
    if (pendingEl) pendingEl.textContent = pending;
    if (approvedEl) approvedEl.textContent = approved;
    if (rejectedEl) rejectedEl.textContent = rejected;
}

function showError(text) {
    const msgEl = document.getElementById("message");
    if (msgEl) {
        msgEl.textContent = text;
        msgEl.style.display = "block";
    }
}

function escapeHTML(str) {
    if (!str) return "";
    return String(str)
        .replace(/&/g, "&amp;")
        .replace(/</g, "&lt;")
        .replace(/>/g, "&gt;")
        .replace(/"/g, "&quot;")
        .replace(/'/g, "&#039;");
}

/* =========================================
   TIME-BASED UTILIZATION (DAILY, WEEKLY, MONTHLY)
========================================= */

function getCurrentWeekString(d = new Date()) {
    const target = new Date(d.valueOf());
    const dayNr = (d.getDay() + 6) % 7;
    target.setDate(target.getDate() - dayNr + 3);
    const firstThursday = target.valueOf();
    target.setMonth(0, 1);
    if (target.getDay() !== 4) {
        target.setMonth(0, 1 + ((4 - target.getDay()) + 7) % 7);
    }
    const week = 1 + Math.ceil((firstThursday - target) / 604800000);
    const year = target.getFullYear();
    return `${year}-W${String(week).padStart(2, '0')}`;
}

function getWeekDates(weekString) {
    if (!weekString || !weekString.includes("-W")) {
        weekString = getCurrentWeekString();
    }
    const [yearStr, weekStr] = weekString.split("-W");
    const year = parseInt(yearStr, 10);
    const week = parseInt(weekStr, 10);
    const simple = new Date(Date.UTC(year, 0, 4));
    const dayOfWeek = simple.getUTCDay() || 7;
    const isoMonday = new Date(simple.getTime() - (dayOfWeek - 1) * 86400000);
    const weekStart = new Date(isoMonday.getTime() + (week - 1) * 7 * 86400000);
    const weekEnd = new Date(weekStart.getTime() + 5 * 86400000); // Mon to Sat
    return {
        startDate: weekStart.toISOString().split("T")[0],
        endDate: weekEnd.toISOString().split("T")[0]
    };
}

function setupTimeUtilizationControls() {
    const dateInput = document.getElementById("utilDatePicker");
    if (dateInput) {
        dateInput.value = selectedDate;
        dateInput.addEventListener("change", () => {
            selectedDate = dateInput.value;
            renderTimeUtilization();
        });
    }

    const weekInput = document.getElementById("utilWeekPicker");
    if (weekInput) {
        selectedWeek = getCurrentWeekString();
        weekInput.value = selectedWeek;
        weekInput.addEventListener("change", () => {
            selectedWeek = weekInput.value;
            renderTimeUtilization();
        });
    }

    const monthInput = document.getElementById("utilMonthPicker");
    if (monthInput) {
        monthInput.value = selectedMonth;
        monthInput.addEventListener("change", () => {
            selectedMonth = monthInput.value;
            renderTimeUtilization();
        });
    }

    const typeFilter = document.getElementById("timeSpaceTypeFilter");
    if (typeFilter) {
        typeFilter.addEventListener("change", () => {
            selectedTimeSpaceType = typeFilter.value;
            renderTimeUtilization();
        });
    }

    const blockFilter = document.getElementById("timeBlockFilter");
    if (blockFilter) {
        blockFilter.addEventListener("change", () => {
            selectedTimeBlock = blockFilter.value;
            renderTimeUtilization();
        });
    }

    const tabBtns = document.querySelectorAll(".time-tab-btn");
    tabBtns.forEach(btn => {
        btn.addEventListener("click", () => {
            tabBtns.forEach(b => b.classList.remove("active"));
            btn.classList.add("active");
            currentTimeView = btn.dataset.timeview;

            const dailyGrp = document.getElementById("dailyPickerGroup");
            const weeklyGrp = document.getElementById("weeklyPickerGroup");
            const monthlyGrp = document.getElementById("monthlyPickerGroup");

            if (dailyGrp) dailyGrp.style.display = (currentTimeView === "daily" || currentTimeView === "blockwise") ? "flex" : "none";
            if (weeklyGrp) weeklyGrp.style.display = currentTimeView === "weekly" ? "flex" : "none";
            if (monthlyGrp) monthlyGrp.style.display = currentTimeView === "monthly" ? "flex" : "none";

            renderTimeUtilization();
        });
    });
}

function renderTimeUtilization() {
    const summaryContainer = document.getElementById("timeStatsSummary");
    const gridContainer = document.getElementById("timeScheduleGrid");
    if (!summaryContainer || !gridContainer) return;

    if (currentTimeView === "daily") {
        renderDailySchedule(summaryContainer, gridContainer);
    } else if (currentTimeView === "weekly") {
        renderWeeklySchedule(summaryContainer, gridContainer);
    } else if (currentTimeView === "monthly") {
        renderMonthlySchedule(summaryContainer, gridContainer);
    } else if (currentTimeView === "blockwise") {
        renderBlockwiseSchedule(summaryContainer, gridContainer);
    }
}

function renderDailySchedule(summaryEl, gridEl) {
    const dayRequests = requests.filter(r => 
        (r.date === selectedDate || r.request_date === selectedDate) &&
        String(r.status).toUpperCase() === "APPROVED"
    );

    const filteredSpaces = spaces.filter(s => 
        (selectedTimeSpaceType === "ALL" || s.type === selectedTimeSpaceType) &&
        (selectedTimeBlock === "ALL" || s.block === selectedTimeBlock)
    );

    let totalAllocatedHours = 0;
    let occupiedRoomsCount = 0;

    const cardsHtml = filteredSpaces.map(space => {
        const spaceReqs = dayRequests.filter(r => Number(r.space_id || r.spaceId) === Number(space.id));
        let bookedHours = 0;

        spaceReqs.forEach(req => {
            const start = req.startTime || req.start_time;
            const end = req.endTime || req.end_time;
            if (start && end) {
                const [sh, sm] = String(start).split(":").map(Number);
                const [eh, em] = String(end).split(":").map(Number);
                const duration = (eh + em / 60) - (sh + sm / 60);
                if (duration > 0) bookedHours += duration;
            }
        });

        if (bookedHours > 0) occupiedRoomsCount++;
        totalAllocatedHours += bookedHours;

        const pct = Math.min(100, Math.round((bookedHours / 8) * 100));

        let cardClass = "status-free";
        let badgeClass = "badge-success";
        let badgeText = "Available All Day";

        if (pct >= 75) {
            cardClass = "status-booked";
            badgeClass = "badge-danger";
            badgeText = "Heavily Utilized";
        } else if (pct > 0) {
            cardClass = "status-partial";
            badgeClass = "badge-warning";
            badgeText = "Partially Booked";
        }

        const slotItems = spaceReqs.length > 0
            ? spaceReqs.map(req => {
                const start = req.startTime || req.start_time;
                const end = req.endTime || req.end_time;
                const fac = req.faculty || req.faculty_name || "Faculty";
                return `
                <div class="time-slot-item">
                    <span class="time-slot-time">${escapeHTML(start)} - ${escapeHTML(end)}</span>
                    <span class="time-slot-desc" title="${escapeHTML(req.purpose)}">${escapeHTML(fac)}: ${escapeHTML(req.purpose)}</span>
                </div>
              `;
            }).join("")
            : `<div class="time-empty-slots">✓ No bookings on this date (Available all 8 working hours)</div>`;

        return `
            <div class="time-room-card ${cardClass}">
                <div class="time-room-header">
                    <div>
                        <div class="time-room-title">${escapeHTML(space.space_name)}</div>
                        <div class="time-room-meta">${escapeHTML(space.block)} • ${escapeHTML(space.type)} (${space.capacity} seats)</div>
                    </div>
                    <span class="time-room-badge ${badgeClass}">${badgeText}</span>
                </div>
                <div class="time-room-metrics">
                    <span>Usage: <strong>${bookedHours.toFixed(1)} hrs</strong> / 8 hrs</span>
                    <span>Occupancy: <strong>${pct}%</strong></span>
                </div>
                <div class="progress-track">
                    <div class="progress-bar" style="width:${pct}%"></div>
                </div>
                <div class="time-slot-list">
                    ${slotItems}
                </div>
            </div>
        `;
    }).join("");

    const dayCapacity = filteredSpaces.length * 8;
    const overallDayPct = dayCapacity > 0 ? Math.round((totalAllocatedHours / dayCapacity) * 100) : 0;

    summaryEl.innerHTML = `
        <div class="time-stat-pill">
            <span>Date Selected</span>
            <strong>${selectedDate}</strong>
            <small>Daily Schedule Analysis</small>
        </div>
        <div class="time-stat-pill">
            <span>Rooms Occupied</span>
            <strong>${occupiedRoomsCount} / ${filteredSpaces.length}</strong>
            <small>${filteredSpaces.length - occupiedRoomsCount} rooms currently idle</small>
        </div>
        <div class="time-stat-pill">
            <span>Total Booked Hours</span>
            <strong>${totalAllocatedHours.toFixed(1)} hrs</strong>
            <small>Out of ${dayCapacity} operational hours</small>
        </div>
        <div class="time-stat-pill">
            <span>Daily Utilization</span>
            <strong style="color:var(--primary);">${overallDayPct}%</strong>
            <small>Campus room occupancy</small>
        </div>
    `;

    gridEl.innerHTML = cardsHtml || `<p style="grid-column:1/-1;text-align:center;color:var(--text-muted);padding:30px;">No spaces match the selected filter.</p>`;
}

function renderWeeklySchedule(summaryEl, gridEl) {
    const { startDate, endDate } = getWeekDates(selectedWeek);

    const weekRequests = requests.filter(r => {
        const d = r.date || r.request_date;
        return d >= startDate && d <= endDate &&
            String(r.status).toUpperCase() === "APPROVED";
    });

    const filteredSpaces = spaces.filter(s => 
        (selectedTimeSpaceType === "ALL" || s.type === selectedTimeSpaceType) &&
        (selectedTimeBlock === "ALL" || s.block === selectedTimeBlock)
    );

    let totalWeeklyHours = 0;
    let activeSpacesCount = 0;

    const cardsHtml = filteredSpaces.map(space => {
        const spaceReqs = weekRequests.filter(r => Number(r.space_id || r.spaceId) === Number(space.id));
        let bookedHours = 0;

        const daysMap = { Mon: 0, Tue: 0, Wed: 0, Thu: 0, Fri: 0, Sat: 0 };
        const dayNames = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

        spaceReqs.forEach(req => {
            const start = req.startTime || req.start_time;
            const end = req.endTime || req.end_time;
            const dStr = req.date || req.request_date;
            if (start && end) {
                const [sh, sm] = String(start).split(":").map(Number);
                const [eh, em] = String(end).split(":").map(Number);
                const duration = (eh + em / 60) - (sh + sm / 60);
                if (duration > 0) {
                    bookedHours += duration;
                    const d = new Date(dStr + "T00:00:00");
                    const dayName = dayNames[d.getDay()];
                    if (daysMap[dayName] !== undefined) {
                        daysMap[dayName] += duration;
                    }
                }
            }
        });

        if (bookedHours > 0) activeSpacesCount++;
        totalWeeklyHours += bookedHours;

        const pct = Math.min(100, Math.round((bookedHours / 48) * 100));

        let cardClass = "status-free";
        let badgeClass = "badge-success";
        let badgeText = "Underutilized";

        if (pct >= 50) {
            cardClass = "status-booked";
            badgeClass = "badge-danger";
            badgeText = "High Weekly Usage";
        } else if (pct >= 20) {
            cardClass = "status-partial";
            badgeClass = "badge-warning";
            badgeText = "Moderate Usage";
        }

        const daysPills = Object.keys(daysMap).map(day => `
            <div style="text-align:center; background:var(--bg-main); padding:4px 6px; border-radius:4px; font-size:0.75rem; border:1px solid var(--border);">
                <div style="font-weight:600; color:var(--text-muted);">${day}</div>
                <div style="font-weight:700; color:${daysMap[day] > 0 ? 'var(--primary)' : 'var(--text-muted)'};">${daysMap[day] > 0 ? daysMap[day].toFixed(1) + 'h' : '-'}</div>
            </div>
        `).join("");

        return `
            <div class="time-room-card ${cardClass}">
                <div class="time-room-header">
                    <div>
                        <div class="time-room-title">${escapeHTML(space.space_name)}</div>
                        <div class="time-room-meta">${escapeHTML(space.block)} • ${escapeHTML(space.type)}</div>
                    </div>
                    <span class="time-room-badge ${badgeClass}">${badgeText}</span>
                </div>
                <div class="time-room-metrics">
                    <span>Weekly Total: <strong>${bookedHours.toFixed(1)} hrs</strong></span>
                    <span>Occupancy: <strong>${pct}%</strong> (${spaceReqs.length} sessions)</span>
                </div>
                <div class="progress-track">
                    <div class="progress-bar" style="width:${pct}%"></div>
                </div>
                <div style="display:grid; grid-template-columns:repeat(6, 1fr); gap:4px; margin-top:6px;">
                    ${daysPills}
                </div>
            </div>
        `;
    }).join("");

    const totalWeeklyCapacity = filteredSpaces.length * 48;
    const overallWeeklyPct = totalWeeklyCapacity > 0 ? Math.round((totalWeeklyHours / totalWeeklyCapacity) * 100) : 0;

    summaryEl.innerHTML = `
        <div class="time-stat-pill">
            <span>Week Period</span>
            <strong>${startDate} to ${endDate}</strong>
            <small>Week ${selectedWeek.split('-W')[1] || ''}</small>
        </div>
        <div class="time-stat-pill">
            <span>Active Rooms</span>
            <strong>${activeSpacesCount} / ${filteredSpaces.length}</strong>
            <small>Used at least once this week</small>
        </div>
        <div class="time-stat-pill">
            <span>Total Booked Hours</span>
            <strong>${totalWeeklyHours.toFixed(1)} hrs</strong>
            <small>Across ${weekRequests.length} approved sessions</small>
        </div>
        <div class="time-stat-pill">
            <span>Weekly Occupancy Rate</span>
            <strong style="color:var(--primary);">${overallWeeklyPct}%</strong>
            <small>Out of ${totalWeeklyCapacity} total weekly room hours</small>
        </div>
    `;

    gridEl.innerHTML = cardsHtml || `<p style="grid-column:1/-1;text-align:center;color:var(--text-muted);padding:30px;">No spaces match the selected filter.</p>`;
}

function renderMonthlySchedule(summaryEl, gridEl) {
    const monthRequests = requests.filter(r => {
        const d = r.date || r.request_date;
        return d && d.startsWith(selectedMonth) &&
            String(r.status).toUpperCase() === "APPROVED";
    });

    const filteredSpaces = spaces.filter(s => 
        (selectedTimeSpaceType === "ALL" || s.type === selectedTimeSpaceType) &&
        (selectedTimeBlock === "ALL" || s.block === selectedTimeBlock)
    );

    let totalMonthlyHours = 0;
    let activeSpacesCount = 0;

    const cardsHtml = filteredSpaces.map(space => {
        const spaceReqs = monthRequests.filter(r => Number(r.space_id || r.spaceId) === Number(space.id));
        let bookedHours = 0;

        spaceReqs.forEach(req => {
            const start = req.startTime || req.start_time;
            const end = req.endTime || req.end_time;
            if (start && end) {
                const [sh, sm] = String(start).split(":").map(Number);
                const [eh, em] = String(end).split(":").map(Number);
                const duration = (eh + em / 60) - (sh + sm / 60);
                if (duration > 0) bookedHours += duration;
            }
        });

        if (bookedHours > 0) activeSpacesCount++;
        totalMonthlyHours += bookedHours;

        const pct = Math.min(100, Math.round((bookedHours / 176) * 100));

        let cardClass = "status-free";
        let badgeClass = "badge-success";
        let badgeText = "Underutilized";

        if (pct >= 40) {
            cardClass = "status-booked";
            badgeClass = "badge-danger";
            badgeText = "High Monthly Usage";
        } else if (pct >= 15) {
            cardClass = "status-partial";
            badgeClass = "badge-warning";
            badgeText = "Moderate Usage";
        }

        return `
            <div class="time-room-card ${cardClass}">
                <div class="time-room-header">
                    <div>
                        <div class="time-room-title">${escapeHTML(space.space_name)}</div>
                        <div class="time-room-meta">${escapeHTML(space.block)} • ${escapeHTML(space.type)}</div>
                    </div>
                    <span class="time-room-badge ${badgeClass}">${badgeText}</span>
                </div>
                <div class="time-room-metrics">
                    <span>Monthly Hours: <strong>${bookedHours.toFixed(1)} hrs</strong></span>
                    <span>Occupancy: <strong>${pct}%</strong></span>
                </div>
                <div class="progress-track">
                    <div class="progress-bar" style="width:${pct}%"></div>
                </div>
                <div style="font-size:0.8rem; color:var(--text-muted); display:flex; justify-content:space-between; margin-top:4px;">
                    <span>Sessions conducted: <strong>${spaceReqs.length}</strong></span>
                    <span>Avg duration: <strong>${spaceReqs.length > 0 ? (bookedHours / spaceReqs.length).toFixed(1) + ' hrs' : '0 hrs'}</strong></span>
                </div>
            </div>
        `;
    }).join("");

    const totalMonthlyCapacity = filteredSpaces.length * 176;
    const overallMonthlyPct = totalMonthlyCapacity > 0 ? Math.round((totalMonthlyHours / totalMonthlyCapacity) * 100) : 0;

    summaryEl.innerHTML = `
        <div class="time-stat-pill">
            <span>Month Selected</span>
            <strong>${selectedMonth}</strong>
            <small>Monthly Aggregated Utilization</small>
        </div>
        <div class="time-stat-pill">
            <span>Active Facilities</span>
            <strong>${activeSpacesCount} / ${filteredSpaces.length}</strong>
            <small>${filteredSpaces.length - activeSpacesCount} facilities unbooked</small>
        </div>
        <div class="time-stat-pill">
            <span>Total Monthly Hours</span>
            <strong>${totalMonthlyHours.toFixed(1)} hrs</strong>
            <small>Across ${monthRequests.length} bookings</small>
        </div>
        <div class="time-stat-pill">
            <span>Monthly Occupancy Rate</span>
            <strong style="color:var(--primary);">${overallMonthlyPct}%</strong>
            <small>Out of ${totalMonthlyCapacity} total capacity hours</small>
        </div>
    `;

    gridEl.innerHTML = cardsHtml || `<p style="grid-column:1/-1;text-align:center;color:var(--text-muted);padding:30px;">No spaces match the selected filter.</p>`;
}

function renderBlockwiseSchedule(summaryEl, gridEl) {
    const dayRequests = requests.filter(r => 
        (r.date === selectedDate || r.request_date === selectedDate) &&
        String(r.status).toUpperCase() === "APPROVED"
    );

    const candidateSpaces = spaces.filter(s => 
        s.status !== "Inactive" &&
        (selectedTimeSpaceType === "ALL" || s.type === selectedTimeSpaceType) &&
        (selectedTimeBlock === "ALL" || s.block === selectedTimeBlock)
    );

    const blockNames = Array.from(new Set(
        candidateSpaces.map(s => String(s.block || "").trim()).filter(Boolean)
    )).sort((a, b) => a.localeCompare(b, undefined, { numeric: true, sensitivity: "base" }));

    if (blockNames.length === 0) {
        summaryEl.innerHTML = `
            <div class="time-stat-pill">
                <span>Date Selected</span>
                <strong>${selectedDate}</strong>
                <small>Block-wise Schedule Analysis</small>
            </div>
            <div class="time-stat-pill">
                <span>Campus Blocks</span>
                <strong>0 Blocks</strong>
                <small>No blocks match filter</small>
            </div>
            <div class="time-stat-pill">
                <span>Rooms Evaluated</span>
                <strong>0 Rooms</strong>
                <small>No spaces found</small>
            </div>
            <div class="time-stat-pill">
                <span>Scheduled Load</span>
                <strong style="color:var(--text-muted);">0%</strong>
                <small>Zero occupancy</small>
            </div>
        `;
        gridEl.innerHTML = `<p style="grid-column:1/-1;text-align:center;color:var(--text-muted);padding:30px;">No spaces match the selected block/type filter.</p>`;
        return;
    }

    let overallBookedHours = 0;
    let overallOccupiedRooms = 0;
    let peakBlockName = null;
    let peakBlockPct = -1;

    const blockSectionsHtml = blockNames.map(blockName => {
        const blockSpaces = candidateSpaces.filter(s => s.block === blockName);
        let blockBookedHours = 0;
        let blockOccupiedRooms = 0;
        let totalCapacity = 0;

        const roomCards = blockSpaces.map(space => {
            totalCapacity += Number(space.capacity || 0);
            const spaceReqs = dayRequests.filter(r => Number(r.space_id || r.spaceId) === Number(space.id));
            let bookedHours = 0;

            spaceReqs.forEach(req => {
                const start = req.startTime || req.start_time;
                const end = req.endTime || req.end_time;
                if (start && end) {
                    const [sh, sm] = String(start).split(":").map(Number);
                    const [eh, em] = String(end).split(":").map(Number);
                    const duration = (eh + em / 60) - (sh + sm / 60);
                    if (duration > 0) bookedHours += duration;
                }
            });

            if (bookedHours > 0) blockOccupiedRooms++;
            blockBookedHours += bookedHours;

            const pct = Math.min(100, Math.round((bookedHours / 8) * 100));

            let cardClass = "status-free";
            let badgeClass = "badge-success";
            let badgeText = "Available All Day";

            if (pct >= 75) {
                cardClass = "status-booked";
                badgeClass = "badge-danger";
                badgeText = "Heavily Utilized";
            } else if (pct > 0) {
                cardClass = "status-partial";
                badgeClass = "badge-warning";
                badgeText = "Partially Booked";
            }

            const isOccupiedNow = (selectedDate === getLocalDateString()) && spaceReqs.some(r => isBookingOccupiedNow(r));
            const liveBadge = isOccupiedNow ? `<span style="display:inline-block; margin-left:6px; font-size:0.72rem; color:#dc2626; font-weight:700;">● IN SESSION NOW</span>` : "";

            const slotItems = spaceReqs.length > 0
                ? spaceReqs.map(req => {
                    const start = req.startTime || req.start_time;
                    const end = req.endTime || req.end_time;
                    const fac = req.faculty || req.faculty_name || "Faculty";
                    return `
                    <div class="time-slot-item">
                        <span class="time-slot-time">${escapeHTML(start)} - ${escapeHTML(end)}</span>
                        <span class="time-slot-desc" title="${escapeHTML(req.purpose)}">${escapeHTML(fac)}: ${escapeHTML(req.purpose)}</span>
                    </div>
                    `;
                }).join("")
                : `<div class="time-empty-slots">✓ No bookings on this date (Available all 8 working hours)</div>`;

            return `
                <div class="time-room-card ${cardClass}">
                    <div class="time-room-header">
                        <div>
                            <div class="time-room-title">${escapeHTML(space.space_name)} ${liveBadge}</div>
                            <div class="time-room-meta">${escapeHTML(space.type)} (${space.capacity} seats)</div>
                        </div>
                        <span class="time-room-badge ${badgeClass}">${badgeText}</span>
                    </div>
                    <div class="time-room-metrics">
                        <span>Usage: <strong>${bookedHours.toFixed(1)} hrs</strong> / 8 hrs</span>
                        <span>Occupancy: <strong>${pct}%</strong></span>
                    </div>
                    <div class="progress-track">
                        <div class="progress-bar" style="width:${pct}%"></div>
                    </div>
                    <div class="time-slot-list">
                        ${slotItems}
                    </div>
                </div>
            `;
        }).join("");

        overallBookedHours += blockBookedHours;
        overallOccupiedRooms += blockOccupiedRooms;

        const blockMaxHours = blockSpaces.length * 8;
        const blockPct = blockMaxHours > 0 ? Math.round((blockBookedHours / blockMaxHours) * 100) : 0;

        if (blockPct > peakBlockPct) {
            peakBlockPct = blockPct;
            peakBlockName = blockName;
        }

        let blockBadgeClass = "badge-success";
        let blockBadgeText = "Low / Free Load";
        if (blockPct >= 75) {
            blockBadgeClass = "badge-danger";
            blockBadgeText = "High Occupancy";
        } else if (blockPct >= 30) {
            blockBadgeClass = "badge-warning";
            blockBadgeText = "Moderate Load";
        }

        return `
            <div class="block-schedule-section">
                <div class="block-schedule-header">
                    <div class="block-header-left">
                        <div class="block-badge-icon">🏢</div>
                        <div>
                            <h3 class="block-schedule-title">${escapeHTML(blockName)}</h3>
                            <p class="block-schedule-subtitle">${blockSpaces.length} Rooms • ${totalCapacity} Total Seats</p>
                        </div>
                    </div>
                    <div class="block-header-right">
                        <div class="block-header-stats">
                            <span class="block-stat-pill"><strong>${blockOccupiedRooms}</strong> / ${blockSpaces.length} Booked</span>
                            <span class="block-stat-pill"><strong>${blockBookedHours.toFixed(1)}h</strong> Booked</span>
                            <span class="block-stat-pill">Utilization: <strong>${blockPct}%</strong></span>
                        </div>
                        <span class="time-room-badge ${blockBadgeClass}">${blockBadgeText}</span>
                    </div>
                </div>
                <div class="block-progress-track">
                    <div class="block-progress-bar" style="width:${blockPct}%;"></div>
                </div>
                <div class="time-rooms-grid" style="margin-top:16px;">
                    ${roomCards}
                </div>
            </div>
        `;
    }).join("");

    const totalOperationalHours = candidateSpaces.length * 8;
    const overallPct = totalOperationalHours > 0 ? Math.round((overallBookedHours / totalOperationalHours) * 100) : 0;

    summaryEl.innerHTML = `
        <div class="time-stat-pill">
            <span>Date Selected</span>
            <strong>${selectedDate}</strong>
            <small>Block-wise Schedule Analysis</small>
        </div>
        <div class="time-stat-pill">
            <span>Campus Blocks</span>
            <strong>${blockNames.length} Blocks</strong>
            <small>${candidateSpaces.length} rooms mapped</small>
        </div>
        <div class="time-stat-pill">
            <span>Rooms Booked</span>
            <strong>${overallOccupiedRooms} / ${candidateSpaces.length}</strong>
            <small>${candidateSpaces.length - overallOccupiedRooms} rooms available all day</small>
        </div>
        <div class="time-stat-pill">
            <span>Peak Block Load</span>
            <strong style="color:var(--primary);">${peakBlockName ? escapeHTML(peakBlockName) + ' (' + peakBlockPct + '%)' : 'None (0%)'}</strong>
            <small>Overall Campus Average: ${overallPct}%</small>
        </div>
    `;

    gridEl.innerHTML = `<div class="blockwise-schedule-container">${blockSectionsHtml}</div>`;
}