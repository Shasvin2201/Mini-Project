const db = require("../config/db");
const { logAuditEvent } = require("../utils/auditLogger");

// Get all requests
const getAllRequests = (req, res) => {
    const sql = `
        SELECT
            requests.id,
            requests.faculty_id,
            users.name AS faculty_name,
            requests.space_id,
            spaces.space_name,
            spaces.block,
            spaces.type,
            DATE_FORMAT(requests.request_date, '%Y-%m-%d') AS request_date,
            requests.start_time,
            requests.end_time,
            requests.required_capacity,
            requests.purpose,
            requests.status
        FROM requests
        JOIN users ON requests.faculty_id = users.id
        JOIN spaces ON requests.space_id = spaces.id
        ORDER BY requests.id DESC
    `;

    db.query(sql, (err, results) => {
        if (err) {
            console.log(err);
            return res.status(500).json({
                message: "Failed to fetch requests"
            });
        }

        const formattedResults = results.map((request) => ({
            ...request,
            status: request.status.toUpperCase()
        }));

        res.json(formattedResults);
    });
};


// Get requests of one faculty
const getFacultyRequests = (req, res) => {
    let facultyId = req.params.facultyId;

    // Security: Faculty can only access their own requests
    if (req.user && req.user.role === "faculty") {
        if (facultyId && facultyId !== "me" && facultyId !== "null" && !isNaN(Number(facultyId)) && Number(facultyId) !== Number(req.user.id)) {
            return res.status(403).json({
                message: "Access denied: You can only view your own booking requests."
            });
        }
        facultyId = req.user.id;
    }

    const sql = `
        SELECT
            requests.id,
            requests.faculty_id,
            users.name AS faculty_name,
            requests.space_id,
            spaces.space_name,
            spaces.block,
            spaces.type,
            DATE_FORMAT(requests.request_date, '%Y-%m-%d') AS request_date,
            requests.start_time,
            requests.end_time,
            requests.required_capacity,
            requests.purpose,
            requests.status
        FROM requests
        JOIN users ON requests.faculty_id = users.id
        JOIN spaces ON requests.space_id = spaces.id
        WHERE requests.faculty_id = ?
        ORDER BY requests.id DESC
    `;

    db.query(sql, [facultyId], (err, results) => {
        if (err) {
            console.log(err);
            return res.status(500).json({
                message: "Failed to fetch faculty requests"
            });
        }

        const formattedResults = results.map((request) => ({
            ...request,
            status: request.status.toUpperCase()
        }));

        res.json(formattedResults);
    });
};


// Get one request by ID
const getRequestById = (req, res) => {
    const requestId = req.params.id;

    const sql = `
        SELECT
            requests.id,
            requests.faculty_id,
            users.name AS faculty_name,
            requests.space_id,
            spaces.space_name,
            spaces.block,
            spaces.type,
            DATE_FORMAT(requests.request_date, '%Y-%m-%d') AS request_date,
            requests.start_time,
            requests.end_time,
            requests.required_capacity,
            requests.purpose,
            requests.status
        FROM requests
        JOIN users ON requests.faculty_id = users.id
        JOIN spaces ON requests.space_id = spaces.id
        WHERE requests.id = ?
    `;

    db.query(sql, [requestId], (err, results) => {
        if (err) {
            console.log(err);
            return res.status(500).json({
                message: "Failed to fetch request"
            });
        }

        if (results.length === 0) {
            return res.status(404).json({
                message: "Request not found"
            });
        }

        const request = results[0];
        request.status = request.status.toUpperCase();

        // Security: Faculty can only access their own requests
        if (req.user && req.user.role === "faculty" && Number(request.faculty_id) !== Number(req.user.id)) {
            return res.status(403).json({
                message: "Access denied: You are not authorized to view another faculty member's request."
            });
        }

        res.json(request);
    });
};


// Create request
const createRequest = (req, res) => {
    const {
        space_id,
        request_date,
        start_time,
        end_time,
        required_capacity,
        purpose
    } = req.body;

    // Security: Force faculty_id from logged-in user if role is faculty
    let effectiveFacultyId = req.body.faculty_id;
    if (req.user && req.user.role === "faculty") {
        effectiveFacultyId = req.user.id;
    }

    if (
        !effectiveFacultyId ||
        !space_id ||
        !request_date ||
        !start_time ||
        !end_time ||
        !required_capacity ||
        !purpose
    ) {
        return res.status(400).json({
            message: "All fields are required"
        });
    }

    const normStartTime = String(start_time).trim();
    const normEndTime = String(end_time).trim();

    if (normStartTime >= normEndTime) {
        return res.status(400).json({
            message: "End time must be later than start time"
        });
    }

    const now = new Date();
    const currentYear = now.getFullYear();
    const currentMonth = String(now.getMonth() + 1).padStart(2, "0");
    const currentDay = String(now.getDate()).padStart(2, "0");
    const today = `${currentYear}-${currentMonth}-${currentDay}`;

    if (request_date < today) {
        return res.status(400).json({
            message: "Booking date cannot be in the past"
        });
    }

    const reqCap = Number(required_capacity);
    if (isNaN(reqCap) || reqCap <= 0) {
        return res.status(400).json({
            message: "Required capacity must be greater than zero"
        });
    }

    // 1. Verify faculty account exists
    const checkFacultySql = "SELECT id, name, email, role FROM users WHERE id = ?";
    db.query(checkFacultySql, [effectiveFacultyId], (fErr, fResults) => {
        if (fErr) {
            console.error("Error checking faculty:", fErr);
            return res.status(500).json({ message: "Failed to verify faculty account" });
        }

        if (fResults.length === 0 || fResults[0].role !== "faculty") {
            return res.status(400).json({ message: "Invalid faculty account" });
        }

        // 2. Verify space exists, is active, and has sufficient capacity
        const checkSpaceSql = "SELECT id, space_name, capacity, status FROM spaces WHERE id = ?";
        db.query(checkSpaceSql, [space_id], (sErr, spaceResults) => {
            if (sErr) {
                console.error("Error checking space:", sErr);
                return res.status(500).json({ message: "Failed to check space" });
            }

            if (spaceResults.length === 0) {
                return res.status(404).json({ message: "Space not found" });
            }

            const space = spaceResults[0];

            if (space.status === "Inactive") {
                return res.status(400).json({
                    message: "This space is currently inactive and cannot be booked."
                });
            }

            if (reqCap > space.capacity) {
                return res.status(400).json({
                    message: `Required capacity (${reqCap}) exceeds space capacity (${space.capacity} seats)`
                });
            }

            // 3. Check for overlapping reservations on the same date for this space
            // Two time ranges [S1, E1] and [S2, E2] overlap if S1 < E2 and E1 > S2
            const conflictSql = `
                SELECT id, status, start_time, end_time
                FROM requests
                WHERE space_id = ?
                AND request_date = ?
                AND status IN ('Approved', 'Pending')
                AND start_time < ?
                AND end_time > ?
                LIMIT 1
            `;

            db.query(conflictSql, [space_id, request_date, normEndTime, normStartTime], (cErr, conflictResults) => {
                if (cErr) {
                    console.error("Error checking booking conflicts:", cErr);
                    return res.status(500).json({ message: "Failed to check schedule conflicts" });
                }

                if (conflictResults.length > 0) {
                    const conflict = conflictResults[0];
                    const conflictType = conflict.status === "Approved" ? "already booked" : "currently requested (pending)";
                    const cStart = String(conflict.start_time).slice(0, 5);
                    const cEnd = String(conflict.end_time).slice(0, 5);
                    return res.status(409).json({
                        message: `Time slot conflict: ${space.space_name} is ${conflictType} on ${request_date} between ${cStart} and ${cEnd}.`
                    });
                }

                // 4. Create request
                const sql = `
                    INSERT INTO requests
                    (faculty_id, space_id, request_date, start_time, end_time, required_capacity, purpose, status)
                    VALUES (?, ?, ?, ?, ?, ?, ?, 'Pending')
                `;

                db.query(
                    sql,
                    [effectiveFacultyId, space_id, request_date, normStartTime, normEndTime, reqCap, purpose.trim()],
                    (err, result) => {
                        if (err) {
                            console.error("Error inserting request:", err);
                            return res.status(500).json({ message: "Failed to create request" });
                        }

                        res.status(201).json({
                            message: "Request created successfully",
                            id: result.insertId
                        });

                        logAuditEvent({
                            userId: req.user ? req.user.id : effectiveFacultyId,
                            userEmail: req.user ? req.user.email : fResults[0].email,
                            userRole: req.user ? req.user.role : "faculty",
                            action: "BOOKING_REQUEST_CREATED",
                            targetType: "request",
                            targetId: result.insertId,
                            details: `Booking request #${result.insertId} created for ${space.space_name} on ${request_date} (${normStartTime} - ${normEndTime}), purpose: ${purpose.trim()}`,
                            ipAddress: req.ip || req.headers["x-forwarded-for"] || "127.0.0.1"
                        });
                    }
                );
            });
        });
    });
};


// Update request
const updateRequest = (req, res) => {
    const requestId = req.params.id;

    const {
        space_id,
        request_date,
        start_time,
        end_time,
        required_capacity,
        purpose
    } = req.body;

    const sql = `
        UPDATE requests
        SET
            space_id = ?,
            request_date = ?,
            start_time = ?,
            end_time = ?,
            required_capacity = ?,
            purpose = ?
        WHERE id = ?
    `;

    db.query(
        sql,
        [
            space_id,
            request_date,
            start_time,
            end_time,
            required_capacity,
            purpose,
            requestId
        ],
        (err, result) => {
            if (err) {
                console.log(err);
                return res.status(500).json({
                    message: "Failed to update request"
                });
            }

            if (result.affectedRows === 0) {
                return res.status(404).json({
                    message: "Request not found"
                });
            }

            res.json({
                message: "Request updated successfully"
            });
        }
    );
};


// Approve request
const approveRequest = (req, res) => {
    const requestId = req.params.id;

    // First find full request details
    const getRequestSql = `
        SELECT id, space_id, DATE_FORMAT(request_date, '%Y-%m-%d') AS request_date, start_time, end_time, status
        FROM requests
        WHERE id = ?
    `;

    db.query(getRequestSql, [requestId], (err, requestResults) => {
        if (err) {
            console.error("Error finding request:", err);
            return res.status(500).json({
                message: "Failed to find request"
            });
        }

        if (requestResults.length === 0) {
            return res.status(404).json({
                message: "Request not found"
            });
        }

        const request = requestResults[0];

        if (request.status === "Approved") {
            return res.status(400).json({
                message: "Request is already approved"
            });
        }

        // Check if ANOTHER request for this space/date/overlapping time has already been Approved
        const checkApprovedConflictSql = `
            SELECT id, start_time, end_time FROM requests
            WHERE space_id = ?
            AND request_date = ?
            AND status = 'Approved'
            AND id != ?
            AND start_time < ?
            AND end_time > ?
            LIMIT 1
        `;

        db.query(
            checkApprovedConflictSql,
            [request.space_id, request.request_date, requestId, request.end_time, request.start_time],
            (cErr, conflictResults) => {
                if (cErr) {
                    console.error("Error checking approval conflict:", cErr);
                    return res.status(500).json({ message: "Failed to verify schedule conflicts" });
                }

                if (conflictResults.length > 0) {
                    const conf = conflictResults[0];
                    return res.status(409).json({
                        message: `Cannot approve: Space is already allocated to approved request #${conf.id} (${String(conf.start_time).slice(0, 5)} - ${String(conf.end_time).slice(0, 5)}).`
                    });
                }

                // Approve the request
                const approveSql = `
                    UPDATE requests
                    SET status = 'Approved'
                    WHERE id = ?
                `;

                db.query(approveSql, [requestId], (appErr, result) => {
                    if (appErr || result.affectedRows === 0) {
                        return res.status(500).json({
                            message: "Failed to approve request"
                        });
                    }

                    // Automatically reject any other overlapping PENDING requests for this space/date/time
                    const rejectOverlappingPendingSql = `
                        UPDATE requests
                        SET status = 'Rejected'
                        WHERE space_id = ?
                        AND request_date = ?
                        AND status = 'Pending'
                        AND id != ?
                        AND start_time < ?
                        AND end_time > ?
                    `;
                    db.query(
                        rejectOverlappingPendingSql,
                        [request.space_id, request.request_date, requestId, request.end_time, request.start_time],
                        (rejErr) => {
                            if (rejErr) console.error("Error auto-rejecting overlapping requests:", rejErr);
                        }
                    );

                    // Update space status to 'Unavailable'
                    const updateSpaceSql = `
                        UPDATE spaces
                        SET status = 'Unavailable'
                        WHERE id = ?
                    `;

                    db.query(updateSpaceSql, [request.space_id], (spErr) => {
                        if (spErr) {
                            console.error("Error updating space status:", spErr);
                            return res.status(500).json({
                                message: "Request approved, but failed to update space status"
                            });
                        }

                        res.json({
                            message: "Request approved and space marked unavailable"
                        });

                        logAuditEvent({
                            userId: req.user ? req.user.id : null,
                            userEmail: req.user ? req.user.email : null,
                            userRole: req.user ? req.user.role : "admin",
                            action: "BOOKING_REQUEST_APPROVED",
                            targetType: "request",
                            targetId: requestId,
                            details: `Admin ${req.user ? req.user.email : ""} approved booking request #${requestId} for space #${request.space_id} on ${request.request_date}`,
                            ipAddress: req.ip || req.headers["x-forwarded-for"] || "127.0.0.1"
                        });
                    });
                });
            }
        );
    });
};


// Reject request
const rejectRequest = (req, res) => {
    const requestId = req.params.id;

    // First find space_id and status of the request
    const findSql = `SELECT space_id, status FROM requests WHERE id = ?`;
    db.query(findSql, [requestId], (err, requestResults) => {
        if (err) {
            console.log(err);
            return res.status(500).json({
                message: "Failed to find request"
            });
        }

        if (requestResults.length === 0) {
            return res.status(404).json({
                message: "Request not found"
            });
        }

        const request = requestResults[0];
        const wasApproved = request.status === "Approved";

        const sql = `
            UPDATE requests
            SET status = 'Rejected'
            WHERE id = ?
        `;

        db.query(sql, [requestId], (err, result) => {
            if (err) {
                console.log(err);
                return res.status(500).json({
                    message: "Failed to reject request"
                });
            }

            if (result.affectedRows === 0) {
                return res.status(404).json({
                    message: "Request not found"
                });
            }

            // If it was approved, check if there are other approved requests for this space
            if (wasApproved) {
                const checkRemainingSql = `
                    SELECT id FROM requests
                    WHERE space_id = ? AND status = 'Approved' AND id != ?
                `;
                db.query(checkRemainingSql, [request.space_id, requestId], (err, remaining) => {
                    if (!err && remaining.length === 0) {
                        db.query("UPDATE spaces SET status = 'Available' WHERE id = ?", [request.space_id]);
                    }
                });
            }

            logAuditEvent({
                userId: req.user ? req.user.id : null,
                userEmail: req.user ? req.user.email : null,
                userRole: req.user ? req.user.role : "admin",
                action: "BOOKING_REQUEST_REJECTED",
                targetType: "request",
                targetId: requestId,
                details: `Admin ${req.user ? req.user.email : ""} rejected booking request #${requestId}`,
                ipAddress: req.ip || req.headers["x-forwarded-for"] || "127.0.0.1"
            });

            res.json({
                message: "Request rejected successfully"
            });
        });
    });
};


// Delete request
const deleteRequest = (req, res) => {
    const requestId = req.params.id;

    // First find space_id and status of the request
    const findSql = `SELECT space_id, status FROM requests WHERE id = ?`;
    db.query(findSql, [requestId], (err, requestResults) => {
        if (err) {
            console.log(err);
            return res.status(500).json({
                message: "Failed to find request"
            });
        }

        if (requestResults.length === 0) {
            return res.status(404).json({
                message: "Request not found"
            });
        }

        const request = requestResults[0];
        const wasApproved = request.status === "Approved";

        const sql = `
            DELETE FROM requests
            WHERE id = ?
        `;

        db.query(sql, [requestId], (err, result) => {
            if (err) {
                console.log(err);
                return res.status(500).json({
                    message: "Failed to delete request"
                });
            }

            if (result.affectedRows === 0) {
                return res.status(404).json({
                    message: "Request not found"
                });
            }

            // If it was approved, check if there are other approved requests for this space
            if (wasApproved) {
                const checkRemainingSql = `
                    SELECT id FROM requests
                    WHERE space_id = ? AND status = 'Approved'
                `;
                db.query(checkRemainingSql, [request.space_id], (err, remaining) => {
                    if (!err && remaining.length === 0) {
                        db.query("UPDATE spaces SET status = 'Available' WHERE id = ?", [request.space_id]);
                    }
                });
            }

            logAuditEvent({
                userId: req.user ? req.user.id : null,
                userEmail: req.user ? req.user.email : null,
                userRole: req.user ? req.user.role : "admin",
                action: "BOOKING_REQUEST_DELETED",
                targetType: "request",
                targetId: requestId,
                details: `Admin ${req.user ? req.user.email : ""} deleted booking request #${requestId}`,
                ipAddress: req.ip || req.headers["x-forwarded-for"] || "127.0.0.1"
            });

            res.json({
                message: "Request deleted successfully"
            });
        });
    });
};


module.exports = {
    getAllRequests,
    getFacultyRequests,
    getRequestById,
    createRequest,
    updateRequest,
    approveRequest,
    rejectRequest,
    deleteRequest
};