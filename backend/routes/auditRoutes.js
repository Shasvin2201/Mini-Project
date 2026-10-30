const express = require("express");
const router = express.Router();
const { authenticate, requireRole } = require("../middleware/authMiddleware");
const { getAuditLogs } = require("../controllers/auditController");

router.get("/", authenticate, requireRole("admin"), getAuditLogs);

module.exports = router;
