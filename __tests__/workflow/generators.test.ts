import {
  generateDeterministicPassword,
  generatePassword,
} from "@/app/lib/workflow/generators";

describe("Password generators", () => {
  it("creates a password of the requested length", () => {
    const pwd = generatePassword(12);
    expect(pwd).toHaveLength(12);
  });

  it("deterministic generator returns consistent result", () => {
    const first = generateDeterministicPassword("example.com");
    const second = generateDeterministicPassword("example.com");
    expect(first).toBe(second);
    expect(first).toHaveLength(16);
  });
});
