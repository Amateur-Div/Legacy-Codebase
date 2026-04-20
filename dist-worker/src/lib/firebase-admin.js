"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.getAdminAuth = getAdminAuth;
const app_1 = require("firebase-admin/app");
const auth_1 = require("firebase-admin/auth");
function initFirebaseAdmin() {
    var _a;
    if ((0, app_1.getApps)().length) {
        return;
    }
    const projectId = process.env.FIREBASE_PROJECT_ID;
    const clientEmail = process.env.FIREBASE_CLIENT_EMAIL;
    const privateKey = (_a = process.env.FIREBASE_PRIVATE_KEY) === null || _a === void 0 ? void 0 : _a.replace(/\\n/g, "\n");
    if (!projectId || !clientEmail || !privateKey) {
        throw new Error("Firebase Admin ENV values are missing or invalid");
    }
    (0, app_1.initializeApp)({
        credential: (0, app_1.cert)({
            projectId,
            clientEmail,
            privateKey,
        }),
    });
}
function getAdminAuth() {
    initFirebaseAdmin();
    return (0, auth_1.getAuth)();
}
