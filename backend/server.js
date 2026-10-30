const express = require("express");
const cors = require("cors");
const path = require("path");
require("dotenv").config({ path: path.join(__dirname, ".env") });
require("dotenv").config(); // Also check cwd if available

const spaceRoutes = require("./routes/spaceRoutes");
const requestRoutes = require("./routes/requestRoutes");
const authRoutes = require("./routes/authRoutes");
const auditRoutes = require("./routes/auditRoutes");
const { autoReleaseCompletedBookings } = require("./controllers/spaceController");
const db = require("./config/db");

const app = express();

app.use(cors());
app.use(express.json());

/* =========================================
   CACHE CONTROL (PREVENT STALE PROTECTED PAGES)
========================================= */
app.use((req, res, next) => {
    res.set("Cache-Control", "no-store, no-cache, must-revalidate, private");
    res.set("Pragma", "no-cache");
    res.set("Expires", "0");
    next();
});

/* =========================================
   STATIC FRONTEND SERVING
========================================= */
app.use(express.static(path.join(__dirname, "../frontend"), {
    setHeaders: (res, filePath) => {
        if (filePath.endsWith(".html")) {
            res.set("Cache-Control", "no-store, no-cache, must-revalidate, private");
            res.set("Pragma", "no-cache");
            res.set("Expires", "0");
        }
    }
}));

/* =========================================
   API ROUTES
========================================= */
app.use("/api/auth", authRoutes);
app.use("/api/spaces", spaceRoutes);
app.use("/api/requests", requestRoutes);
app.use("/api/audit-logs", auditRoutes);

/* =========================================
   FALLBACK TO LOGIN PAGE
========================================= */
app.get("/", (req, res) => {
    res.set("Cache-Control", "no-store, no-cache, must-revalidate, private");
    res.sendFile(path.join(__dirname, "../frontend/login.html"));
});

/* =========================================
   SERVER
========================================= */
const PORT = process.env.PORT || 5000;

const startServer = () => {
    app.listen(PORT, () => {
        console.log(`Server running on http://localhost:${PORT}`);
        console.log(`Frontend accessible at http://localhost:${PORT}`);

        // Auto-release completed space bookings on startup and every 60 seconds
        if (typeof autoReleaseCompletedBookings === "function") {
            autoReleaseCompletedBookings();
            setInterval(autoReleaseCompletedBookings, 60000);
        }
    });
};

// Ensure database tables and initial seed data are ready before starting the server
if (db && typeof db.initializeDatabase === "function") {
    db.initializeDatabase(startServer);
} else {
    startServer();
}