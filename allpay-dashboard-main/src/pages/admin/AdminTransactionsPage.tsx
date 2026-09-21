import CheckCircle from "@mui/icons-material/CheckCircle";
import Clear from "@mui/icons-material/Clear";
import ExpandLess from "@mui/icons-material/ExpandLess";
import ExpandMore from "@mui/icons-material/ExpandMore";
import FilterList from "@mui/icons-material/FilterList";
import Search from "@mui/icons-material/Search";
import WarningAmber from "@mui/icons-material/WarningAmber";
import {
  Alert,
  Box,
  Button,
  Checkbox,
  Chip,
  CircularProgress,
  Collapse,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  Divider,
  FormControl,
  InputAdornment,
  InputLabel,
  MenuItem,
  Select,
  Stack,
  Table,
  TableBody,
  TableCell,
  TableHead,
  TablePagination,
  TableRow,
  TextField,
  ToggleButton,
  ToggleButtonGroup,
  Typography,
} from "@mui/material";
import dayjs from "dayjs";
import { keepPreviousData, useQuery, useQueryClient } from "@tanstack/react-query";
import { useEffect, useMemo, useState } from "react";
import { Link as RouterLink, useLocation } from "react-router-dom";
import { adminApi } from "../../api/adminApi";
import {
  AdminCard,
  AdminEmptyState,
  AdminPage,
  AdminResultBar,
  AdminTableShell,
} from "../../components/admin/ui";
import { AdminStatusChip } from "../../components/admin/AdminStatusChip";
import { AllOptionSelect } from "../../components/filters/AllOptionSelect";
import { useAdminData } from "../../context/AdminDataContext";
import { adminKeys } from "../../query/adminKeys";
import { ADMIN_FILTER_FIELD_SX, ADMIN_FILTER_GRID_SX } from "../../theme";
import type { TransactionFilters } from "../../types";
import { inr, STATUS_OPTIONS, statusLabel } from "../../utils/labels";

const PAGE_SIZE_OPTIONS = [10, 25, 50, 100] as const;

const FILTER_GRID_SX = ADMIN_FILTER_GRID_SX;
const FILTER_FIELD_SX = ADMIN_FILTER_FIELD_SX;

function rejectReasonFromDecision(decision?: string): string | null {
  if (!decision) return null;
  const s = decision.trim();
  const prefixes = ["Rejected - ", "Bulk rejected - ", "Bulk rejected -", "Bulk rejected"];
  for (const p of prefixes) {
    if (s.startsWith(p)) {
      const reason = s.slice(p.length).trim().replace(/^-\s*/, "");
      return reason || null;
    }
  }
  return null;
}

export const AdminTransactionsPage = () => {
  const location = useLocation();
  const queryClient = useQueryClient();
  const {
    employees,
    transactions,
    filters,
    setFilters,
    resetFilters,
    approveTransaction,
    rejectTransaction,
    bulkDecision,
    flaggedOnly,
    setFlaggedOnly,
    errorMessage,
    isSaving,
    departments,
    refreshTransactions,
  } = useAdminData();

  const [selected, setSelected] = useState<string[]>([]);
  const [rejectReason, setRejectReason] = useState("Missing supporting bill");
  const [actionByTx, setActionByTx] = useState<Record<string, "" | "view" | "approve" | "reject">>({});
  const [approveDialog, setApproveDialog] = useState<{ open: boolean; txId: string | null }>({
    open: false,
    txId: null,
  });
  const [approveAmount, setApproveAmount] = useState("");
  const [rejectDialog, setRejectDialog] = useState<{ open: boolean; txId: string | null }>({
    open: false,
    txId: null,
  });
  const [rejectReasonLocal, setRejectReasonLocal] = useState(rejectReason);

  const [page, setPage] = useState(0);
  const [rowsPerPage, setRowsPerPage] = useState<number>(25);
  const [debouncedSearch, setDebouncedSearch] = useState(filters.search);
  const [filtersOpen, setFiltersOpen] = useState(false);

  const categories = useMemo(
    () => Array.from(new Set(transactions.map((tx) => tx.category).filter(Boolean))).sort(),
    [transactions]
  );

  const activeFilterChips = useMemo(() => {
    const chips: { key: keyof TransactionFilters | "flaggedOnly"; label: string }[] = [];
    if (filters.search.trim()) chips.push({ key: "search", label: `Search: ${filters.search.trim()}` });
    if (filters.employeeId) {
      const emp = employees.find((e) => e.id === filters.employeeId);
      chips.push({ key: "employeeId", label: emp?.name ?? filters.employeeId });
    }
    if (filters.department) chips.push({ key: "department", label: filters.department });
    if (filters.category) chips.push({ key: "category", label: filters.category });
    if (filters.status) {
      chips.push({
        key: "status",
        label: STATUS_OPTIONS.find((o) => o.value === filters.status)?.label ?? filters.status,
      });
    }
    if (filters.upiApp) chips.push({ key: "upiApp", label: filters.upiApp });
    if (filters.mcc.trim()) chips.push({ key: "mcc", label: `MCC ${filters.mcc.trim()}` });
    if (filters.startDate) chips.push({ key: "startDate", label: `From ${filters.startDate}` });
    if (filters.endDate) chips.push({ key: "endDate", label: `To ${filters.endDate}` });
    if (filters.minAmount !== "") chips.push({ key: "minAmount", label: `Min ${inr(Number(filters.minAmount) || 0)}` });
    if (filters.maxAmount !== "") chips.push({ key: "maxAmount", label: `Max ${inr(Number(filters.maxAmount) || 0)}` });
    if (flaggedOnly) chips.push({ key: "flaggedOnly", label: "Flagged only" });
    return chips;
  }, [filters, employees, flaggedOnly]);

  const clearOneFilter = (key: keyof TransactionFilters | "flaggedOnly") => {
    if (key === "flaggedOnly") {
      setFlaggedOnly(false);
      return;
    }
    setFilters({ [key]: "" });
  };

  useEffect(() => {
    // Clear immediately so Reset / chip-clear reloads the full list without waiting.
    if (!filters.search.trim()) {
      setDebouncedSearch("");
      return;
    }
    const handle = window.setTimeout(() => setDebouncedSearch(filters.search), 300);
    return () => window.clearTimeout(handle);
  }, [filters.search]);

  const filterKey = useMemo(
    () =>
      JSON.stringify({
        employeeId: filters.employeeId,
        department: filters.department,
        category: filters.category,
        mcc: filters.mcc,
        status: filters.status,
        upiApp: filters.upiApp,
        startDate: filters.startDate,
        endDate: filters.endDate,
        minAmount: filters.minAmount,
        maxAmount: filters.maxAmount,
        search: debouncedSearch,
        flaggedOnly,
      }),
    [filters, debouncedSearch, flaggedOnly]
  );

  useEffect(() => {
    setPage(0);
    setSelected([]);
  }, [filterKey]);

  const listParams = useMemo(() => {
    const params: Record<string, string | number | boolean | undefined> = {
      page: page + 1,
      limit: rowsPerPage,
    };
    if (flaggedOnly) params.flagged = 1;
    if (filters.employeeId) params.employeeId = filters.employeeId;
    if (filters.department) params.department = filters.department;
    if (filters.category) params.category = filters.category;
    if (filters.mcc) params.mcc = filters.mcc;
    if (filters.status && !flaggedOnly) params.status = filters.status;
    if (filters.upiApp) params.upiApp = filters.upiApp;
    if (debouncedSearch.trim()) params.search = debouncedSearch.trim();
    if (filters.startDate) params.startDate = filters.startDate;
    if (filters.endDate) params.endDate = filters.endDate;
    if (filters.minAmount !== "") params.minAmount = filters.minAmount;
    if (filters.maxAmount !== "") params.maxAmount = filters.maxAmount;
    return params;
  }, [page, rowsPerPage, filters, flaggedOnly, debouncedSearch]);

  const listQuery = useQuery({
    queryKey: adminKeys.transactions(listParams),
    queryFn: () => adminApi.getTransactions(listParams),
    placeholderData: keepPreviousData,
  });

  useEffect(() => {
    const data = listQuery.data;
    if (!data) return;
    const maxPage = Math.max(0, Math.ceil(data.transactionTotal / Math.max(1, data.transactionPageSize)) - 1);
    if (page > maxPage) setPage(maxPage);
  }, [listQuery.data, page]);

  const rows = listQuery.data?.transactions ?? [];
  const total = listQuery.data?.transactionTotal ?? 0;
  const listLoading = listQuery.isFetching;
  const showBlankLoader = listQuery.isPending && !listQuery.data;
  const listError = listQuery.error ? (listQuery.error as Error).message : "";
  const pageAmount = useMemo(() => rows.reduce((acc, tx) => acc + tx.amount, 0), [rows]);

  const refreshList = async () => {
    await refreshTransactions();
    await queryClient.invalidateQueries({ queryKey: [...adminKeys.all, "transactions"] });
  };

  const toggleSelected = (id: string) => {
    setSelected((prev) => (prev.includes(id) ? prev.filter((item) => item !== id) : [...prev, id]));
  };

  return (
    <AdminPage
      title="Transactions"
      description="Every claim in the workspace. Filters and paging are applied on the server."
      actions={
        <Chip
          color="success"
          variant="outlined"
          label={`${total} claim${total === 1 ? "" : "s"} · page ${inr(pageAmount)}`}
        />
      }
      alert={
        <>
          {errorMessage ? <Alert severity="error">{errorMessage}</Alert> : null}
          {listError ? <Alert severity="error">{listError}</Alert> : null}
        </>
      }
    >
      <AdminCard variant="flush">
        <Box sx={{ px: 2, pt: 2, pb: filtersOpen ? 0 : 2 }}>
          <Stack spacing={2}>
            <Stack
              direction={{ xs: "column", sm: "row" }}
              spacing={1.5}
              alignItems={{ xs: "stretch", sm: "center" }}
              justifyContent="space-between"
            >
              <Button
                onClick={() => setFiltersOpen((open) => !open)}
                aria-expanded={filtersOpen}
                aria-controls="transaction-filters-panel"
                startIcon={<FilterList />}
                endIcon={filtersOpen ? <ExpandLess /> : <ExpandMore />}
                variant={filtersOpen ? "contained" : "outlined"}
                color="primary"
                sx={{
                  fontWeight: 700,
                  alignSelf: { xs: "stretch", sm: "center" },
                  px: 1.75,
                }}
              >
                Filters
                {activeFilterChips.length ? (
                  <Chip
                    size="small"
                    label={activeFilterChips.length}
                    sx={{
                      ml: 1,
                      height: 22,
                      fontWeight: 700,
                      bgcolor: filtersOpen ? "rgba(255,255,255,0.22)" : "action.selected",
                      color: "inherit",
                      "& .MuiChip-label": { px: 0.75 },
                    }}
                  />
                ) : null}
              </Button>

              <Stack direction="row" spacing={1} alignItems="center" flexWrap="wrap" useFlexGap>
                <ToggleButtonGroup
                  exclusive
                  size="small"
                  value={flaggedOnly ? "flagged" : "all"}
                  onChange={(_, value) => {
                    if (value == null) return;
                    setFlaggedOnly(value === "flagged");
                  }}
                  sx={{
                    bgcolor: "background.paper",
                    "& .MuiToggleButton-root": {
                      px: 1.5,
                      fontWeight: 600,
                    },
                  }}
                >
                  <ToggleButton value="all">All claims</ToggleButton>
                  <ToggleButton value="flagged">
                    <Stack direction="row" spacing={0.75} alignItems="center">
                      <WarningAmber sx={{ fontSize: 16 }} />
                      <span>Flagged</span>
                    </Stack>
                  </ToggleButton>
                </ToggleButtonGroup>
                <Button
                  variant="outlined"
                  size="small"
                  startIcon={<Clear />}
                  disabled={!activeFilterChips.length && !debouncedSearch.trim()}
                  onClick={() => {
                    setDebouncedSearch("");
                    resetFilters();
                    setPage(0);
                    setSelected([]);
                  }}
                >
                  Reset
                </Button>
              </Stack>
            </Stack>

            <Collapse in={filtersOpen} timeout="auto" unmountOnExit={false}>
              <Stack spacing={2} id="transaction-filters-panel">
                <TextField
                  size="small"
                  fullWidth
                  placeholder="Search merchant, UPI ref, or claim id"
                  value={filters.search}
                  onChange={(event) => setFilters({ search: event.target.value })}
                  InputProps={{
                    startAdornment: (
                      <InputAdornment position="start">
                        <Search fontSize="small" color="action" />
                      </InputAdornment>
                    ),
                    endAdornment: filters.search ? (
                      <InputAdornment position="end">
                        <Button size="small" onClick={() => setFilters({ search: "" })} sx={{ minWidth: 0, px: 1 }}>
                          Clear
                        </Button>
                      </InputAdornment>
                    ) : undefined,
                  }}
                />

                {activeFilterChips.length ? (
                  <Stack direction="row" spacing={0.75} flexWrap="wrap" useFlexGap>
                    {activeFilterChips.map((chip) => (
                      <Chip
                        key={chip.key}
                        size="small"
                        label={chip.label}
                        onDelete={() => clearOneFilter(chip.key)}
                        color={chip.key === "flaggedOnly" ? "warning" : "default"}
                        variant={chip.key === "flaggedOnly" ? "filled" : "outlined"}
                      />
                    ))}
                  </Stack>
                ) : null}

                <Box>
                  <Typography
                    variant="caption"
                    color="text.secondary"
                    fontWeight={700}
                    letterSpacing={0.4}
                    sx={{ display: "block", mb: 1, textTransform: "uppercase" }}
                  >
                    People & category
                  </Typography>
                  <Box sx={FILTER_GRID_SX}>
                    <AllOptionSelect
                      fullWidth
                      label="Employee"
                      allLabel="All employees"
                      value={filters.employeeId}
                      onChange={(value) => setFilters({ employeeId: value })}
                      options={employees.map((emp) => ({ value: emp.id, label: emp.name }))}
                      sx={FILTER_FIELD_SX}
                    />
                    <AllOptionSelect
                      fullWidth
                      label="Department"
                      allLabel="All departments"
                      value={filters.department}
                      onChange={(value) => setFilters({ department: value })}
                      options={departments.map((dept) => ({ value: dept, label: dept }))}
                      sx={FILTER_FIELD_SX}
                    />
                    <AllOptionSelect
                      fullWidth
                      label="Category"
                      allLabel="All categories"
                      value={filters.category}
                      onChange={(value) => setFilters({ category: value })}
                      options={categories.map((item) => ({ value: item, label: item }))}
                      sx={FILTER_FIELD_SX}
                    />
                    <AllOptionSelect
                      fullWidth
                      label="Status"
                      allLabel="All statuses"
                      value={filters.status}
                      onChange={(value) => setFilters({ status: value })}
                      disabled={flaggedOnly}
                      options={STATUS_OPTIONS.filter((opt) => opt.value).map((opt) => ({
                        value: opt.value,
                        label: opt.label,
                      }))}
                      sx={FILTER_FIELD_SX}
                    />
                  </Box>
                </Box>

                <Box>
                  <Typography
                    variant="caption"
                    color="text.secondary"
                    fontWeight={700}
                    letterSpacing={0.4}
                    sx={{ display: "block", mb: 1, textTransform: "uppercase" }}
                  >
                    Payment & amount
                  </Typography>
                  <Box sx={FILTER_GRID_SX}>
                    <AllOptionSelect
                      fullWidth
                      label="UPI app"
                      allLabel="All apps"
                      value={filters.upiApp}
                      onChange={(value) => setFilters({ upiApp: value })}
                      options={[
                        { value: "GPay", label: "GPay" },
                        { value: "PhonePe", label: "PhonePe" },
                        { value: "Paytm", label: "Paytm" },
                        { value: "BHIM", label: "BHIM" },
                      ]}
                      sx={FILTER_FIELD_SX}
                    />
                    <TextField
                      size="small"
                      fullWidth
                      label="MCC code"
                      value={filters.mcc}
                      onChange={(event) => setFilters({ mcc: event.target.value })}
                      sx={FILTER_FIELD_SX}
                    />
                    <TextField
                      size="small"
                      fullWidth
                      type="number"
                      label="Min amount"
                      value={filters.minAmount}
                      onChange={(event) => setFilters({ minAmount: event.target.value })}
                      InputProps={{
                        startAdornment: <InputAdornment position="start">₹</InputAdornment>,
                      }}
                      sx={FILTER_FIELD_SX}
                    />
                    <TextField
                      size="small"
                      fullWidth
                      type="number"
                      label="Max amount"
                      value={filters.maxAmount}
                      onChange={(event) => setFilters({ maxAmount: event.target.value })}
                      InputProps={{
                        startAdornment: <InputAdornment position="start">₹</InputAdornment>,
                      }}
                      sx={FILTER_FIELD_SX}
                    />
                  </Box>
                </Box>

                <Box>
                  <Typography
                    variant="caption"
                    color="text.secondary"
                    fontWeight={700}
                    letterSpacing={0.4}
                    sx={{ display: "block", mb: 1, textTransform: "uppercase" }}
                  >
                    Date range
                  </Typography>
                  <Box
                    sx={{
                      display: "grid",
                      gap: 1.5,
                      gridTemplateColumns: {
                        xs: "1fr",
                        sm: "repeat(2, minmax(0, 1fr))",
                        md: "repeat(4, minmax(0, 1fr))",
                      },
                    }}
                  >
                    <TextField
                      size="small"
                      fullWidth
                      type="date"
                      label="Start date"
                      InputLabelProps={{ shrink: true }}
                      value={filters.startDate}
                      onChange={(event) => setFilters({ startDate: event.target.value })}
                      sx={FILTER_FIELD_SX}
                    />
                    <TextField
                      size="small"
                      fullWidth
                      type="date"
                      label="End date"
                      InputLabelProps={{ shrink: true }}
                      value={filters.endDate}
                      onChange={(event) => setFilters({ endDate: event.target.value })}
                      sx={FILTER_FIELD_SX}
                    />
                  </Box>
                </Box>
              </Stack>
            </Collapse>
          </Stack>
        </Box>

        <Divider sx={{ mt: filtersOpen ? 2 : 0 }} />
        <AdminResultBar>
          {showBlankLoader ? (
            <Stack direction="row" spacing={1} alignItems="center">
              <CircularProgress size={14} />
              <Typography variant="body2" color="text.secondary" fontWeight={600}>
                Loading claims…
              </Typography>
            </Stack>
          ) : (
            <>
              <Typography variant="body2" fontWeight={700}>
                {total.toLocaleString("en-IN")} matching
              </Typography>
              <Typography variant="body2" color="text.secondary">
                · showing {rows.length} on this page
              </Typography>
              <Typography variant="body2" color="text.secondary">
                · {inr(pageAmount)}
              </Typography>
              {listLoading ? <CircularProgress size={12} sx={{ ml: 0.5 }} /> : null}
            </>
          )}
        </AdminResultBar>
      </AdminCard>

      <AdminCard variant="flush">
        <Box sx={{ px: 2, pt: 2, pb: 1.5 }}>
          <Stack
            direction={{ xs: "column", sm: "row" }}
            spacing={1}
            flexWrap="wrap"
            useFlexGap
            alignItems={{ sm: "center" }}
          >
            <Button
              disabled={!selected.length || isSaving || listLoading}
              variant="contained"
              onClick={async () => {
                await bulkDecision(selected, "approved");
                setSelected([]);
                await refreshList();
              }}
            >
              Bulk approve ({selected.length})
            </Button>
            <Button
              disabled={!selected.length || isSaving || listLoading}
              color="error"
              variant="outlined"
              onClick={async () => {
                await bulkDecision(selected, "rejected", rejectReason);
                setSelected([]);
                await refreshList();
              }}
            >
              Bulk reject
            </Button>
            <TextField
              size="small"
              label="Rejection reason"
              value={rejectReason}
              onChange={(event) => setRejectReason(event.target.value.slice(0, 300))}
              sx={{ minWidth: { xs: "100%", sm: 220 } }}
            />
          </Stack>
        </Box>

        <AdminTableShell
          loading={showBlankLoader}
          isEmpty={!showBlankLoader && rows.length === 0}
          empty={<AdminEmptyState title="No claims match these filters" />}
          sx={{ border: "none", borderRadius: 0, minHeight: 200 }}
        >
          {listLoading && !showBlankLoader ? (
            <Box sx={{ position: "absolute", top: 8, right: 12, zIndex: 2 }}>
              <CircularProgress size={18} thickness={5} />
            </Box>
          ) : null}
          <Table size="small" sx={{ minWidth: 1080, tableLayout: "auto", opacity: listLoading ? 0.85 : 1 }}>
              <TableHead>
                <TableRow>
                  <TableCell sx={{ width: 48 }} />
                  <TableCell sx={{ whiteSpace: "nowrap" }}>Employee</TableCell>
                  <TableCell sx={{ whiteSpace: "nowrap" }}>Department</TableCell>
                  <TableCell sx={{ whiteSpace: "nowrap" }}>Merchant</TableCell>
                  <TableCell sx={{ whiteSpace: "nowrap" }}>Category</TableCell>
                  <TableCell sx={{ whiteSpace: "nowrap" }}>MCC</TableCell>
                  <TableCell align="right" sx={{ whiteSpace: "nowrap" }}>
                    Amount
                  </TableCell>
                  <TableCell sx={{ whiteSpace: "nowrap" }}>Date</TableCell>
                  <TableCell sx={{ whiteSpace: "nowrap" }}>Status</TableCell>
                  <TableCell align="center" sx={{ whiteSpace: "nowrap", minWidth: 220 }}>
                    Actions
                  </TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {rows.map((tx) => (
                  <TableRow key={tx.id} hover>
                    <TableCell>
                      <Checkbox
                        checked={selected.includes(tx.id)}
                        onChange={() => toggleSelected(tx.id)}
                        disabled={listLoading}
                      />
                    </TableCell>
                    <TableCell sx={{ whiteSpace: "nowrap" }}>
                      <Stack direction="row" spacing={1} alignItems="center">
                        {tx.isNew ? (
                          <Box
                            sx={{
                              width: 10,
                              height: 10,
                              borderRadius: 99,
                              bgcolor: "success.main",
                              animation: "pulse 1s infinite",
                              flexShrink: 0,
                            }}
                          />
                        ) : null}
                        <Box>
                          <Typography variant="body2">{tx.employeeName}</Typography>
                          <Typography variant="caption" color="text.secondary">
                            {tx.upiRefId}
                          </Typography>
                        </Box>
                      </Stack>
                    </TableCell>
                    <TableCell sx={{ whiteSpace: "nowrap" }}>{tx.department}</TableCell>
                    <TableCell sx={{ whiteSpace: "nowrap" }}>{tx.merchantName}</TableCell>
                    <TableCell sx={{ whiteSpace: "nowrap" }}>{tx.category}</TableCell>
                    <TableCell sx={{ whiteSpace: "nowrap" }}>
                      <Typography variant="body2">{tx.mcc || "—"}</Typography>
                    </TableCell>
                    <TableCell align="right" sx={{ whiteSpace: "nowrap" }}>
                      {inr(tx.amount)}
                    </TableCell>
                    <TableCell sx={{ whiteSpace: "nowrap" }}>
                      {dayjs(tx.dateTime).format("DD MMM YYYY, HH:mm")}
                    </TableCell>
                    <TableCell sx={{ whiteSpace: "nowrap" }}>
                      <AdminStatusChip
                        status={tx.status}
                        label={statusLabel(tx.status)}
                        icon={
                          tx.status === "flagged" ? (
                            <WarningAmber />
                          ) : tx.status === "approved" ? (
                            <CheckCircle />
                          ) : undefined
                        }
                      />
                    </TableCell>
                    <TableCell align="center" sx={{ whiteSpace: "nowrap", minWidth: 220 }}>
                      <Stack direction="row" spacing={1} justifyContent="center" alignItems="center">
                        <Button
                          component={RouterLink}
                          to={`/admin/transaction/${tx.id}`}
                          state={{ returnTo: `${location.pathname}${location.search}` }}
                          size="small"
                          variant="text"
                          sx={{ flexShrink: 0 }}
                        >
                          View
                        </Button>
                        {tx.status === "approved" ? (
                          <Chip
                            size="small"
                            color="success"
                            variant="outlined"
                            label={`Approved ${inr(tx.claimedAmount)}`}
                          />
                        ) : tx.status === "rejected" ? (
                          <Chip
                            size="small"
                            color="error"
                            variant="outlined"
                            label={rejectReasonFromDecision(tx.adminDecision) ?? "Rejected"}
                          />
                        ) : tx.status === "pending" || tx.status === "flagged" ? (
                          <FormControl size="small" sx={{ minWidth: 128, flexShrink: 0 }}>
                            <InputLabel shrink>Action</InputLabel>
                            <Select
                              label="Action"
                              displayEmpty
                              notched
                              value={actionByTx[tx.id] ?? ""}
                              renderValue={(selected) => {
                                if (!selected) return "Action";
                                if (selected === "approve") return "Approve";
                                if (selected === "reject") return "Reject";
                                return String(selected);
                              }}
                              onChange={(e) => {
                                const v = e.target.value as "" | "view" | "approve" | "reject";
                                setActionByTx((prev) => ({ ...prev, [tx.id]: v }));
                                if (v === "view") return;
                                if (v === "approve") {
                                  setApproveAmount(String(tx.claimedAmount ?? tx.amount ?? ""));
                                  setApproveDialog({ open: true, txId: tx.id });
                                }
                                if (v === "reject") {
                                  setRejectReasonLocal(rejectReason);
                                  setRejectDialog({ open: true, txId: tx.id });
                                }
                              }}
                              disabled={isSaving || listLoading}
                            >
                              <MenuItem value="">Select</MenuItem>
                              <MenuItem value="approve">Approve</MenuItem>
                              <MenuItem value="reject">Reject</MenuItem>
                            </Select>
                          </FormControl>
                        ) : null}
                      </Stack>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
        </AdminTableShell>

          <TablePagination
            component="div"
            count={total}
            page={page}
            onPageChange={(_, nextPage) => setPage(nextPage)}
            rowsPerPage={rowsPerPage}
            onRowsPerPageChange={(e) => {
              setRowsPerPage(Number(e.target.value));
              setPage(0);
            }}
            rowsPerPageOptions={[...PAGE_SIZE_OPTIONS]}
            labelRowsPerPage="Rows per page"
            showFirstButton
            showLastButton
            sx={{
              borderTop: "1px solid",
              borderColor: "divider",
              mt: 0,
              ".MuiTablePagination-toolbar": { flexWrap: "wrap", gap: 0.5 },
            }}
          />
      </AdminCard>

      <Dialog
        open={approveDialog.open}
        onClose={() => setApproveDialog({ open: false, txId: null })}
        maxWidth="xs"
        fullWidth
      >
        <DialogTitle>Approve transaction</DialogTitle>
        <DialogContent>
          <Stack spacing={1.5} sx={{ mt: 1 }}>
            <Typography variant="body2" color="text.secondary">
              Enter the amount to approve.
            </Typography>
            <TextField
              label="Approved amount (INR)"
              type="number"
              value={approveAmount}
              onChange={(e) => setApproveAmount(e.target.value)}
              fullWidth
              size="small"
            />
          </Stack>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setApproveDialog({ open: false, txId: null })} disabled={isSaving}>
            Cancel
          </Button>
          <Button
            variant="contained"
            color="success"
            disabled={isSaving || !approveDialog.txId || Number(approveAmount) <= 0}
            onClick={async () => {
              if (!approveDialog.txId) return;
              await approveTransaction(approveDialog.txId, Number(approveAmount));
              setApproveDialog({ open: false, txId: null });
              setActionByTx((prev) => ({ ...prev, [approveDialog.txId!]: "" }));
              await refreshList();
            }}
          >
            Approve
          </Button>
        </DialogActions>
      </Dialog>

      <Dialog
        open={rejectDialog.open}
        onClose={() => setRejectDialog({ open: false, txId: null })}
        maxWidth="sm"
        fullWidth
      >
        <DialogTitle>Reject transaction</DialogTitle>
        <DialogContent>
          <Stack spacing={1.5} sx={{ mt: 1 }}>
            <Typography variant="body2" color="text.secondary">
              Provide a rejection reason.
            </Typography>
            <TextField
              label="Rejection reason"
              value={rejectReasonLocal}
              onChange={(e) => setRejectReasonLocal(e.target.value.slice(0, 300))}
              fullWidth
              size="small"
            />
          </Stack>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setRejectDialog({ open: false, txId: null })} disabled={isSaving}>
            Cancel
          </Button>
          <Button
            variant="contained"
            color="error"
            disabled={isSaving || !rejectDialog.txId || !rejectReasonLocal.trim()}
            onClick={async () => {
              if (!rejectDialog.txId) return;
              await rejectTransaction(rejectDialog.txId, rejectReasonLocal.trim());
              setRejectDialog({ open: false, txId: null });
              setActionByTx((prev) => ({ ...prev, [rejectDialog.txId!]: "" }));
              await refreshList();
            }}
          >
            Reject
          </Button>
        </DialogActions>
      </Dialog>
    </AdminPage>
  );
};
