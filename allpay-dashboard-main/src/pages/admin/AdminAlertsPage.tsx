import CampaignOutlined from "@mui/icons-material/CampaignOutlined";
import NotificationsActive from "@mui/icons-material/NotificationsActive";
import {
  Button,
  Card,
  CardContent,
  Chip,
  MenuItem,
  Stack,
  TextField,
  Typography,
} from "@mui/material";
import { useState } from "react";
import { useAdminData } from "../../context/AdminDataContext";

export const AdminAlertsPage = () => {
  const { alertsConfig, updateAlertConfig, transactions, employees, policies } = useAdminData();
  const [mutePolicy, setMutePolicy] = useState("");
  const [muteEmployee, setMuteEmployee] = useState("");
  const flaggedCount = transactions.filter((tx) => tx.flags.length).length;

  return (
    <Stack spacing={2.5}>
      <Card sx={{ borderRadius: 3 }}>
        <CardContent>
          <Stack direction="row" spacing={1} alignItems="center">
            <CampaignOutlined color="primary" />
            <Typography variant="h5">
              Policy alerts
            </Typography>
          </Stack>
          <Typography color="text.secondary">
            Configure per-violation, daily digest, or weekly summaries with real-time in-app badge updates.
          </Typography>
        </CardContent>
      </Card>

      <Card sx={{ borderRadius: 3 }}>
        <CardContent>
          <Stack direction={{ xs: "column", md: "row" }} spacing={1}>
            <TextField
              select
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
            <Chip icon={<NotificationsActive />} color="warning" label={`Flagged badge: ${flaggedCount}`} />
          </Stack>

          <Stack direction={{ xs: "column", md: "row" }} spacing={1} mt={2}>
            <TextField
              select
              label="Mute policy"
              value={mutePolicy}
              onChange={(e) => setMutePolicy(e.target.value)}
              sx={{ minWidth: 220 }}
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
            >
              Mute policy for 7 days
            </Button>

            <TextField
              select
              label="Mute employee"
              value={muteEmployee}
              onChange={(e) => setMuteEmployee(e.target.value)}
              sx={{ minWidth: 220 }}
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
            >
              Mute employee
            </Button>
          </Stack>

          <Typography mt={2} variant="body2" color="text.secondary">
            Alert email payload includes employee name, amount, merchant, violation reason, and direct transaction link.
          </Typography>
        </CardContent>
      </Card>
    </Stack>
  );
};
