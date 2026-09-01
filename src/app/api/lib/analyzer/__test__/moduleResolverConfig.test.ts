import { describe, expect, it } from "vitest";
import { createModuleResolverConfig } from "../moduleResolverConfig";

describe("createModuleResolverConfig", () => {
  it("extracts baseUrl and path aliases", () => {
    const config = createModuleResolverConfig({
      compilerOptions: {
        baseUrl: ".",
        paths: {
          "@/*": ["./src/*"],
          "@ui/*": ["./src/components/*"],
          "@paper/session-bridge": ["./src/session-bridge/index.ts"],
        },
      },
    });

    expect(config).toEqual({
      baseUrl: ".",
      paths: [
        {
          pattern: "@/*",
          targets: ["./src/*"],
        },
        {
          pattern: "@ui/*",
          targets: ["./src/components/*"],
        },
        {
          pattern: "@paper/session-bridge",
          targets: ["./src/session-bridge/index.ts"],
        },
      ],
    });
  });

  it("handles missing compilerOptions", () => {
    expect(createModuleResolverConfig({})).toEqual({
      baseUrl: undefined,
      paths: [],
    });
  });

  it("ignores invalid path mappings", () => {
    const config = createModuleResolverConfig({
      compilerOptions: {
        paths: {
          "@valid/*": ["src/*"],
          "@invalid": "src/invalid",
          "@empty": [],
          "": ["src/*"],
        },
      },
    });

    expect(config).toEqual({
      baseUrl: undefined,
      paths: [
        {
          pattern: "@valid/*",
          targets: ["src/*"],
        },
      ],
    });
  });

  it("supports multiple targets", () => {
    const config = createModuleResolverConfig({
      compilerOptions: {
        paths: {
          "@shared/*": ["./src/shared/*", "./generated/shared/*"],
        },
      },
    });

    expect(config.paths).toEqual([
      {
        pattern: "@shared/*",
        targets: ["./src/shared/*", "./generated/shared/*"],
      },
    ]);
  });
});
