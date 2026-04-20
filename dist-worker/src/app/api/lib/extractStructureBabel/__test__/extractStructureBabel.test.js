"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const extractStructureBable_1 = require("../../extractStructureBable");
const fs_1 = __importDefault(require("fs"));
const path_1 = __importDefault(require("path"));
function load(name) {
    return fs_1.default.readFileSync(path_1.default.join(__dirname, "fixtures", name), "utf-8");
}
describe("extractStructureBabel", () => {
    it("extracts functions and exports", () => {
        const code = load("simple-functions.ts");
        const res = (0, extractStructureBable_1.extractStructureBabel)("simple-functions.ts", code);
        expect(res.functions.map((f) => f.name)).toContain("add");
        expect(res.exports.map((e) => e.name)).toContain("add");
    });
});
