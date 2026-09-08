import CloudUpload from "@mui/icons-material/CloudUpload";
import PersonAddAlt from "@mui/icons-material/PersonAddAlt";
import {
  Alert,
  Box,
  Button,
  Chip,
  Stack,
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableRow,
  TextField,
  Typography,
} from "@mui/material";
import { useCallback, useMemo, useState, type ReactNode } from "react";
import { PageHeader } from "../../components/layout/PageHeader";
import { useAdminData } from "../../context/AdminDataContext";
import { AdminEmployeesOnboardingTable } from "./AdminEmployeesTable";

function SectionPanel({
  title,
  description,
  children,
  action,
}: {
  title: string;
  description?: ReactNode;
  children: ReactNode;
  action?: ReactNode;
}) {
  return (
    <Box
      sx={{
        bgcolor: "#fff",
        border: "1px solid",
        borderColor: "divider",
        px: 2,
        py: 1.75,
        height: "100%",
      }}
    >
      <Stack
        direction="row"
        spacing={1}
        alignItems="flex-start"
        justifyContent="space-between"
        sx={{ mb: description ? 1 : 1.25 }}
      >
        <Box sx={{ minWidth: 0 }}>
          <Typography
            variant="caption"
            color="text.secondary"
            sx={{ fontWeight: 650, letterSpacing: "0.04em", textTransform: "uppercase" }}
          >
            {title}
          </Typography>
          {description ? (
            <Typography variant="body2" color="text.secondary" sx={{ mt: 0.35 }}>
              {description}
            </Typography>
          ) : null}
        </Box>
        {action}
      </Stack>
      {children}
    </Box>
  );
}

function KpiStat({ label, value, accent }: { label: string; value: string; accent: string }) {
  return (
    <Box
      sx={{
        flex: 1,
        minWidth: 0,
        bgcolor: "#fff",
        borderLeft: "3px solid",
        borderColor: accent,
        px: 1.75,
        py: 1.5,
      }}
    >
      <Typography
        variant="caption"
        color="text.secondary"
        sx={{ fontWeight: 650, letterSpacing: "0.04em", textTransform: "uppercase" }}
      >
        {label}
      </Typography>
      <Typography variant="h5" fontWeight={800} sx={{ mt: 0.5, letterSpacing: "-0.02em" }}>
        {value}
      </Typography>
    </Box>
  );
}

export const AdminEmployeesPage = () => {
  const {
    employees,
    company,
    addEmployeesFromCsv,
    inviteEmployee,
    assignEmployeeId,
    generateEmployeeInviteCode,
    resetEmployeeLogin,
    updateCompanyInvitePrefix,
    manageDepartment,
    isSaving,
    errorMessage,
  } = useAdminData();
  const [csv, setCsv] = useState(
    "employee ID,name,email,department,role\nemp5,New User,new.user@allpay.in,Finance,employee"
  );
  const [inviteEmail, setInviteEmail] = useState("");
  const [inviteDepartment, setInviteDepartment] = useState("Finance");
  const [inviteEmployeeId, setInviteEmployeeId] = useState("");
  const [invitePrefixDraft, setInvitePrefixDraft] = useState("");
  const [department, setDepartment] = useState("New Department");
  const [departmentNext, setDepartmentNext] = useState("Renamed Department");
  const [info, setInfo] = useState("");
  const [assignedBanner, setAssignedBanner] = useState("");
  const [tableFeedback, setTableFeedback] = useState<{
    severity: "success" | "error";
    text: string;
  } | null>(null);
  const [directoryReloadToken, setDirectoryReloadToken] = useState(0);
  const [directoryCounts, setDirectoryCounts] = useState<{
    total: number;
    active: number;
    pendingId: number;
    onboarded: number;
  } | null>(null);

  const bumpDirectory = useCallback(() => {
    setDirectoryReloadToken((n) => n + 1);
  }, []);

  const handleDirectoryCounts = useCallback(
    (counts: { total: number; active: number; pendingId: number; onboarded: number }) => {
      setDirectoryCounts(counts);
    },
    []
  );

  const departments = useMemo(
    () => Array.from(new Set(employees.map((emp) => emp.department).filter(Boolean))).sort(),
    [employees]
  );
  const pendingEmployees = useMemo(
    () => employees.filter((emp) => emp.active && emp.idAssigned === false),
    [employees]
  );

  const kpiTotal = directoryCounts?.total ?? employees.length;
  const kpiActive = directoryCounts?.active ?? employees.filter((emp) => emp.active).length;
  const kpiPending = directoryCounts?.pendingId ?? pendingEmployees.length;
  const kpiOnboarded = directoryCounts?.onboarded ?? employees.filter((emp) => emp.onboarded).length;

  const prefixExample = (company?.invitePrefix || invitePrefixDraft || "MCR").toUpperCase();

  const copyText = async (label: string, text: string) => {
    try {
      await navigator.clipboard.writeText(text);
      setInfo(`Copied ${label} to clipboard.`);
    } catch {
      setInfo(`${label}: ${text}`);
    }
  };

  const copyId = async (id: string) => copyText("Employee ID", id);
  const copyInviteCode = async (code: string) => copyText("Invite code", code);

  return (
    <Stack spacing={2.5}>
      <PageHeader
        title="Employees"
        description={`Invite or import people, assign IDs, and share mobile invite codes like ${prefixExample}_58847.`}
        actions={
          company?.name ? (
            <Chip size="small" variant="outlined" label={company.name} sx={{ fontWeight: 650 }} />
          ) : null
        }
      />

      <Stack direction={{ xs: "column", sm: "row" }} spacing={1.25}>
        <KpiStat label="Total" value={String(kpiTotal)} accent="#2563EB" />
        <KpiStat label="Active" value={String(kpiActive)} accent="#059669" />
        <KpiStat label="Pending ID" value={String(kpiPending)} accent="#D97706" />
        <KpiStat label="Onboarded" value={String(kpiOnboarded)} accent="#0F766E" />
      </Stack>

      {errorMessage ? <Alert severity="error">{errorMessage}</Alert> : null}
      {info ? (
        <Alert severity="info" onClose={() => setInfo("")}>
          {info}
        </Alert>
      ) : null}
      {assignedBanner ? (
        <Alert
          severity="success"
          onClose={() => setAssignedBanner("")}
          action={
            <Button
              color="inherit"
              size="small"
              onClick={() => {
                const match = assignedBanner.match(/Assigned ([^\s]+)/);
                if (match?.[1]) void copyId(match[1]);
              }}
            >
              Copy ID
            </Button>
          }
        >
          {assignedBanner}
        </Alert>
      ) : null}

      {pendingEmployees.length > 0 ? (
        <Box
          sx={{
            bgcolor: "#fff",
            border: "1px solid",
            borderColor: "#FDE68A",
            borderLeft: "3px solid #D97706",
            p: 2,
          }}
        >
          <Typography
            variant="caption"
            sx={{ fontWeight: 700, letterSpacing: "0.04em", textTransform: "uppercase", color: "#B45309" }}
          >
            Pending Employee ID · {pendingEmployees.length}
          </Typography>
          <Typography variant="body2" color="text.secondary" sx={{ mt: 0.5, mb: 1.5 }}>
            These people cannot use the mobile app until you assign an ID (creates their {prefixExample}_…
            invite code).
          </Typography>
          <Box
            sx={{
              border: "1px solid",
              borderColor: "divider",
              borderRadius: 0,
              overflow: "hidden",
              bgcolor: "#fff",
            }}
          >
            <Table size="small">
              <TableHead>
                <TableRow>
                  <TableCell>Name</TableCell>
                  <TableCell>Email</TableCell>
                  <TableCell>Department</TableCell>
                  <TableCell align="right">Action</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {pendingEmployees.map((emp) => (
                  <TableRow key={emp.email} hover>
                    <TableCell>
                      <Typography variant="body2" fontWeight={700}>
                        {emp.name}
                      </Typography>
                    </TableCell>
                    <TableCell>{emp.email}</TableCell>
                    <TableCell>{emp.department}</TableCell>
                    <TableCell align="right">
                      <Button
                        variant="contained"
                        size="small"
                        disabled={isSaving}
                        onClick={async () => {
                          const { employeeId, inviteCode } = await assignEmployeeId(emp.email);
                          const codeNote = inviteCode ? ` Mobile invite code: ${inviteCode}.` : "";
                          setAssignedBanner(
                            `Assigned ${employeeId} to ${emp.name}. Share it so they can log in.${codeNote}`
                          );
                          setInfo("");
                          bumpDirectory();
                        }}
                        sx={{ textTransform: "none" }}
                      >
                        Assign ID
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </Box>
        </Box>
      ) : null}

      <Box
        sx={{
          display: "grid",
          gridTemplateColumns: { xs: "1fr", md: "1fr 1fr" },
          gap: 1.25,
        }}
      >
        <SectionPanel
          title="Invite employee"
          description="Send a single invite with optional employee ID."
        >
          <Stack spacing={1.25}>
            <TextField
              size="small"
              fullWidth
              label="Work email"
              value={inviteEmail}
              onChange={(event) => setInviteEmail(event.target.value)}
            />
            <Stack direction={{ xs: "column", sm: "row" }} spacing={1}>
              <TextField
                size="small"
                fullWidth
                label="Department"
                value={inviteDepartment}
                onChange={(event) => setInviteDepartment(event.target.value)}
              />
              <TextField
                size="small"
                fullWidth
                label="Employee ID (optional)"
                placeholder="58847 or emp1"
                value={inviteEmployeeId}
                onChange={(event) => setInviteEmployeeId(event.target.value)}
                helperText={`Creates ${prefixExample}_${(inviteEmployeeId || "ID").toUpperCase()}`}
              />
            </Stack>
            <Button
              variant="contained"
              startIcon={<PersonAddAlt />}
              disabled={isSaving || !inviteEmail}
              onClick={async () => {
                const inviteCode = await inviteEmployee(
                  inviteEmail,
                  inviteDepartment,
                  undefined,
                  inviteEmployeeId.trim() || undefined
                );
                const codeNote = inviteCode
                  ? ` Mobile invite code: ${inviteCode} (share for app onboarding).`
                  : " Assign an Employee ID to generate the mobile invite code.";
                setInfo(`Invited ${inviteEmail}.${codeNote}`);
                setInviteEmail("");
                setInviteEmployeeId("");
                bumpDirectory();
              }}
              sx={{ textTransform: "none", alignSelf: "flex-start" }}
            >
              Invite employee
            </Button>
          </Stack>
        </SectionPanel>

        <SectionPanel
          title="Company invite prefix"
          description={
            <>
              Mobile codes use{" "}
              <strong>
                {company?.invitePrefix || "—"}
                _EMPLOYEEID
              </strong>
              . Example: MCR_58847 (prefix = company, suffix = employee ID). If a 3-letter prefix is taken, try 4
              letters — never reuse an existing prefix.
            </>
          }
        >
          <Stack direction={{ xs: "column", sm: "row" }} spacing={1} alignItems={{ sm: "flex-start" }}>
            <TextField
              size="small"
              label="Invite prefix"
              placeholder="MCR"
              value={invitePrefixDraft || company?.invitePrefix || ""}
              onChange={(event) => setInvitePrefixDraft(event.target.value.toUpperCase())}
              inputProps={{ maxLength: 6 }}
              helperText="2–6 letters/numbers, unique across companies"
              sx={{ minWidth: 160 }}
            />
            <Button
              variant="contained"
              disabled={isSaving || !(invitePrefixDraft || company?.invitePrefix)}
              onClick={async () => {
                const next = (invitePrefixDraft || company?.invitePrefix || "").trim();
                const result = await updateCompanyInvitePrefix(next);
                setInfo(result.message);
                if (result.ok) {
                  setInvitePrefixDraft("");
                  bumpDirectory();
                }
              }}
              sx={{ textTransform: "none", mt: { sm: 0.5 } }}
            >
              Save prefix
            </Button>
          </Stack>
        </SectionPanel>

        <SectionPanel
          title="Bulk import via CSV"
          description="Paste rows with employee ID, name, email, department, role."
        >
          <TextField
            multiline
            minRows={5}
            fullWidth
            value={csv}
            onChange={(event) => setCsv(event.target.value)}
            sx={{
              "& .MuiInputBase-root": {
                fontFamily: "ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace",
                fontSize: 13,
              },
            }}
          />
          <Button
            variant="contained"
            startIcon={<CloudUpload />}
            disabled={isSaving}
            onClick={async () => {
              const count = await addEmployeesFromCsv(csv);
              setInfo(
                `Imported ${count} employees successfully. Rows without an ID column stay pending until you assign one.`
              );
              bumpDirectory();
            }}
            sx={{ textTransform: "none", mt: 1.25 }}
          >
            Import CSV
          </Button>
        </SectionPanel>

        <SectionPanel title="Department controls" description="Create, rename, or remove departments.">
          <Stack direction={{ xs: "column", sm: "row" }} spacing={1} flexWrap="wrap" useFlexGap>
            <TextField
              size="small"
              label="Department"
              value={department}
              onChange={(event) => setDepartment(event.target.value)}
              sx={{ minWidth: 140, flex: 1 }}
            />
            <TextField
              size="small"
              label="Rename to"
              value={departmentNext}
              onChange={(event) => setDepartmentNext(event.target.value)}
              sx={{ minWidth: 140, flex: 1 }}
            />
          </Stack>
          <Stack direction="row" spacing={1} mt={1.25} flexWrap="wrap" useFlexGap>
            <Button variant="outlined" size="small" onClick={() => manageDepartment("create", department)} sx={{ textTransform: "none" }}>
              Create
            </Button>
            <Button
              variant="outlined"
              size="small"
              onClick={() => manageDepartment("rename", department, departmentNext)}
              sx={{ textTransform: "none" }}
            >
              Rename
            </Button>
            <Button
              variant="outlined"
              size="small"
              color="error"
              onClick={() => manageDepartment("delete", department)}
              sx={{ textTransform: "none" }}
            >
              Delete
            </Button>
          </Stack>
          {departments.length ? (
            <Stack direction="row" spacing={0.75} mt={1.5} flexWrap="wrap" useFlexGap>
              {departments.map((dep) => (
                <Chip
                  key={dep}
                  size="small"
                  variant="outlined"
                  label={dep}
                  onClick={() => setDepartment(dep)}
                  sx={{ borderRadius: 1 }}
                />
              ))}
            </Stack>
          ) : null}
        </SectionPanel>
      </Box>

      <AdminEmployeesOnboardingTable
        isSaving={isSaving}
        tableFeedback={tableFeedback}
        onDismissFeedback={() => setTableFeedback(null)}
        onCopyId={(id) => void copyId(id)}
        onCopyInviteCode={(code) => void copyInviteCode(code)}
        reloadToken={directoryReloadToken}
        onCounts={handleDirectoryCounts}
        onGenerateInvite={async (email, name) => {
          setTableFeedback(null);
          const result = await generateEmployeeInviteCode(email);
          setTableFeedback({
            severity: result.ok ? "success" : "error",
            text: result.ok
              ? `Invite code ${result.inviteCode} ready for ${name}.`
              : result.message || "Could not generate invite code.",
          });
          if (result.ok) bumpDirectory();
        }}
        onResetLogin={async (email, id) => {
          setTableFeedback(null);
          const result = await resetEmployeeLogin(email, id);
          setTableFeedback({
            severity: result.ok ? "success" : "error",
            text: result.message || "Reset login failed.",
          });
          if (result.ok) bumpDirectory();
        }}
      />
    </Stack>
  );
};
