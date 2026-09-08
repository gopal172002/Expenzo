/** Nice round ceiling for chart axes (Tableau-style headroom). */
function niceCeil(value: number): number {
  if (value <= 0) return 1000;
  const exp = Math.pow(10, Math.floor(Math.log10(value)));
  const n = value / exp;
  const nice = n <= 1 ? 1 : n <= 1.2 ? 1.2 : n <= 1.5 ? 1.5 : n <= 2 ? 2 : n <= 2.5 ? 2.5 : n <= 3 ? 3 : n <= 4 ? 4 : n <= 5 ? 5 : n <= 6 ? 6 : n <= 8 ? 8 : 10;
  return Math.round(nice * exp);
}

/** Smallest clean scale top ≥ 1.75× max spend (legacy bar charts). */
function scaleTopAtSpend(maxVal: number): number {
  if (maxVal <= 0) return 1000;
  return niceCeil(maxVal * 1.75);
}

export function computeChartYAxis(values: number[], tickCount = 4) {
  const maxVal = Math.max(0, ...values);
  const top = maxVal === 0 ? 1000 : scaleTopAtSpend(maxVal);
  const step = top / tickCount;
  const ticks = Array.from({ length: tickCount + 1 }, (_, i) => Math.round(i * step));
  return {
    domain: [0, top] as [number, number],
    ticks,
  };
}

/** Tighter domain (~12% headroom) for Tableau-style categorical bars. */
export function computeTightChartAxis(values: number[], tickCount = 4) {
  const maxVal = Math.max(0, ...values);
  const top = maxVal === 0 ? 1000 : niceCeil(maxVal * 1.12);
  const step = top / tickCount;
  const ticks = Array.from({ length: tickCount + 1 }, (_, i) => Math.round(i * step));
  return {
    domain: [0, top] as [number, number],
    ticks,
  };
}
