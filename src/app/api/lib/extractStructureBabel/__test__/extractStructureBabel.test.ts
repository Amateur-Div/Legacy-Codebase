import { extractStructureBabel } from "../../extractStructureBable";
import fs from "fs";
import path from "path";

function load(name: string) {
  return fs.readFileSync(path.join(__dirname, "fixtures", name), "utf-8");
}

describe("extractStructureBabel", () => {
  it("extracts functions and exports", () => {
    const code = load("simple-functions.ts");
    const res = extractStructureBabel("simple-functions.ts", code);

    expect(res.functions.map((f) => f.name)).toContain("add");
    expect(res.exports.map((e) => e.name)).toContain("add");
  });
});
