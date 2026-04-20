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
exports.instrumentExecutionBabel = instrumentExecutionBabel;
const babelParser = __importStar(require("@babel/parser"));
const generator_1 = __importDefault(require("@babel/generator"));
const t = __importStar(require("@babel/types"));
function instrumentExecutionBabel(code) {
    var _a;
    let idCounter = 0;
    const makeId = (prefix = "n") => `${prefix}#${Date.now()}_${++idCounter}`;
    const tryGen = (node) => {
        if (!node)
            return undefined;
        try {
            return (0, generator_1.default)(node, { concise: true }).code;
        }
        catch {
            return undefined;
        }
    };
    const nodes = [];
    const edges = [];
    const addNode = (node) => {
        nodes.push(node);
        return node;
    };
    const addEdge = (from, to, label) => {
        edges.push({ id: `${from.id}->${to.id}`, from: from.id, to: to.id, label });
    };
    const handleStatementSequence = (stmts, parentNode) => {
        var _a, _b, _c, _d, _e, _f, _g, _h, _j, _k;
        let prevNodes = [];
        for (const s of stmts) {
            const line = (_c = (_b = (_a = s.loc) === null || _a === void 0 ? void 0 : _a.start) === null || _b === void 0 ? void 0 : _b.line) !== null && _c !== void 0 ? _c : 0;
            const code = (_d = tryGen(s)) === null || _d === void 0 ? void 0 : _d.slice(0, 400);
            if (!code ||
                code.startsWith('"use strict"') ||
                code.startsWith("'use strict'")) {
                continue;
            }
            if (t.isIfStatement(s)) {
                const exits = handleIfStatement(s, prevNodes.length > 0 ? prevNodes[0] : parentNode);
                prevNodes = exits;
                parentNode = undefined;
            }
            const nodeType = t.isForStatement(s) ||
                t.isWhileStatement(s) ||
                t.isDoWhileStatement(s) ||
                t.isForOfStatement(s) ||
                t.isForInStatement(s)
                ? "loop"
                : t.isFunctionDeclaration(s) || t.isFunctionExpression(s)
                    ? "function"
                    : "statement";
            const node = addNode({
                id: makeId(nodeType),
                type: nodeType,
                line,
                code,
            });
            if (parentNode) {
                addEdge(parentNode, node, "executes");
            }
            for (const p of prevNodes) {
                addEdge(p, node, "next");
            }
            prevNodes = [node];
            if (t.isForStatement(s) ||
                t.isWhileStatement(s) ||
                t.isDoWhileStatement(s) ||
                t.isForOfStatement(s) ||
                t.isForInStatement(s)) {
                handleLoopStatement(s, node);
            }
            else if (t.isFunctionDeclaration(s) || t.isFunctionExpression(s)) {
                const fnDecl = s;
                const fnName = (_f = (_e = fnDecl.id) === null || _e === void 0 ? void 0 : _e.name) !== null && _f !== void 0 ? _f : "anonymous";
                const fnNode = addNode({
                    id: makeId("fn"),
                    type: "function",
                    name: fnName,
                    line,
                    code: (_g = tryGen(fnDecl)) === null || _g === void 0 ? void 0 : _g.slice(0, 400),
                });
                addEdge(node, fnNode, "declares");
                if (fnDecl.body && t.isBlockStatement(fnDecl.body)) {
                    const body = fnDecl.body.body;
                    if (body.length) {
                        const first = body[0];
                        const entry = addNode({
                            id: makeId("fn-entry"),
                            type: "fn-entry",
                            code: (_h = tryGen(first)) === null || _h === void 0 ? void 0 : _h.slice(0, 300),
                            line: (_k = (_j = first.loc) === null || _j === void 0 ? void 0 : _j.start.line) !== null && _k !== void 0 ? _k : line,
                        });
                        addEdge(fnNode, entry, "entry");
                        handleStatementSequence(body, entry);
                    }
                }
            }
        }
        return prevNodes;
    };
    const handleIfStatement = (node, containerNode) => {
        var _a, _b, _c, _d, _e, _f, _g, _h, _j, _k, _l, _m, _o, _p, _q, _r, _s, _t, _u;
        const exits = [];
        const ifNode = addNode({
            id: makeId("if"),
            type: "if",
            code: tryGen(node.test),
            line: (_c = (_b = (_a = node.loc) === null || _a === void 0 ? void 0 : _a.start) === null || _b === void 0 ? void 0 : _b.line) !== null && _c !== void 0 ? _c : 0,
        });
        if (containerNode) {
            addEdge(containerNode, ifNode, "if");
        }
        if (node.consequent) {
            if (t.isBlockStatement(node.consequent) && node.consequent.body.length) {
                const first = node.consequent.body[0];
                const entry = addNode({
                    id: makeId("if-true"),
                    type: "if-true",
                    code: (_d = tryGen(first)) === null || _d === void 0 ? void 0 : _d.slice(0, 300),
                    line: (_g = (_f = (_e = first.loc) === null || _e === void 0 ? void 0 : _e.start) === null || _f === void 0 ? void 0 : _f.line) !== null && _g !== void 0 ? _g : 0,
                });
                addEdge(ifNode, entry, "true");
                const branchExits = handleStatementSequence(node.consequent.body, entry);
                exits.push(...branchExits);
            }
            else if (t.isStatement(node.consequent)) {
                const single = addNode({
                    id: makeId("if-true"),
                    type: "if-true",
                    code: (_h = tryGen(node.consequent)) === null || _h === void 0 ? void 0 : _h.slice(0, 300),
                    line: (_l = (_k = (_j = node.consequent.loc) === null || _j === void 0 ? void 0 : _j.start) === null || _k === void 0 ? void 0 : _k.line) !== null && _l !== void 0 ? _l : 0,
                });
                addEdge(ifNode, single, "true");
                exits.push(single);
            }
        }
        else {
            exits.push(ifNode);
        }
        if (node.alternate) {
            if (t.isBlockStatement(node.alternate) && node.alternate.body.length) {
                const first = node.alternate.body[0];
                const entry = addNode({
                    id: makeId("if-false"),
                    type: "if-false",
                    code: (_m = tryGen(first)) === null || _m === void 0 ? void 0 : _m.slice(0, 300),
                    line: (_q = (_p = (_o = first.loc) === null || _o === void 0 ? void 0 : _o.start) === null || _p === void 0 ? void 0 : _p.line) !== null && _q !== void 0 ? _q : 0,
                });
                addEdge(ifNode, entry, "false");
                const branchExits = handleStatementSequence(node.alternate.body, entry);
                exits.push(...branchExits);
            }
            else if (t.isStatement(node.alternate)) {
                const single = addNode({
                    id: makeId("if-false"),
                    type: "if-false",
                    code: (_r = tryGen(node.alternate)) === null || _r === void 0 ? void 0 : _r.slice(0, 300),
                    line: (_u = (_t = (_s = node.alternate.loc) === null || _s === void 0 ? void 0 : _s.start) === null || _t === void 0 ? void 0 : _t.line) !== null && _u !== void 0 ? _u : 0,
                });
                addEdge(ifNode, single, "false");
                exits.push(single);
            }
        }
        else {
            exits.push(ifNode);
        }
        return exits;
    };
    const handleLoopStatement = (node, containerNode) => {
        var _a, _b, _c, _d, _e, _f, _g, _h, _j, _k, _l;
        const cond = (_c = tryGen((_b = (_a = node.test) !== null && _a !== void 0 ? _a : node.right) !== null && _b !== void 0 ? _b : node.init)) !== null && _c !== void 0 ? _c : tryGen(node);
        const loopNode = addNode({
            id: makeId("loop"),
            type: "loop",
            code: cond,
            line: (_f = (_e = (_d = node.loc) === null || _d === void 0 ? void 0 : _d.start) === null || _e === void 0 ? void 0 : _e.line) !== null && _f !== void 0 ? _f : 0,
        });
        addEdge(containerNode, loopNode, "loop");
        if (node.body && t.isBlockStatement(node.body) && node.body.body.length) {
            const first = node.body.body[0];
            const entry = addNode({
                id: makeId("loop-body"),
                type: "loop-body",
                code: (_g = tryGen(first)) === null || _g === void 0 ? void 0 : _g.slice(0, 300),
                line: (_k = (_j = (_h = first.loc) === null || _h === void 0 ? void 0 : _h.start) === null || _j === void 0 ? void 0 : _j.line) !== null && _k !== void 0 ? _k : 0,
            });
            addEdge(loopNode, entry, "body");
            const innerExits = handleStatementSequence(node.body.body, entry);
            for (const exitNode of innerExits) {
                addEdge(exitNode, loopNode, "back");
            }
            const after = addNode({
                id: makeId("after-loop"),
                type: "after-loop",
                code: "after loop",
            });
            addEdge(loopNode, after, "exit");
        }
        else if (node.body) {
            const entry = addNode({
                id: makeId("loop-body"),
                type: "loop-body",
                code: (_l = tryGen(node.body)) === null || _l === void 0 ? void 0 : _l.slice(0, 300),
            });
            addEdge(loopNode, entry, "body");
            if (t.isStatement(node.body))
                handleStatementSequence([node.body], entry);
        }
    };
    try {
        const ast = babelParser.parse(code, {
            sourceType: "unambiguous",
            allowReturnOutsideFunction: true,
            errorRecovery: true,
            plugins: [
                "typescript",
                "jsx",
                ["decorators", { decoratorsBeforeExport: false }],
                "classProperties",
                "classPrivateProperties",
                "classPrivateMethods",
                "dynamicImport",
                "optionalChaining",
                "nullishCoalescingOperator",
            ],
        });
        const prog = ast.program;
        const rootNode = addNode({
            id: "root",
            type: "root",
            code: "root",
            line: 0,
        });
        handleStatementSequence(prog.body, rootNode);
    }
    catch (err) {
        const errNode = addNode({
            id: makeId("error"),
            type: "error",
            code: String((_a = err === null || err === void 0 ? void 0 : err.message) !== null && _a !== void 0 ? _a : err),
        });
    }
    return { nodes, edges };
}
