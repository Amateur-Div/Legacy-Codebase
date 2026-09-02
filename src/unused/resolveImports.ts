import path from "path";
import fs from "fs";
import ts from "typescript";

export interface ResolveOptions {
  projectRoot: string;
  tsconfigPath?: string;
}

export function createPathResolver({
  projectRoot,
  tsconfigPath,
}: ResolveOptions) {
  let compilerOptions: ts.CompilerOptions = {
    moduleResolution: ts.ModuleResolutionKind.NodeNext,
  };
  if (tsconfigPath && fs.existsSync(tsconfigPath)) {
    const parsed = ts.readConfigFile(tsconfigPath, ts.sys.readFile);
    if (!parsed.error && parsed.config.compilerOptions) {
      compilerOptions = {
        ...compilerOptions,
        ...parsed.config.compilerOptions,
      };
    }
  }

  const host = ts.createCompilerHost(compilerOptions, false);

  function resolveImport(
    importSource: string,
    fromFile: string
  ): string | null {
    try {
      if (importSource.startsWith(".") || importSource.startsWith("/")) {
        const abs = path.resolve(path.dirname(fromFile), importSource);
        const candidates = [
          abs,
          `${abs}.ts`,
          `${abs}.tsx`,
          `${abs}.js`,
          `${abs}.jsx`,
          path.join(abs, "index.ts"),
          path.join(abs, "index.js"),
        ];
        for (const c of candidates)
          if (fs.existsSync(c)) return path.relative(projectRoot, c);
      }

      const resolved = ts.resolveModuleName(
        importSource,
        fromFile,
        compilerOptions,
        host
      );
      const file = resolved?.resolvedModule?.resolvedFileName;
      if (file && fs.existsSync(file)) return path.relative(projectRoot, file);

      return null;
    } catch {
      return null;
    }
  }

  return resolveImport;
}
