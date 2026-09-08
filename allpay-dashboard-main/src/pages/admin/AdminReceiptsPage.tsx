import ReceiptLongOutlined from "@mui/icons-material/ReceiptLongOutlined";
import {
  Alert,
  Box,
  Button,
  Card,
  CardContent,
  Chip,
  Stack,
  TextField,
  Typography,
} from "@mui/material";
import dayjs from "dayjs";
import { useMemo, useState } from "react";
import { Link as RouterLink } from "react-router-dom";
import { AllOptionSelect } from "../../components/filters/AllOptionSelect";
import { PageHeader } from "../../components/layout/PageHeader";
import { ReceiptExplorer } from "../../components/receipts/ReceiptExplorer";
import { useAdminData } from "../../context/AdminDataContext";
import { inr, STATUS_OPTIONS } from "../../utils/labels";
import type { Transaction } from "../../types";

export function AdminDashboardPage() {
  const { transactions, employees, errorMessage, isBootstrapping } = useAdminData();

  const receipts = useMemo(
    () =>
      transactions
        .filter((tx) => Boolean(tx.receiptUrl))
        .sort((a, b) => dayjs(b.dateTime).valueOf() - dayjs(a.dateTime).valueOf()),
    [transactions]
  );

  const pending = transactions.filter((tx) => tx.status === "pending").length;
  const flagged = transactions.filter((tx) => tx.status === "flagged" || tx.flags.length > 0).length;
  const missingReceipts = transactions.filter((tx) => !tx.receiptUrl).length;
  const todaySpend = transactions
    .filter((tx) => dayjs(tx.dateTime).isSame(dayjs(), "day"))
    .reduce((sum, tx) => sum + tx.amount, 0);

  const stats = [
    { label: "Receipts on file", value: String(receipts.length) },
    { label: "Pending review", value: String(pending) },
    { label: "Flagged", value: String(flagged) },
    { label: "Today's spend", value: inr(todaySpend) },
  ];

  return (
    <Stack spacing={2.5}>
      {errorMessage ? <Alert severity="error">{errorMessage}</Alert> : null}

      <PageHeader
        title="Dashboard"
        description="Claims waiting on finance, receipts on file, and spend posted today."
        actions={
          <Stack direction="row" spacing={1}>
            <Button component={RouterLink} to="/admin/receipts" variant="contained">
              Employee receipts
            </Button>
            <Button component={RouterLink} to="/admin/transactions" variant="outlined">
              Transactions
            </Button>
          </Stack>
        }
      />

      <Box
        sx={{
          display: "grid",
          gridTemplateColumns: { xs: "1fr", sm: "repeat(2, 1fr)", md: "repeat(4, 1fr)" },
          gap: 1.5,
        }}
      >
        {stats.map((item) => (
          <Card key={item.label}>
            <CardContent>
              <Typography variant="caption" color="text.secondary">
                {item.label}
              </Typography>
              <Typography variant="h5" sx={{ mt: 0.5 }}>
                {item.value}
              </Typography>
            </CardContent>
          </Card>
        ))}
      </Box>

      <Typography variant="h6">Latest receipts</Typography>

      {isBootstrapping ? (
        <Typography color="text.secondary">Loading receipts…</Typography>
      ) : receipts.length === 0 ? (
        <Card>
          <CardContent>
            <Stack spacing={1} alignItems="flex-start">
              <ReceiptLongOutlined color="action" />
              <Typography fontWeight={650}>No employee receipts yet</Typography>
              <Typography color="text.secondary">
                When employees upload a bill, it appears here. {employees.length} employees are loaded.{" "}
                {missingReceipts} transactions still have no receipt.
              </Typography>
            </Stack>
          </CardContent>
        </Card>
      ) : (
        <ReceiptExplorer transactions={receipts.slice(0, 40)} emptyLabel="No recent receipts." />
      )}

      {missingReceipts > 0 ? (
        <Alert severity="info">
          {missingReceipts} transaction{missingReceipts === 1 ? "" : "s"} have no receipt attached.{" "}
          <Button component={RouterLink} to="/admin/receipts?tab=missing" size="small">
            Review missing receipts
          </Button>
        </Alert>
      ) : null}
    </Stack>
  );
}

export function AdminReceiptsPage() {
  const { transactions, employees } = useAdminData();
  const [search, setSearch] = useState("");
  const [status, setStatus] = useState("");
  const [employeeId, setEmployeeId] = useState("");
  const [category, setCategory] = useState("");
  const [tab, setTab] = useState<"with" | "missing">(
    new URLSearchParams(window.location.search).get("tab") === "missing" ? "missing" : "with"
  );

  const categories = useMemo(() => {
    return Array.from(new Set(transactions.map((tx) => tx.category).filter(Boolean))).sort();
  }, [transactions]);

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    return transactions
      .filter((tx: Transaction) => (tab === "with" ? Boolean(tx.receiptUrl) : !tx.receiptUrl))
      .filter((tx) => (status ? tx.status === status : true))
      .filter((tx) => (employeeId ? tx.employeeId === employeeId : true))
      .filter((tx) => (category ? tx.category === category : true))
      .filter((tx) => {
        if (!q) return true;
        return [tx.employeeName, tx.employeeId, tx.merchantName, tx.id, tx.department, tx.category, tx.mcc]
          .join(" ")
          .toLowerCase()
          .includes(q);
      })
      .sort((a, b) => dayjs(b.dateTime).valueOf() - dayjs(a.dateTime).valueOf());
  }, [transactions, search, status, employeeId, category, tab]);

  const reset = () => {
    setSearch("");
    setStatus("");
    setEmployeeId("");
    setCategory("");
  };

  return (
    <Stack spacing={2.5}>
      <PageHeader
        title="Employee receipts"
        description="Browse by department, then spend category, then employee. Filters apply as you change them — there is no extra Apply step."
      />

      <Card>
        <CardContent>
          <Stack direction="row" spacing={1} flexWrap="wrap" useFlexGap sx={{ mb: 2 }}>
            <Chip
              label={`With receipt (${transactions.filter((tx) => tx.receiptUrl).length})`}
              color={tab === "with" ? "primary" : "default"}
              onClick={() => setTab("with")}
            />
            <Chip
              label={`Missing receipt (${transactions.filter((tx) => !tx.receiptUrl).length})`}
              color={tab === "missing" ? "primary" : "default"}
              onClick={() => setTab("missing")}
            />
          </Stack>
          <Stack direction={{ xs: "column", md: "row" }} spacing={1.5}>
            <TextField
              size="small"
              placeholder="Search employee, merchant, MCC, or ID"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              sx={{ flex: 1, minWidth: 220 }}
            />
            <AllOptionSelect
              label="Status"
              allLabel="All statuses"
              value={status}
              onChange={setStatus}
              minWidth={150}
              options={STATUS_OPTIONS.filter((opt) => opt.value).map((opt) => ({
                value: opt.value,
                label: opt.label,
              }))}
            />
            <AllOptionSelect
              label="Category"
              allLabel="All categories"
              value={category}
              onChange={setCategory}
              minWidth={160}
              options={categories.map((item) => ({ value: item, label: item }))}
            />
            <AllOptionSelect
              label="Employee"
              allLabel="All employees"
              value={employeeId}
              onChange={setEmployeeId}
              minWidth={180}
              options={employees.map((emp) => ({
                value: emp.id,
                label: `${emp.name} (${emp.id})`,
              }))}
            />
            <Button onClick={reset} sx={{ alignSelf: { md: "center" } }}>
              Reset
            </Button>
          </Stack>
        </CardContent>
      </Card>

      <ReceiptExplorer
        transactions={filtered}
        emptyLabel={
          tab === "with"
            ? "No receipts match these filters."
            : "Every transaction in this filter already has a receipt."
        }
      />
    </Stack>
  );
}
