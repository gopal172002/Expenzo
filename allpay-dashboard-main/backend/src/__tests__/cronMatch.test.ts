import { cronMatches } from "../services/cronMatch";

describe("cronMatches", () => {
  const at = (iso: string) => new Date(iso);

  it("matches an exact minute and hour", () => {
    expect(cronMatches("30 2 * * *", at("2026-08-22T02:30:00"))).toBe(true);
    expect(cronMatches("30 2 * * *", at("2026-08-22T02:31:00"))).toBe(false);
  });

  it("matches step expressions", () => {
    expect(cronMatches("0 */2 * * *", at("2026-08-22T04:00:00"))).toBe(true);
    expect(cronMatches("0 */2 * * *", at("2026-08-22T05:00:00"))).toBe(false);
  });

  it("rejects malformed cron", () => {
    expect(cronMatches("* *", at("2026-08-22T00:00:00"))).toBe(false);
  });
});
