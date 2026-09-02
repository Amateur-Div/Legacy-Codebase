import { describe, expect, it } from "vitest";
import { analyzeEntrypoint } from "../fileRoleClassifier";

describe("analyzeEntrypoint", () => {
  it("detects nested Next.js page routes", () => {
    const result = analyzeEntrypoint(
      "src/app/(storefront)/[locale]/[channel]/(main)/page.tsx",
      "export default function Page() {}",
    );

    expect(result.isLikelyEntry).toBe(true);
    expect(result.reasons).toContain("nextjs app-router entry");
  });

  it("detects nested Next.js layouts", () => {
    const result = analyzeEntrypoint(
      "src/app/(storefront)/[locale]/layout.tsx",
      "export default function Layout({ children }) { return children; }",
    );

    expect(result.isLikelyEntry).toBe(true);
    expect(result.reasons).toContain("nextjs app-router entry");
  });

  it("detects Next.js route handlers", () => {
    const result = analyzeEntrypoint(
      "src/app/api/auth/login/route.ts",
      "export async function POST() {}",
    );

    expect(result.isLikelyEntry).toBe(true);
    expect(result.reasons).toContain("nextjs app-router entry");
  });

  it("detects src/middleware.ts", () => {
    const result = analyzeEntrypoint(
      "src/middleware.ts",
      "export function middleware() {}",
    );

    expect(result.isLikelyEntry).toBe(true);
  });

  it("does not classify an ordinary component as a framework entry", () => {
    const result = analyzeEntrypoint(
      "src/components/ProductCard.tsx",
      "export function ProductCard() {}",
    );

    expect(result.isLikelyEntry).toBe(false);
  });

  it("keeps tests out of the entry-point model", () => {
    const result = analyzeEntrypoint(
      "src/app/example.test.tsx",
      "export default function Test() {}",
    );

    expect(result.isLikelyEntry).toBe(false);
  });
});
