"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.getGridFSBucket = getGridFSBucket;
exports.uploadZipToGridFS = uploadZipToGridFS;
exports.downloadZipToPath = downloadZipToPath;
const mongodb_1 = require("mongodb");
const fs_1 = __importDefault(require("fs"));
const mongoClient_1 = __importDefault(require("../../../lib/mongoClient"));
let bucket = null;
async function getGridFSBucket() {
    if (bucket)
        return bucket;
    const client = await mongoClient_1.default;
    const db = client.db();
    bucket = new mongodb_1.GridFSBucket(db, {
        bucketName: "project_uploads",
        chunkSizeBytes: 1024 * 1024,
    });
    return bucket;
}
async function uploadZipToGridFS(projectId, file) {
    const bucket = await getGridFSBucket();
    const uploadStream = bucket.openUploadStream(`${projectId}.zip`, {
        metadata: { projectId },
    });
    const reader = file.stream().getReader();
    while (true) {
        const { done, value } = await reader.read();
        if (done)
            break;
        uploadStream.write(value);
    }
    uploadStream.end();
    return new Promise((resolve, reject) => {
        uploadStream.on("finish", () => {
            resolve(uploadStream.id.toString()); // keep string for DB
        });
        uploadStream.on("error", reject);
    });
}
async function downloadZipToPath(fileId, destPath) {
    const bucket = await getGridFSBucket();
    const stream = bucket.openDownloadStream(new mongodb_1.ObjectId(fileId));
    return new Promise((resolve, reject) => {
        const write = fs_1.default.createWriteStream(destPath);
        stream.pipe(write);
        write.on("finish", () => resolve());
        write.on("error", reject);
        stream.on("error", reject);
    });
}
