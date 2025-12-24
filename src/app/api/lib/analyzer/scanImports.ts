import * as babelParser from "@babel/parser";
import traverse from "@babel/traverse";

export type ImportSpec = {
  source: string;
  specifiers: Array<{
    local: string;
    imported?: string;
    type: "default" | "named" | "namespace" | string;
  }>;
  locStart?: number;
};

export type ExportSpec = {
  name: string;
  local?: string;
  locStart?: number;
};

export function scanImports(code: string) {
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

  const imports: ImportSpec[] = [];
  const exports: ExportSpec[] = [];
  const requires: Array<{ name?: string; source: string; locStart?: number }> =
    [];

  traverse(ast as any, {
    ImportDeclaration(path) {
      try {
        const source = path.node.source.value as string;
        const specifiers = (path.node.specifiers || []).map((s: any) => {
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
          locStart: path.node.loc?.start.line,
        });
      } catch (err) {}
    },
    ExportNamedDeclaration(path) {
      try {
        if (path.node.declaration) {
          const decl: any = path.node.declaration;
          if (decl.id && decl.id.name) {
            exports.push({
              name: decl.id.name,
              local: decl.id.name,
              locStart: path.node.loc?.start.line,
            });
          } else if (decl.declarations && decl.declarations.length) {
            for (const d of decl.declarations) {
              if (d.id && d.id.name)
                exports.push({
                  name: d.id.name,
                  local: d.id.name,
                  locStart: d.loc?.start?.line,
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
                locStart: s.loc?.start?.line,
              });
            }
          }
        }
      } catch (err) {}
    },
    ExportDefaultDeclaration(path) {
      try {
        const decl: any = path.node.declaration;
        let local;
        if (decl && decl.id && decl.id.name) local = decl.id.name;
        exports.push({
          name: "default",
          local,
          locStart: path.node.loc?.start?.line,
        });
      } catch (err) {}
    },
    CallExpression(path) {
      try {
        const callee = path.node.callee as any;
        if (
          callee &&
          callee.type === "Identifier" &&
          callee.name === "require"
        ) {
          const args = path.node.arguments || [];
          if (args[0] && args[0].type === "StringLiteral") {
            requires.push({
              source: args[0].value,
              locStart: path.node.loc?.start?.line,
            });
          }
        }
      } catch (err) {}
    },
  });

  return { imports, exports, requires };
}
