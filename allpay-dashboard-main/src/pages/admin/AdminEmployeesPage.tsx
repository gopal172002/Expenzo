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
import { useCallback, useMemo, useState } from "react";
import {
  AdminCallout,
  AdminCard,
  AdminKpi,
  AdminKpiRow,
  AdminPage,
  AdminTableShell,
} from "../../components/admin/ui";
import { useAdminData } from "../../context/AdminDataContext";
import { AdminEmployeesOnboardingTable } from "./AdminEmployeesTable";

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
    <AdminPage
      title="Employees"
      description={`Invite or import people, assign IDs, and share mobile invite codes like ${prefixExample}_58847.`}
      actions={
        company?.name ? (
          <Chip size="small" variant="outlined" label={company.name} sx={{ fontWeight: 600 }} />
        ) : null
      }
      alert={
        <>
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
        </>
      }
    >
      <AdminKpiRow>
        <AdminKpi label="Total" value={String(kpiTotal)} accent="primary" />
        <AdminKpi label="Active" value={String(kpiActive)} accent="success" />
        <AdminKpi label="Pending ID" value={String(kpiPending)} accent="warning" />
        <AdminKpi label="Onboarded" value={String(kpiOnboarded)} accent="teal" />
      </AdminKpiRow>

      {pendingEmployees.length > 0 ? (
        <AdminCallout
          tone="warning"
          title={`Pending Employee ID · ${pendingEmployees.length}`}
        >
          <Typography variant="body2" color="text.secondary" sx={{ mb: 1.5 }}>
            These people cannot use the mobile app until you assign an ID (creates their {prefixExample}_…
            invite code).
          </Typography>
          <AdminTableShell sx={{ borderRadius: 1 }}>
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
                      >
                        Assign ID
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </AdminTableShell>
        </AdminCallout>
      ) : null}

      <Box
        sx={{
          display: "grid",
          gridTemplateColumns: { xs: "1fr", md: "1fr 1fr" },
          gap: 1.25,
        }}
      >
        <AdminCard title="Invite employee" description="Send a single invite with optional employee ID." sx={{ height: "100%" }}>
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
        </AdminCard>

        <AdminCard
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
          sx={{ height: "100%" }}
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
        </AdminCard>

        <AdminCard
          title="Bulk import via CSV"
          description="Paste rows with employee ID, name, email, department, role."
          sx={{ height: "100%" }}
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
        </AdminCard>

        <AdminCard title="Department controls" description="Create, rename, or remove departments." sx={{ height: "100%" }}>
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
        </AdminCard>
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
    </AdminPage>
  );
};
