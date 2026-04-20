"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
var _a;
Object.defineProperty(exports, "__esModule", { value: true });
exports.pusherServer = void 0;
const pusher_1 = __importDefault(require("pusher"));
exports.pusherServer = new pusher_1.default({
    appId: (_a = process.env.PUSHER_APP_ID) === null || _a === void 0 ? void 0 : _a.toString(),
    key: process.env.PUSHER_KEY,
    secret: process.env.PUSHER_SECRET,
    cluster: process.env.PUSHER_CLUSTER,
    useTLS: true,
});
