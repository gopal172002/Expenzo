/**
 * Minimal 5-field cron matcher (minute hour day-of-month month weekday).
 * Supports *, lists, ranges, and /steps. Weekday 0 and 7 are Sunday.
 */
function fieldMatches(expr: string, value: number): boolean {
  for (const part of expr.split(",")) {
    const token = part.trim();
    if (!token) continue;
    if (token === "*") return true;

    if (token.includes("/")) {
      const [rangeRaw, stepRaw] = token.split("/");
      const step = Number(stepRaw);
      if (!Number.isFinite(step) || step <= 0) continue;
      if (rangeRaw === "*") {
        if (value % step === 0) return true;
        continue;
      }
      if (rangeRaw?.includes("-")) {
        const [start, end] = rangeRaw.split("-").map(Number);
        if (value >= start && value <= end && (value - start) % step === 0) return true;
        continue;
      }
      const start = Number(rangeRaw);
      if (value >= start && (value - start) % step === 0) return true;
      continue;
    }

    if (token.includes("-")) {
      const [start, end] = token.split("-").map(Number);
      if (value >= start && value <= end) return true;
      continue;
    }

    if (Number(token) === value) return true;
  }
  return false;
}

export function cronMatches(cron: string, date: Date): boolean {
  const parts = cron.trim().split(/\s+/);
  if (parts.length !== 5) return false;
  const [minute, hour, day, month, weekday] = parts;
  const dow = date.getDay();
  return (
    fieldMatches(minute!, date.getMinutes()) &&
    fieldMatches(hour!, date.getHours()) &&
    fieldMatches(day!, date.getDate()) &&
    fieldMatches(month!, date.getMonth() + 1) &&
    (fieldMatches(weekday!, dow) || (dow === 0 && fieldMatches(weekday!, 7)))
  );
}
