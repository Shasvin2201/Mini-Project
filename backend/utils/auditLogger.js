const db = require("../config/db");

/**
 * Log a security or administrative action to the audit_logs table
 */
const logAuditEvent = ({
    userId = null,
    userEmail = null,
    userRole = null,
    action,
    targetType = null,
    targetId = null,
    details = null,
    ipAddress = "127.0.0.1"
}) => {
    if (!action) return;

    const sql = `
        INSERT INTO audit_logs (
            user_id, user_email, user_role, action, target_type, target_id, details, ip_address
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?)
    `;

    const tid = targetId ? Number(targetId) || null : null;

    db.query(
        sql,
        [userId, userEmail, userRole, action, targetType, tid, details, ipAddress],
        (err) => {
            if (err) {
                console.error("Failed to write to audit_logs:", err.message);
            }
        }
    );
};

module.exports = { logAuditEvent };
