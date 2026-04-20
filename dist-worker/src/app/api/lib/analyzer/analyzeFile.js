"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.analyzeFile = analyzeFile;
const instrumentExecutionBabel_1 = require("../instrumentExecutionBabel");
const normalizeGraphIds_1 = require("./normalizeGraphIds");
async function analyzeFile(filePath, code) {
    const raw = (0, instrumentExecutionBabel_1.instrumentExecutionBabel)(code);
    const normalized = (0, normalizeGraphIds_1.normalizeGraphIds)(raw, filePath);
    return normalized;
}
