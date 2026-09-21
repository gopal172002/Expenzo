import CloudOutlined from "@mui/icons-material/CloudOutlined";
import DeleteOutline from "@mui/icons-material/DeleteOutline";
import EditOutlined from "@mui/icons-material/EditOutlined";
import HubOutlined from "@mui/icons-material/HubOutlined";
import ScheduleOutlined from "@mui/icons-material/ScheduleOutlined";
import PeopleAltOutlined from "@mui/icons-material/PeopleAltOutlined";
import PlayArrowOutlined from "@mui/icons-material/PlayArrowOutlined";
import LockOutlined from "@mui/icons-material/LockOutlined";
import {
  Alert,
  Box,
  Button,
  Chip,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  Divider,
  FormControl,
  FormControlLabel,
  IconButton,
  InputLabel,
  MenuItem,
  Select,
  Stack,
  Switch,
  Tab,
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableRow,
  Tabs,
  TextField,
  Tooltip,
  Typography,
} from "@mui/material";
import dayjs from "dayjs";
import { useEffect, useMemo, useState } from "react";
import {
  adminConsoleApi,
  type AdminConsolePlatformResponse,
  type ConnectionCategory,
  type PlatformConfig,
  type PlatformConnection,
  type ScheduledJob,
  type ScheduledJobType,
} from "../../api/adminConsoleApi";
import { AdminCard, AdminPage, AdminPageLoader } from "../../components/admin/ui";
import { AdminStatusChip } from "../../components/admin/AdminStatusChip";
import { useAuth } from "../../context/AuthContext";
import type { AdminRole, AdminUser } from "../../types";

const ROLE_LABELS: Record<AdminRole, string> = {
  super_admin: "Super Admin",
  finance_manager: "Finance Manager",
  hr_manager: "HR Manager",
  auditor: "Auditor",
};

const ROLE_SUMMARY: Record<AdminRole, string> = {
  super_admin: "Full access, including this console. Read and write are locked on.",
  finance_manager: "Approves claims, edits policies, and runs exports.",
  hr_manager: "Manages employees, departments, and onboarding.",
  auditor: "Read-only access for audit and reporting.",
};

const CONNECTOR_BY_CATEGORY: Record<ConnectionCategory, { value: string; label: string }[]> = {
  data_warehouse: [
    { value: "snowflake", label: "Snowflake" },
    { value: "bigquery", label: "BigQuery" },
    { value: "databricks", label: "Databricks" },
    { value: "redshift", label: "Amazon Redshift" },
  ],
  cloud_storage: [
    { value: "local_disk", label: "Local disk (this server)" },
    { value: "s3", label: "Amazon S3" },
    { value: "gcs", label: "Google Cloud Storage" },
    { value: "azure_blob", label: "Azure Blob Storage" },
  ],
  relational_database: [
    { value: "postgres", label: "PostgreSQL" },
    { value: "mysql", label: "MySQL" },
    { value: "sqlite", label: "SQLite" },
  ],
};

const CATEGORY_LABELS: Record<ConnectionCategory, string> = {
  data_warehouse: "Data warehouse",
  cloud_storage: "Cloud storage",
  relational_database: "Relational database",
};

const JOB_TYPE_LABELS: Record<ScheduledJobType, string> = {
  receipt_ingestion: "Receipt ingestion",
  quality_checks: "Data quality checks",
  warehouse_sync: "Warehouse sync",
  fraud_rescan: "Fraud re-scan",
};

const CATEGORY_FIELDS: Record<ConnectionCategory, { key: string; label: string; required?: boolean }[]> = {
  data_warehouse: [
    { key: "account", label: "Snowflake account", required: true },
    { key: "warehouse", label: "Compute warehouse", required: true },
    { key: "database", label: "Database", required: true },
    { key: "schema", label: "Schema" },
    { key: "username", label: "Username" },
    { key: "role", label: "Role" },
  ],
  cloud_storage: [
    { key: "bucket", label: "S3 bucket / folder name", required: true },
    { key: "region", label: "Region" },
    { key: "prefix", label: "Landing path prefix (e.g. allpay)" },
    { key: "endpoint", label: "Custom endpoint (LocalStack)" },
    { key: "accessKeyId", label: "Access key (optional if env set)" },
    { key: "secretAccessKey", label: "Secret key (optional if env set)" },
  ],
  relational_database: [
    { key: "host", label: "Host", required: true },
    { key: "port", label: "Port" },
    { key: "database", label: "Database" },
    { key: "username", label: "Username" },
  ],
};

const emptyUser = (): Partial<AdminUser> => ({
  id: "",
  name: "",
  email: "",
  role: "finance_manager",
  active: true,
  twoFactor: true,
  canRead: true,
  canWrite: true,
});

function statusChip(status: PlatformConnection["status"]) {
  if (status === "connected") return <AdminStatusChip status="connected" />;
  if (status === "error") return <AdminStatusChip status="needs_attention" />;
  return <AdminStatusChip status="not_tested" />;
}

export function AdminConsolePage() {
  const { user } = useAuth();
  const [tab, setTab] = useState(0);
  const [users, setUsers] = useState<AdminUser[]>([]);
  const [activeSuperAdmins, setActiveSuperAdmins] = useState(0);
  const [platform, setPlatform] = useState<AdminConsolePlatformResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const [reloadToken, setReloadToken] = useState(0);
  const [userDialog, setUserDialog] = useState<Partial<AdminUser> | null>(null);
  const [connectionDialog, setConnectionDialog] = useState<Partial<PlatformConnection> | null>(null);
  const [jobDialog, setJobDialog] = useState<Partial<ScheduledJob> | null>(null);

  useEffect(() => {
    let cancelled = false;
    void (async () => {
      try {
        const [userRes, platformRes] = await Promise.all([
          adminConsoleApi.getUsers(),
          adminConsoleApi.getPlatform(),
        ]);
        if (cancelled) return;
        setUsers(userRes.users);
        setActiveSuperAdmins(userRes.activeSuperAdmins);
        setPlatform(platformRes);
        setError("");
      } catch (e) {
        if (!cancelled) setError((e as Error).message);
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [reloadToken]);

  const run = async (action: () => Promise<string>) => {
    setError("");
    setNotice("");
    try {
      const message = await action();
      setNotice(message);
      setReloadToken((token) => token + 1);
    } catch (e) {
      setError((e as Error).message);
    }
  };

  if (loading) {
    return (
      <AdminPage title="Admin console" description="Workspace users, receipt storage, export destinations, and jobs that actually run on a cron.">
        <AdminPageLoader label="Loading Admin Console…" />
      </AdminPage>
    );
  }

  return (
    <AdminPage
      title="Admin console"
      description="Workspace users, receipt storage, export destinations, and jobs that actually run on a cron."
      alert={
        <>
          {error ? (
            <Alert severity="error" onClose={() => setError("")}>
              {error}
            </Alert>
          ) : null}
          {notice ? (
            <Alert severity="success" onClose={() => setNotice("")}>
              {notice}
            </Alert>
          ) : null}
        </>
      }
    >
      <AdminCard variant="flush">
        <Tabs
          value={tab}
          onChange={(_, next) => setTab(next)}
          variant="scrollable"
          scrollButtons="auto"
          sx={{ px: 2, borderBottom: 1, borderColor: "divider" }}
        >
          <Tab icon={<PeopleAltOutlined />} iconPosition="start" label="User management" />
          <Tab icon={<CloudOutlined />} iconPosition="start" label="Receipt storage" />
          <Tab icon={<HubOutlined />} iconPosition="start" label="Destinations" />
          <Tab icon={<ScheduleOutlined />} iconPosition="start" label="Scheduler" />
        </Tabs>

        <Box sx={{ p: 2 }}>
          {tab === 0 ? (
            <UserManagementTab
              users={users}
              activeSuperAdmins={activeSuperAdmins}
              currentEmail={user?.email ?? ""}
              onEdit={setUserDialog}
              onAdd={() => setUserDialog(emptyUser())}
              onToggle={(id, name, active) =>
                run(async () => {
                  await adminConsoleApi.toggleUser(id);
                  return `${name} is now ${active ? "inactive" : "active"}.`;
                })
              }
              onPermission={(id, name, permissions) =>
                run(async () => {
                  await adminConsoleApi.setPermissions(id, permissions);
                  return `Updated access for ${name}.`;
                })
              }
              onDelete={(id, name) =>
                run(async () => {
                  await adminConsoleApi.deleteUser(id);
                  return `Removed ${name}.`;
                })
              }
            />
          ) : null}

          {tab === 1 && platform ? (
            <PlatformConfigurationTab
              key={platform.config.updatedAt}
              config={platform.config}
              options={platform.options}
              onSave={(next) =>
                run(async () => {
                  await adminConsoleApi.savePlatform(next);
                  return "Platform configuration saved.";
                })
              }
            />
          ) : null}

          {tab === 2 && platform ? (
            <ConnectionManagerTab
              connections={platform.connections}
              onAdd={() =>
                setConnectionDialog({ category: "cloud_storage", connector: "local_disk", config: {} })
              }
              onEdit={setConnectionDialog}
              onTest={(id, name) =>
                run(async () => {
                  const result = await adminConsoleApi.testConnection(id);
                  return `${name}: ${result.message}`;
                })
              }
              onDelete={(id, name) =>
                run(async () => {
                  await adminConsoleApi.deleteConnection(id);
                  return `Removed connection ${name}.`;
                })
              }
            />
          ) : null}

          {tab === 3 && platform ? (
            <SchedulerTab
              jobs={platform.jobs}
              ingestionMode={platform.config.ingestionMode}
              onAdd={() =>
                setJobDialog({ jobType: "receipt_ingestion", cron: "0 */2 * * *", enabled: true })
              }
              onEdit={setJobDialog}
              onToggle={(id, name, enabled) =>
                run(async () => {
                  await adminConsoleApi.toggleJob(id);
                  return `${name} is now ${enabled ? "paused" : "running on schedule"}.`;
                })
              }
              onRun={(id, name) =>
                run(async () => {
                  const result = await adminConsoleApi.runJob(id);
                  return `${name}: ${result.message}`;
                })
              }
              onDelete={(id, name) =>
                run(async () => {
                  await adminConsoleApi.deleteJob(id);
                  return `Removed job ${name}.`;
                })
              }
            />
          ) : null}
        </Box>
      </AdminCard>

      {userDialog ? (
        <UserDialog
          key={`user-${userDialog.id ?? "new"}-${reloadToken}`}
          value={userDialog}
          onClose={() => setUserDialog(null)}
          onSave={(next) =>
            run(async () => {
              await adminConsoleApi.saveUser(next);
              setUserDialog(null);
              return `Saved ${next.name}.`;
            })
          }
        />
      ) : null}

      {connectionDialog ? (
        <ConnectionDialog
          key={`connection-${connectionDialog.id ?? "new"}-${reloadToken}`}
          value={connectionDialog}
          onClose={() => setConnectionDialog(null)}
          onSave={(next) =>
            run(async () => {
              await adminConsoleApi.saveConnection(next);
              setConnectionDialog(null);
              return `Saved connection ${next.name}.`;
            })
          }
        />
      ) : null}

      {jobDialog ? (
        <JobDialog
          key={`job-${jobDialog.id ?? "new"}-${reloadToken}`}
          value={jobDialog}
          onClose={() => setJobDialog(null)}
          onSave={(next) =>
            run(async () => {
              await adminConsoleApi.saveJob(next);
              setJobDialog(null);
              return `Saved job ${next.name}.`;
            })
          }
        />
      ) : null}
    </AdminPage>
  );
}

function UserManagementTab({
  users,
  activeSuperAdmins,
  currentEmail,
  onAdd,
  onEdit,
  onToggle,
  onPermission,
  onDelete,
}: {
  users: AdminUser[];
  activeSuperAdmins: number;
  currentEmail: string;
  onAdd: () => void;
  onEdit: (user: AdminUser) => void;
  onToggle: (id: string, name: string, active: boolean) => void;
  onPermission: (id: string, name: string, permissions: { canRead?: boolean; canWrite?: boolean }) => void;
  onDelete: (id: string, name: string) => void;
}) {
  return (
    <Stack spacing={2}>
      <Stack direction={{ xs: "column", sm: "row" }} justifyContent="space-between" spacing={1.5}>
        <Box>
          <Typography fontWeight={600}>Workspace users</Typography>
          <Typography variant="body2" color="text.secondary">
            Super Admin keeps read and write permanently enabled. At least one active Super Admin must remain.
            Sessions expire after 30 minutes of inactivity. 2FA is recorded per user; TOTP enrolment is enforced
            at sign-in when the flag is on.
          </Typography>
        </Box>
        <Button variant="contained" onClick={onAdd} sx={{ alignSelf: "flex-start" }}>
          Add user
        </Button>
      </Stack>

      <Box
        sx={{
          display: "grid",
          gridTemplateColumns: { xs: "1fr", md: "repeat(2, 1fr)" },
          gap: 1,
        }}
      >
        {(Object.keys(ROLE_SUMMARY) as AdminRole[]).map((role) => (
          <Box key={role} sx={{ border: "1px solid", borderColor: "divider", borderRadius: 1.5, p: 1.25 }}>
            <Typography variant="body2" fontWeight={600}>
              {ROLE_LABELS[role]}
            </Typography>
            <Typography variant="caption" color="text.secondary">
              {ROLE_SUMMARY[role]}
            </Typography>
          </Box>
        ))}
      </Box>

      {activeSuperAdmins <= 1 ? (
        <Alert severity="info">
          Only one active Super Admin remains. Add another before deactivating or downgrading this account.
        </Alert>
      ) : null}

      <Box sx={{ overflowX: "auto" }}>
        <Table size="small">
          <TableHead>
            <TableRow>
              <TableCell>User</TableCell>
              <TableCell>Email</TableCell>
              <TableCell>Role</TableCell>
              <TableCell align="center">2FA</TableCell>
              <TableCell align="center">Active</TableCell>
              <TableCell align="center">Read</TableCell>
              <TableCell align="center">Write</TableCell>
              <TableCell align="right">Actions</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {users.length === 0 ? (
              <TableRow>
                <TableCell colSpan={8}>
                  <Typography color="text.secondary">No admin users yet.</Typography>
                </TableCell>
              </TableRow>
            ) : (
              users.map((admin) => {
                const locked = admin.role === "super_admin";
                const isSelf = admin.email.toLowerCase() === currentEmail.toLowerCase();
                return (
                  <TableRow key={admin.id} hover>
                    <TableCell>
                      <Typography fontWeight={600}>{admin.name}</Typography>
                      <Typography variant="caption" color="text.secondary">
                        {admin.id}
                        {isSelf ? " · you" : ""}
                      </Typography>
                    </TableCell>
                    <TableCell>{admin.email}</TableCell>
                    <TableCell>
                      <Chip
                        size="small"
                        color={locked ? "primary" : "default"}
                        label={ROLE_LABELS[admin.role] ?? admin.role}
                      />
                    </TableCell>
                    <TableCell align="center">
                      <Chip
                        icon={<LockOutlined />}
                        size="small"
                        color={admin.twoFactor ? "success" : "default"}
                        variant={admin.twoFactor ? "filled" : "outlined"}
                        label={admin.twoFactor ? "On" : "Off"}
                      />
                    </TableCell>
                    <TableCell align="center">
                      <Tooltip
                        title={
                          isSelf
                            ? "You cannot deactivate your own account"
                            : admin.active
                              ? "Deactivate this user"
                              : "Activate this user"
                        }
                      >
                        <span>
                          <Switch
                            size="small"
                            disabled={isSelf}
                            checked={admin.active}
                            onChange={() => onToggle(admin.id, admin.name, admin.active)}
                          />
                        </span>
                      </Tooltip>
                    </TableCell>
                    <TableCell align="center">
                      <Tooltip title={locked ? "Locked on for Super Admin" : "Allow viewing data"}>
                        <span>
                          <Switch
                            size="small"
                            disabled={locked}
                            checked={admin.canRead ?? true}
                            onChange={(e) =>
                              onPermission(admin.id, admin.name, { canRead: e.target.checked })
                            }
                          />
                        </span>
                      </Tooltip>
                    </TableCell>
                    <TableCell align="center">
                      <Tooltip
                        title={
                          locked
                            ? "Locked on for Super Admin"
                            : admin.role === "auditor"
                              ? "Auditors are read-only"
                              : "Allow approving and editing"
                        }
                      >
                        <span>
                          <Switch
                            size="small"
                            disabled={locked || admin.role === "auditor"}
                            checked={admin.canWrite ?? true}
                            onChange={(e) =>
                              onPermission(admin.id, admin.name, { canWrite: e.target.checked })
                            }
                          />
                        </span>
                      </Tooltip>
                    </TableCell>
                    <TableCell align="right">
                      <IconButton size="small" onClick={() => onEdit(admin)} aria-label={`Edit ${admin.name}`}>
                        <EditOutlined fontSize="small" />
                      </IconButton>
                      <IconButton
                        size="small"
                        disabled={isSelf}
                        onClick={() => onDelete(admin.id, admin.name)}
                        aria-label={`Remove ${admin.name}`}
                      >
                        <DeleteOutline fontSize="small" />
                      </IconButton>
                    </TableCell>
                  </TableRow>
                );
              })
            )}
          </TableBody>
        </Table>
      </Box>
    </Stack>
  );
}

function PlatformConfigurationTab({
  config,
  options,
  onSave,
}: {
  config: PlatformConfig;
  options: AdminConsolePlatformResponse["options"];
  onSave: (next: Partial<PlatformConfig>) => void;
}) {
  const [draft, setDraft] = useState<PlatformConfig>(config);

  const dirty = useMemo(() => JSON.stringify(draft) !== JSON.stringify(config), [draft, config]);

  return (
    <Stack spacing={2.5}>
      <Box>
        <Typography fontWeight={800}>Receipt storage</Typography>
        <Typography variant="body2" color="text.secondary">
          Where uploaded receipt images live. MongoDB works out of the box; S3 or GCS is recommended once
          volume grows, because receipts are large binary files.
        </Typography>
      </Box>
      <Stack direction={{ xs: "column", md: "row" }} spacing={2}>
        <FormControl size="small" sx={{ minWidth: 200 }}>
          <InputLabel>Storage backend</InputLabel>
          <Select
            label="Storage backend"
            value={draft.receiptStorage}
            onChange={(e) =>
              setDraft({ ...draft, receiptStorage: e.target.value as PlatformConfig["receiptStorage"] })
            }
          >
            {options.receiptStorage.map((mode) => (
              <MenuItem key={mode} value={mode}>
                {mode === "mongo" ? "MongoDB (built in)" : mode === "s3" ? "Amazon S3" : "Google Cloud Storage"}
              </MenuItem>
            ))}
          </Select>
        </FormControl>
        <TextField
          size="small"
          label="Bucket"
          value={draft.storageBucket ?? ""}
          onChange={(e) => setDraft({ ...draft, storageBucket: e.target.value })}
          disabled={draft.receiptStorage === "mongo"}
          sx={{ minWidth: 200 }}
        />
        <TextField
          size="small"
          label="Region"
          value={draft.storageRegion ?? ""}
          onChange={(e) => setDraft({ ...draft, storageRegion: e.target.value })}
          disabled={draft.receiptStorage === "mongo"}
          sx={{ minWidth: 160 }}
        />
        <TextField
          size="small"
          label="Public URL base"
          value={draft.storagePublicBase ?? ""}
          onChange={(e) => setDraft({ ...draft, storagePublicBase: e.target.value })}
          disabled={draft.receiptStorage === "mongo"}
          sx={{ flex: 1, minWidth: 220 }}
        />
      </Stack>

      <Divider />

      <Box>
        <Typography fontWeight={800}>Ingestion</Typography>
        <Typography variant="body2" color="text.secondary">
          Real time posts each receipt to the admin dashboard the moment an employee submits it. Scheduled
          batches submissions on a cron, which is cheaper at high volume but adds delay.
        </Typography>
      </Box>
      <Stack direction={{ xs: "column", md: "row" }} spacing={2}>
        <FormControl size="small" sx={{ minWidth: 200 }}>
          <InputLabel>Ingestion mode</InputLabel>
          <Select
            label="Ingestion mode"
            value={draft.ingestionMode}
            onChange={(e) =>
              setDraft({ ...draft, ingestionMode: e.target.value as PlatformConfig["ingestionMode"] })
            }
          >
            {options.ingestionModes.map((mode) => (
              <MenuItem key={mode} value={mode}>
                {mode === "realtime" ? "Real time (recommended)" : "Scheduled batch"}
              </MenuItem>
            ))}
          </Select>
        </FormControl>
        <TextField
          size="small"
          label="Batch schedule (cron)"
          value={draft.ingestionCron ?? ""}
          onChange={(e) => setDraft({ ...draft, ingestionCron: e.target.value })}
          disabled={draft.ingestionMode === "realtime"}
          helperText="Five fields, for example 0 */2 * * *"
          sx={{ minWidth: 220 }}
        />
        <TextField
          size="small"
          type="number"
          label="Receipt retention (days)"
          value={draft.retentionDays}
          onChange={(e) => setDraft({ ...draft, retentionDays: Number(e.target.value) })}
          helperText="Indian tax records are commonly kept 7 years"
          sx={{ minWidth: 200 }}
        />
      </Stack>

      <Stack direction="row" spacing={1} alignItems="center">
        <Button variant="contained" disabled={!dirty} onClick={() => onSave(draft)}>
          Save configuration
        </Button>
        <Button disabled={!dirty} onClick={() => setDraft(config)}>
          Discard changes
        </Button>
        {config.updatedAt ? (
          <Typography variant="caption" color="text.secondary">
            Last updated {dayjs(config.updatedAt).format("DD MMM YYYY HH:mm")}
            {config.updatedBy ? ` by ${config.updatedBy}` : ""}
          </Typography>
        ) : null}
      </Stack>
    </Stack>
  );
}

function connectorInitials(connector: string) {
  if (connector === "snowflake") return { abbr: "SF", color: "#2563EB" };
  if (connector === "databricks") return { abbr: "DB", color: "#F97316" };
  if (connector === "bigquery") return { abbr: "BQ", color: "#0EA5E9" };
  if (connector === "redshift") return { abbr: "RS", color: "#DC2626" };
  if (connector === "s3") return { abbr: "S3", color: "#D97706" };
  if (connector === "gcs") return { abbr: "GS", color: "#16A34A" };
  if (connector === "azure_blob") return { abbr: "AZ", color: "#2563EB" };
  if (connector === "local_disk") return { abbr: "FS", color: "#4B5563" };
  if (connector === "postgres") return { abbr: "PG", color: "#1D4ED8" };
  if (connector === "mysql") return { abbr: "MY", color: "#EA580C" };
  return { abbr: connector.slice(0, 2).toUpperCase(), color: "#6B7280" };
}

function ConnectionManagerTab({
  connections,
  onAdd,
  onEdit,
  onTest,
  onDelete,
}: {
  connections: PlatformConnection[];
  onAdd: () => void;
  onEdit: (connection: PlatformConnection) => void;
  onTest: (id: string, name: string) => void;
  onDelete: (id: string, name: string) => void;
}) {
  return (
    <Stack spacing={2}>
      <Stack direction={{ xs: "column", sm: "row" }} justifyContent="space-between" spacing={1.5}>
        <Box>
          <Typography fontWeight={600}>Destinations</Typography>
          <Typography variant="body2" color="text.secondary">
            Cloud storage and warehouse extracts this workspace writes to. Keep warehouse connectors here — they
            do not belong on the main claims sidebar. Test writes a probe file or validates required fields.
          </Typography>
        </Box>
        <Button variant="contained" onClick={onAdd} sx={{ alignSelf: "flex-start" }}>
          Add destination
        </Button>
      </Stack>

      {connections.length === 0 ? (
        <Alert severity="info">
          No destinations yet. Receipts stay in MongoDB until you add local disk, S3, or a warehouse extract.
        </Alert>
      ) : (
        <Box
          sx={{
            display: "grid",
            gridTemplateColumns: { xs: "1fr", md: "repeat(2, 1fr)" },
            gap: 1.25,
          }}
        >
          {connections.map((connection) => {
            const mark = connectorInitials(connection.connector);
            return (
              <Box
                key={connection.id}
                sx={{ border: "1px solid", borderColor: "divider", borderRadius: 2, p: 1.5 }}
              >
                <Stack direction="row" spacing={1.5} alignItems="flex-start">
                  <Box
                    sx={{
                      width: 40,
                      height: 40,
                      borderRadius: 1,
                      bgcolor: mark.color,
                      color: "#fff",
                      fontWeight: 700,
                      fontSize: 13,
                      display: "grid",
                      placeItems: "center",
                      flexShrink: 0,
                    }}
                  >
                    {mark.abbr}
                  </Box>
                  <Box sx={{ minWidth: 0, flex: 1 }}>
                    <Stack direction="row" spacing={1} alignItems="center">
                      <Typography fontWeight={600} noWrap>
                        {connection.name}
                      </Typography>
                      {statusChip(connection.status)}
                    </Stack>
                    <Typography variant="caption" color="text.secondary">
                      {CATEGORY_LABELS[connection.category]} · {connection.connector}
                    </Typography>
                    <Typography variant="body2" color="text.secondary" sx={{ mt: 0.5 }}>
                      {connection.description || "Connection to this destination."}
                    </Typography>
                    <Typography variant="caption" color="text.secondary">
                      Last tested{" "}
                      {connection.lastTestedAt ? dayjs(connection.lastTestedAt).format("DD MMM HH:mm") : "never"}
                    </Typography>
                  </Box>
                </Stack>
                <Stack direction="row" spacing={0.5} justifyContent="flex-end" sx={{ mt: 1 }}>
                  <Button size="small" onClick={() => onTest(connection.id, connection.name)}>
                    Test
                  </Button>
                  <IconButton size="small" onClick={() => onEdit(connection)} aria-label={`Edit ${connection.name}`}>
                    <EditOutlined fontSize="small" />
                  </IconButton>
                  <IconButton
                    size="small"
                    onClick={() => onDelete(connection.id, connection.name)}
                    aria-label={`Remove ${connection.name}`}
                  >
                    <DeleteOutline fontSize="small" />
                  </IconButton>
                </Stack>
              </Box>
            );
          })}
        </Box>
      )}
    </Stack>
  );
}

function SchedulerTab({
  jobs,
  ingestionMode,
  onAdd,
  onEdit,
  onToggle,
  onRun,
  onDelete,
}: {
  jobs: ScheduledJob[];
  ingestionMode: PlatformConfig["ingestionMode"];
  onAdd: () => void;
  onEdit: (job: ScheduledJob) => void;
  onToggle: (id: string, name: string, enabled: boolean) => void;
  onRun: (id: string, name: string) => void;
  onDelete: (id: string, name: string) => void;
}) {
  return (
    <Stack spacing={2}>
      <Stack direction={{ xs: "column", sm: "row" }} justifyContent="space-between" spacing={1.5}>
        <Box>
          <Typography fontWeight={600}>Scheduled jobs</Typography>
          <Typography variant="body2" color="text.secondary">
            The API process runs these on cron. Use Run now to execute immediately and write warehouse extracts
            to the server data folder.
          </Typography>
        </Box>
        <Button variant="contained" onClick={onAdd} sx={{ alignSelf: "flex-start" }}>
          Add job
        </Button>
      </Stack>

      {ingestionMode === "realtime" ? (
        <Alert severity="info">
          Ingestion is set to real time, so receipts reach the admin dashboard immediately. Jobs below still run
          for quality checks, warehouse sync, and re-scans.
        </Alert>
      ) : null}

      {jobs.length === 0 ? (
        <Alert severity="info">No scheduled jobs configured.</Alert>
      ) : (
        <Box sx={{ overflowX: "auto" }}>
          <Table size="small">
            <TableHead>
              <TableRow>
                <TableCell>Job</TableCell>
                <TableCell>Type</TableCell>
                <TableCell>Schedule</TableCell>
                <TableCell align="center">Enabled</TableCell>
                <TableCell>Last run</TableCell>
                <TableCell align="right">Actions</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {jobs.map((job) => (
                <TableRow key={job.id} hover>
                  <TableCell>
                    <Typography fontWeight={700}>{job.name}</Typography>
                    <Typography variant="caption" color="text.secondary">
                      {job.id}
                    </Typography>
                  </TableCell>
                  <TableCell>{JOB_TYPE_LABELS[job.jobType] ?? job.jobType}</TableCell>
                  <TableCell>
                    <code>{job.cron}</code>
                  </TableCell>
                  <TableCell align="center">
                    <Switch
                      size="small"
                      checked={job.enabled}
                      onChange={() => onToggle(job.id, job.name, job.enabled)}
                    />
                  </TableCell>
                  <TableCell>
                    {job.lastRunAt ? (
                      <>
                        <Typography variant="body2">
                          {dayjs(job.lastRunAt).format("DD MMM HH:mm")}
                          {job.lastRunRows != null ? ` · ${job.lastRunRows} rows` : ""}
                        </Typography>
                        <Typography variant="caption" color="text.secondary">
                          {job.lastRunMessage || job.lastRunStatus || ""}
                        </Typography>
                      </>
                    ) : (
                      "Not run yet"
                    )}
                  </TableCell>
                  <TableCell align="right">
                    <Tooltip title="Run now">
                      <IconButton size="small" onClick={() => onRun(job.id, job.name)} aria-label={`Run ${job.name}`}>
                        <PlayArrowOutlined fontSize="small" />
                      </IconButton>
                    </Tooltip>
                    <IconButton size="small" onClick={() => onEdit(job)} aria-label={`Edit ${job.name}`}>
                      <EditOutlined fontSize="small" />
                    </IconButton>
                    <IconButton
                      size="small"
                      onClick={() => onDelete(job.id, job.name)}
                      aria-label={`Remove ${job.name}`}
                    >
                      <DeleteOutline fontSize="small" />
                    </IconButton>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </Box>
      )}
    </Stack>
  );
}

function UserDialog({
  value,
  onClose,
  onSave,
}: {
  value: Partial<AdminUser>;
  onClose: () => void;
  onSave: (user: Partial<AdminUser>) => void;
}) {
  const [draft, setDraft] = useState<Partial<AdminUser>>(value);

  const role = (draft.role ?? "finance_manager") as AdminRole;
  const locked = role === "super_admin";
  const valid = Boolean(draft.name?.trim()) && /^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(draft.email ?? "");

  return (
    <Dialog open onClose={onClose} fullWidth maxWidth="sm">
      <DialogTitle>{draft.id ? "Edit user" : "Add user"}</DialogTitle>
      <DialogContent>
        <Stack spacing={2} sx={{ mt: 1 }}>
          <TextField
            label="Display name"
            required
            value={draft.name ?? ""}
            onChange={(e) => setDraft({ ...draft, name: e.target.value })}
            fullWidth
          />
          <TextField
            label="Email"
            required
            type="email"
            value={draft.email ?? ""}
            onChange={(e) => setDraft({ ...draft, email: e.target.value })}
            helperText="This is the address they sign in with."
            fullWidth
          />
          <FormControl fullWidth>
            <InputLabel>Role</InputLabel>
            <Select
              label="Role"
              value={role}
              onChange={(e) => setDraft({ ...draft, role: e.target.value as AdminRole })}
            >
              {(Object.keys(ROLE_LABELS) as AdminRole[]).map((key) => (
                <MenuItem key={key} value={key}>
                  {ROLE_LABELS[key]}
                </MenuItem>
              ))}
            </Select>
          </FormControl>
          <Alert severity="info">{ROLE_SUMMARY[role]}</Alert>
          <Stack direction="row" spacing={2}>
            <FormControlLabel
              control={
                <Switch
                  checked={draft.active ?? true}
                  onChange={(e) => setDraft({ ...draft, active: e.target.checked })}
                />
              }
              label="Active"
            />
            <FormControlLabel
              control={
                <Switch
                  checked={draft.twoFactor ?? true}
                  onChange={(e) => setDraft({ ...draft, twoFactor: e.target.checked })}
                />
              }
              label="Require 2FA"
            />
            <FormControlLabel
              control={
                <Switch
                  disabled={locked}
                  checked={locked ? true : (draft.canRead ?? true)}
                  onChange={(e) => setDraft({ ...draft, canRead: e.target.checked })}
                />
              }
              label="Read"
            />
            <FormControlLabel
              control={
                <Switch
                  disabled={locked || role === "auditor"}
                  checked={locked ? true : role === "auditor" ? false : (draft.canWrite ?? true)}
                  onChange={(e) => setDraft({ ...draft, canWrite: e.target.checked })}
                />
              }
              label="Write"
            />
          </Stack>
        </Stack>
      </DialogContent>
      <DialogActions>
        <Button onClick={onClose}>
          Cancel
        </Button>
        <Button variant="contained" disabled={!valid} onClick={() => onSave(draft)}>
          Save user
        </Button>
      </DialogActions>
    </Dialog>
  );
}

function ConnectionDialog({
  value,
  onClose,
  onSave,
}: {
  value: Partial<PlatformConnection>;
  onClose: () => void;
  onSave: (connection: Partial<PlatformConnection>) => void;
}) {
  const [draft, setDraft] = useState<Partial<PlatformConnection>>({
    ...value,
    config: value.config ?? {},
  });

  const category = (draft.category ?? "cloud_storage") as ConnectionCategory;
  const fields = CATEGORY_FIELDS[category];
  const config = draft.config ?? {};
  const valid =
    Boolean(draft.name?.trim()) &&
    fields.filter((f) => f.required).every((f) => String(config[f.key] ?? "").trim());

  return (
    <Dialog open onClose={onClose} fullWidth maxWidth="sm">
      <DialogTitle>{draft.id ? "Edit connection" : "New connection"}</DialogTitle>
      <DialogContent>
        <Stack spacing={2} sx={{ mt: 1 }}>
          <TextField
            label="Connection name"
            required
            value={draft.name ?? ""}
            onChange={(e) => setDraft({ ...draft, name: e.target.value })}
            fullWidth
          />
          <TextField
            label="Description"
            value={draft.description ?? ""}
            onChange={(e) => setDraft({ ...draft, description: e.target.value })}
            fullWidth
          />
          <Stack direction={{ xs: "column", sm: "row" }} spacing={2}>
            <FormControl fullWidth>
              <InputLabel>Category</InputLabel>
              <Select
                label="Category"
                value={category}
                onChange={(e) => {
                  const nextCategory = e.target.value as ConnectionCategory;
                  setDraft({
                    ...draft,
                    category: nextCategory,
                    connector: CONNECTOR_BY_CATEGORY[nextCategory][0]!.value,
                    config: {},
                  });
                }}
              >
                {(Object.keys(CATEGORY_LABELS) as ConnectionCategory[]).map((key) => (
                  <MenuItem key={key} value={key}>
                    {CATEGORY_LABELS[key]}
                  </MenuItem>
                ))}
              </Select>
            </FormControl>
            <FormControl fullWidth>
              <InputLabel>Connector</InputLabel>
              <Select
                label="Connector"
                value={draft.connector ?? CONNECTOR_BY_CATEGORY[category][0]!.value}
                onChange={(e) => setDraft({ ...draft, connector: e.target.value })}
              >
                {CONNECTOR_BY_CATEGORY[category].map((option) => (
                  <MenuItem key={option.value} value={option.value}>
                    {option.label}
                  </MenuItem>
                ))}
              </Select>
            </FormControl>
          </Stack>

          {fields.map((field) => (
            <TextField
              key={field.key}
              label={field.label}
              required={field.required}
              value={String(config[field.key] ?? "")}
              onChange={(e) =>
                setDraft({ ...draft, config: { ...config, [field.key]: e.target.value } })
              }
              fullWidth
            />
          ))}

          <Alert severity="info">
            Test the connection after saving. Secrets such as access keys belong in server environment
            variables, not in this form.
          </Alert>
        </Stack>
      </DialogContent>
      <DialogActions>
        <Button onClick={onClose}>
          Cancel
        </Button>
        <Button variant="contained" disabled={!valid} onClick={() => onSave(draft)}>
          Save connection
        </Button>
      </DialogActions>
    </Dialog>
  );
}

function JobDialog({
  value,
  onClose,
  onSave,
}: {
  value: Partial<ScheduledJob>;
  onClose: () => void;
  onSave: (job: Partial<ScheduledJob>) => void;
}) {
  const [draft, setDraft] = useState<Partial<ScheduledJob>>(value);

  const valid = Boolean(draft.name?.trim()) && String(draft.cron ?? "").trim().split(/\s+/).length === 5;

  return (
    <Dialog open onClose={onClose} fullWidth maxWidth="sm">
      <DialogTitle>{draft.id ? "Edit job" : "New scheduled job"}</DialogTitle>
      <DialogContent>
        <Stack spacing={2} sx={{ mt: 1 }}>
          <TextField
            label="Job name"
            required
            value={draft.name ?? ""}
            onChange={(e) => setDraft({ ...draft, name: e.target.value })}
            fullWidth
          />
          <FormControl fullWidth>
            <InputLabel>Job type</InputLabel>
            <Select
              label="Job type"
              value={draft.jobType ?? "receipt_ingestion"}
              onChange={(e) => setDraft({ ...draft, jobType: e.target.value as ScheduledJobType })}
            >
              {(Object.keys(JOB_TYPE_LABELS) as ScheduledJobType[]).map((key) => (
                <MenuItem key={key} value={key}>
                  {JOB_TYPE_LABELS[key]}
                </MenuItem>
              ))}
            </Select>
          </FormControl>
          <TextField
            label="Cron schedule"
            required
            value={draft.cron ?? ""}
            onChange={(e) => setDraft({ ...draft, cron: e.target.value })}
            helperText="Five fields. 0 */2 * * * runs every two hours."
            fullWidth
          />
          <FormControlLabel
            control={
              <Switch
                checked={draft.enabled ?? true}
                onChange={(e) => setDraft({ ...draft, enabled: e.target.checked })}
              />
            }
            label="Enabled"
          />
        </Stack>
      </DialogContent>
      <DialogActions>
        <Button onClick={onClose}>
          Cancel
        </Button>
        <Button variant="contained" disabled={!valid} onClick={() => onSave(draft)}>
          Save job
        </Button>
      </DialogActions>
    </Dialog>
  );
}
