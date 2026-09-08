import Add from "@mui/icons-material/Add";
import DeleteOutline from "@mui/icons-material/DeleteOutline";
import PolicyOutlined from "@mui/icons-material/PolicyOutlined";
import {
  Alert,
  Box,
  Button,
  Card,
  CardContent,
  Chip,
  IconButton,
  MenuItem,
  Stack,
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableRow,
  TextField,
  Tooltip,
  Typography,
} from "@mui/material";
import dayjs from "dayjs";
import { useEffect, useReducer, useState } from "react";
import { adminApi, type PolicyPreviewResponse } from "../../api/adminApi";
import { POLICY_CATEGORIES } from "../../constants/policyCategories";
import { useAdminData } from "../../context/AdminDataContext";
import type { ExpensePolicy } from "../../types";

const weekdayOptions = [
  { label: "Mon", value: 1 },
  { label: "Tue", value: 2 },
  { label: "Wed", value: 3 },
  { label: "Thu", value: 4 },
  { label: "Fri", value: 5 },
  { label: "Sat", value: 6 },
  { label: "Sun", value: 0 },
];

const categoryLabel = (value: string) =>
  POLICY_CATEGORIES.find((c) => c.value === value)?.label ?? value;

export const AdminPoliciesPage = () => {
  const { policies, createPolicy, deletePolicy, isSaving, errorMessage } = useAdminData();
  const [createdInfo, setCreatedInfo] = useState("");
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [preview, dispatchPreview] = useReducer(
    (
      state: {
        serverPreview: PolicyPreviewResponse | null;
        previewLoading: boolean;
        previewError: string;
      },
      action:
        | { type: "start" }
        | { type: "success"; data: PolicyPreviewResponse }
        | { type: "error"; message: string }
        | { type: "finish" }
    ) => {
      switch (action.type) {
        case "start":
          return { ...state, previewLoading: true, previewError: "" };
        case "success":
          return { ...state, serverPreview: action.data };
        case "error":
          return { ...state, previewError: action.message };
        case "finish":
          return { ...state, previewLoading: false };
        default:
          return state;
      }
    },
    { serverPreview: null, previewLoading: false, previewError: "" }
  );
  const [policy, setPolicy] = useState<ExpensePolicy>(() => ({
    id: "POL-draft",
    name: "",
    mccCategory: "food",
    maxPerTransaction: 10000,
    maxPerMonth: 40000,
    allowedDays: [1, 2, 3, 4, 5],
    scopeType: "all",
    scopeValue: "",
    startDate: dayjs().format("YYYY-MM-DD"),
    endDate: "",
    active: true,
  }));

  useEffect(() => {
    if (!policy.name.trim()) {
      return;
    }
    const t = window.setTimeout(() => {
      dispatchPreview({ type: "start" });
      adminApi
        .previewPolicy(policy)
        .then((r) => dispatchPreview({ type: "success", data: r }))
        .catch((e) => dispatchPreview({ type: "error", message: (e as Error).message }))
        .finally(() => dispatchPreview({ type: "finish" }));
    }, 450);
    return () => clearTimeout(t);
  }, [policy]);

  const scopeNeedsValue = policy.scopeType !== "all";
  const canActivate =
    policy.name.trim().length > 0 && (!scopeNeedsValue || Boolean(policy.scopeValue?.trim()));

  return (
    <Stack spacing={2.5}>
      <Card sx={{ borderRadius: 3 }}>
        <CardContent>
          <Stack direction="row" spacing={1} alignItems="center">
            <PolicyOutlined color="primary" />
            <Typography variant="h5">
              Expense policies
            </Typography>
          </Stack>
          <Typography color="text.secondary">
            Configure spend limits by category (food, fuel, travel, etc.). Active policies are enforced in the employee app and on transaction sync.
          </Typography>
        </CardContent>
      </Card>

      <Card sx={{ borderRadius: 3 }}>
        <CardContent>
          <Typography variant="h6" fontWeight={700} mb={1.5}>
            Create policy
          </Typography>
          <Stack direction={{ xs: "column", md: "row" }} spacing={1}>
            <TextField
              label="Policy name"
              value={policy.name}
              onChange={(e) => setPolicy({ ...policy, name: e.target.value })}
            />
            <TextField
              select
              label="Category"
              value={policy.mccCategory}
              onChange={(e) => setPolicy({ ...policy, mccCategory: e.target.value })}
            >
              {POLICY_CATEGORIES.map((cat) => (
                <MenuItem key={cat.value} value={cat.value}>
                  {cat.label}
                </MenuItem>
              ))}
            </TextField>
            <TextField
              type="number"
              label="Max per transaction"
              value={policy.maxPerTransaction}
              onChange={(e) => setPolicy({ ...policy, maxPerTransaction: Number(e.target.value) })}
            />
            <TextField
              type="number"
              label="Max per month"
              value={policy.maxPerMonth}
              onChange={(e) => setPolicy({ ...policy, maxPerMonth: Number(e.target.value) })}
            />
          </Stack>
          <Stack direction={{ xs: "column", md: "row" }} spacing={1} mt={1}>
            <TextField
              select
              label="Scope type"
              value={policy.scopeType}
              onChange={(e) =>
                setPolicy({ ...policy, scopeType: e.target.value as ExpensePolicy["scopeType"] })
              }
            >
              <MenuItem value="all">All employees</MenuItem>
              <MenuItem value="department">Department</MenuItem>
              <MenuItem value="employee">Individual employee</MenuItem>
            </TextField>
            <TextField
              label="Scope value"
              disabled={!scopeNeedsValue}
              helperText={scopeNeedsValue ? "Department name or employee ID" : "Not required for all employees"}
              value={policy.scopeValue || ""}
              onChange={(e) => setPolicy({ ...policy, scopeValue: e.target.value })}
            />
            <TextField
              type="date"
              label="Start date"
              InputLabelProps={{ shrink: true }}
              value={policy.startDate}
              onChange={(e) => setPolicy({ ...policy, startDate: e.target.value })}
            />
            <TextField
              type="date"
              label="End date"
              InputLabelProps={{ shrink: true }}
              value={policy.endDate || ""}
              onChange={(e) => setPolicy({ ...policy, endDate: e.target.value })}
            />
          </Stack>
          <Stack direction="row" spacing={1} mt={1.2} flexWrap="wrap">
            {weekdayOptions.map((day) => (
              <Chip
                key={day.value}
                clickable
                color={policy.allowedDays.includes(day.value) ? "primary" : "default"}
                label={day.label}
                onClick={() =>
                  setPolicy((prev) => ({
                    ...prev,
                    allowedDays: prev.allowedDays.includes(day.value)
                      ? prev.allowedDays.filter((item) => item !== day.value)
                      : [...prev.allowedDays, day.value],
                  }))
                }
              />
            ))}
          </Stack>
          <Stack direction="row" spacing={1} mt={2}>
            <Button
              variant="contained"
              startIcon={<Add />}
              disabled={isSaving || !canActivate}
              onClick={async () => {
                setCreatedInfo("");
                try {
                  const draft = {
                    ...policy,
                    id: "",
                    name: policy.name.trim(),
                    scopeValue: scopeNeedsValue ? policy.scopeValue?.trim() : "",
                  };
                  const prev = await adminApi.previewPolicy(draft);
                  await createPolicy(draft);
                  setCreatedInfo(
                    `Policy "${draft.name}" activated. Server preview: ${prev.wouldFlagCount} transactions would have been flagged; ${prev.affectedEmployeeCount} employees affected.`
                  );
                  setPolicy((p) => ({
                    ...p,
                    id: "POL-draft",
                    name: "",
                  }));
                } catch {
                  /* errorMessage shown below */
                }
              }}
            >
              Activate policy
            </Button>
            <Chip
              color="warning"
              label={
                preview.previewLoading
                  ? "Server preview…"
                  : `Server preview: ${preview.serverPreview?.wouldFlagCount ?? "—"} matches`
              }
            />
            {preview.serverPreview != null && !preview.previewLoading ? (
              <Chip
                color="info"
                label={`Employees: ${preview.serverPreview.affectedEmployeeCount} · Est. savings: Rs.${preview.serverPreview.estimatedSavingsIfRejected.toLocaleString("en-IN")}`}
              />
            ) : null}
          </Stack>
          {preview.previewError ? (
            <Alert severity="warning" sx={{ mt: 1 }}>
              {preview.previewError}
            </Alert>
          ) : null}
          {createdInfo && <Alert sx={{ mt: 1.4 }}>{createdInfo}</Alert>}
          {errorMessage ? (
            <Alert severity="error" sx={{ mt: 1.2 }}>
              {errorMessage}
            </Alert>
          ) : null}
        </CardContent>
      </Card>

      <Card sx={{ borderRadius: 3 }}>
        <CardContent>
          <Typography variant="h6" fontWeight={700} mb={1}>
            Active policies
          </Typography>
          <Table size="small">
            <TableHead>
              <TableRow>
                <TableCell>Name</TableCell>
                <TableCell>Category</TableCell>
                <TableCell>Scope</TableCell>
                <TableCell>Caps</TableCell>
                <TableCell>Effective range</TableCell>
                <TableCell align="right">Actions</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {policies.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={6}>
                    <Typography variant="body2" color="text.secondary">
                      No policies yet. Create a food expense limit or spend cap above.
                    </Typography>
                  </TableCell>
                </TableRow>
              ) : (
                policies.map((item) => (
                  <TableRow key={item.id}>
                    <TableCell>{item.name}</TableCell>
                    <TableCell>{categoryLabel(item.mccCategory)}</TableCell>
                    <TableCell>
                      {item.scopeType === "all" ? "All" : `${item.scopeType}: ${item.scopeValue}`}
                    </TableCell>
                    <TableCell>
                      Rs.{item.maxPerTransaction} / Rs.{item.maxPerMonth}
                    </TableCell>
                    <TableCell>
                      {item.startDate} to {item.endDate || "Open-ended"}
                    </TableCell>
                    <TableCell align="right">
                      <Tooltip title="Delete policy">
                        <span>
                          <IconButton
                            size="small"
                            color="error"
                            disabled={isSaving || deletingId === item.id}
                            onClick={async () => {
                              if (!window.confirm(`Delete policy "${item.name}"?`)) return;
                              setDeletingId(item.id);
                              try {
                                await deletePolicy(item.id);
                                setCreatedInfo(`Policy "${item.name}" deleted.`);
                              } catch {
                                /* error shown via context */
                              } finally {
                                setDeletingId(null);
                              }
                            }}
                          >
                            <DeleteOutline fontSize="small" />
                          </IconButton>
                        </span>
                      </Tooltip>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
          <Box mt={1}>
            <Typography variant="caption" color="text.secondary">
              Conflict resolution: most restrictive matching policy applies. Deleted policies stop enforcing immediately in the employee app.
            </Typography>
          </Box>
        </CardContent>
      </Card>
    </Stack>
  );
};
