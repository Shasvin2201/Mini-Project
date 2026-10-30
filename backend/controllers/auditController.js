const db = require("../config/db");

const getAuditLogs = (req, res) => {
    const limit = parseInt(req.query.limit, 10) || 50;

    const sql = `
        SELECT
            id,
            user_id,
            user_email,
            user_role,
            action,
            target_type,
            target_id,
            details,
            ip_address,
            DATE_FORMAT(created_at, '%Y-%m-%d %H:%i:%s') AS timestamp
        FROM audit_logs
        ORDER BY id DESC
        LIMIT ?
    `;

    db.query(sql, [limit], (err, results) => {
        if (err) {
            console.error("Failed to fetch audit logs:", err);
            return res.status(500).json({ message: "Failed to fetch audit logs" });
        }
        res.json(results);
    });
};

module.exports = { getAuditLogs };
