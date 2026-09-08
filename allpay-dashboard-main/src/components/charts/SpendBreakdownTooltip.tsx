import { Box, Typography } from "@mui/material";

export type SpendBreakdownCategory = { category: string; total: number };

export type SpendBreakdownPoint = {
  value: number;
  name?: string;
  byCategory?: SpendBreakdownCategory[];
  dayLabel?: string;
};

type Props = {
  active?: boolean;
  payload?: Array<{ payload?: SpendBreakdownPoint; value?: number }>;
  label?: string;
};

export function SpendBreakdownTooltip({ active, payload, label }: Props) {
  if (!active || !payload?.length) return null;

  const point = payload[0]?.payload;
  const title = point?.dayLabel ?? point?.name ?? label ?? "";
  const total = Number(point?.value ?? payload[0]?.value ?? 0);
  const categories = point?.byCategory ?? [];

  return (
    <Box
      sx={{
        bgcolor: "#0f172a",
        color: "#fff",
        px: 1.5,
        py: 1.25,
        borderRadius: 2,
        minWidth: 168,
        boxShadow: "0 8px 24px rgba(15,23,42,0.35)",
      }}
    >
      {title ? (
        <Typography variant="body2" fontWeight={600} mb={0.5} sx={{ color: "#e2e8f0" }}>
          {title}
        </Typography>
      ) : null}
      <Typography variant="body2" sx={{ color: "#4ade80", fontWeight: 700, mb: categories.length ? 0.75 : 0 }}>
        Total: ₹{total.toLocaleString("en-IN")}
      </Typography>
      {categories.map((c) => (
        <Typography key={c.category} variant="caption" display="block" sx={{ color: "#cbd5e1" }}>
          {c.category}: ₹{c.total.toLocaleString("en-IN")}
        </Typography>
      ))}
    </Box>
  );
}
