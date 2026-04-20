"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.scanImports = scanImports;
const babelParser = __importStar(require("@babel/parser"));
const traverse_1 = __importDefault(require("@babel/traverse"));
function scanImports(code) {
    const ast = babelParser.parse(code, {
        sourceType: "unambiguous",
        plugins: [
            "typescript",
            "jsx",
            "classProperties",
            "optionalChaining",
            "decorators-legacy",
        ],
    });
    const imports = [];
    const exports = [];
    const requires = [];
    (0, traverse_1.default)(ast, {
        ImportDeclaration(path) {
            var _a;
            try {
                const source = path.node.source.value;
                const specifiers = (path.node.specifiers || []).map((s) => {
                    if (s.type === "ImportDefaultSpecifier")
                        return {
                            local: s.local.name,
                            imported: "default",
                            type: "default",
                        };
                    if (s.type === "ImportNamespaceSpecifier")
                        return { local: s.local.name, imported: "*", type: "namespace" };
                    if (s.type === "ImportSpecifier")
                        return {
                            local: s.local.name,
                            imported: s.imported.name,
                            type: "named",
                        };
                    return {
                        local: (s.local && s.local.name) || "unknown",
                        type: "named",
                    };
                });
                imports.push({
                    source,
                    specifiers,
                    locStart: (_a = path.node.loc) === null || _a === void 0 ? void 0 : _a.start.line,
                });
            }
            catch (err) { }
        },
        ExportNamedDeclaration(path) {
            var _a, _b, _c, _d, _e;
            try {
                if (path.node.declaration) {
                    const decl = path.node.declaration;
                    if (decl.id && decl.id.name) {
                        exports.push({
                            name: decl.id.name,
                            local: decl.id.name,
                            locStart: (_a = path.node.loc) === null || _a === void 0 ? void 0 : _a.start.line,
                        });
                    }
                    else if (decl.declarations && decl.declarations.length) {
                        for (const d of decl.declarations) {
                            if (d.id && d.id.name)
                                exports.push({
                                    name: d.id.name,
                                    local: d.id.name,
                                    locStart: (_c = (_b = d.loc) === null || _b === void 0 ? void 0 : _b.start) === null || _c === void 0 ? void 0 : _c.line,
                                });
                        }
                    }
                }
                if (path.node.specifiers && path.node.specifiers.length) {
                    for (const s of path.node.specifiers) {
                        if (s.type === "ExportNamespaceSpecifier") {
                            exports.push({
                                name: s.exported.name,
                                local: undefined,
                                locStart: (_e = (_d = s.loc) === null || _d === void 0 ? void 0 : _d.start) === null || _e === void 0 ? void 0 : _e.line,
                            });
                        }
                    }
                }
            }
            catch (err) { }
        },
        ExportDefaultDeclaration(path) {
            var _a, _b;
            try {
                const decl = path.node.declaration;
                let local;
                if (decl && decl.id && decl.id.name)
                    local = decl.id.name;
                exports.push({
                    name: "default",
                    local,
                    locStart: (_b = (_a = path.node.loc) === null || _a === void 0 ? void 0 : _a.start) === null || _b === void 0 ? void 0 : _b.line,
                });
            }
            catch (err) { }
        },
        CallExpression(path) {
            var _a, _b;
            try {
                const callee = path.node.callee;
                if (callee &&
                    callee.type === "Identifier" &&
                    callee.name === "require") {
                    const args = path.node.arguments || [];
                    if (args[0] && args[0].type === "StringLiteral") {
                        requires.push({
                            source: args[0].value,
                            locStart: (_b = (_a = path.node.loc) === null || _a === void 0 ? void 0 : _a.start) === null || _b === void 0 ? void 0 : _b.line,
                        });
                    }
                }
            }
            catch (err) { }
        },
    });
    return { imports, exports, requires };
}
