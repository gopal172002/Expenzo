import { lazy, Suspense, useEffect, useMemo, useReducer, useState } from "react";
import {
  Alert,
  Box,
  Card,
  CardContent,
  CircularProgress,
  Divider,
  FormControl,
  MenuItem,
  Select,
  Stack,
  Typography,
} from "@mui/material";
import { employeeApi, type EmployeeSpendResponse } from "../../api/employeeApi";
import { useEmployeeData } from "../../context/EmployeeDataContext";
import { computeEmployeeSpendFromTransactions } from "../../utils/employeeSpend";

const EmployeeSpendBarChart = lazy(() =>
  import("../../components/charts/EmployeeSpendBarChart").then((m) => ({ default: m.EmployeeSpendBarChart }))
);

const fmt = (n: number) => `Rs.${n.toLocaleString("en-IN")}`;
const CHART_CATEGORIES = ["Fuel", "Office Supplies", "Travel", "Lodging", "Bars/Alcohol", "Meals"];

type SpendLoadState = {
  data: EmployeeSpendResponse | null;
  error: string;
  loading: boolean;
};

type SpendLoadAction =
  | { type: "start" }
  | { type: "success"; data: EmployeeSpendResponse }
  | { type: "error"; message: string }
  | { type: "finish" };

function spendLoadReducer(state: SpendLoadState, action: SpendLoadAction): SpendLoadState {
  switch (action.type) {
    case "start":
      return { ...state, loading: true, error: "" };
    case "success":
      return { ...state, data: action.data };
    case "error":
      return { ...state, error: action.message };
    case "finish":
      return { ...state, loading: false };
    default:
      return state;
  }
}

export function EmployeeSpendPage() {
  const { transactions, isBootstrapping } = useEmployeeData();
  const [range, setRange] = useState(30);
  const [loadState, dispatch] = useReducer(spendLoadReducer, {
    data: null,
    error: "",
    loading: true,
  });

  useEffect(() => {
    let cancelled = false;
    dispatch({ type: "start" });

    const loadFromTransactions = () => {
      if (!cancelled) {
        dispatch({ type: "success", data: computeEmployeeSpendFromTransactions(transactions, range) });
        dispatch({ type: "finish" });
      }
    };

    employeeApi
      .getSpend(range)
      .then((res) => {
        if (!cancelled) dispatch({ type: "success", data: res });
      })
      .catch(() => {
        if (!cancelled && transactions.length > 0) {
          loadFromTransactions();
        } else if (!cancelled) {
          dispatch({ type: "error", message: "Could not load spend data. Restart the backend and refresh." });
          dispatch({ type: "finish" });
        }
      })
      .finally(() => {
        if (!cancelled) dispatch({ type: "finish" });
      });

    return () => {
      cancelled = true;
    };
  }, [range, transactions]);

  const chartData = useMemo(() => {
    const fromApi = loadState.data?.byCategory ?? [];
    return CHART_CATEGORIES.map((name) => {
      const row = fromApi.find((c) => c.category === name);
      return { name, value: row?.total ?? 0 };
    });
  }, [loadState.data]);

  const showLoader = (loadState.loading || isBootstrapping) && !loadState.data;

  return (
    <Card
      sx={{
        borderRadius: 3,
        border: "1px solid #e8edf2",
        boxShadow: "0 1px 2px rgba(15,23,42,0.04)",
      }}
    >
      <CardContent sx={{ p: { xs: 2.5, md: 3 } }}>
        <Stack direction="row" justifyContent="space-between" alignItems="flex-start" spacing={2}>
          <Box>
            <Typography variant="h5" sx={{ fontWeight: 800, color: "#0f172a", mb: 0.75 }}>
              My spend
            </Typography>
            <Typography variant="body2" color="text.secondary">
              Same metrics style as admin Analytics, scoped to your transactions only.
            </Typography>
          </Box>
          <FormControl size="small" sx={{ minWidth: 148, flexShrink: 0 }}>
            <Select
              value={range}
              onChange={(e) => setRange(Number(e.target.value))}
              sx={{
                borderRadius: 2,
                bgcolor: "#fff",
                fontSize: 14,
                "& .MuiOutlinedInput-notchedOutline": { borderColor: "#d1d9e0" },
              }}
            >
              <MenuItem value={7}>Last 7 days</MenuItem>
              <MenuItem value={30}>Last 30 days</MenuItem>
              <MenuItem value={90}>Last 90 days</MenuItem>
            </Select>
          </FormControl>
        </Stack>

        {loadState.error ? (
          <Alert severity="error" sx={{ mt: 2 }}>
            {loadState.error}
          </Alert>
        ) : null}

        {loadState.data && !showLoader ? (
          <Stack direction="row" spacing={3} flexWrap="wrap" sx={{ mt: 2.5, mb: 2.5 }}>
            <Typography variant="body2" sx={{ color: "#0f172a" }}>
              <Box component="span" sx={{ fontWeight: 700 }}>
                Approved
              </Box>{" "}
              in range: {fmt(loadState.data.approvedInRange)}
            </Typography>
            <Typography variant="body2" sx={{ color: "#0f172a" }}>
              <Box component="span" sx={{ fontWeight: 700 }}>
                Pending
              </Box>{" "}
              in range: {fmt(loadState.data.pendingInRange)}
            </Typography>
            <Typography variant="body2" color="text.secondary">
              {loadState.data.transactionCount} transactions
            </Typography>
          </Stack>
        ) : null}

        <Divider sx={{ borderColor: "#e8edf2", mb: 2.5 }} />

        <Typography variant="subtitle1" sx={{ fontWeight: 700, color: "#0f172a", mb: 2 }}>
          By category
        </Typography>

        {showLoader ? (
          <Stack alignItems="center" py={6}>
            <CircularProgress size={32} />
          </Stack>
        ) : loadState.data ? (
          <Suspense
            fallback={
              <Stack alignItems="center" py={6}>
                <CircularProgress size={32} />
              </Stack>
            }
          >
            <EmployeeSpendBarChart chartData={chartData} />
          </Suspense>
        ) : null}
      </CardContent>
    </Card>
  );
}
