const db = require("../config/db");
const bcrypt = require("bcryptjs");
const { logAuditEvent } = require("../utils/auditLogger");
const { generateToken } = require("../utils/token");


/* =========================================
   LOGIN
========================================= */

const login = (req, res) => {
    const { email, password } = req.body;
    const clientIp = req.ip || req.headers["x-forwarded-for"] || "127.0.0.1";

    if (!email || !password) {
        return res.status(400).json({
            message: "Email and password are required"
        });
    }

    const sql = `
        SELECT
            id,
            name,
            email,
            password,
            role
        FROM users
        WHERE email = ?
    `;

    db.query(sql, [email.trim()], async (err, results) => {
        if (err) {
            console.error("Database error during login:", err);
            return res.status(500).json({
                message: "Database error occurred"
            });
        }

        if (results.length === 0) {
            logAuditEvent({
                userEmail: email.trim(),
                action: "LOGIN_FAILED",
                details: `Failed login attempt: Email not found (${email.trim()})`,
                ipAddress: clientIp
            });
            return res.status(401).json({
                message: "Invalid email or password"
            });
        }

        const user = results[0];

        try {
            let isMatch = false;

            // Check if stored password is a bcrypt hash
            if (user.password.startsWith("$2a$") || user.password.startsWith("$2b$")) {
                isMatch = await bcrypt.compare(password, user.password);
            } else {
                // Legacy plaintext fallback: verify and automatically upgrade to bcrypt hash
                isMatch = (user.password === password);
                if (isMatch) {
                    const salt = await bcrypt.genSalt(10);
                    const hashed = await bcrypt.hash(password, salt);
                    db.query("UPDATE users SET password = ? WHERE id = ?", [hashed, user.id]);
                }
            }

            if (!isMatch) {
                logAuditEvent({
                    userId: user.id,
                    userEmail: user.email,
                    userRole: user.role,
                    action: "LOGIN_FAILED",
                    details: `Failed login attempt: Invalid password for ${user.email}`,
                    ipAddress: clientIp
                });
                return res.status(401).json({
                    message: "Invalid email or password"
                });
            }

            // Successful login audit log
            logAuditEvent({
                userId: user.id,
                userEmail: user.email,
                userRole: user.role,
                action: "LOGIN_SUCCESS",
                targetType: "user",
                targetId: user.id,
                details: `User ${user.name} logged into ${user.role} portal`,
                ipAddress: clientIp
            });

            const token = generateToken(user);

            res.json({
                message: "Login successful",
                token: token,
                user: {
                    id: user.id,
                    name: user.name,
                    email: user.email,
                    role: user.role
                }
            });
        } catch (compareErr) {
            console.error("Error during password verification:", compareErr);
            return res.status(500).json({
                message: "Authentication error occurred"
            });
        }
    });
};


/* =========================================
   FACULTY MANAGEMENT (ADMIN ONLY)
========================================= */

const getAllFaculty = (req, res) => {
    const sql = `
        SELECT id, name, email, role
        FROM users
        WHERE role = 'faculty'
        ORDER BY id DESC
    `;

    db.query(sql, (err, results) => {
        if (err) {
            console.error("Error fetching faculty:", err);
            return res.status(500).json({ message: "Database error" });
        }
        res.json(results);
    });
};

const addFaculty = (req, res) => {
    const { name, email, password } = req.body;
    const clientIp = req.ip || req.headers["x-forwarded-for"] || "127.0.0.1";

    if (!name || !email || !password) {
        return res.status(400).json({ message: "Name, email and password are required" });
    }

    if (name.trim().length < 3) {
        return res.status(400).json({ message: "Name must contain at least 3 characters" });
    }

    if (password.length < 6) {
        return res.status(400).json({ message: "Password must contain at least 6 characters" });
    }

    const checkSql = "SELECT id FROM users WHERE email = ?";
    db.query(checkSql, [email.trim()], async (err, results) => {
        if (err) {
            console.error("Database error during faculty check:", err);
            return res.status(500).json({ message: "Database error" });
        }

        if (results.length > 0) {
            return res.status(409).json({ message: "Email already registered" });
        }

        try {
            // Hash password securely with bcrypt before storing in database
            const salt = await bcrypt.genSalt(10);
            const hashedPassword = await bcrypt.hash(password, salt);

            const insertSql = `
                INSERT INTO users (name, email, password, role)
                VALUES (?, ?, ?, 'faculty')
            `;

            db.query(insertSql, [name.trim(), email.trim(), hashedPassword], (insertErr, result) => {
                if (insertErr) {
                    console.error("Failed to create faculty account:", insertErr);
                    return res.status(500).json({ message: "Failed to create faculty account" });
                }

                logAuditEvent({
                    userId: req.user ? req.user.id : null,
                    userEmail: req.user ? req.user.email : null,
                    userRole: req.user ? req.user.role : "admin",
                    action: "FACULTY_CREATED",
                    targetType: "faculty",
                    targetId: result.insertId,
                    details: `Admin ${req.user ? req.user.email : ""} created faculty account: ${name.trim()} (${email.trim()})`,
                    ipAddress: clientIp
                });

                res.status(201).json({
                    message: "Faculty account created successfully",
                    user: {
                        id: result.insertId,
                        name: name.trim(),
                        email: email.trim(),
                        role: "faculty"
                    }
                });
            });
        } catch (hashErr) {
            console.error("Error hashing password:", hashErr);
            return res.status(500).json({ message: "Error securing faculty password" });
        }
    });
};

const updateFaculty = (req, res) => {
    const { id } = req.params;
    const { name, email, password } = req.body;
    const clientIp = req.ip || req.headers["x-forwarded-for"] || "127.0.0.1";

    if (!name || !email) {
        return res.status(400).json({ message: "Name and email are required" });
    }

    const checkSql = "SELECT id FROM users WHERE email = ? AND id != ?";
    db.query(checkSql, [email.trim(), id], async (err, results) => {
        if (err) {
            console.error("Database error during update check:", err);
            return res.status(500).json({ message: "Database error" });
        }

        if (results.length > 0) {
            return res.status(409).json({ message: "Email is already used by another account" });
        }

        let updateSql = "UPDATE users SET name = ?, email = ? WHERE id = ? AND role = 'faculty'";
        let params = [name.trim(), email.trim(), id];

        if (password && password.trim() !== "") {
            if (password.length < 6) {
                return res.status(400).json({ message: "Password must contain at least 6 characters" });
            }

            try {
                const salt = await bcrypt.genSalt(10);
                const hashedPassword = await bcrypt.hash(password, salt);
                updateSql = "UPDATE users SET name = ?, email = ?, password = ? WHERE id = ? AND role = 'faculty'";
                params = [name.trim(), email.trim(), hashedPassword, id];
            } catch (hashErr) {
                console.error("Error hashing updated password:", hashErr);
                return res.status(500).json({ message: "Error securing updated password" });
            }
        }

        db.query(updateSql, params, (updateErr, result) => {
            if (updateErr) {
                console.error("Failed to update faculty account:", updateErr);
                return res.status(500).json({ message: "Failed to update faculty account" });
            }

            if (result.affectedRows === 0) {
                return res.status(404).json({ message: "Faculty member not found" });
            }

            logAuditEvent({
                userId: req.user ? req.user.id : null,
                userEmail: req.user ? req.user.email : null,
                userRole: req.user ? req.user.role : "admin",
                action: "FACULTY_UPDATED",
                targetType: "faculty",
                targetId: id,
                details: `Admin ${req.user ? req.user.email : ""} updated faculty account ID #${id} (${email.trim()})`,
                ipAddress: clientIp
            });

            res.json({ message: "Faculty account updated successfully" });
        });
    });
};

const deleteFaculty = (req, res) => {
    const { id } = req.params;
    const clientIp = req.ip || req.headers["x-forwarded-for"] || "127.0.0.1";

    // Clean up any requests submitted by this faculty member first
    db.query("DELETE FROM requests WHERE faculty_id = ?", [id], (reqErr) => {
        if (reqErr) {
            console.log("Error deleting faculty requests:", reqErr);
        }

        const sql = "DELETE FROM users WHERE id = ? AND role = 'faculty'";
        db.query(sql, [id], (err, result) => {
            if (err) {
                console.log(err);
                return res.status(500).json({ message: "Failed to delete faculty account" });
            }

            if (result.affectedRows === 0) {
                return res.status(404).json({ message: "Faculty member not found" });
            }

            logAuditEvent({
                userId: req.user ? req.user.id : null,
                userEmail: req.user ? req.user.email : null,
                userRole: req.user ? req.user.role : "admin",
                action: "FACULTY_DELETED",
                targetType: "faculty",
                targetId: id,
                details: `Admin ${req.user ? req.user.email : ""} deleted faculty account ID #${id}`,
                ipAddress: clientIp
            });

            res.json({ message: "Faculty account deleted successfully" });
        });
    });
};

module.exports = {
    login,
    getAllFaculty,
    addFaculty,
    updateFaculty,
    deleteFaculty
};