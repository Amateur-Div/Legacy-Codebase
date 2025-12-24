import * as babelParser from "@babel/parser";
import generate from "@babel/generator";
import * as t from "@babel/types";
import { FlowEdge, FlowGraph, FlowNode } from "./analyzer/types";

export function instrumentExecutionBabel(code: string): FlowGraph {
  let idCounter = 0;
  const makeId = (prefix = "n") => `${prefix}#${Date.now()}_${++idCounter}`;

  const tryGen = (node?: t.Node | null) => {
    if (!node) return undefined;
    try {
      return generate(node as any, { concise: true }).code;
    } catch {
      return undefined;
    }
  };

  const nodes: FlowNode[] = [];
  const edges: FlowEdge[] = [];

  const addNode = (node: FlowNode) => {
    nodes.push(node);
    return node;
  };

  const addEdge = (from: FlowNode, to: FlowNode, label?: string) => {
    edges.push({ id: `${from.id}->${to.id}`, from: from.id, to: to.id, label });
  };

  const handleStatementSequence = (
    stmts: t.Statement[],
    parentNode?: FlowNode
  ) => {
    let prevNode: FlowNode | null = null;

    for (const s of stmts) {
      const line = s.loc?.start?.line ?? 0;
      const code = tryGen(s)?.slice(0, 400);

      if (
        !code ||
        code.startsWith('"use strict"') ||
        code.startsWith("'use strict'")
      ) {
        continue;
      }

      const nodeType = t.isIfStatement(s)
        ? "if"
        : t.isForStatement(s) ||
          t.isWhileStatement(s) ||
          t.isDoWhileStatement(s) ||
          t.isForOfStatement(s) ||
          t.isForInStatement(s)
        ? "loop"
        : t.isFunctionDeclaration(s) || t.isFunctionExpression(s)
        ? "function"
        : "statement";

      const node: FlowNode = addNode({
        id: makeId(nodeType),
        type: nodeType,
        line,
        code,
      });

      if (parentNode) {
        const relation =
          parentNode.type === "function"
            ? "executes"
            : parentNode.type.startsWith("if")
            ? "branch"
            : parentNode.type.startsWith("loop")
            ? "body"
            : "child";
        addEdge(parentNode, node, relation);
      }

      if (prevNode) {
        addEdge(prevNode, node, "next");
      }
      prevNode = node;

      if (t.isIfStatement(s)) {
        handleIfStatement(s as t.IfStatement, node);
      } else if (
        t.isForStatement(s) ||
        t.isWhileStatement(s) ||
        t.isDoWhileStatement(s) ||
        t.isForOfStatement(s) ||
        t.isForInStatement(s)
      ) {
        handleLoopStatement(s as any, node);
      } else if (t.isFunctionDeclaration(s) || t.isFunctionExpression(s)) {
        const fnDecl = s as t.FunctionDeclaration | t.FunctionExpression;
        const fnName = (fnDecl as any).id?.name ?? "anonymous";
        const fnNode: FlowNode = addNode({
          id: makeId("fn"),
          type: "function",
          name: fnName,
          line,
          code: tryGen(fnDecl)?.slice(0, 400),
        });
        addEdge(node, fnNode, "declares");

        if (
          fnDecl.body &&
          t.isBlockStatement(fnDecl.body) &&
          fnDecl.body.body.length
        ) {
          const first = fnDecl.body.body[0];
          const fakeFirst: FlowNode = addNode({
            id: makeId("fn-entry"),
            type: "fn-entry",
            code: tryGen(first)?.slice(0, 300),
            line: first.loc?.start.line ?? line,
          });
          addEdge(fnNode, fakeFirst, "entry");
          handleStatementSequence(fnDecl.body.body, fakeFirst);
        }
      }
    }

    return prevNode;
  };

  const handleIfStatement = (node: t.IfStatement, containerNode: FlowNode) => {
    const testCode = tryGen(node.test);
    const ifNode: FlowNode = addNode({
      id: makeId("if"),
      type: "if",
      code: testCode,
      line: node.loc?.start?.line ?? 0,
    });
    addEdge(containerNode, ifNode, "if");

    if (node.consequent) {
      if (t.isBlockStatement(node.consequent)) {
        const first = node.consequent.body[0];
        if (first) {
          const entry = addNode({
            id: makeId("if-true"),
            type: "if-true",
            code: tryGen(first)?.slice(0, 300),
            line: first.loc?.start?.line ?? 0,
          });
          addEdge(ifNode, entry, "true");
          handleStatementSequence(node.consequent.body, entry);
        }
      } else {
        const single = addNode({
          id: makeId("if-true"),
          type: "if-true",
          code: tryGen(node.consequent)?.slice(0, 300),
          line: node.consequent.loc?.start?.line ?? 0,
        });
        addEdge(ifNode, single, "true");
        if (t.isStatement(node.consequent))
          handleStatementSequence([node.consequent], single);
      }
    }

    if (node.alternate) {
      if (t.isBlockStatement(node.alternate)) {
        const first = node.alternate.body[0];
        if (first) {
          const entry = addNode({
            id: makeId("if-false"),
            type: "if-false",
            code: tryGen(first)?.slice(0, 300),
            line: first.loc?.start?.line ?? 0,
          });
          addEdge(ifNode, entry, "false");
          handleStatementSequence(node.alternate.body, entry);
        }
      } else {
        const single = addNode({
          id: makeId("if-false"),
          type: "if-false",
          code: tryGen(node.alternate)?.slice(0, 300),
          line: (node.alternate as any).loc?.start?.line ?? 0,
        });
        addEdge(ifNode, single, "false");
        if (t.isStatement(node.alternate))
          handleStatementSequence([node.alternate], single);
      }
    }
  };

  const handleLoopStatement = (
    node: t.Statement & any,
    containerNode: FlowNode
  ) => {
    const cond = tryGen(node.test ?? node.right ?? node.init) ?? tryGen(node);
    const loopNode: FlowNode = addNode({
      id: makeId("loop"),
      type: "loop",
      code: cond,
      line: node.loc?.start?.line ?? 0,
    });
    addEdge(containerNode, loopNode, "loop");

    if (node.body && t.isBlockStatement(node.body) && node.body.body.length) {
      const first = node.body.body[0];
      const entry = addNode({
        id: makeId("loop-body"),
        type: "loop-body",
        code: tryGen(first)?.slice(0, 300),
        line: first.loc?.start?.line ?? 0,
      });
      addEdge(loopNode, entry, "body");
      const lastInner = handleStatementSequence(node.body.body, entry);

      if (lastInner) {
        addEdge(lastInner, loopNode, "back");
      }
      const after = addNode({
        id: makeId("after-loop"),
        type: "after-loop",
        code: "after loop",
      });
      addEdge(loopNode, after, "exit");
    } else if (node.body) {
      const entry = addNode({
        id: makeId("loop-body"),
        type: "loop-body",
        code: tryGen(node.body)?.slice(0, 300),
      });
      addEdge(loopNode, entry, "body");
      if (t.isStatement(node.body)) handleStatementSequence([node.body], entry);
    }
  };

  try {
    const ast = babelParser.parse(code, {
      sourceType: "unambiguous",
      plugins: [
        "jsx",
        "typescript",
        "classProperties",
        "optionalChaining",
        "decorators-legacy",
      ],
    });

    const prog = ast.program;

    const rootNode: FlowNode = addNode({
      id: "root",
      type: "root",
      code: "root",
      line: 0,
    });

    handleStatementSequence(prog.body as any as t.Statement[], rootNode);
  } catch (err: any) {
    const errNode: FlowNode = addNode({
      id: makeId("error"),
      type: "error",
      code: String(err?.message ?? err),
    });
  }

  return { nodes, edges };
}
