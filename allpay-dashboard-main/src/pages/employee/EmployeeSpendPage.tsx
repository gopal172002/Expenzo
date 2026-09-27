import { lazy, Suspense, useEffect, useReducer, useState } from "react";
import {
  Alert,
  CircularProgress,
  FormControl,
  MenuItem,
  Select,
  Stack,
  Typography,
} from "@mui/material";
import { employeeApi, type EmployeeSpendResponse } from "../../api/employeeApi";
import {
  AdminCard,
  AdminKpi,
  AdminKpiRow,
  AdminPage,
} from "../../components/admin/ui";
import { useEmployeeData } from "../../context/EmployeeDataContext";
import { computeEmployeeSpendFromTransactions } from "../../utils/employeeSpend";

const DailySpendChart = lazy(() =>
  import("../../components/charts/DailySpendChart").then((m) => ({ default: m.DailySpendChart }))
);
const CategorySpendChart = lazy(() =>
  import("../../components/charts/DailySpendChart").then((m) => ({ default: m.CategorySpendChart }))
);

const fmt = (n: number) => `₹${n.toLocaleString("en-IN")}`;

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

  const showLoader = (loadState.loading || isBootstrapping) && !loadState.data;

  return (
    <AdminPage
      title="My spend"
      description="Category and range totals for your expenses only. Approved amounts are reimbursement decisions — not UPI settlement."
      actions={
        <FormControl size="small" sx={{ minWidth: 148 }}>
          <Select value={range} onChange={(e) => setRange(Number(e.target.value))}>
            <MenuItem value={7}>Last 7 days</MenuItem>
            <MenuItem value={30}>Last 30 days</MenuItem>
            <MenuItem value={90}>Last 90 days</MenuItem>
          </Select>
        </FormControl>
      }
    >
      {loadState.error ? <Alert severity="error">{loadState.error}</Alert> : null}

      <AdminCard title="Summary">
        {loadState.data && !showLoader ? (
          <AdminKpiRow>
            <AdminKpi label="Approved in range" value={fmt(loadState.data.approvedInRange)} accent="success" />
            <AdminKpi label="Pending in range" value={fmt(loadState.data.pendingInRange)} accent="warning" />
            <AdminKpi label="Transactions" value={String(loadState.data.transactionCount)} accent="primary" />
          </AdminKpiRow>
        ) : showLoader ? (
          <Stack alignItems="center" py={4}>
            <CircularProgress size={28} />
          </Stack>
        ) : (
          <Typography color="text.secondary">No spend data for this range.</Typography>
        )}
      </AdminCard>

      <Suspense
        fallback={
          <Stack alignItems="center" py={6}>
            <CircularProgress size={32} />
          </Stack>
        }
      >
        <DailySpendChart transactions={transactions} loading={showLoader} portal="employee" />
      </Suspense>

      <Suspense
        fallback={
          <Stack alignItems="center" py={6}>
            <CircularProgress size={32} />
          </Stack>
        }
      >
        <CategorySpendChart transactions={transactions} loading={showLoader} portal="employee" />
      </Suspense>
    </AdminPage>
  );
}
