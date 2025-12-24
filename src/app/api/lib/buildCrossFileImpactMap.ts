import fs from "fs";
import path from "path";

export function attachCrossFileImpact(fileTree: any[], projectRoot: string) {
  const extractImportPath = (imp: {
    name: any;
    source: { value: any };
    value: any;
    argument: { value: any };
  }) => {
    if (!imp) return null;
    if (typeof imp === "string") return imp;
    if (typeof imp === "object") {
      if (typeof imp.name === "string") return imp.name;
      if (typeof imp.source === "string") return imp.source;
      if (imp.source?.value) return imp.source.value;
      if (imp.value) return imp.value;
      if (imp.argument?.value) return imp.argument.value;
    }
    return null;
  };

  const resolveImport = (fileRel: string, impStr: string) => {
    if (!impStr) return null;
    if (!impStr.startsWith(".") && !impStr.startsWith("/")) return null;

    const fileAbs = path.join(projectRoot, fileRel);
    const baseDir = path.dirname(fileAbs);

    const absCandidate = path.resolve(baseDir, impStr);
    const tryPaths = [];
    const exts = [".js", ".ts", ".jsx", ".tsx"];

    if (path.extname(absCandidate)) {
      tryPaths.push(absCandidate);
    } else {
      for (const e of exts) tryPaths.push(absCandidate + e);
      for (const e of exts) tryPaths.push(path.join(absCandidate, "index" + e));
    }

    for (const p of tryPaths) {
      try {
        if (fs.existsSync(p) && fs.statSync(p).isFile()) {
          const rel = path.relative(projectRoot, p).split(path.sep).join("/");
          return rel;
        }
      } catch (e) {}
    }

    let rel = path.relative(projectRoot, absCandidate);
    if (!path.extname(rel)) rel += ".js";
    return rel.split(path.sep).join("/");
  };

  const files: { relPath: any; imports: any; exports: any; nodeRef: any }[] =
    [];
  const collect = (nodes: any) => {
    for (const node of nodes) {
      if (!node) continue;
      if (node.type === "file") {
        const imports = Array.isArray(node.imports)
          ? node.imports.map(extractImportPath).filter(Boolean)
          : [];
        const exports = Array.isArray(node.exports) ? node.exports : [];
        files.push({ relPath: node.fullPath, imports, exports, nodeRef: node });
      } else if (Array.isArray(node.children) && node.children.length) {
        collect(node.children);
      }
    }
  };
  collect(fileTree);

  const forwardMap: any = {};
  const reverseMap: any = {};

  for (const { relPath, imports, exports } of files) {
    const resolvedImports: string[] = [];

    for (const imp of imports) {
      const resolved = resolveImport(relPath, imp);
      if (!resolved) continue;
      if (resolved === relPath) continue;
      if (!resolvedImports.includes(resolved)) resolvedImports.push(resolved);

      if (!reverseMap[resolved]) reverseMap[resolved] = [];
      if (!reverseMap[resolved].includes(relPath))
        reverseMap[resolved].push(relPath);
    }

    forwardMap[relPath] = { imports: resolvedImports, exports };
  }

  for (const { relPath, nodeRef } of files) {
    nodeRef.impact = {
      imports: forwardMap[relPath] ? forwardMap[relPath].imports : [],
      usedBy: reverseMap[relPath] ? reverseMap[relPath].slice() : [],
    };
  }

  try {
    console.log(
      `[impact] attached forward: ${Object.keys(forwardMap).length}, reverse: ${
        Object.keys(reverseMap).length
      }`
    );
  } catch (e) {}

  return fileTree;
}
