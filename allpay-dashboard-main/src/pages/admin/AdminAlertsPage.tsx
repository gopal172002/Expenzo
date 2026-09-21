import NotificationsActive from "@mui/icons-material/NotificationsActive";
import {
  Button,
  Chip,
  MenuItem,
  Stack,
  TextField,
  Typography,
} from "@mui/material";
import { useState } from "react";
import { AdminCard, AdminPage, AdminSectionLabel } from "../../components/admin/ui";
import { useAdminData } from "../../context/AdminDataContext";

export const AdminAlertsPage = () => {
  const { alertsConfig, updateAlertConfig, transactions, employees, policies } = useAdminData();
  const [mutePolicy, setMutePolicy] = useState("");
  const [muteEmployee, setMuteEmployee] = useState("");
  const flaggedCount = transactions.filter((tx) => tx.flags.length).length;

  return (
    <AdminPage
      title="Policy alerts"
      description="Configure per-violation, daily digest, or weekly summaries with real-time in-app badge updates."
      actions={
        <Chip
          size="small"
          icon={<NotificationsActive />}
          color="warning"
          variant="outlined"
          label={`Flagged badge: ${flaggedCount}`}
        />
      }
    >
      <AdminCard title="Delivery settings" description="Choose how and when policy violations reach your team.">
        <Stack
          direction={{ xs: "column", sm: "row" }}
          spacing={1.5}
          useFlexGap
          sx={{
            display: "grid",
            gridTemplateColumns: { xs: "1fr", sm: "1fr 1fr" },
            gap: 1.5,
          }}
        >
          <TextField
            select
            fullWidth
            label="Alert delivery"
            value={alertsConfig.delivery}
            onChange={(event) => updateAlertConfig({ delivery: event.target.value as "email" | "in_app" | "both" })}
          >
            <MenuItem value="email">Email</MenuItem>
            <MenuItem value="in_app">In-app only</MenuItem>
            <MenuItem value="both">Email + In-app</MenuItem>
          </TextField>
          <TextField
            select
            fullWidth
            label="Threshold"
            value={alertsConfig.threshold}
            onChange={(event) =>
              updateAlertConfig({
                threshold: event.target.value as "per_violation" | "daily_digest" | "weekly_summary",
              })
            }
          >
            <MenuItem value="per_violation">Per violation</MenuItem>
            <MenuItem value="daily_digest">Daily digest</MenuItem>
            <MenuItem value="weekly_summary">Weekly summary</MenuItem>
          </TextField>
        </Stack>

        <Typography mt={2} variant="body2" color="text.secondary">
          Alert email payload includes employee name, amount, merchant, violation reason, and a direct transaction link.
        </Typography>
      </AdminCard>

      <AdminCard title="Mute rules" description="Temporarily silence alerts for a policy or employee.">
        <AdminSectionLabel>Mute policy</AdminSectionLabel>
        <Stack direction={{ xs: "column", sm: "row" }} spacing={1.25} alignItems={{ sm: "center" }} useFlexGap>
          <TextField
            select
            fullWidth
            label="Policy"
            value={mutePolicy}
            onChange={(e) => setMutePolicy(e.target.value)}
            sx={{ minWidth: 0, flex: 1 }}
            InputLabelProps={{ shrink: true }}
            SelectProps={{
              displayEmpty: true,
              renderValue: (selected) => {
                const v = String(selected ?? "");
                if (!v) return "Select policy";
                return policies.find((policy) => policy.id === v)?.name ?? v;
              },
            }}
          >
            <MenuItem value="">Select policy</MenuItem>
            {policies.map((policy) => (
              <MenuItem key={policy.id} value={policy.id}>
                {policy.name}
              </MenuItem>
            ))}
          </TextField>
          <Button
            variant="outlined"
            onClick={() => updateAlertConfig({ mutedPolicies: [...alertsConfig.mutedPolicies, mutePolicy] })}
            disabled={!mutePolicy}
            sx={{ flexShrink: 0 }}
          >
            Mute for 7 days
          </Button>
        </Stack>

        <Typography variant="overline" display="block" sx={{ mt: 2.5, mb: 1 }}>
          Mute employee
        </Typography>
        <Stack direction={{ xs: "column", sm: "row" }} spacing={1.25} alignItems={{ sm: "center" }} useFlexGap>
          <TextField
            select
            fullWidth
            label="Employee"
            value={muteEmployee}
            onChange={(e) => setMuteEmployee(e.target.value)}
            sx={{ minWidth: 0, flex: 1 }}
            InputLabelProps={{ shrink: true }}
            SelectProps={{
              displayEmpty: true,
              renderValue: (selected) => {
                const v = String(selected ?? "");
                if (!v) return "Select employee";
                return employees.find((employee) => employee.id === v)?.name ?? v;
              },
            }}
          >
            <MenuItem value="">Select employee</MenuItem>
            {employees.slice(0, 40).map((employee) => (
              <MenuItem key={employee.id} value={employee.id}>
                {employee.name}
              </MenuItem>
            ))}
          </TextField>
          <Button
            variant="outlined"
            onClick={() => updateAlertConfig({ mutedEmployees: [...alertsConfig.mutedEmployees, muteEmployee] })}
            disabled={!muteEmployee}
            sx={{ flexShrink: 0 }}
          >
            Mute employee
          </Button>
        </Stack>
      </AdminCard>
    </AdminPage>
  );
};
