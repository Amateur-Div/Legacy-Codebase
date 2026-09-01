export type TsPathMapping = {
  pattern: string;
  targets: string[];
};

export type ModuleResolverConfig = {
  baseUrl?: string;
  paths: TsPathMapping[];
};

type TsConfigLike = {
  compilerOptions?: {
    baseUrl?: unknown;
    paths?: unknown;
  };
};

export function createModuleResolverConfig(
  tsconfig: TsConfigLike | null | undefined,
): ModuleResolverConfig {
  const compilerOptions = tsconfig?.compilerOptions;

  const baseUrl =
    typeof compilerOptions?.baseUrl === "string" &&
    compilerOptions.baseUrl.trim().length > 0
      ? compilerOptions.baseUrl.trim()
      : undefined;

  const paths: TsPathMapping[] = [];

  if (
    compilerOptions?.paths &&
    typeof compilerOptions.paths === "object" &&
    !Array.isArray(compilerOptions.paths)
  ) {
    for (const [pattern, targets] of Object.entries(
      compilerOptions.paths as Record<string, unknown>,
    )) {
      if (typeof pattern !== "string" || !pattern.trim()) {
        continue;
      }

      if (!Array.isArray(targets)) {
        continue;
      }

      const validTargets = targets.filter(
        (target): target is string =>
          typeof target === "string" && target.trim().length > 0,
      );

      if (validTargets.length === 0) {
        continue;
      }

      paths.push({
        pattern: pattern.trim(),
        targets: validTargets.map((target) => target.trim()),
      });
    }
  }

  return {
    baseUrl,
    paths,
  };
}
