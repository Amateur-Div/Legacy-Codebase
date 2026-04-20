"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.authMiddleware = authMiddleware;
const firebase_admin_1 = require("./firebase-admin");
async function authMiddleware(token) {
    if (!token) {
        throw new Error("Unauthorized: No token provided");
    }
    try {
        const adminAuth = (0, firebase_admin_1.getAdminAuth)();
        const decodedToken = await adminAuth.verifyIdToken(token);
        return {
            uid: decodedToken.uid,
            email: decodedToken.email,
        };
    }
    catch (err) {
        console.error("Firebase auth error:", err);
        throw new Error("Unauthorized: Invalid token");
    }
}
