import { useMemo, useState, useTransition } from "react";
import {
  Cell,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
} from "recharts";
import { Box, CircularProgress, MenuItem, Stack, TextField, Typography } from "@mui/material";
import type { Transaction } from "../../types";
import {
  ANALYTICS_PERIOD_OPTIONS,
  aggregateByEmployee,
  filterTransactionsInPeriod,
} from "../../utils/analyticsPeriod";
import type { AnalyticsPeriod } from "../../utils/analyticsPeriod";
import { inr } from "../../utils/labels";
import { EmployeeSpendBarChart } from "./EmployeeSpendBarChart";
import { DailySpendChart } from "./DailySpendChart";

const CATEGORY_COLORS = ["#1D4ED8", "#0D5C56", "#B45309", "#6D28D9", "#B91C1C", "#0E7490", "#4338CA", "#4D7C0F"];
const CATEGORY_FILL_OPACITY = 0.78;
const PANEL_BG = "#16181D";
const PANEL_BORDER = "#22252C";
const PANEL_MUTED = "#9CA3AF";
const PANEL_TEXT = "#FFFFFF";
const FIELD_BG = "#1F232B";
const DEPARTMENT_MENU_MAX_HEIGHT = 180;

const darkFieldSx = {
  minWidth: 140,
  flex: { xs: 1, sm: "none" },
  "& .MuiOutlinedInput-root": {
    color: PANEL_TEXT,
    bgcolor: FIELD_BG,
    "& fieldset": { borderColor: "#2A2F38" },
    "&:hover fieldset": { borderColor: "#4ADE80" },
    "&.Mui-focused fieldset": { borderColor: "#4ADE80" },
  },
  "& .MuiInputLabel-root": { color: PANEL_MUTED },
  "& .MuiInputLabel-root.Mui-focused": { color: "#4ADE80" },
  "& .MuiSelect-icon": { color: PANEL_MUTED },
} as const;

function ChartWaiter({
  height = 260,
  label = "Loading chart…",
  dark = false,
}: {
  height?: number;
  label?: string;
  dark?: boolean;
}) {
  return (
    <Stack
      alignItems="center"
      justifyContent="center"
      spacing={1.25}
      sx={{
        height,
        width: "100%",
        bgcolor: dark ? "rgba(255,255,255,0.03)" : "#F8FAFC",
        borderRadius: 2,
        border: "1px dashed",
        borderColor: dark ? "#2A2F38" : "divider",
      }}
    >
      <CircularProgress size={28} thickness={4} sx={dark ? { color: "#93C5FD" } : undefined} />
      <Typography variant="body2" color={dark ? "#9CA3AF" : "text.secondary"} fontWeight={650}>
        {label}
      </Typography>
    </Stack>
  );
}

function CategoryTooltip({
  active,
  payload,
}: {
  active?: boolean;
  payload?: Array<{ name?: string; value?: number; payload?: { name: string; value: number } }>;
}) {
  if (!active || !payload?.[0]) return null;
  const row = payload[0];
  const name = row.name ?? row.payload?.name ?? "";
  const value = Number(row.value ?? 0);
  return (
    <Box
      sx={{
        bgcolor: "#0f172a",
        color: "#fff",
        border: "1px solid #2A2F38",
        px: 1.25,
        py: 0.85,
        minWidth: 120,
        borderRadius: 2,
        boxShadow: "0 8px 24px rgba(15,23,42,0.35)",
      }}
    >
      <Typography variant="body2" fontWeight={700} sx={{ color: "#e2e8f0" }}>
        {name}
      </Typography>
      <Typography variant="body2" fontWeight={750} sx={{ color: "#4ADE80" }}>
        {inr(value)}
      </Typography>
    </Box>
  );
}

export function AdminAnalyticsCharts({
  byCategory,
  transactions,
  departments,
  drillKey,
  onDrill,
  loading = false,
}: {
  byCategory: { name: string; value: number }[];
  transactions: Transaction[];
  departments: string[];
  drillKey: string;
  onDrill: (key: string) => void;
  loading?: boolean;
}) {
  const [employeePeriod, setEmployeePeriod] = useState<AnalyticsPeriod>("week");
  const [employeeDepartment, setEmployeeDepartment] = useState<string>("All");
  const [employeePending, startEmployeeTransition] = useTransition();

  const departmentOptions = useMemo(() => ["All", ...departments], [departments]);
  const activeDepartment =
    employeeDepartment !== "All" && !departments.includes(employeeDepartment)
      ? "All"
      : employeeDepartment;

  const byEmployee = useMemo(() => {
    const rows = filterTransactionsInPeriod(transactions, employeePeriod).filter(
      (tx) => activeDepartment === "All" || tx.department === activeDepartment
    );
    return aggregateByEmployee(rows);
  }, [transactions, employeePeriod, activeDepartment]);

  const categoryTotal = useMemo(
    () => byCategory.reduce((sum, row) => sum + row.value, 0),
    [byCategory]
  );

  const sortedCategories = useMemo(
    () => [...byCategory].sort((a, b) => b.value - a.value),
    [byCategory]
  );

  const categoryLoading = loading;
  const employeeLoading = loading || employeePending;

  return (
    <Stack spacing={1.5}>
      <Box
        sx={{
          display: "grid",
          gridTemplateColumns: { xs: "1fr", lg: "0.95fr 1.05fr" },
          gap: 1.25,
        }}
      >
        <Box
          className="claim-fade-up claim-fade-up-delay-2"
          sx={{
            bgcolor: PANEL_BG,
            p: 2,
            minHeight: 340,
            border: `1px solid ${PANEL_BORDER}`,
            borderRadius: 2,
            minWidth: 0,
          }}
        >
          <Typography variant="subtitle1" fontWeight={700} sx={{ color: PANEL_TEXT }}>
            Spend by category
          </Typography>
          <Typography variant="caption" sx={{ display: "block", mb: 1.5, color: PANEL_MUTED }}>
            Click a slice to focus the window
          </Typography>

          {categoryLoading ? (
            <ChartWaiter height={300} label="Loading category spend…" dark />
          ) : sortedCategories.length === 0 ? (
            <Stack alignItems="center" justifyContent="center" sx={{ height: 260 }}>
              <Typography sx={{ color: PANEL_MUTED }}>No category spend in this window</Typography>
            </Stack>
          ) : (
            <>
              <Box sx={{ position: "relative", height: 260 }}>
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie
                      data={sortedCategories}
                      dataKey="value"
                      nameKey="name"
                      innerRadius={62}
                      outerRadius={92}
                      paddingAngle={2}
                      stroke={PANEL_BG}
                      strokeWidth={2}
                      onClick={(entry) => onDrill((entry as { name: string }).name)}
                      style={{ cursor: "pointer" }}
                    >
                      {sortedCategories.map((item, index) => {
                        const color = CATEGORY_COLORS[index % CATEGORY_COLORS.length]!;
                        const dimmed = Boolean(drillKey && drillKey !== item.name);
                        return (
                          <Cell
                            key={item.name}
                            fill={color}
                            fillOpacity={dimmed ? 0.28 : CATEGORY_FILL_OPACITY}
                            stroke={color}
                            strokeWidth={1.5}
                            strokeOpacity={dimmed ? 0.45 : 1}
                          />
                        );
                      })}
                    </Pie>
                    <Tooltip content={<CategoryTooltip />} />
                  </PieChart>
                </ResponsiveContainer>
                <Box
                  sx={{
                    position: "absolute",
                    inset: 0,
                    display: "grid",
                    placeItems: "center",
                    pointerEvents: "none",
                  }}
                >
                  <Box sx={{ textAlign: "center", mt: "-4px" }}>
                    <Typography variant="caption" fontWeight={650} sx={{ color: PANEL_MUTED }}>
                      Total
                    </Typography>
                    <Typography
                      fontWeight={800}
                      sx={{ fontSize: 15, letterSpacing: "-0.02em", color: PANEL_TEXT }}
                    >
                      {inr(categoryTotal)}
                    </Typography>
                  </Box>
                </Box>
              </Box>

              <Stack
                spacing={0.75}
                sx={{
                  mt: 0.5,
                  maxHeight: 140,
                  overflow: "auto",
                  scrollbarWidth: "none",
                  msOverflowStyle: "none",
                  "&::-webkit-scrollbar": { display: "none" },
                }}
              >
                {sortedCategories.map((item, index) => {
                  const pct = categoryTotal > 0 ? Math.round((item.value / categoryTotal) * 100) : 0;
                  const active = drillKey === item.name;
                  return (
                    <Box
                      key={item.name}
                      component="button"
                      onClick={() => onDrill(item.name)}
                      sx={{
                        display: "flex",
                        alignItems: "center",
                        gap: 1,
                        border: 0,
                        bgcolor: active ? "#1F232B" : "transparent",
                        cursor: "pointer",
                        textAlign: "left",
                        px: 0.75,
                        py: 0.5,
                        width: "100%",
                        borderRadius: 1,
                        "&:hover": { bgcolor: "#1F232B" },
                      }}
                    >
                      <Box
                        sx={{
                          width: 8,
                          height: 8,
                          borderRadius: "50%",
                          bgcolor: CATEGORY_COLORS[index % CATEGORY_COLORS.length],
                          flexShrink: 0,
                        }}
                      />
                      <Typography
                        variant="body2"
                        fontWeight={650}
                        sx={{ flex: 1, minWidth: 0, color: PANEL_TEXT }}
                        noWrap
                      >
                        {item.name}
                      </Typography>
                      <Typography variant="caption" sx={{ flexShrink: 0, color: PANEL_MUTED }}>
                        {pct}%
                      </Typography>
                      <Typography
                        variant="body2"
                        fontWeight={700}
                        sx={{ flexShrink: 0, minWidth: 72, textAlign: "right", color: PANEL_TEXT }}
                      >
                        {inr(item.value)}
                      </Typography>
                    </Box>
                  );
                })}
              </Stack>
            </>
          )}
        </Box>

        <Box
          className="claim-fade-up claim-fade-up-delay-3"
          sx={{
            bgcolor: PANEL_BG,
            p: 2,
            minHeight: 340,
            border: `1px solid ${PANEL_BORDER}`,
            borderRadius: 2,
            minWidth: 0,
          }}
        >
          <Stack
            direction={{ xs: "column", sm: "row" }}
            justifyContent="space-between"
            alignItems={{ xs: "stretch", sm: "flex-start" }}
            spacing={1.25}
            sx={{ mb: 1.5, width: "100%" }}
          >
            <Box sx={{ minWidth: 0, pr: { sm: 1 } }}>
              <Typography variant="subtitle1" fontWeight={700} sx={{ color: PANEL_TEXT }}>
                Spend per employee
              </Typography>
            </Box>
            <Stack
              direction="row"
              spacing={1}
              alignItems="center"
              sx={{ flexShrink: 0, alignSelf: { xs: "stretch", sm: "flex-start" } }}
            >
              <TextField
                select
                size="small"
                label="Department"
                value={activeDepartment}
                disabled={employeeLoading}
                onChange={(e) => {
                  const next = e.target.value;
                  startEmployeeTransition(() => setEmployeeDepartment(next));
                }}
                sx={darkFieldSx}
                SelectProps={{
                  MenuProps: {
                    PaperProps: {
                      sx: {
                        maxHeight: DEPARTMENT_MENU_MAX_HEIGHT,
                        overflowY: "auto",
                        bgcolor: FIELD_BG,
                        color: PANEL_TEXT,
                        border: `1px solid ${PANEL_BORDER}`,
                        "& .MuiMenuItem-root:hover": { bgcolor: "#2A2F38" },
                        "& .Mui-selected": { bgcolor: "#2A2F38" },
                      },
                    },
                  },
                }}
              >
                {departmentOptions.map((d) => (
                  <MenuItem key={d} value={d}>
                    {d}
                  </MenuItem>
                ))}
              </TextField>
              <TextField
                select
                size="small"
                value={employeePeriod}
                disabled={employeeLoading}
                onChange={(e) => {
                  const next = e.target.value as AnalyticsPeriod;
                  startEmployeeTransition(() => setEmployeePeriod(next));
                }}
                sx={{ ...darkFieldSx, minWidth: 100 }}
                SelectProps={{
                  MenuProps: {
                    PaperProps: {
                      sx: {
                        bgcolor: FIELD_BG,
                        color: PANEL_TEXT,
                        border: `1px solid ${PANEL_BORDER}`,
                        "& .MuiMenuItem-root:hover": { bgcolor: "#2A2F38" },
                        "& .Mui-selected": { bgcolor: "#2A2F38" },
                      },
                    },
                  },
                }}
              >
                {ANALYTICS_PERIOD_OPTIONS.map((opt) => (
                  <MenuItem key={opt.value} value={opt.value}>
                    {opt.label}
                  </MenuItem>
                ))}
              </TextField>
            </Stack>
          </Stack>
          {employeeLoading ? (
            <ChartWaiter height={360} label="Loading employee spend…" dark />
          ) : (
            <EmployeeSpendBarChart
              chartData={byEmployee}
              onBarClick={onDrill}
              height={360}
              autoYAxis
              showCategoryBreakdown
              layout="vertical"
              highlightName={drillKey}
              showSummary
            />
          )}
        </Box>
      </Box>

      <Box className="claim-fade-up claim-fade-up-delay-4">
        <DailySpendChart transactions={transactions} loading={loading} />
      </Box>
    </Stack>
  );
}
