const express = require("express");
const { authenticate, requireRole } = require("../middleware/authMiddleware");

const {
    getAllRequests,
    getFacultyRequests,
    getRequestById,
    createRequest,
    updateRequest,
    approveRequest,
    rejectRequest,
    deleteRequest
} = require("../controllers/requestController");

const router = express.Router();

// GET all requests (Admin and Management only)
router.get("/", authenticate, requireRole("admin", "management"), getAllRequests);
router.get("/faculty/:facultyId", authenticate, getFacultyRequests);
router.get("/:id", authenticate, getRequestById);
router.post("/", authenticate, requireRole("faculty", "admin"), createRequest);
router.put("/:id", authenticate, requireRole("admin"), updateRequest);
router.put("/:id/approve", authenticate, requireRole("admin"), approveRequest);
router.put("/:id/reject", authenticate, requireRole("admin"), rejectRequest);
router.delete("/:id", authenticate, requireRole("admin"), deleteRequest);

module.exports = router;