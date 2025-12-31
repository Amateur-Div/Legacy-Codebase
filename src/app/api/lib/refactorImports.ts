import { parse } from "@babel/parser";
import traverse from "@babel/traverse";
import generate from "@babel/generator";
import * as t from "@babel/types";

export function rewriteImportsAST(
  code: string,
  oldBase: string,
  newBase: string
): string {
  const ast = parse(code, {
    sourceType: "module",
    plugins: ["typescript", "jsx"],
  });

  traverse(ast, {
    ImportDeclaration(path) {
      const value = path.node.source.value;
      if (typeof value === "string" && value.includes(oldBase)) {
        path.node.source = t.stringLiteral(value.replace(oldBase, newBase));
      }
    },

    CallExpression(path) {
      if (
        t.isIdentifier(path.node.callee, { name: "require" }) &&
        path.node.arguments.length === 1 &&
        t.isStringLiteral(path.node.arguments[0]) &&
        path.node.arguments[0].value.includes(oldBase)
      ) {
        path.node.arguments[0] = t.stringLiteral(
          path.node.arguments[0].value.replace(oldBase, newBase)
        );
      }
    },
  });

  return generate(ast, { retainLines: true }).code;
}
