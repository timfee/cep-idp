import {
  extractCertificateFromXml,
  extractValueFromPath,
} from "@/app/lib/workflow/extractors";
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));

describe("Workflow extractors", () => {
  let xml: string;

  beforeAll(() => {
    const file = path.join(
      __dirname,
      "../fixtures/public/federationmetadata.xml"
    );
    xml = fs.readFileSync(file, "utf8");
  });

  test("certificate is extracted from federation metadata", () => {
    const cert = extractCertificateFromXml(xml);
    expect(cert).toMatch(/BEGIN CERTIFICATE/);
  });

  test("values can be extracted using simple paths", () => {
    const obj = { a: { b: [{ c: 1 }, { c: 2 }] } };
    expect(extractValueFromPath(obj, "a.b.1.c")).toBe(2);
  });
});
