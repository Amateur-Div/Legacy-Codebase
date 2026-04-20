"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.storage = exports.googleProvider = exports.db = exports.auth = exports.app = void 0;
const app_1 = require("firebase/app");
// import { getAnalytics } from "firebase/analytics";
const auth_1 = require("firebase/auth");
const firestore_1 = require("firebase/firestore");
const storage_1 = require("firebase/storage");
const firebaseConfig = {
    apiKey: "AIzaSyAD54FG62klPsVN-Ep0Ovs0fdbcI5iGwis",
    authDomain: "legacy-codebase.firebaseapp.com",
    projectId: "legacy-codebase",
    storageBucket: "legacy-codebase.firebasestorage.app",
    messagingSenderId: "89526963192",
    appId: "1:89526963192:web:fc5358892ca19aaa96640d",
    measurementId: "G-Z1VBSGV2Z4",
};
const app = (0, app_1.getApps)().length ? (0, app_1.getApp)() : (0, app_1.initializeApp)(firebaseConfig);
exports.app = app;
const auth = (0, auth_1.getAuth)(app);
exports.auth = auth;
const db = (0, firestore_1.getFirestore)(app);
exports.db = db;
const googleProvider = new auth_1.GoogleAuthProvider();
exports.googleProvider = googleProvider;
const storage = (0, storage_1.getStorage)(app);
exports.storage = storage;
