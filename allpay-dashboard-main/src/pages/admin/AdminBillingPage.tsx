import Download from "@mui/icons-material/Download";
import {
  Alert,
  Button,
  Chip,
  Stack,
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableRow,
  Typography,
} from "@mui/material";
import dayjs from "dayjs";
import { AdminCard, AdminPage, AdminTableShell } from "../../components/admin/ui";
import { useAdminData } from "../../context/AdminDataContext";

const plans = [
  { name: "Basic", cards: 50, approvals: "single-level", analytics: "basic" },
  { name: "Pro", cards: 250, approvals: "multi-level", analytics: "advanced" },
  { name: "Enterprise", cards: 9999, approvals: "custom workflows", analytics: "full suite" },
];

export const AdminBillingPage = () => {
  const { billing, updateBillingPlan } = useAdminData();
  const overage = billing.headcount > billing.licenses;

  return (
    <AdminPage
      title="Billing"
      description="Manage current plan, renewal, invoices, and headcount versus license utilization."
      actions={
        <>
          <Chip size="small" label={`Current plan: ${billing.plan}`} color="primary" />
          <Chip size="small" variant="outlined" label={`Cycle: ${billing.billingCycle}`} />
          <Chip size="small" color="success" variant="outlined" label={`Next renewal: ${billing.nextRenewal}`} />
        </>
      }
      alert={
        overage ? (
          <Alert severity="warning">Headcount exceeded license count. Auto-upgrade recommended.</Alert>
        ) : undefined
      }
    >
      <AdminCard title="Upgrade plan (prorated)" description="Switch plans any time. Charges are prorated for the current cycle.">
        <Stack direction={{ xs: "column", sm: "row" }} spacing={1} flexWrap="wrap" useFlexGap>
          <Button variant="outlined" onClick={() => updateBillingPlan("Basic")}>
            Basic
          </Button>
          <Button variant="contained" onClick={() => updateBillingPlan("Pro")}>
            Pro
          </Button>
          <Button variant="outlined" onClick={() => updateBillingPlan("Enterprise")}>
            Enterprise
          </Button>
        </Stack>
        <Typography variant="body2" color="text.secondary" mt={1.5}>
          Licenses used: {billing.headcount} / {billing.licenses}
        </Typography>
      </AdminCard>

      <AdminCard title="Plan comparison" variant="flush">
        <AdminTableShell sx={{ border: "none", borderRadius: 0 }}>
          <Table size="small">
            <TableHead>
              <TableRow>
                <TableCell>Plan</TableCell>
                <TableCell>Card limit</TableCell>
                <TableCell>Approvals</TableCell>
                <TableCell>Analytics</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {plans.map((plan) => (
                <TableRow key={plan.name} hover selected={plan.name === billing.plan}>
                  <TableCell>
                    <Typography variant="body2" fontWeight={plan.name === billing.plan ? 700 : 500}>
                      {plan.name}
                      {plan.name === billing.plan ? " · Current" : ""}
                    </Typography>
                  </TableCell>
                  <TableCell>{plan.cards === 9999 ? "Unlimited" : plan.cards}</TableCell>
                  <TableCell>{plan.approvals}</TableCell>
                  <TableCell>{plan.analytics}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </AdminTableShell>
      </AdminCard>

      <AdminCard title="Billing history" description="Download prior invoices as PDF.">
        <Stack direction="row" spacing={1} flexWrap="wrap" useFlexGap>
          {[0, 1, 2, 3].map((idx) => (
            <Button key={idx} startIcon={<Download />} variant="outlined" size="small">
              Invoice {dayjs().subtract(idx, "month").format("MMM YYYY")}
            </Button>
          ))}
        </Stack>
      </AdminCard>
    </AdminPage>
  );
};
