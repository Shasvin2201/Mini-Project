# Campus Space Utilization & Management Platform - React Frontend (Client)

A commercial-grade, modern React (Vite) client overhaul for the Campus Space Management Platform, delivering high-density SaaS dark theme design, real-time analytics, role-based workflows, and conflict-safe room reservations.

---

## 🚀 Key Features

* **Commercial-Grade SaaS Dark Theme:** Deep charcoal slate surfaces (`#0B0F17` / `#111827`), elevated card layers (`#182234`), crisp border accents (`#374151`), and distinct color-coded status badges (Available, Unavailable, Pending, Inactive).
* **Role-Based Workflows & RBAC Guard:** Dedicated experiences for **Administrator**, **Faculty**, and **Management** with automatic route protection and bfcache/storage synchronization.
* **Authentication Suite:**
  * Live login integrated directly with Express backend (`POST /api/auth/login`).
  * Quick-fill demo account selector for Admin (`admin@campus.com`), Faculty (`bit@campus.com`), and Management (`management@campus.com`).
  * Faculty onboarding & 6-digit OTP code verification flow with auto-focus inputs, numeric validation, and countdown resend timer.
* **Admin Control Center:**
  * Real-Time KPI Dashboard: Total Spaces, Available Rooms, Currently Booked, Pending Requests.
  * Four-Block Structure Matrix: Blocks A, B, C, D allocation breakdown with clickable block inspection modal.
  * Facility Breakdown: Classrooms (CR), Seminar Halls (SH), and Laboratories (LAB).
  * Space Management: Full CRUD with block allocation, type, capacity, search, pagination, and soft deactivation.
  * Faculty Management: Searchable directory, provision accounts with secure bcrypt hashing, edit, and delete with cascade cleanup.
  * Booking Review Pipeline: Approve (with conflict safety & space lock), Reject (releasing rooms), and manual booking creation.
  * Utilization Analytics: Recharts-powered occupancy analytics, space optimization alerts highlighting rooms with <50% utilization rate, and timetable scheduling.
  * Database Security & Audit Trail: Live audit logs for logins, space additions, and approvals.
* **Faculty Space Portal:**
  * Personal KPI dashboard with live counters of approved, pending, and rejected requests.
  * Space Discovery Directory: Dynamic filters by Block (A, B, C, D), Facility Type, Minimum Capacity, and name search.
  * Booking Modal: Date picker restricting past dates, start/end time validation, capacity check against room limits, purpose description, and schedule conflict warnings.
  * My Requests: Status tracking table for personal reservations with real-time badges.
* **Management Executive Dashboard:**
  * Executive overview metrics, live occupancy rate progress tracking, and block status distribution.

---

## 🛠️ Tech Stack & Directory Structure

* **Framework:** React 19 + Vite 8
* **Routing:** React Router v7
* **Styling:** Tailwind CSS v4 + Plus Jakarta Sans & Inter
* **Icons:** Lucide React
* **Charts:** Recharts
* **Architecture:**
  ```
  client/
  ├── src/
  │   ├── api/                  # Centralized API service layer
  │   │   ├── client.js         # Base fetch wrapper with Bearer token injection & 401 handling
  │   │   ├── authApi.js        # Login & faculty management endpoints
  │   │   ├── spacesApi.js      # Space CRUD & deactivation endpoints
  │   │   ├── requestsApi.js    # Booking workflow & approval endpoints
  │   │   └── auditApi.js       # Security audit logs endpoint
  │   ├── components/
  │   │   ├── common/           # Reusable UI library
  │   │   │   ├── Button.jsx    # Primary, secondary, danger, emerald variants with loader
  │   │   │   ├── Input.jsx     # Form input with icons, labels, focus glow
  │   │   │   ├── Select.jsx    # Styled dropdown selector
  │   │   │   ├── Modal.jsx     # Accessible dialog with animated backdrop
  │   │   │   ├── Card.jsx      # Elevated dark card surface
  │   │   │   ├── Badge.jsx     # Status badges (Available, Unavailable, Pending)
  │   │   │   ├── Table.jsx     # High-density responsive tables
  │   │   │   ├── Pagination.jsx# Page controls & item indicators
  │   │   │   ├── SkeletonLoader.jsx # Shimmer loading placeholders
  │   │   │   └── ConfirmModal.jsx   # Confirmation dialog for critical actions
  │   │   └── layout/
  │   │       ├── Sidebar.jsx   # Collapsible sidebar with role-aware links
  │   │       ├── Header.jsx    # Sticky header with breadcrumbs, avatar & logout
  │   │       └── AppLayout.jsx # Master responsive layout wrapper
  │   ├── context/
  │   │   ├── AuthContext.jsx   # Session management, JWT storage, role helpers
  │   │   └── ToastContext.jsx  # Stacked toast alerts (success, error, warning, info)
  │   ├── pages/
  │   │   ├── auth/             # LoginPage, SignupPage (with OTP verification)
  │   │   ├── admin/            # AdminDashboard, Spaces, Faculty, Requests, Utilization, Audit
  │   │   ├── faculty/          # FacultyDashboard, FindSpaces, BookingModal, MyRequests
  │   │   └── management/       # ManagementDashboard
  │   └── routes/
  │       ├── ProtectedRoute.jsx# Role authorization guard
  │       └── AppRoutes.jsx     # Route registry
  └── vite.config.js            # Proxy to http://localhost:5000/api
  ```

---

## ⚡ Quick Start

### 1. Start the Backend Server (if not running)
In `backend/`:
```bash
node server.js
```
The server runs on `http://localhost:5000`.

### 2. Start the Modern React Frontend
In `client/`:
```bash
npm run dev
```
Open **`http://localhost:5173`** in your browser.

### 3. Production Build
```bash
npm run build
```
Creates an optimized production bundle in `client/dist`.
