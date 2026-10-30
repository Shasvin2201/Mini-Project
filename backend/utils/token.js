const crypto = require("crypto");

const JWT_SECRET = process.env.JWT_SECRET || "campus_space_jwt_secret_key_2026_secure";

/**
 * Generate a cryptographically signed HMAC-SHA256 token (valid for 24 hours)
 */
function generateToken(user) {
    const payload = {
        id: user.id,
        name: user.name,
        email: user.email,
        role: user.role,
        exp: Date.now() + 24 * 60 * 60 * 1000 // 24 hours validity
    };

    const data = Buffer.from(JSON.stringify(payload)).toString("base64url");
    const signature = crypto.createHmac("sha256", JWT_SECRET).update(data).digest("base64url");
    return `${data}.${signature}`;
}

/**
 * Verify and decode an HMAC-SHA256 token
 */
function verifyToken(token) {
    if (!token || typeof token !== "string" || !token.includes(".")) {
        return null;
    }

    const [data, signature] = token.split(".");
    if (!data || !signature) return null;

    const expectedSignature = crypto.createHmac("sha256", JWT_SECRET).update(data).digest("base64url");
    
    // Constant-time comparison to prevent timing attacks
    if (signature.length !== expectedSignature.length || !crypto.timingSafeEqual(Buffer.from(signature), Buffer.from(expectedSignature))) {
        return null;
    }

    try {
        const payload = JSON.parse(Buffer.from(data, "base64url").toString());
        if (payload.exp && Date.now() > payload.exp) {
            return null; // Token expired
        }
        return payload;
    } catch {
        return null;
    }
}

module.exports = { generateToken, verifyToken };
