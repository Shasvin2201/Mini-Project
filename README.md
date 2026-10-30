# Campus Space Utilization & Management Platform

A centralized, full-stack web application designed for higher education institutions to monitor, allocate, and optimize campus spaces (classrooms, seminar halls, laboratories) across departments and campus blocks in real time.

---

## 📌 Project Information

* **Project Title:** Campus Space Utilization & Management Platform
* **Academic Year:** 2024 – 2026 (S5 Mini Project)
* **Department:** Information Technology / AI & Data Science
* **Institution:** Bannari Amman Institute of Technology
* **Batch Members:**
  * **SHASVIN D** (7376242IT295) — *Lead Developer (Full-Stack & Database Architecture)*
  * **VIVIN C** (7376242AD344)
  * **SATCHINDRA R B** (7376242AD296)
* **Project Guide:** K. R. Sabarmathi (Assistant Professor, Dept. of Information Technology)

---

## 🚀 Key Features

### 1. 🛡️ Admin Portal (`admin.html`)
* **Real-Time KPI Dashboard:** Live stats for Total Spaces, Available Rooms, Currently Booked Rooms, and Pending Requests.
* **Space Management (Full CRUD):** Create, view, edit, and delete campus facilities with block location, facility type, capacity, and status.
* **Faculty Account Management:** Provision and manage faculty logins directly with secure `bcryptjs` password hashing.
* **Booking Request Approvals:** Review incoming faculty requests. Approving a request instantly updates room status to `Unavailable` and records an audit log. Rejecting or deleting releases the space back to `Available`.
* **Utilization & Optimization:** Real-time occupancy rate analytics, block-by-block breakdown, and identification of underutilized rooms.
* **Interactive Timetable Schedule:** View room utilization across Daily, Weekly, and Monthly schedule matrices.
* **Security & Audit Logs:** Centralized audit trail capturing user logins, approvals, space creations, and account updates.

### 2. 👨‍🏫 Faculty Portal (`faculty.html`)
* **Personal Dashboard:** Real-time counters of approved, pending, and rejected requests.
* **Find Spaces Directory:** Filter rooms dynamically by **Block**, **Type** (Classroom, Seminar Hall, Lab), **Minimum Capacity**, and **Name Search**.
* **Space Booking Modal:** Submit space booking requests with date picker (restricts past dates), start/end time validation, required capacity, and purpose.
* **My Requests:** Track real-time status (`PENDING`, `APPROVED`, `REJECTED`) of all submitted requests.

### 3. 📊 Management Portal (`management.html`)
* **Executive Campus Overview:** Campus-wide space occupancy rate and live block status distribution.
* **Space Optimization Insights:** Categorizes rooms by utilization level (*Underutilized < 50%*, *Moderate Usage 50–79%*, *High Utilization ≥ 80%*).
* **Facility Type Efficiency:** Compares occupancy rates across classrooms, seminar halls, and computer labs.
* **Detailed Timetable Schedule:** Daily, weekly, and monthly timetable view for campus administrative planning.

### 4. 🔒 Security & Background Automation
* **Unified Auth Guard (`auth-guard.js`):** Client-side role-based routing, cache prevention (no stale pages on back button/bfcache), and secure session cleanup on logout.
* **Password Hashing:** Passwords secured with `bcryptjs` (includes auto-upgrade for legacy records).
* **Auto-Release Engine:** Automated background timer in `server.js` running every 60 seconds to release spaces whose booking time has passed.

---

## 🛠️ Technology Stack

| Component | Technologies Used |
| :--- | :--- |
| **Modern Frontend (React)** | React 19, Vite, Tailwind CSS v4, Motion (Framer Motion), Recharts, Lucide React, React Router v7 |
| **Classic Frontend** | HTML5, CSS3 (Modern Flexbox/Grid), Vanilla JavaScript (ES6+) |
| **Backend** | Node.js, Express.js REST API |
| **Database** | MySQL (Connection Pooling, Foreign Keys with Cascade, Automated Schema Init) |
| **Authentication** | Role-Based Access Control (RBAC), `bcryptjs` password encryption, HMAC-SHA256 Token Auth |
| **Logging** | Automated database-backed Audit Logging (`audit_logs`) |

---

## ⚙️ Getting Started

### 1. Prerequisites
Ensure you have the following installed on your machine:
* [Node.js](https://nodejs.org/) (v18.x or higher)
* [MySQL Server](https://dev.mysql.com/downloads/mysql/) (v8.0+ or MariaDB / XAMPP)

### 2. Database Configuration
1. Start your local MySQL service (e.g., via MySQL Workbench, XAMPP, or command line).
2. Create the database:
   ```sql
   CREATE DATABASE IF NOT EXISTS campus_space;
   ```
3. Copy `backend/.env.example` to `backend/.env` and configure your credentials:
   ```env
   DB_HOST=localhost
   DB_USER=root
   DB_PASSWORD=your_mysql_password
   DB_NAME=campus_space
   DB_PORT=3306
   PORT=5000
   ```
   *(Note: The server automatically creates all required tables—`users`, `spaces`, `requests`, and `audit_logs`—and seeds default spaces upon startup.)*

### 3. Start Backend Server
Open your terminal in the `backend/` directory:
```bash
cd backend
npm install
npm start
```
* **Server runs at:** `http://localhost:5000`

### 4. Start Modern React Client
In a separate terminal, open the `client/` directory:
```bash
cd client
npm install
npm run dev
```
* **Modern React App runs at:** `http://localhost:5173` (Proxies API calls to `:5000`)
* **Classic HTML UI accessible at:** `http://localhost:5000` (Served directly by backend)

---

## 🔑 Login Credentials

The system provides pre-configured role-based accounts:

| Role | Email | Password | Access Portal |
| :--- | :--- | :--- | :--- |
| **Administrator** | `admin@campus.com` | *(configured in DB)* / `admin123`* | [Admin Dashboard](http://localhost:5000/admin.html) |
| **Faculty** | `shasvind@campus.com` / `bit@campus.com` | *(configured in DB)* / `faculty123`* | [Faculty Portal](http://localhost:5000/faculty.html) |
| **Management** | `management@campus.com` | *(configured in DB)* / `management123`* | [Management Dashboard](http://localhost:5000/management.html) |

*\*Default passwords seeded automatically when running on a fresh database.*

---

## 📡 REST API Reference

### Authentication & Users (`/api/auth`)
* `POST /api/auth/login` — Authenticate user and return role/session info
* `GET  /api/auth/faculty` — Fetch all faculty members *(Admin)*
* `POST /api/auth/faculty` — Add a new faculty member with hashed password *(Admin)*
* `PUT  /api/auth/faculty/:id` — Update faculty details or password *(Admin)*
* `DELETE /api/auth/faculty/:id` — Delete a faculty account and related requests *(Admin)*

### Spaces Management (`/api/spaces`)
* `GET    /api/spaces` — Retrieve all spaces with status (Faculty sees active spaces only; Admin/Management see all)
* `GET    /api/spaces/:id` — Retrieve single space by ID *(Authenticated)*
* `POST   /api/spaces` — Add a new campus space *(Admin)*
* `PUT    /api/spaces/:id` — Update room details *(Admin)*
* `DELETE /api/spaces/:id` — Soft-deactivate space *(Admin)* — sets status to `Inactive` preserving past booking analytics

### Space Requests (`/api/requests`)
* `GET    /api/requests` — Retrieve all booking requests across campus *(Admin & Management only)*
* `GET    /api/requests/faculty/:facultyId` — Retrieve requests submitted by a specific faculty *(Faculty: own requests only; Admin/Management: all)*
* `GET    /api/requests/:id` — Retrieve a single request by ID *(Faculty: own request only; Admin/Management: any)*
* `POST   /api/requests` — Submit a new space reservation request *(Faculty / Admin)* — forces logged-in faculty identity and detects time slot conflicts
* `PUT    /api/requests/:id/approve` — Approve request, toggle space to Unavailable, auto-reject overlapping pending requests *(Admin)*
* `PUT    /api/requests/:id/reject` — Reject request & release space *(Admin)*
* `DELETE /api/requests/:id` — Delete booking request *(Admin)*

### Security & Audit (`/api/audit-logs`)
* `GET    /api/audit-logs?limit=50` — Retrieve the latest administrative audit trail records *(Admin only)*

---

## 📁 Project Structure

```
S5 Mini Project/
├── README.md                      # Project documentation and setup guide
├── database/
│   └── campus_space.sql           # Full standalone SQL database schema & seed
├── backend/
│   ├── .env                       # Database connection configuration
│   ├── .env.example               # Configuration template for repository distribution
│   ├── package.json               # Backend dependencies (express, mysql2, bcryptjs, etc.)
│   ├── server.js                  # Main Express server and static file hosting
│   ├── config/
│   │   └── db.js                  # MySQL pool, table creation, and auto-seeding
│   ├── middleware/
│   │   └── authMiddleware.js      # JWT/HMAC token authentication & role-based access control (RBAC)
│   ├── controllers/
│   │   ├── authController.js      # Login and Faculty CRUD logic
│   │   ├── spaceController.js     # Space CRUD, soft-deactivation, and auto-release logic
│   │   ├── requestController.js   # Booking workflow, conflict prevention, and request security
│   │   └── auditController.js     # Audit log retrieval
│   ├── routes/
│   │   ├── authRoutes.js          # Authentication and user endpoints
│   │   ├── spaceRoutes.js         # Space management endpoints
│   │   ├── requestRoutes.js       # Request workflow endpoints
│   │   └── auditRoutes.js         # Audit log endpoints
│   └── utils/
│       ├── auditLogger.js         # Security audit logging helper
│       └── token.js               # Cryptographic HMAC-SHA256 session token generator & verifier
└── frontend/
    ├── auth-guard.js              # Universal client-side auth, role guard & Bearer token injector
    ├── login.html / login.js / login.css         # Authentication portal
    ├── admin.html / admin.js / admin.css         # Admin Control Center
    ├── faculty.html / faculty.js / faculty.css   # Faculty Booking Portal
    └── management.html / management.js / management.css # Management Analytics Portal
```
