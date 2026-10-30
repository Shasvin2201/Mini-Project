/* =========================================
   ADMIN AUTHENTICATION & INITIALIZATION
========================================= */

if (window.authGuard) {
    authGuard.requireRole("admin");
}

const loggedInUser = window.authGuard 
    ? authGuard.getLoggedInUser() 
    : (() => {
        try { return JSON.parse(localStorage.getItem("loggedInUser") || "null"); } catch (e) { return null; }
    })();

/* =========================================
   GLOBAL STATE & CONSTANTS
========================================= */

const API_URL = "http://localhost:5000/api";
let spaces = [];
let requests = [];
let facultyList = [];
let confirmAction = null;
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
    const adminNameEl = document.getElementById("adminName");
    if (adminNameEl && loggedInUser) {
        adminNameEl.textContent = loggedInUser.name || "Admin";
    }

    setupNavigation();
    setupFiltersAndListeners();
    setupOptimizationFilters();

    await loadSpaces();
    await loadRequests();
    await loadFaculty();
});

/* =========================================
   PAGE NAVIGATION
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
        spaces: document.getElementById("spacesPage"),
        faculty: document.getElementById("facultyPage"),
        requests: document.getElementById("requestsPage"),
        utilization: document.getElementById("utilizationPage"),
        audit: document.getElementById("auditPage")
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

            if (pageName === "spaces") displaySpaces();
            if (pageName === "faculty") displayFaculty();
            if (pageName === "requests") displayRequests();
            if (pageName === "utilization") {
                const activeSubtab = document.querySelector(".util-subtab-btn.active")?.dataset.subtab || "overview";
                switchUtilSubtab(activeSubtab);
            }
            if (pageName === "audit") loadAuditLogs();
            updateDashboard();
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
            showConfirm("Confirm Logout", "Are you sure you want to log out of the Admin panel?", () => {
                if (window.authGuard) {
                    authGuard.logout();
                } else {
                    localStorage.removeItem("loggedInUser");
                    window.location.replace("login.html");
                }
            });
        });
    }
}

async function loadAuditLogs() {
    const tbody = document.getElementById("auditTableBody");
    if (!tbody) return;

    tbody.innerHTML = `<tr><td colspan="7" style="text-align:center;">Loading audit trail...</td></tr>`;

    try {
        const response = await fetch(`${API_URL}/audit-logs?limit=50`);
        if (!response.ok) throw new Error("Failed to fetch audit logs");

        const logs = await response.json();
        if (logs.length === 0) {
            tbody.innerHTML = `<tr><td colspan="7" style="text-align:center;">No audit records found.</td></tr>`;
            return;
        }

        tbody.innerHTML = "";
        logs.forEach(log => {
            let badgeClass = "badge-available";
            if (log.action.includes("FAILED") || log.action.includes("DELETED") || log.action.includes("REJECTED")) {
                badgeClass = "badge-unavailable";
            } else if (log.action.includes("CREATED") || log.action.includes("APPROVED")) {
                badgeClass = "badge-approved";
            }

            const tr = document.createElement("tr");
            tr.innerHTML = `
                <td><strong>#${log.id}</strong></td>
                <td><small style="color:var(--text-muted);">${escapeHTML(log.timestamp || "")}</small></td>
                <td><span class="badge ${badgeClass}">${escapeHTML(log.action)}</span></td>
                <td>${escapeHTML(log.user_email || "System")}</td>
                <td><span style="text-transform:capitalize;">${escapeHTML(log.user_role || "-")}</span></td>
                <td>${escapeHTML(log.details || "-")}</td>
                <td><code>${escapeHTML(log.ip_address || "127.0.0.1")}</code></td>
            `;
            tbody.appendChild(tr);
        });
    } catch (err) {
        console.error("Error loading audit logs:", err);
        tbody.innerHTML = `<tr><td colspan="7" style="text-align:center; color:var(--danger);">Failed to load audit logs.</td></tr>`;
    }
}
window.loadAuditLogs = loadAuditLogs;

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
   DATA LOADING FUNCTIONS
========================================= */

async function loadSpaces() {
    try {
        const response = await fetch(`${API_URL}/spaces`);
        if (!response.ok) throw new Error("Failed to fetch space data");

        spaces = await response.json();
        populateBlockDropdowns();
        displaySpaces();
        updateDashboard();
        updateBlockCards();
        updateUtilization();
    } catch (error) {
        console.error(error);
        showToast("Error connecting to server to load spaces.", "error");
    }
}

async function loadRequests() {
    try {
        const response = await fetch(`${API_URL}/requests`);
        if (!response.ok) throw new Error("Failed to fetch request data");

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

        displayRequests();
        updateDashboard();
        updateRequestStats();
        updateUtilization();
    } catch (error) {
        console.error(error);
        showToast("Error connecting to server to load requests.", "error");
    }
}

/* =========================================
   BLOCK UTILITIES & DROPDOWNS
========================================= */

function getUniqueBlocks() {
    const blocks = spaces
        .map(s => String(s.block || "").trim())
        .filter(b => b !== "");
    return Array.from(new Set(blocks)).sort((a, b) => 
        a.localeCompare(b, undefined, { numeric: true, sensitivity: "base" })
    );
}

function populateBlockDropdowns() {
    const blocks = getUniqueBlocks();

    const spaceBlockFilter = document.getElementById("spaceBlockFilter");
    const spaceBlockSelect = document.getElementById("spaceBlock");
    const requestBlockFilter = document.getElementById("requestBlockFilter");
    const requestBlockSelect = document.getElementById("requestBlock");
    const timeBlockFilter = document.getElementById("timeBlockFilter");

    [spaceBlockFilter, requestBlockFilter, timeBlockFilter].forEach(dropdown => {
        if (!dropdown) return;
        const currentVal = dropdown.value;
        dropdown.innerHTML = `<option value="ALL">All Blocks</option>`;
        blocks.forEach(block => {
            const opt = document.createElement("option");
            opt.value = block;
            opt.textContent = block;
            dropdown.appendChild(opt);
        });
        if (blocks.includes(currentVal)) dropdown.value = currentVal;
    });

    [spaceBlockSelect, requestBlockSelect].forEach(dropdown => {
        if (!dropdown) return;
        const currentVal = dropdown.value;
        dropdown.innerHTML = `<option value="">Select Block</option>`;
        blocks.forEach(block => {
            const opt = document.createElement("option");
            opt.value = block;
            opt.textContent = block;
            dropdown.appendChild(opt);
        });
        if (blocks.includes(currentVal)) dropdown.value = currentVal;
    });
}

/* =========================================
   DASHBOARD FUNCTIONS
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
    const totalSpaces = activeSpaces.length;

    // Currently booked spaces = active approved bookings right now
    const bookedSpaces = activeSpaces.filter(s => 
        requests.some(r => Number(r.space_id || r.spaceId) === Number(s.id) && isBookingOccupiedNow(r))
    );
    const currentlyBooked = bookedSpaces.length;

    // Available spaces = spaces ready for immediate booking (status === 'Available' and not booked right now)
    const availableSpaces = activeSpaces.filter(s => 
        s.status === "Available" && !bookedSpaces.some(b => Number(b.id) === Number(s.id))
    ).length;

    const pendingRequests = requests.filter(r => String(r.status).toUpperCase() === "PENDING").length;

    const totalEl = document.getElementById("dashboardTotalSpaces");
    const availEl = document.getElementById("dashboardAvailable");
    const unavailEl = document.getElementById("dashboardUnavailable");
    const pendingEl = document.getElementById("dashboardPending");

    if (totalEl) totalEl.textContent = totalSpaces;
    if (availEl) availEl.textContent = availableSpaces;
    if (unavailEl) unavailEl.textContent = currentlyBooked;
    if (pendingEl) pendingEl.textContent = pendingRequests;

    const crCount = activeSpaces.filter(s => s.type === "Classroom").length;
    const shCount = activeSpaces.filter(s => s.type === "Seminar Hall").length;
    const labCount = activeSpaces.filter(s => s.type === "Lab").length;

    const crEl = document.getElementById("dashboardClassrooms");
    const shEl = document.getElementById("dashboardSeminarHalls");
    const labEl = document.getElementById("dashboardLabs");

    if (crEl) crEl.textContent = crCount;
    if (shEl) shEl.textContent = shCount;
    if (labEl) labEl.textContent = labCount;

    const blocks = getUniqueBlocks();
    const blockBadge = document.getElementById("dashboardBlockCount");
    if (blockBadge) blockBadge.textContent = `${blocks.length} Blocks`;
}

function updateBlockCards() {
    const container = document.getElementById("blocksGrid");
    if (!container) return;
    container.innerHTML = "";

    const blocks = getUniqueBlocks();
    if (blocks.length === 0) {
        container.innerHTML = `<div class="empty-state"><p>No campus blocks found in database.</p></div>`;
        return;
    }

    blocks.forEach(blockName => {
        const blockSpaces = spaces.filter(s => s.block === blockName);
        const cr = blockSpaces.filter(s => s.type === "Classroom").length;
        const sh = blockSpaces.filter(s => s.type === "Seminar Hall").length;
        const lab = blockSpaces.filter(s => s.type === "Lab").length;
        const available = blockSpaces.filter(s => s.status === "Available").length;
        const unavailable = blockSpaces.filter(s => s.status === "Unavailable").length;

        const card = document.createElement("div");
        card.className = "block-card";
        card.innerHTML = `
            <div class="block-header">
                <div class="block-icon">🏢</div>
                <div>
                    <h3>${escapeHTML(blockName)}</h3>
                    <p>${blockSpaces.length} Total Spaces</p>
                </div>
            </div>
            <div class="block-stats">
                <div class="block-stat-item"><span class="stat-count">${cr}</span> <span class="stat-label">Classrooms</span></div>
                <div class="block-stat-item"><span class="stat-count">${sh}</span> <span class="stat-label">Seminar Halls</span></div>
                <div class="block-stat-item"><span class="stat-count">${lab}</span> <span class="stat-label">Labs</span></div>
            </div>
            <div class="block-status">
                <span class="badge-success">${available} Available</span>
                <span class="badge-danger">${unavailable} Unavailable</span>
            </div>
            <button class="block-btn" type="button" onclick="showBlockDetails('${escapeHTML(blockName)}')">View Details</button>
        `;
        container.appendChild(card);
    });
}

function showBlockDetails(blockName) {
    const blockSpaces = spaces.filter(s => s.block === blockName);

    const title = document.getElementById("blockDetailsTitle");
    const subtitle = document.getElementById("blockDetailsSubtitle");
    if (title) title.textContent = `${blockName} Details`;
    if (subtitle) subtitle.textContent = `Comprehensive breakdown of rooms in ${blockName}`;

    const crCount = blockSpaces.filter(s => s.type === "Classroom").length;
    const shCount = blockSpaces.filter(s => s.type === "Seminar Hall").length;
    const labCount = blockSpaces.filter(s => s.type === "Lab").length;

    const crEl = document.getElementById("blockCRCount");
    const shEl = document.getElementById("blockSHCount");
    const labEl = document.getElementById("blockLABCount");
    if (crEl) crEl.textContent = crCount;
    if (shEl) shEl.textContent = shCount;
    if (labEl) labEl.textContent = labCount;

    const table = document.getElementById("blockSpaceTable");
    if (table) {
        table.innerHTML = "";
        blockSpaces.forEach(s => {
            const row = document.createElement("tr");
            const statusClass = s.status === "Available" ? "status-available" : "status-unavailable";
            row.innerHTML = `
                <td><strong>${escapeHTML(s.space_name)}</strong></td>
                <td>${escapeHTML(s.type)}</td>
                <td>${s.capacity} Seats</td>
                <td><span class="status-pill ${statusClass}">${s.status}</span></td>
            `;
            table.appendChild(row);
        });
    }

    const modal = document.getElementById("blockDetailsModal");
    if (modal) modal.style.display = "flex";
}

/* =========================================
   MANAGE SPACES FUNCTIONS
========================================= */

function displaySpaces() {
    const table = document.getElementById("spaceTable");
    if (!table) return;
    table.innerHTML = "";

    const blockFilter = document.getElementById("spaceBlockFilter")?.value || "ALL";
    const typeFilter = document.getElementById("spaceTypeFilter")?.value || "ALL";
    const statusFilter = document.getElementById("spaceStatusFilter")?.value || "ALL";

    const filtered = spaces.filter(s => {
        const matchBlock = blockFilter === "ALL" || s.block === blockFilter;
        const matchType = typeFilter === "ALL" || s.type === typeFilter;
        const matchStatus = statusFilter === "ALL" || s.status === statusFilter;
        return matchBlock && matchType && matchStatus;
    });

    if (filtered.length === 0) {
        table.innerHTML = `<tr><td colspan="6" style="text-align:center; padding: 24px;">No spaces match the selected filters.</td></tr>`;
        return;
    }

    filtered.forEach(space => {
        const row = document.createElement("tr");
        const isInactive = space.status === "Inactive";
        let statusClass = "status-unavailable";
        if (space.status === "Available") statusClass = "status-available";
        else if (isInactive) statusClass = "status-inactive";

        const deleteOrReactivateBtn = isInactive
            ? `<button class="action-btn" style="background:#10b981; color:#fff;" onclick="confirmDeleteSpace(${space.id})">Reactivate</button>`
            : `<button class="action-btn delete-btn" onclick="confirmDeleteSpace(${space.id})">Deactivate</button>`;

        row.innerHTML = `
            <td><strong>${escapeHTML(space.space_name)}</strong></td>
            <td>${escapeHTML(space.block)}</td>
            <td>${escapeHTML(space.type)}</td>
            <td>${space.capacity} Capacity</td>
            <td><span class="status-pill ${statusClass}">${escapeHTML(space.status)}</span></td>
            <td>
                <div class="action-buttons">
                    <button class="action-btn edit-btn" onclick="openEditSpaceModal(${space.id})">Edit</button>
                    ${deleteOrReactivateBtn}
                </div>
            </td>
        `;
        table.appendChild(row);
    });
}

function openAddSpaceModal() {
    const form = document.getElementById("spaceForm");
    if (form) form.reset();
    document.getElementById("spaceId").value = "";
    document.getElementById("spaceModalTitle").textContent = "Add New Space";
    document.getElementById("spaceStatus").value = "Available";
    populateBlockDropdowns();
    document.getElementById("spaceModal").style.display = "flex";
}

function openEditSpaceModal(id) {
    const space = spaces.find(s => Number(s.id) === Number(id));
    if (!space) return;

    populateBlockDropdowns();
    document.getElementById("spaceId").value = space.id;
    document.getElementById("spaceName").value = space.space_name;
    document.getElementById("spaceBlock").value = space.block;
    document.getElementById("spaceType").value = space.type;
    document.getElementById("spaceCapacity").value = space.capacity;
    document.getElementById("spaceStatus").value = space.status;
    document.getElementById("spaceModalTitle").textContent = "Edit Space";
    document.getElementById("spaceModal").style.display = "flex";
}

async function handleSpaceFormSubmit(event) {
    event.preventDefault();
    const id = document.getElementById("spaceId").value;
    const spaceData = {
        space_name: document.getElementById("spaceName").value.trim(),
        block: document.getElementById("spaceBlock").value.trim(),
        type: document.getElementById("spaceType").value,
        capacity: Number(document.getElementById("spaceCapacity").value),
        status: document.getElementById("spaceStatus").value
    };

    if (!spaceData.space_name || !spaceData.block || !spaceData.type || !spaceData.capacity) {
        showToast("Please fill all required space fields.", "warning");
        return;
    }

    try {
        const method = id ? "PUT" : "POST";
        const url = id ? `${API_URL}/spaces/${id}` : `${API_URL}/spaces`;

        const response = await fetch(url, {
            method,
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(spaceData)
        });

        const result = await response.json();
        if (!response.ok) throw new Error(result.message || "Failed to save space");

        document.getElementById("spaceModal").style.display = "none";
        await loadSpaces();
        showToast(id ? "Space updated successfully!" : "New space created successfully!", "success");
    } catch (error) {
        console.error(error);
        showToast(error.message || "Failed to save space.", "error");
    }
}

function confirmDeleteSpace(id) {
    const space = spaces.find(s => Number(s.id) === Number(id));
    if (!space) return;

    const isCurrentlyInactive = space.status === "Inactive";
    const promptTitle = isCurrentlyInactive ? "Reactivate Space" : "Deactivate Space";
    const promptMsg = isCurrentlyInactive
        ? `Reactivate "${space.space_name}" and make it available for faculty bookings?`
        : `Deactivate "${space.space_name}"? It will be hidden from faculty booking, while preserving past booking history and analytics.`;

    showConfirm(promptTitle, promptMsg, async () => {
        try {
            let response;
            if (isCurrentlyInactive) {
                response = await fetch(`${API_URL}/spaces/${id}`, {
                    method: "PUT",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify({
                        space_name: space.space_name,
                        block: space.block,
                        type: space.type,
                        capacity: space.capacity,
                        status: "Available"
                    })
                });
            } else {
                response = await fetch(`${API_URL}/spaces/${id}`, { method: "DELETE" });
            }
            const result = await response.json();
            if (!response.ok) throw new Error(result.message || "Action failed");

            await loadSpaces();
            showToast(isCurrentlyInactive ? "Space reactivated successfully!" : "Space deactivated successfully!", "success");
        } catch (error) {
            console.error(error);
            showToast(error.message || "Error updating space.", "error");
        }
    });
}

/* =========================================
   REQUEST MANAGEMENT FUNCTIONS
========================================= */

function displayRequests() {
    const table = document.getElementById("requestTable");
    if (!table) return;
    table.innerHTML = "";

    const search = document.getElementById("requestSearch")?.value.toLowerCase().trim() || "";
    const statusFilter = document.getElementById("requestStatusFilter")?.value || "ALL";
    const blockFilter = document.getElementById("requestBlockFilter")?.value || "ALL";

    const filtered = requests.filter(req => {
        const searchMatch = !search ||
            String(req.faculty).toLowerCase().includes(search) ||
            String(req.space).toLowerCase().includes(search) ||
            String(req.purpose).toLowerCase().includes(search);
        
        const statusMatch = statusFilter === "ALL" || String(req.status).toUpperCase() === statusFilter.toUpperCase();
        const blockMatch = blockFilter === "ALL" || req.block === blockFilter;

        return searchMatch && statusMatch && blockMatch;
    });

    if (filtered.length === 0) {
        table.innerHTML = `<tr><td colspan="9" style="text-align:center; padding: 24px;">No requests match your current criteria.</td></tr>`;
        return;
    }

    filtered.forEach(req => {
        const row = document.createElement("tr");
        const statusUpper = String(req.status).toUpperCase();
        let statusBadgeClass = "status-pending";
        if (statusUpper === "APPROVED") statusBadgeClass = "status-approved";
        if (statusUpper === "REJECTED") statusBadgeClass = "status-rejected";

        row.innerHTML = `
            <td>#${req.id}</td>
            <td><strong>${escapeHTML(req.faculty || "Faculty")}</strong></td>
            <td>${escapeHTML(req.space)}</td>
            <td>${escapeHTML(req.block)}</td>
            <td>${req.date}</td>
            <td>${req.startTime} - ${req.endTime}</td>
            <td>${req.capacity} Seats</td>
            <td><span class="status-pill ${statusBadgeClass}">${statusUpper}</span></td>
            <td>
                <div class="action-buttons">
                    <button class="action-btn view-btn" onclick="viewRequest(${req.id})">View</button>
                    <button class="action-btn edit-btn" onclick="editRequest(${req.id})">Edit</button>
                    ${statusUpper === "PENDING" ? `
                        <button class="action-btn approve-btn" onclick="approveRequest(${req.id})">Approve</button>
                        <button class="action-btn reject-btn" onclick="rejectRequest(${req.id})">Reject</button>
                    ` : ""}
                    <button class="action-btn delete-btn" onclick="deleteRequest(${req.id})">Delete</button>
                </div>
            </td>
        `;
        table.appendChild(row);
    });

    updateRequestStats();
}

function viewRequest(id) {
    const req = requests.find(r => Number(r.id) === Number(id));
    if (!req) return;

    const detailsContainer = document.getElementById("requestDetails");
    if (detailsContainer) {
        const statusUpper = String(req.status).toUpperCase();
        let badgeClass = "status-pending";
        if (statusUpper === "APPROVED") badgeClass = "status-approved";
        if (statusUpper === "REJECTED") badgeClass = "status-rejected";

        detailsContainer.innerHTML = `
            <div class="request-detail-grid">
                <div><span>Request ID:</span> <strong>#${req.id}</strong></div>
                <div><span>Faculty Name:</span> <strong>${escapeHTML(req.faculty)}</strong></div>
                <div><span>Space Requested:</span> <strong>${escapeHTML(req.space)} (${escapeHTML(req.block)})</strong></div>
                <div><span>Date & Time:</span> <strong>${req.date} (${req.startTime} to ${req.endTime})</strong></div>
                <div><span>Required Capacity:</span> <strong>${req.capacity} Seats</strong></div>
                <div><span>Status:</span> <span class="status-pill ${badgeClass}">${statusUpper}</span></div>
                <div style="grid-column: 1 / -1;"><span>Purpose:</span> <p style="margin-top:4px; padding: 10px; background: var(--bg-hover); border-radius: 6px;">${escapeHTML(req.purpose)}</p></div>
            </div>
        `;
    }

    const modal = document.getElementById("detailsModal");
    if (modal) modal.style.display = "flex";
}

function populateFacultyDropdown(selectedId = null) {
    const select = document.getElementById("facultySelect");
    if (!select) return;
    select.innerHTML = '<option value="">Select Faculty</option>';
    facultyList.forEach(f => {
        const opt = document.createElement("option");
        opt.value = f.id;
        opt.textContent = `${f.name} (${f.email})`;
        if (selectedId && Number(selectedId) === Number(f.id)) {
            opt.selected = true;
        }
        select.appendChild(opt);
    });
}

function openCreateRequestModal() {
    const form = document.getElementById("requestForm");
    if (form) form.reset();
    document.getElementById("requestId").value = "";
    document.getElementById("requestModalTitle").textContent = "Create Request";
    populateFacultyDropdown();
    populateBlockDropdowns();
    document.getElementById("requestDate").value = getLocalDateString();
    document.getElementById("requestModal").style.display = "flex";
}

function editRequest(id) {
    const req = requests.find(r => Number(r.id) === Number(id));
    if (!req) return;

    populateBlockDropdowns();
    populateFacultyDropdown(req.faculty_id);
    document.getElementById("requestId").value = req.id;
    document.getElementById("requestBlock").value = req.block;
    document.getElementById("requestSpace").value = req.space;
    document.getElementById("requestDate").value = req.date;
    document.getElementById("startTime").value = req.startTime;
    document.getElementById("endTime").value = req.endTime;
    document.getElementById("requestCapacity").value = req.capacity;
    document.getElementById("requestPurpose").value = req.purpose;
    document.getElementById("requestModalTitle").textContent = "Edit Request";
    document.getElementById("requestModal").style.display = "flex";
}

async function handleRequestFormSubmit(event) {
    event.preventDefault();
    const id = document.getElementById("requestId").value;
    const blockName = document.getElementById("requestBlock").value;
    const spaceName = document.getElementById("requestSpace").value.trim();
    const facultySelect = document.getElementById("facultySelect");
    const facultyId = facultySelect ? Number(facultySelect.value) : null;

    if (!facultyId) {
        showToast("Please select a faculty member.", "error");
        return;
    }

    const targetSpace = spaces.find(s => 
        s.space_name.toLowerCase() === spaceName.toLowerCase() ||
        (s.block === blockName && s.space_name.toLowerCase().includes(spaceName.toLowerCase()))
    );

    if (!targetSpace) {
        showToast("Space not found. Please enter a valid room name.", "error");
        return;
    }

    const payload = {
        faculty_id: facultyId,
        space_id: targetSpace.id,
        request_date: document.getElementById("requestDate").value,
        start_time: document.getElementById("startTime").value,
        end_time: document.getElementById("endTime").value,
        required_capacity: Number(document.getElementById("requestCapacity").value),
        purpose: document.getElementById("requestPurpose").value
    };

    try {
        const method = id ? "PUT" : "POST";
        const url = id ? `${API_URL}/requests/${id}` : `${API_URL}/requests`;

        const response = await fetch(url, {
            method,
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(payload)
        });

        const result = await response.json();
        if (!response.ok) throw new Error(result.message || "Failed to save request");

        document.getElementById("requestModal").style.display = "none";
        await loadRequests();
        showToast(id ? "Request updated successfully!" : "Request created successfully!", "success");
    } catch (error) {
        console.error(error);
        showToast(error.message || "Error submitting request.", "error");
    }
}

function approveRequest(id) {
    const req = requests.find(r => Number(r.id) === Number(id));
    if (!req) return;

    showConfirm("Approve Request", `Are you sure you want to approve request #${id} for ${req.space}?`, async () => {
        try {
            const response = await fetch(`${API_URL}/requests/${id}/approve`, {
                method: "PUT",
                headers: { "Content-Type": "application/json" }
            });
            const result = await response.json();
            if (!response.ok) throw new Error(result.message || "Failed to approve request");

            await loadSpaces();
            await loadRequests();
            showToast("Request approved successfully!", "success");
        } catch (error) {
            console.error(error);
            showToast(error.message || "Error approving request.", "error");
        }
    });
}

function rejectRequest(id) {
    const req = requests.find(r => Number(r.id) === Number(id));
    if (!req) return;

    showConfirm("Reject Request", `Are you sure you want to reject request #${id}?`, async () => {
        try {
            const response = await fetch(`${API_URL}/requests/${id}/reject`, {
                method: "PUT",
                headers: { "Content-Type": "application/json" }
            });
            const result = await response.json();
            if (!response.ok) throw new Error(result.message || "Failed to reject request");

            await loadRequests();
            showToast("Request rejected successfully!", "success");
        } catch (error) {
            console.error(error);
            showToast(error.message || "Error rejecting request.", "error");
        }
    });
}

function deleteRequest(id) {
    showConfirm("Delete Request", `Are you sure you want to delete request #${id}?`, async () => {
        try {
            const response = await fetch(`${API_URL}/requests/${id}`, { method: "DELETE" });
            const result = await response.json();
            if (!response.ok) throw new Error(result.message || "Failed to delete request");

            await loadRequests();
            showToast("Request deleted successfully!", "success");
        } catch (error) {
            console.error(error);
            showToast(error.message || "Error deleting request.", "error");
        }
    });
}

function updateRequestStats() {
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

/* =========================================
   CAMPUS UTILIZATION & OPTIMIZATION FUNCTIONS
========================================= */

function updateUtilization() {
    const activeSpaces = spaces.filter(s => s.status !== "Inactive");
    const total = activeSpaces.length;

    // Currently booked spaces = active approved bookings right now
    const bookedSpaces = activeSpaces.filter(s => 
        requests.some(r => Number(r.space_id || r.spaceId) === Number(s.id) && isBookingOccupiedNow(r))
    );
    const bookedCount = bookedSpaces.length;

    // Available spaces = spaces ready for immediate booking (status === 'Available' and not booked right now)
    const available = activeSpaces.filter(s => 
        s.status === "Available" && !bookedSpaces.some(b => Number(b.id) === Number(s.id))
    ).length;

    // Operational utilization: approved booked hours / total operational hours (8 hrs per active room)
    let totalBookedHoursToday = 0;
    activeSpaces.forEach(s => {
        const utilData = calculateSpaceUtilization(s.id);
        totalBookedHoursToday += utilData.bookedHours;
    });

    const totalOperationalHours = total * 8;
    const percentage = totalOperationalHours > 0 
        ? Math.min(100, Math.round((totalBookedHoursToday / totalOperationalHours) * 100))
        : 0;

    const totalEl = document.getElementById("utilTotal");
    const availEl = document.getElementById("utilAvailable");
    const unavailEl = document.getElementById("utilUnavailable");
    const percentageEl = document.getElementById("utilPercentage");

    if (totalEl) totalEl.textContent = total;
    if (availEl) availEl.textContent = available;
    if (unavailEl) unavailEl.textContent = bookedCount;
    if (percentageEl) percentageEl.textContent = `${percentage}%`;

    updateTypeUtilization();
    updateBlockUtilization();
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

function updateTypeUtilization() {
    const container = document.getElementById("typeGrid");
    if (!container) return;
    container.innerHTML = "";

    const types = ["Classroom", "Seminar Hall", "Lab"];
    types.forEach(type => {
        const typeSpaces = spaces.filter(s => s.type === type && s.status !== "Inactive");
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

        const operationalHours = total * 8;
        const percentage = operationalHours > 0 
            ? Math.min(100, Math.round((bookedHours / operationalHours) * 100)) 
            : 0;

        const card = document.createElement("div");
        card.className = "type-card";
        card.innerHTML = `
            <h3>${type}</h3>
            <p>${total} active spaces (${bookedNow} currently booked)</p>
            <div class="percentage">${percentage}%</div>
            <div class="progress-track"><div class="progress-bar" style="width:${percentage}%"></div></div>
        `;
        container.appendChild(card);
    });
}

function updateBlockUtilization() {
    const container = document.getElementById("blockUtilizationGrid");
    if (!container) return;
    container.innerHTML = "";

    const blocks = getUniqueBlocks();
    blocks.forEach(block => {
        const blockSpaces = spaces.filter(s => s.block === block && s.status !== "Inactive");
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
        const percentage = operationalHours > 0 
            ? Math.min(100, Math.round((bookedHours / operationalHours) * 100)) 
            : 0;

        let badgeClass = "badge-opt-high";
        let badgeLabel = "High Utilization";
        if (percentage < 40) {
            badgeClass = "badge-opt-warn";
            badgeLabel = "Underutilized";
        } else if (percentage < 75) {
            badgeClass = "badge-opt-mid";
            badgeLabel = "Moderate";
        }

        const card = document.createElement("div");
        card.className = "block-utilization-card";
        card.innerHTML = `
            <div style="display:flex; justify-content:space-between; align-items:flex-start;">
                <div>
                    <h3>${escapeHTML(block)}</h3>
                    <p>${total} rooms (${bookedNow} currently booked)</p>
                </div>
                <span class="status-pill ${badgeClass}">${badgeLabel}</span>
            </div>
            <div class="block-progress-label" style="margin-top:12px;"><span>Utilization</span> <strong>${percentage}%</strong></div>
            <div class="progress-track"><div class="progress-bar" style="width:${percentage}%"></div></div>
        `;
        container.appendChild(card);
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

    const underutilizedText = document.getElementById("adminUnderutilizedCountText");
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
        container.innerHTML = `<div style="grid-column:1/-1; padding:32px; text-align:center; background:#fff; border-radius:12px; border:1px solid #e2e8f0;"><p>No spaces match the selected optimization filter.</p></div>`;
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

/* =========================================
   ADD NEW BLOCK MODAL
========================================= */

function handleNewBlockSubmit(event) {
    event.preventDefault();
    const blockName = document.getElementById("newBlockName").value.trim();
    if (!blockName) return;

    const spaceBlockSelect = document.getElementById("spaceBlock");
    if (spaceBlockSelect) {
        const opt = document.createElement("option");
        opt.value = blockName;
        opt.textContent = blockName;
        spaceBlockSelect.appendChild(opt);
        spaceBlockSelect.value = blockName;
    }

    document.getElementById("newBlockModal").style.display = "none";
    showToast(`Added ${blockName}! Assign a room to save it permanently.`, "info");
}

/* =========================================
   EVENT SETUP HELPERS
========================================= */

function setupFiltersAndListeners() {
    ["spaceBlockFilter", "spaceTypeFilter", "spaceStatusFilter"].forEach(id => {
        const el = document.getElementById(id);
        if (el) el.addEventListener("change", displaySpaces);
    });

    ["requestSearch", "requestStatusFilter", "requestBlockFilter"].forEach(id => {
        const el = document.getElementById(id);
        if (el) {
            el.addEventListener("input", displayRequests);
            el.addEventListener("change", displayRequests);
        }
    });

    const facultySearchEl = document.getElementById("facultySearch");
    if (facultySearchEl) {
        facultySearchEl.addEventListener("input", displayFaculty);
    }

    setupTimeUtilizationControls();

    const facultyForm = document.getElementById("facultyForm");
    if (facultyForm) facultyForm.addEventListener("submit", handleFacultyFormSubmit);

    const addFacultyBtn = document.getElementById("addFacultyBtn");
    if (addFacultyBtn) addFacultyBtn.addEventListener("click", () => openFacultyModal());

    const spaceForm = document.getElementById("spaceForm");
    if (spaceForm) spaceForm.addEventListener("submit", handleSpaceFormSubmit);

    const requestForm = document.getElementById("requestForm");
    if (requestForm) requestForm.addEventListener("submit", handleRequestFormSubmit);

    const newBlockForm = document.getElementById("newBlockForm");
    if (newBlockForm) newBlockForm.addEventListener("submit", handleNewBlockSubmit);

    const addSpaceBtn = document.getElementById("addSpaceBtn");
    if (addSpaceBtn) addSpaceBtn.addEventListener("click", openAddSpaceModal);

    const createRequestBtn = document.getElementById("createRequestBtn");
    if (createRequestBtn) createRequestBtn.addEventListener("click", openCreateRequestModal);

    const addNewBlockBtn = document.getElementById("addNewBlockBtn");
    if (addNewBlockBtn) addNewBlockBtn.addEventListener("click", () => {
        document.getElementById("newBlockModal").style.display = "flex";
    });

    const modalCloseMap = [
        { btn: "closeSpaceModal", modal: "spaceModal" },
        { btn: "cancelSpaceBtn", modal: "spaceModal" },
        { btn: "closeRequestModal", modal: "requestModal" },
        { btn: "cancelRequestBtn", modal: "requestModal" },
        { btn: "closeFacultyModal", modal: "facultyModal" },
        { btn: "cancelFacultyBtn", modal: "facultyModal" },
        { btn: "closeDetailsModal", modal: "detailsModal" },
        { btn: "closeBlockModal", modal: "blockDetailsModal" },
        { btn: "closeNewBlockModal", modal: "newBlockModal" },
        { btn: "cancelNewBlockBtn", modal: "newBlockModal" },
        { btn: "confirmCancelBtn", modal: "confirmModal" }
    ];

    modalCloseMap.forEach(({ btn, modal }) => {
        const btnEl = document.getElementById(btn);
        if (btnEl) {
            btnEl.addEventListener("click", () => {
                const modalEl = document.getElementById(modal);
                if (modalEl) modalEl.style.display = "none";
                if (modal === "confirmModal") confirmAction = null;
            });
        }
    });

    const confirmOkBtn = document.getElementById("confirmOkBtn");
    if (confirmOkBtn) {
        confirmOkBtn.addEventListener("click", () => {
            document.getElementById("confirmModal").style.display = "none";
            if (confirmAction) confirmAction();
            confirmAction = null;
        });
    }

    window.addEventListener("click", (event) => {
        if (event.target.classList.contains("modal")) {
            event.target.style.display = "none";
        }
    });
}

function showToast(message, type = "info") {
    const toast = document.getElementById("toast");
    if (!toast) return;

    toast.textContent = message;
    toast.className = `toast show ${type}`;

    setTimeout(() => {
        toast.classList.remove("show");
    }, 3000);
}

function showConfirm(title, message, action) {
    const modal = document.getElementById("confirmModal");
    const titleEl = document.getElementById("confirmTitle");
    const msgEl = document.getElementById("confirmMessage");
    if (!modal || !titleEl || !msgEl) return;

    titleEl.textContent = title;
    msgEl.textContent = message;
    confirmAction = action;
    modal.style.display = "flex";
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
   FACULTY MANAGEMENT (ADMIN ONLY)
========================================= */

async function loadFaculty() {
    try {
        const response = await fetch(`${API_URL}/auth/faculty`);
        if (!response.ok) throw new Error("Failed to load faculty accounts");

        facultyList = await response.json();
        displayFaculty();
    } catch (error) {
        console.error(error);
        showToast("Error connecting to server to load faculty accounts.", "error");
    }
}

function displayFaculty() {
    const tableBody = document.getElementById("facultyTable");
    if (!tableBody) return;

    const searchInput = document.getElementById("facultySearch");
    const searchTerm = searchInput ? searchInput.value.toLowerCase().trim() : "";

    const filtered = facultyList.filter(f =>
        (f.name && f.name.toLowerCase().includes(searchTerm)) ||
        (f.email && f.email.toLowerCase().includes(searchTerm))
    );

    if (filtered.length === 0) {
        tableBody.innerHTML = `
            <tr>
                <td colspan="5" style="text-align:center; color:var(--text-muted); padding:32px;">
                    ${searchTerm ? "No faculty members match your search query." : "No faculty accounts created yet."}
                </td>
            </tr>
        `;
        return;
    }

    tableBody.innerHTML = filtered.map(f => `
        <tr>
            <td><strong>#${f.id}</strong></td>
            <td><strong>${escapeHTML(f.name)}</strong></td>
            <td>${escapeHTML(f.email)}</td>
            <td><span class="badge badge-approved" style="text-transform:capitalize;">${escapeHTML(f.role || 'faculty')}</span></td>
            <td>
                <div class="action-buttons">
                    <button class="secondary-btn btn-sm" onclick="openFacultyModal(${f.id})">Edit</button>
                    <button class="danger-btn btn-sm" onclick="confirmDeleteFaculty(${f.id})">Delete</button>
                </div>
            </td>
        </tr>
    `).join("");
}

function openFacultyModal(facultyId = null) {
    const modal = document.getElementById("facultyModal");
    const title = document.getElementById("facultyModalTitle");
    const idInput = document.getElementById("facultyId");
    const nameInput = document.getElementById("facultyNameInput");
    const emailInput = document.getElementById("facultyEmailInput");
    const passwordInput = document.getElementById("facultyPasswordInput");
    const passwordLabel = document.getElementById("facultyPasswordLabel");
    const passwordHelp = document.getElementById("facultyPasswordHelp");

    if (!modal) return;

    if (facultyId) {
        const facultyObj = facultyList.find(f => f.id === facultyId);
        if (!facultyObj) return;

        title.textContent = "Edit Faculty Member";
        idInput.value = facultyObj.id;
        nameInput.value = facultyObj.name;
        emailInput.value = facultyObj.email;
        passwordInput.value = "";
        passwordInput.required = false;
        passwordInput.placeholder = "Leave blank to keep current password";
        if (passwordLabel) passwordLabel.textContent = "New Password (Optional)";
        if (passwordHelp) passwordHelp.textContent = "Leave blank if you do not want to change the password.";
    } else {
        title.textContent = "Add New Faculty Member";
        idInput.value = "";
        nameInput.value = "";
        emailInput.value = "";
        passwordInput.value = "";
        passwordInput.required = true;
        passwordInput.placeholder = "Enter password (min. 6 characters)";
        if (passwordLabel) passwordLabel.textContent = "Password";
        if (passwordHelp) passwordHelp.textContent = "Must contain at least 6 characters.";
    }

    modal.style.display = "flex";
}

function closeFacultyModal() {
    const modal = document.getElementById("facultyModal");
    if (modal) modal.style.display = "none";
}

async function handleFacultyFormSubmit(event) {
    event.preventDefault();

    const id = document.getElementById("facultyId").value;
    const name = document.getElementById("facultyNameInput").value.trim();
    const email = document.getElementById("facultyEmailInput").value.trim();
    const password = document.getElementById("facultyPasswordInput").value;

    if (!name || !email) {
        showToast("Please enter both full name and email address.", "error");
        return;
    }

    if (!id && !password) {
        showToast("Password is required for new faculty accounts.", "error");
        return;
    }

    if (password && password.length < 6) {
        showToast("Password must contain at least 6 characters.", "error");
        return;
    }

    const payload = { name, email };
    if (password) payload.password = password;

    const isEdit = !!id;
    const url = isEdit ? `${API_URL}/auth/faculty/${id}` : `${API_URL}/auth/faculty`;
    const method = isEdit ? "PUT" : "POST";

    try {
        const response = await fetch(url, {
            method,
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(payload)
        });

        const data = await response.json();

        if (!response.ok) {
            showToast(data.message || "Failed to save faculty member.", "error");
            return;
        }

        showToast(isEdit ? "Faculty account updated successfully!" : "Faculty account created successfully!", "success");
        closeFacultyModal();
        await loadFaculty();
    } catch (error) {
        console.error(error);
        showToast("Error connecting to server.", "error");
    }
}

function confirmDeleteFaculty(id) {
    const facultyObj = facultyList.find(f => f.id === id);
    const facultyName = facultyObj ? facultyObj.name : "this faculty member";

    showConfirm(
        "Delete Faculty Account",
        `Are you sure you want to delete account for "${facultyName}"? They will no longer be able to log in.`,
        async () => {
            try {
                const response = await fetch(`${API_URL}/auth/faculty/${id}`, {
                    method: "DELETE"
                });

                const data = await response.json();

                if (!response.ok) {
                    showToast(data.message || "Failed to delete faculty account.", "error");
                    return;
                }

                showToast("Faculty account deleted successfully.", "success");
                await loadFaculty();
                await loadRequests();
            } catch (error) {
                console.error(error);
                showToast("Error connecting to server.", "error");
            }
        }
    );
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

