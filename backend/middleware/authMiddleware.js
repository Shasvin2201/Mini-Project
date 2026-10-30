const { verifyToken } = require("../utils/token");

/**
 * Authentication Middleware: Validates Bearer token from Authorization header
 */
const authenticate = (req, res, next) => {
    const authHeader = req.headers["authorization"] || req.headers["x-access-token"];
    let token = null;

    if (authHeader && authHeader.startsWith("Bearer ")) {
        token = authHeader.substring(7);
    } else if (authHeader) {
        token = authHeader;
    }

    if (!token) {
        return res.status(401).json({
            message: "Authentication required: Please provide a valid Bearer token in Authorization header."
        });
    }

    const decoded = verifyToken(token);
    if (!decoded) {
        return res.status(401).json({
            message: "Invalid or expired session token. Please log in again."
        });
    }

    req.user = decoded;
    next();
};

/**
 * Role-Based Access Control (RBAC) Middleware: Restricts endpoints to authorized roles
 */
const requireRole = (...allowedRoles) => {
    return (req, res, next) => {
        if (!req.user || !allowedRoles.includes(req.user.role)) {
            return res.status(403).json({
                message: `Access denied: Action requires [${allowedRoles.join(" or ")}] privileges.`
            });
        }
        next();
    };
};

module.exports = { authenticate, requireRole };
