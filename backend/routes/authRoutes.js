const express = require("express");
const { authenticate, requireRole } = require("../middleware/authMiddleware");

const {
    login,
    getAllFaculty,
    addFaculty,
    updateFaculty,
    deleteFaculty
} = require("../controllers/authController");

const router = express.Router();

/* =========================================
   LOGIN (PUBLIC)
========================================= */

router.post("/login", login);

/* =========================================
   FACULTY MANAGEMENT (ADMIN ONLY)
========================================= */

router.get("/faculty", authenticate, requireRole("admin"), getAllFaculty);
router.post("/faculty", authenticate, requireRole("admin"), addFaculty);
router.put("/faculty/:id", authenticate, requireRole("admin"), updateFaculty);
router.delete("/faculty/:id", authenticate, requireRole("admin"), deleteFaculty);

module.exports = router;