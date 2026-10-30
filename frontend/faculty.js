/* =========================================
   FACULTY AUTHENTICATION & INITIALIZATION
========================================= */

if (window.authGuard) {
    authGuard.requireRole("faculty");
}

const loggedInUser = window.authGuard 
    ? authGuard.getLoggedInUser() 
    : (() => {
        try { return JSON.parse(localStorage.getItem("loggedInUser") || "null"); } catch (e) { return null; }
    })();

const FACULTY_ID = loggedInUser ? loggedInUser.id : null;
const API_URL = "http://localhost:5000/api";

let spaces = [];
let requests = [];
let selectedSpaceForRequest = null;

/* =========================================
   DATE HELPER
========================================= */

function getLocalDateString(d = new Date()) {
    const year = d.getFullYear();
    const month = String(d.getMonth() + 1).padStart(2, "0");
    const day = String(d.getDate()).padStart(2, "0");
    return `${year}-${month}-${day}`;
}

/* =========================================
   DOM EVENT LISTENERS
========================================= */

document.addEventListener("DOMContentLoaded", async () => {
    // Set user name in header and dashboard
    const currentName = (loggedInUser && loggedInUser.name) ? loggedInUser.name : "Faculty";
    const facultyNameEls = document.querySelectorAll(".faculty-name-display");
    facultyNameEls.forEach(el => el.textContent = currentName);

    setupNavigation();
    setupFiltersAndListeners();

    // Prevent selecting past dates in date picker
    const requestDateInput = document.getElementById("requestDate");
    if (requestDateInput) {
        requestDateInput.setAttribute("min", getLocalDateString());
    }

    // Load Data
    await loadSpaces();
    await loadRequests();
});

/* =========================================
   NAVIGATION & TAB SWITCHING
========================================= */

function setupNavigation() {
    const menuItems = document.querySelectorAll(".menu");
    const pages = {
        dashboard: document.getElementById("dashboardPage"),
        spaces: document.getElementById("spacesPage"),
        requests: document.getElementById("requestsPage")
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

            if (pageName === "spaces") loadSpaces();
            if (pageName === "requests") loadRequests();
            updateDashboard();
        });
    });

    // Find Space CTA button on Dashboard
    const findSpaceBtn = document.getElementById("findSpaceBtn");
    if (findSpaceBtn) {
        findSpaceBtn.addEventListener("click", () => {
            const spacesTab = document.querySelector('[data-page="spaces"]');
            if (spacesTab) spacesTab.click();
        });
    }

    // Header Logout Button
    const logoutBtn = document.getElementById("logoutBtn");
    if (logoutBtn) {
        logoutBtn.addEventListener("click", () => {
            if (confirm("Are you sure you want to log out of the Faculty Portal?")) {
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

/* =========================================
   AUTH HELPER
========================================= */

function getAuthHeaders() {
    const token = localStorage.getItem("authToken");
    const headers = { "Content-Type": "application/json" };
    if (token) {
        headers["Authorization"] = `Bearer ${token}`;
    }
    return headers;
}

/* =========================================
   DATA LOADING
========================================= */

async function loadSpaces() {
    try {
        const response = await fetch(`${API_URL}/spaces`, { headers: getAuthHeaders() });
        if (!response.ok) throw new Error("Failed to load spaces");

        const data = await response.json();
        spaces = data.map(space => ({
            id: space.id,
            name: space.space_name,
            block: space.block,
            type: space.type,
            capacity: space.capacity,
            status: space.status
        }));

        populateBlockFilter();
        displaySpaces();
    } catch (error) {
        console.error(error);
        showToast("Unable to load campus spaces.", "error");
    }
}

async function loadRequests() {
    try {
        const user = window.authGuard 
            ? authGuard.getLoggedInUser() 
            : (() => {
                try { return JSON.parse(localStorage.getItem("loggedInUser") || "null"); } catch (e) { return null; }
            })();
        const facultyId = (user && user.id) ? user.id : (FACULTY_ID || "me");

        const response = await fetch(`${API_URL}/requests/faculty/${facultyId}`, { headers: getAuthHeaders() });
        if (!response.ok) throw new Error("Failed to load requests");

        const data = await response.json();
        requests = data.map(req => ({
            id: req.id,
            faculty: req.faculty_name,
            space: req.space_name,
            block: req.block,
            date: req.request_date ? String(req.request_date).split("T")[0] : "",
            startTime: req.start_time ? String(req.start_time).slice(0, 5) : "",
            endTime: req.end_time ? String(req.end_time).slice(0, 5) : "",
            capacity: req.required_capacity,
            purpose: req.purpose,
            status: String(req.status).toUpperCase()
        }));

        displayRequests();
        updateDashboard();
    } catch (error) {
        console.error(error);
        showToast("Unable to load your requests.", "error");
    }
}

/* =========================================
   DYNAMIC FILTERS & DISPLAY SPACES
========================================= */

function populateBlockFilter() {
    const blockFilter = document.getElementById("blockFilter");
    if (!blockFilter) return;

    const currentVal = blockFilter.value;
    const blocks = Array.from(new Set(spaces.map(s => s.block))).sort();

    blockFilter.innerHTML = `<option value="ALL">All Blocks</option>`;
    blocks.forEach(block => {
        const opt = document.createElement("option");
        opt.value = block;
        opt.textContent = block;
        blockFilter.appendChild(opt);
    });

    if (blocks.includes(currentVal)) blockFilter.value = currentVal;
}

function displaySpaces() {
    const container = document.getElementById("spaceContainer");
    const noSpaces = document.getElementById("noSpaces");
    if (!container) return;

    container.innerHTML = "";

    const block = document.getElementById("blockFilter")?.value || "ALL";
    const type = document.getElementById("typeFilter")?.value || "ALL";
    const capacity = document.getElementById("capacityFilter")?.value || "ALL";
    const search = document.getElementById("spaceSearch")?.value.toLowerCase().trim() || "";

    const filtered = spaces.filter(space => {
        if (space.status !== "Available") return false;
        if (block !== "ALL" && space.block !== block) return false;
        if (type !== "ALL" && space.type !== type) return false;
        if (capacity !== "ALL" && Number(space.capacity) < Number(capacity)) return false;
        if (search !== "" && !space.name.toLowerCase().includes(search)) return false;
        return true;
    });

    if (filtered.length === 0) {
        if (noSpaces) noSpaces.style.display = "block";
        return;
    }

    if (noSpaces) noSpaces.style.display = "none";

    filtered.forEach(space => {
        const card = document.createElement("div");
        card.className = "space-card";
        card.innerHTML = `
            <div class="space-card-top">
                <div>
                    <h3>${escapeHTML(space.name)}</h3>
                    <div class="block-badge">🏢 ${escapeHTML(space.block)}</div>
                </div>
                <span class="space-type-pill">${getShortType(space.type)}</span>
            </div>
            <div class="space-info">
                <div><span>Type</span> <strong>${escapeHTML(space.type)}</strong></div>
                <div><span>Capacity</span> <strong>${space.capacity} Seats</strong></div>
                <div><span>Status</span> <strong class="status-available">Available</strong></div>
            </div>
            <button class="request-btn" type="button" onclick="openRequestModal(${space.id})">Request Space</button>
        `;
        container.appendChild(card);
    });
}

function getShortType(type) {
    if (type === "Classroom") return "CR";
    if (type === "Seminar Hall") return "SH";
    if (type === "Lab") return "LAB";
    return type;
}

/* =========================================
   REQUEST MODAL & SUBMISSION
========================================= */

function openRequestModal(spaceId) {
    const space = spaces.find(s => Number(s.id) === Number(spaceId));
    if (!space) {
        console.error("Space not found for ID:", spaceId);
        return;
    }

    selectedSpaceForRequest = space;

    const user = window.authGuard 
        ? authGuard.getLoggedInUser() 
        : (() => {
            try { return JSON.parse(localStorage.getItem("loggedInUser") || "null"); } catch (e) { return null; }
        })();

    const facultyNameInput = document.getElementById("facultyName");
    if (facultyNameInput) facultyNameInput.value = (user && user.name) ? user.name : "Faculty";

    const selectedSpaceInput = document.getElementById("selectedSpace");
    if (selectedSpaceInput) selectedSpaceInput.value = space.name;

    const selectedBlockInput = document.getElementById("selectedBlock");
    if (selectedBlockInput) selectedBlockInput.value = space.block;

    const requestCapacityInput = document.getElementById("requestCapacity");
    if (requestCapacityInput) {
        requestCapacityInput.value = space.capacity;
        requestCapacityInput.max = space.capacity;
    }

    // Set default date to today (local timezone) and min date
    const today = getLocalDateString();
    const requestDateInput = document.getElementById("requestDate");
    if (requestDateInput) {
        requestDateInput.value = today;
        requestDateInput.min = today;
    }

    // Clear time fields and purpose
    const startTimeInput = document.getElementById("startTime");
    if (startTimeInput) startTimeInput.value = "";

    const endTimeInput = document.getElementById("endTime");
    if (endTimeInput) endTimeInput.value = "";

    const requestPurposeInput = document.getElementById("requestPurpose");
    if (requestPurposeInput) requestPurposeInput.value = "";

    const requestModal = document.getElementById("requestModal");
    if (requestModal) requestModal.style.display = "flex";
}

async function handleRequestSubmit(event) {
    event.preventDefault();

    if (!selectedSpaceForRequest) {
        showToast("Selected space error. Please re-select a room.", "error");
        return;
    }

    const requestDate = document.getElementById("requestDate").value;
    const startTime = document.getElementById("startTime").value;
    const endTime = document.getElementById("endTime").value;
    const requiredCapacity = Number(document.getElementById("requestCapacity").value);
    const purpose = document.getElementById("requestPurpose").value.trim();

    if (!requestDate || !startTime || !endTime || !purpose) {
        showToast("Please fill all required fields.", "warning");
        return;
    }

    if (endTime <= startTime) {
        showToast("End time must be later than start time.", "warning");
        return;
    }

    if (requiredCapacity > selectedSpaceForRequest.capacity) {
        showToast(`Capacity cannot exceed room maximum (${selectedSpaceForRequest.capacity} seats).`, "warning");
        return;
    }

    const user = window.authGuard 
        ? authGuard.getLoggedInUser() 
        : (() => {
            try { return JSON.parse(localStorage.getItem("loggedInUser") || "null"); } catch (e) { return null; }
        })();
    const facultyId = (user && user.id) ? user.id : FACULTY_ID;

    const payload = {
        faculty_id: facultyId,
        space_id: selectedSpaceForRequest.id,
        request_date: requestDate,
        start_time: startTime,
        end_time: endTime,
        required_capacity: requiredCapacity,
        purpose: purpose
    };

    const submitBtn = event.target ? event.target.querySelector('button[type="submit"]') : null;
    if (submitBtn) {
        submitBtn.disabled = true;
        submitBtn.textContent = "Submitting...";
    }

    try {
        const response = await fetch(`${API_URL}/requests`, {
            method: "POST",
            headers: getAuthHeaders(),
            body: JSON.stringify(payload)
        });

        const data = await response.json();
        if (!response.ok) throw new Error(data.message || "Failed to submit request.");

        const requestModal = document.getElementById("requestModal");
        if (requestModal) requestModal.style.display = "none";

        document.getElementById("requestForm").reset();
        showToast("Space request submitted successfully!", "success");

        await loadRequests();

        const requestsTab = document.querySelector('[data-page="requests"]');
        if (requestsTab) {
            setTimeout(() => {
                requestsTab.click();
            }, 500);
        }
    } catch (error) {
        console.error(error);
        showToast(error.message || "Server connection failed.", "error");
    } finally {
        if (submitBtn) {
            submitBtn.disabled = false;
            submitBtn.textContent = "Submit Request";
        }
    }
}

// Expose handlers on window for HTML inline access
window.openRequestModal = openRequestModal;
window.handleRequestSubmit = handleRequestSubmit;

/* =========================================
   MY REQUESTS DISPLAY
========================================= */

function displayRequests() {
    const table = document.getElementById("requestTable");
    if (!table) return;

    table.innerHTML = "";

    if (requests.length === 0) {
        table.innerHTML = `<tr><td colspan="6" style="text-align:center; padding:24px;">You have no space requests submitted yet.</td></tr>`;
        return;
    }

    requests.forEach(req => {
        const row = document.createElement("tr");
        let statusBadgeClass = "status-pending";
        if (req.status === "APPROVED") statusBadgeClass = "status-approved";
        if (req.status === "REJECTED") statusBadgeClass = "status-rejected";

        row.innerHTML = `
            <td><strong>${escapeHTML(req.space)}</strong></td>
            <td>${escapeHTML(req.block)}</td>
            <td>${req.date}</td>
            <td>${req.startTime} - ${req.endTime}</td>
            <td>${escapeHTML(req.purpose)}</td>
            <td><span class="status-pill ${statusBadgeClass}">${req.status}</span></td>
        `;
        table.appendChild(row);
    });
}

function updateDashboard() {
    const pending = requests.filter(r => r.status === "PENDING").length;
    const approved = requests.filter(r => r.status === "APPROVED").length;
    const rejected = requests.filter(r => r.status === "REJECTED").length;

    const pendingEl = document.getElementById("pendingCount");
    const approvedEl = document.getElementById("approvedCount");
    const rejectedEl = document.getElementById("rejectedCount");

    if (pendingEl) pendingEl.textContent = pending;
    if (approvedEl) approvedEl.textContent = approved;
    if (rejectedEl) rejectedEl.textContent = rejected;
}

/* =========================================
   EVENT SETUP HELPERS
========================================= */

function setupFiltersAndListeners() {
    ["blockFilter", "typeFilter", "capacityFilter"].forEach(id => {
        const el = document.getElementById(id);
        if (el) el.addEventListener("change", displaySpaces);
    });

    const spaceSearch = document.getElementById("spaceSearch");
    if (spaceSearch) spaceSearch.addEventListener("input", displaySpaces);

    const requestForm = document.getElementById("requestForm");
    if (requestForm) requestForm.addEventListener("submit", handleRequestSubmit);

    // Modal Controls
    const closeBtn = document.getElementById("closeRequestModal");
    const cancelBtn = document.getElementById("cancelRequestBtn");
    const modal = document.getElementById("requestModal");

    [closeBtn, cancelBtn].forEach(btn => {
        if (btn) btn.addEventListener("click", () => {
            if (modal) modal.style.display = "none";
        });
    });

    window.addEventListener("click", (event) => {
        if (event.target === modal) {
            modal.style.display = "none";
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

function escapeHTML(str) {
    if (!str) return "";
    return String(str)
        .replace(/&/g, "&amp;")
        .replace(/</g, "&lt;")
        .replace(/>/g, "&gt;")
        .replace(/"/g, "&quot;")
        .replace(/'/g, "&#039;");
}