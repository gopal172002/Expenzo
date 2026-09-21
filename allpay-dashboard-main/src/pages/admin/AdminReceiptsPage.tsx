import ReceiptLongOutlined from "@mui/icons-material/ReceiptLongOutlined";
import {
  Alert,
  Button,
  Stack,
  TextField,
} from "@mui/material";
import dayjs from "dayjs";
import { useMemo, useState } from "react";
import { Link as RouterLink } from "react-router-dom";
import {
  AdminEmptyState,
  AdminFilterBar,
  AdminKpi,
  AdminKpiRow,
  AdminPage,
  AdminPageLoader,
  AdminSectionLabel,
  AdminSegmentedControl,
} from "../../components/admin/ui";
import { AllOptionSelect } from "../../components/filters/AllOptionSelect";
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

  return (
    <AdminPage
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
      alert={errorMessage ? <Alert severity="error">{errorMessage}</Alert> : null}
    >
      <AdminKpiRow>
        <AdminKpi label="Receipts on file" value={String(receipts.length)} accent="primary" />
        <AdminKpi label="Pending review" value={String(pending)} accent="warning" />
        <AdminKpi label="Flagged" value={String(flagged)} accent="error" />
        <AdminKpi label="Today's spend" value={inr(todaySpend)} accent="teal" />
      </AdminKpiRow>

      <AdminSectionLabel>Latest receipts</AdminSectionLabel>

      {isBootstrapping ? (
        <AdminPageLoader label="Loading receipts…" />
      ) : receipts.length === 0 ? (
        <AdminEmptyState
          icon={<ReceiptLongOutlined color="action" />}
          title="No employee receipts yet"
          description={`When employees upload a bill, it appears here. ${employees.length} employees are loaded. ${missingReceipts} transactions still have no receipt.`}
        />
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
    </AdminPage>
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
    <AdminPage
      title="Employee receipts"
      description="Browse by department, then spend category, then employee. Filters apply as you change them — there is no extra Apply step."
    >
      <AdminSegmentedControl
        aria-label="Receipt availability"
        value={tab}
        onChange={setTab}
        options={[
          {
            value: "with",
            label: `With receipt (${transactions.filter((tx) => tx.receiptUrl).length})`,
          },
          {
            value: "missing",
            label: `Missing receipt (${transactions.filter((tx) => !tx.receiptUrl).length})`,
          },
        ]}
      />

      <AdminFilterBar
        actions={
          <Button onClick={reset} sx={{ alignSelf: { md: "center" } }}>
            Reset
          </Button>
        }
      >
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
      </AdminFilterBar>

      <ReceiptExplorer
        transactions={filtered}
        emptyLabel={
          tab === "with"
            ? "No receipts match these filters."
            : "Every transaction in this filter already has a receipt."
        }
      />
    </AdminPage>
  );
}
