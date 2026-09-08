import { buildInviteCode, normalizeInviteCode } from "../utils/inviteCode";
import {
  deriveInvitePrefix,
  invitePrefixCandidates,
  normalizeInvitePrefix,
} from "../tenant";

describe("company invite prefix + employee invite code", () => {
  it("derives a 3-letter style prefix from company names", () => {
    expect(deriveInvitePrefix("Microsoft")).toBe("MIC");
    expect(deriveInvitePrefix("Acme Corp")).toMatch(/^[A-Z]{2,3}$/);
    expect(normalizeInvitePrefix("mcr!")).toBe("MCR");
  });

  it("tries 3 letters then 4+ from company name before numbered fallbacks", () => {
    const candidates = invitePrefixCandidates("MCR", "Microsoft");
    expect(candidates[0]).toBe("MCR");
    expect(candidates).toContain("MIC");
    expect(candidates).toContain("MICR");
    expect(candidates.indexOf("MIC")).toBeLessThan(candidates.indexOf("MICR"));
    // Numbered only after name-based options
    const numbered = candidates.find((c) => /\d$/.test(c));
    expect(numbered).toBeTruthy();
    expect(candidates.indexOf("MICR")).toBeLessThan(candidates.indexOf(numbered!));
  });

  it("never lists empty or 1-char prefixes", () => {
    for (const c of invitePrefixCandidates("X", "Y")) {
      expect(c.length).toBeGreaterThanOrEqual(2);
      expect(c.length).toBeLessThanOrEqual(6);
    }
  });

  it("builds invite code as PREFIX_EMPLOYEEID (suffix = company employee id)", () => {
    expect(buildInviteCode("MCR", "58847")).toBe("MCR_58847");
    expect(buildInviteCode("dem", "emp1")).toBe("DEM_EMP1");
    expect(normalizeInviteCode("mcr_58847")).toBe("MCR_58847");
  });

  it("rejects invite code build without prefix or employee id", () => {
    expect(() => buildInviteCode("M", "58847")).toThrow();
    expect(() => buildInviteCode("MCR", "")).toThrow();
  });
});
