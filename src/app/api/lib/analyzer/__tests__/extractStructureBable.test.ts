import { describe, expect, it } from "vitest";
import { extractStructureBabel } from "../../extractStructureBable";

describe("extractStructureBabel", () => {
  it("extracts a function declaration", () => {
    const result = extractStructureBabel(
      "src/example.ts",
      `
        function calculateTotal(value: number) {
          return value * 2;
        }
      `,
    );

    expect(result.functions.some((fn) => fn.name === "calculateTotal")).toBe(
      true,
    );
  });

  it("extracts a class declaration", () => {
    const result = extractStructureBabel(
      "src/example.ts",
      `
        class UserService {
          getUser() {
            return null;
          }
        }
      `,
    );

    expect(result.classes.some((cls) => cls.name === "UserService")).toBe(true);
  });

  it("extracts ES module imports", () => {
    const result = extractStructureBabel(
      "src/example.ts",
      `
        import React from "react";
        import { Button } from "./Button";
      `,
    );

    expect(result.imports.map((item) => item.name)).toEqual([
      "react",
      "./Button",
    ]);
  });

  it("extracts CommonJS require imports", () => {
    const result = extractStructureBabel(
      "src/example.ts",
      `
        const fs = require("fs");
      `,
    );

    expect(result.imports.map((item) => item.name)).toContain("fs");
  });

  it("extracts dynamic imports", () => {
    const result = extractStructureBabel(
      "src/example.ts",
      `
        async function loadModule() {
          return import("./feature");
        }
      `,
    );

    expect(result.imports.map((item) => item.name)).toContain("./feature");
  });

  it("extracts control-flow blocks", () => {
    const result = extractStructureBabel(
      "src/example.ts",
      `
        function process(value: number) {
          if (value > 10) {
            return value;
          }

          for (let i = 0; i < value; i++) {
            console.log(i);
          }
        }
      `,
    );

    const blockNames = result.blocks.map((block) => block.name);

    expect(blockNames).toContain("if");
    expect(blockNames).toContain("for");
  });

  it("extracts try/catch blocks", () => {
    const result = extractStructureBabel(
      "src/example.ts",
      `
        function load() {
          try {
            return doSomething();
          } catch (error) {
            console.error(error);
          }
        }
      `,
    );

    const blockNames = result.blocks.map((block) => block.name);

    expect(blockNames).toContain("try");
    expect(blockNames).toContain("catch");
  });

  it("extracts TypeScript interfaces", () => {
    const result = extractStructureBabel(
      "src/example.ts",
      `
        interface User {
          id: string;
          name: string;
        }
      `,
    );

    expect(result.interfaces.some((item) => item.name === "User")).toBe(true);
  });

  it("extracts exported declarations", () => {
    const result = extractStructureBabel(
      "src/example.ts",
      `
        export function authenticate() {
          return true;
        }

        export const version = "1.0.0";
      `,
    );

    const exportNames = result.exports.map((item) => item.name);

    expect(exportNames).toContain("authenticate");
    expect(exportNames).toContain("version");
  });

  it("returns parse errors instead of throwing", () => {
    const result = extractStructureBabel(
      "src/example.ts",
      `
        function broken( {
      `,
    );

    expect(result.errors).toBeDefined();
    expect(result.errors!.length).toBeGreaterThan(0);
  });
});
