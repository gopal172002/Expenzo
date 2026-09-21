import PersonOutline from "@mui/icons-material/PersonOutline";
import { Chip, Divider, Stack, Typography } from "@mui/material";
import { AdminCard, AdminPage } from "../../components/admin/ui";
import { useAuth } from "../../context/AuthContext";
import { useEmployeeData } from "../../context/EmployeeDataContext";
import { ADMIN } from "../../theme";

function ProfileRow({ label, value }: { label: string; value: string }) {
  return (
    <Stack direction="row" spacing={1.5} alignItems="baseline" sx={{ py: 1.1 }}>
      <Typography variant="body2" fontWeight={700} color="text.secondary" sx={{ minWidth: 120 }}>
        {label}
      </Typography>
      <Typography variant="body1" fontWeight={600}>
        {value}
      </Typography>
    </Stack>
  );
}

export function EmployeeProfilePage() {
  const { user } = useAuth();
  const { employee } = useEmployeeData();

  const name = employee?.name ?? user?.fullName ?? "—";
  const email = employee?.email ?? user?.email ?? "—";
  const employeeId = employee?.id ?? user?.employeeId ?? "—";
  const department = employee?.department ?? user?.employeeDepartment ?? "—";
  const role = employee?.role ?? user?.employeeRole ?? "employee";
  const company = "Your company";

  return (
    <AdminPage
      title="Profile"
      description="Directory details finance sees under Employees. This view is read-only."
    >
      <AdminCard
        title={
          <Stack direction="row" spacing={1} alignItems="center">
            <PersonOutline color="primary" fontSize="small" />
            <Typography variant="h6">Account</Typography>
          </Stack>
        }
        description={`${company} · AllPay employee portal`}
      >
        <ProfileRow label="Name" value={name} />
        <Divider />
        <ProfileRow label="Email" value={email} />
        <Divider />
        <ProfileRow label="Employee ID" value={employeeId} />
        <Divider />
        <ProfileRow label="Department" value={department} />
        <Divider />
        <ProfileRow label="Role" value={role} />

        <Stack direction="row" spacing={1} flexWrap="wrap" useFlexGap sx={{ mt: 3 }}>
          <Chip
            label="Active"
            size="small"
            sx={{ bgcolor: ADMIN.accent.success, color: "#fff", fontWeight: 600 }}
          />
          {employee?.onboarded ? (
            <Chip
              label="Onboarding complete"
              size="small"
              sx={{ bgcolor: ADMIN.accent.primary, color: "#fff", fontWeight: 600 }}
            />
          ) : (
            <Chip label="Onboarding pending" size="small" variant="outlined" />
          )}
          {employee?.travelApproved ? (
            <Chip label="Travel approved" size="small" variant="outlined" />
          ) : (
            <Chip label="Travel not approved" size="small" variant="outlined" />
          )}
        </Stack>
      </AdminCard>
    </AdminPage>
  );
}
