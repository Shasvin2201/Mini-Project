const express = require("express");
const { authenticate, requireRole } = require("../middleware/authMiddleware");

const {
    getAllSpaces,
    getSpaceById,
    createSpace,
    updateSpace,
    deleteSpace
} = require("../controllers/spaceController");

const router = express.Router();

// GET all spaces (Authenticated users)
router.get("/", authenticate, getAllSpaces);

// GET one space (Authenticated users)
router.get("/:id", authenticate, getSpaceById);

// CREATE space (Admin only)
router.post("/", authenticate, requireRole("admin"), createSpace);

// UPDATE space (Admin only)
router.put("/:id", authenticate, requireRole("admin"), updateSpace);

// DELETE space (Admin only)
router.delete("/:id", authenticate, requireRole("admin"), deleteSpace);

module.exports = router;