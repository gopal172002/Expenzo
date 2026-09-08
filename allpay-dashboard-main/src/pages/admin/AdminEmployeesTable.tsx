import ContentCopy from "@mui/icons-material/ContentCopy";
import Search from "@mui/icons-material/Search";
import {
  Alert,
  Avatar,
  Box,
  Button,
  Chip,
  CircularProgress,
  FormControl,
  IconButton,
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
  Tooltip,
  Typography,
} from "@mui/material";
import { keepPreviousData, useQuery, useQueryClient } from "@tanstack/react-query";
import { useEffect, useState } from "react";
import { adminApi } from "../../api/adminApi";
import { adminKeys } from "../../query/adminKeys";

const PAGE_SIZE_OPTIONS = [10, 25, 50, 100] as const;

function initials(name: string) {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  if (!parts.length) return "?";
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
  return `${parts[0][0] ?? ""}${parts[parts.length - 1][0] ?? ""}`.toUpperCase();
}

function avatarColor(seed: string) {
  const palette = ["#2563EB", "#059669", "#D97706", "#DC2626", "#0F766E", "#475569"];
  let hash = 0;
  for (let i = 0; i < seed.length; i += 1) hash = (hash + seed.charCodeAt(i) * (i + 1)) % 997;
  return palette[hash % palette.length];
}

export function AdminEmployeesOnboardingTable({
  isSaving,
  tableFeedback,
  onDismissFeedback,
  onCopyId,
  onCopyInviteCode,
  onGenerateInvite,
  onResetLogin,
  reloadToken = 0,
  onCounts,
}: {
  isSaving: boolean;
  tableFeedback: { severity: "success" | "error"; text: string } | null;
  onDismissFeedback: () => void;
  onCopyId: (id: string) => void;
  onCopyInviteCode: (code: string) => void;
  onGenerateInvite: (email: string, name: string) => Promise<void>;
  onResetLogin: (email: string, id: string) => Promise<void>;
  /** Bump after invite / import / assign so the directory reloads from the server. */
  reloadToken?: number;
  onCounts?: (counts: { total: number; active: number; pendingId: number; onboarded: number }) => void;
}) {
  const queryClient = useQueryClient();
  const [search, setSearch] = useState("");
  const [debouncedSearch, setDebouncedSearch] = useState("");
  const [department, setDepartment] = useState("");
  const [status, setStatus] = useState<"all" | "active" | "pending" | "inactive">("all");
  const [page, setPage] = useState(0);
  const [rowsPerPage, setRowsPerPage] = useState(25);

  useEffect(() => {
    if (!search.trim()) {
      setDebouncedSearch("");
      return;
    }
    const handle = window.setTimeout(() => setDebouncedSearch(search.trim()), 300);
    return () => window.clearTimeout(handle);
  }, [search]);

  useEffect(() => {
    setPage(0);
  }, [debouncedSearch, department, status]);

  useEffect(() => {
    if (reloadToken > 0) {
      void queryClient.invalidateQueries({ queryKey: [...adminKeys.all, "employees"] });
    }
  }, [reloadToken, queryClient]);

  const listParams = {
    page: page + 1,
    limit: rowsPerPage,
    search: debouncedSearch,
    department,
    status,
  };

  const employeesQuery = useQuery({
    queryKey: adminKeys.employees(listParams),
    queryFn: async () => {
      const res = await adminApi.listEmployees({
        page: listParams.page,
        limit: listParams.limit,
        search: listParams.search || undefined,
        department: listParams.department || undefined,
        status: listParams.status === "all" ? undefined : listParams.status,
      });
      return res;
    },
    placeholderData: keepPreviousData,
  });

  useEffect(() => {
    if (employeesQuery.data?.counts) onCounts?.(employeesQuery.data.counts);
  }, [employeesQuery.data?.counts, onCounts]);

  useEffect(() => {
    const data = employeesQuery.data;
    if (!data) return;
    const maxPage = Math.max(0, Math.ceil(data.total / Math.max(1, data.pageSize)) - 1);
    if (page > maxPage) setPage(maxPage);
  }, [employeesQuery.data, page]);

  const rows = employeesQuery.data?.employees ?? [];
  const total = employeesQuery.data?.total ?? 0;
  const departments = employeesQuery.data?.departments ?? [];
  const listError = employeesQuery.error ? (employeesQuery.error as Error).message : "";
  const loading = employeesQuery.isFetching;
  const showBlankLoader = employeesQuery.isPending && !employeesQuery.data;

  return (
    <Box
      sx={{
        bgcolor: "#fff",
        border: "1px solid",
        borderColor: "divider",
        borderRadius: 0,
        p: 2,
      }}
    >
      <Stack
        direction={{ xs: "column", md: "row" }}
        spacing={1.5}
        justifyContent="space-between"
        alignItems={{ md: "flex-end" }}
        sx={{ mb: 1.5 }}
      >
        <Box>
          <Typography variant="h6" fontWeight={700}>
            Employee directory
          </Typography>
          <Typography variant="body2" color="text.secondary">
            {showBlankLoader ? "Loading…" : `${total.toLocaleString("en-IN")} match${total === 1 ? "" : "es"}`}
          </Typography>
        </Box>
        <Stack direction={{ xs: "column", sm: "row" }} spacing={1} sx={{ width: { xs: "100%", md: "auto" } }}>
          <TextField
            size="small"
            placeholder="Search name, email, ID…"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            sx={{ minWidth: { sm: 220 } }}
            InputProps={{
              startAdornment: (
                <InputAdornment position="start">
                  <Search fontSize="small" color="action" />
                </InputAdornment>
              ),
            }}
          />
          <FormControl size="small" sx={{ minWidth: 140 }}>
            <InputLabel shrink>Department</InputLabel>
            <Select
              label="Department"
              displayEmpty
              notched
              value={department}
              onChange={(e) => setDepartment(e.target.value)}
              renderValue={(selected) => (selected ? String(selected) : "All departments")}
            >
              <MenuItem value="">All departments</MenuItem>
              {departments.map((dep) => (
                <MenuItem key={dep} value={dep}>
                  {dep}
                </MenuItem>
              ))}
            </Select>
          </FormControl>
          <FormControl size="small" sx={{ minWidth: 130 }}>
            <InputLabel shrink>Status</InputLabel>
            <Select
              label="Status"
              notched
              value={status}
              onChange={(e) => setStatus(e.target.value as typeof status)}
            >
              <MenuItem value="all">All</MenuItem>
              <MenuItem value="active">Active</MenuItem>
              <MenuItem value="pending">Pending ID</MenuItem>
              <MenuItem value="inactive">Deactivated</MenuItem>
            </Select>
          </FormControl>
        </Stack>
      </Stack>

      {listError ? (
        <Alert severity="error" sx={{ mb: 1.5 }}>
          {listError}
        </Alert>
      ) : null}
      {tableFeedback ? (
        <Alert severity={tableFeedback.severity} sx={{ mb: 1.5 }} onClose={onDismissFeedback}>
          {tableFeedback.text}
        </Alert>
      ) : null}

      <Box
        sx={{
          border: "1px solid",
          borderColor: "divider",
          borderRadius: 0,
          overflow: "hidden",
          bgcolor: "#fff",
          position: "relative",
          minHeight: 180,
        }}
      >
        {loading && employeesQuery.data ? (
          <Box
            sx={{
              position: "absolute",
              top: 8,
              right: 12,
              zIndex: 2,
            }}
          >
            <CircularProgress size={18} thickness={5} />
          </Box>
        ) : null}
        {showBlankLoader ? (
          <Stack
            alignItems="center"
            justifyContent="center"
            spacing={1}
            sx={{ py: 6, position: "absolute", inset: 0, zIndex: 2, bgcolor: "rgba(255,255,255,0.7)" }}
          >
            <CircularProgress size={28} />
            <Typography variant="body2" color="text.secondary" fontWeight={650}>
              Loading page…
            </Typography>
          </Stack>
        ) : null}
        <Box sx={{ overflowX: "auto" }}>
          <Table size="small">
            <TableHead>
              <TableRow>
                <TableCell>Employee</TableCell>
                <TableCell>ID</TableCell>
                <TableCell>Department</TableCell>
                <TableCell>Mobile invite</TableCell>
                <TableCell>Status</TableCell>
                <TableCell>Onboarding</TableCell>
                <TableCell align="right">Actions</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {!showBlankLoader && rows.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={7} align="center" sx={{ py: 5 }}>
                    <Typography color="text.secondary">No employees match these filters</Typography>
                  </TableCell>
                </TableRow>
              ) : null}
              {rows.map((emp) => (
                <TableRow key={emp.email} hover>
                  <TableCell>
                    <Stack direction="row" spacing={1.25} alignItems="center">
                      <Avatar
                        sx={{
                          width: 34,
                          height: 34,
                          fontSize: 13,
                          fontWeight: 700,
                          bgcolor: avatarColor(emp.email || emp.name),
                        }}
                      >
                        {initials(emp.name)}
                      </Avatar>
                      <Box sx={{ minWidth: 0 }}>
                        <Typography variant="body2" fontWeight={700} noWrap>
                          {emp.name}
                        </Typography>
                        <Typography variant="caption" color="text.secondary" noWrap>
                          {emp.email}
                        </Typography>
                      </Box>
                    </Stack>
                  </TableCell>
                  <TableCell>
                    <Stack direction="row" alignItems="center" spacing={0.5}>
                      <Typography variant="body2" fontWeight={650}>
                        {emp.idAssigned === false ? "—" : emp.id}
                      </Typography>
                      {emp.idAssigned !== false ? (
                        <Tooltip title="Copy ID">
                          <IconButton size="small" onClick={() => onCopyId(emp.id)}>
                            <ContentCopy fontSize="inherit" />
                          </IconButton>
                        </Tooltip>
                      ) : null}
                    </Stack>
                  </TableCell>
                  <TableCell>{emp.department || "—"}</TableCell>
                  <TableCell>
                    {emp.inviteCode ? (
                      <Stack direction="row" alignItems="center" spacing={0.5}>
                        <Chip size="small" label={emp.inviteCode} variant="outlined" sx={{ borderRadius: 1 }} />
                        <Tooltip title="Copy invite code">
                          <IconButton size="small" onClick={() => onCopyInviteCode(emp.inviteCode!)}>
                            <ContentCopy fontSize="inherit" />
                          </IconButton>
                        </Tooltip>
                      </Stack>
                    ) : (
                      <Button
                        size="small"
                        variant="text"
                        disabled={isSaving || loading}
                        onClick={() => void onGenerateInvite(emp.email, emp.name)}
                        sx={{ textTransform: "none" }}
                      >
                        Generate
                      </Button>
                    )}
                  </TableCell>
                  <TableCell>
                    <Chip
                      size="small"
                      color={emp.active ? "success" : "default"}
                      label={emp.active ? "Active" : "Deactivated"}
                      sx={{ borderRadius: 1 }}
                    />
                  </TableCell>
                  <TableCell>
                    {emp.idAssigned === false ? (
                      <Chip size="small" color="warning" label="Pending ID" sx={{ borderRadius: 1 }} />
                    ) : (
                      <Chip
                        size="small"
                        color={emp.onboarded ? "primary" : "warning"}
                        label={emp.onboarded ? "Completed" : "Pending"}
                        sx={{ borderRadius: 1 }}
                      />
                    )}
                  </TableCell>
                  <TableCell align="right">
                    {emp.idAssigned !== false ? (
                      <Button
                        size="small"
                        variant="outlined"
                        disabled={isSaving || loading}
                        onClick={() => void onResetLogin(emp.email, emp.id)}
                        sx={{ textTransform: "none" }}
                      >
                        Reset login
                      </Button>
                    ) : (
                      <Typography variant="caption" color="text.secondary">
                        Assign ID first
                      </Typography>
                    )}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </Box>

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
            ".MuiTablePagination-toolbar": { flexWrap: "wrap", gap: 0.5 },
          }}
        />
      </Box>
    </Box>
  );
}
