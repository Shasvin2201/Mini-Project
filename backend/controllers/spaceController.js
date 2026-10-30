const db = require("../config/db");
const { logAuditEvent } = require("../utils/auditLogger");

// AUTO-RELEASE SPACES WHOSE CLASS TIMING HAS COMPLETED
// NOTE: Only releases spaces that had an approved booking that has now ended,
// preserving spaces manually set to 'Unavailable' by Admin for maintenance.
const autoReleaseCompletedBookings = (callback) => {
    const now = new Date();
    const year = now.getFullYear();
    const month = String(now.getMonth() + 1).padStart(2, "0");
    const day = String(now.getDate()).padStart(2, "0");
    const hours = String(now.getHours()).padStart(2, "0");
    const minutes = String(now.getMinutes()).padStart(2, "0");
    const seconds = String(now.getSeconds()).padStart(2, "0");
    const currentDate = `${year}-${month}-${day}`;
    const currentTime = `${hours}:${minutes}:${seconds}`;

    const sql = `
        UPDATE spaces
        SET status = 'Available'
        WHERE status = 'Unavailable'
        AND id IN (
            SELECT space_id FROM requests
            WHERE status = 'Approved'
            AND (
                request_date < ?
                OR (request_date = ? AND end_time <= ?)
            )
        )
        AND id NOT IN (
            SELECT space_id FROM requests
            WHERE status = 'Approved'
            AND (
                request_date > ?
                OR (request_date = ? AND end_time > ?)
            )
        )
    `;

    db.query(sql, [currentDate, currentDate, currentTime, currentDate, currentDate, currentTime], (err, result) => {
        if (err) {
            console.error("Auto-release completed bookings error:", err);
        }
        if (callback) callback(err, result);
    });
};

// GET ALL SPACES
const getAllSpaces = (req, res) => {
    autoReleaseCompletedBookings(() => {
        let sql = "SELECT * FROM spaces ORDER BY id";
        if (req.user && req.user.role === "faculty") {
            sql = "SELECT * FROM spaces WHERE status != 'Inactive' ORDER BY id";
        }

        db.query(sql, (err, results) => {
            if (err) {
                console.log(err);
                return res.status(500).json({
                    message: "Failed to fetch spaces"
                });
            }

            res.json(results);
        });
    });
};


// GET ONE SPACE
const getSpaceById = (req, res) => {

    const id = req.params.id;

    const sql = "SELECT * FROM spaces WHERE id = ?";

    db.query(sql, [id], (err, results) => {

        if (err) {
            console.log(err);
            return res.status(500).json({
                message: "Failed to fetch space"
            });
        }

        if (results.length === 0) {
            return res.status(404).json({
                message: "Space not found"
            });
        }

        res.json(results[0]);
    });
};


// ADD NEW SPACE
const createSpace = (req, res) => {

    const {
        space_name,
        block,
        type,
        capacity,
        status
    } = req.body;

    const sql = `
        INSERT INTO spaces
        (space_name, block, type, capacity, status)
        VALUES (?, ?, ?, ?, ?)
    `;

    db.query(
        sql,
        [
            space_name,
            block,
            type,
            capacity,
            status || "Available"
        ],
        (err, result) => {

            if (err) {
                console.log(err);
                return res.status(500).json({
                    message: "Failed to create space"
                });
            }

            res.status(201).json({
                message: "Space created successfully",
                id: result.insertId
            });

            logAuditEvent({
                userId: req.user ? req.user.id : null,
                userEmail: req.user ? req.user.email : null,
                userRole: req.user ? req.user.role : "admin",
                action: "SPACE_CREATED",
                targetType: "space",
                targetId: result.insertId,
                details: `Admin ${req.user ? req.user.email : ""} created space ${space_name} (${block}, ${type}, capacity: ${capacity})`,
                ipAddress: req.ip || req.headers["x-forwarded-for"] || "127.0.0.1"
            });
        }
    );
};


// UPDATE SPACE
const updateSpace = (req, res) => {

    const id = req.params.id;

    const {
        space_name,
        block,
        type,
        capacity,
        status
    } = req.body;

    const sql = `
        UPDATE spaces
        SET
            space_name = ?,
            block = ?,
            type = ?,
            capacity = ?,
            status = ?
        WHERE id = ?
    `;

    db.query(
        sql,
        [
            space_name,
            block,
            type,
            capacity,
            status,
            id
        ],
        (err, result) => {

            if (err) {
                console.log(err);
                return res.status(500).json({
                    message: "Failed to update space"
                });
            }

            if (result.affectedRows === 0) {
                return res.status(404).json({
                    message: "Space not found"
                });
            }

            logAuditEvent({
                userId: req.user ? req.user.id : null,
                userEmail: req.user ? req.user.email : null,
                userRole: req.user ? req.user.role : "admin",
                action: "SPACE_UPDATED",
                targetType: "space",
                targetId: id,
                details: `Admin ${req.user ? req.user.email : ""} updated space #${id} (${space_name}, ${block}, ${type}, status: ${status})`,
                ipAddress: req.ip || req.headers["x-forwarded-for"] || "127.0.0.1"
            });

            res.json({
                message: "Space updated successfully"
            });
        }
    );
};


// SOFT DELETE / DEACTIVATE SPACE
const deleteSpace = (req, res) => {

    const id = req.params.id;

    // Soft delete: Set status to 'Inactive' to keep historical bookings and utilization data intact
    const sql = "UPDATE spaces SET status = 'Inactive' WHERE id = ?";

    db.query(sql, [id], (err, result) => {

        if (err) {
            console.log(err);
            return res.status(500).json({
                message: "Failed to deactivate space"
            });
        }

        if (result.affectedRows === 0) {
            return res.status(404).json({
                message: "Space not found"
            });
        }

        logAuditEvent({
            userId: req.user ? req.user.id : null,
            userEmail: req.user ? req.user.email : null,
            userRole: req.user ? req.user.role : "admin",
            action: "SPACE_DEACTIVATED",
            targetType: "space",
            targetId: id,
            details: `Admin ${req.user ? req.user.email : ""} deactivated space #${id}`,
            ipAddress: req.ip || req.headers["x-forwarded-for"] || "127.0.0.1"
        });

        res.json({
            message: "Space deactivated successfully (historical bookings preserved)"
        });
    });
};


module.exports = {
    getAllSpaces,
    getSpaceById,
    createSpace,
    updateSpace,
    deleteSpace,
    autoReleaseCompletedBookings
};