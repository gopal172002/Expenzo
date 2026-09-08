import Download from "@mui/icons-material/Download";
import ReceiptLong from "@mui/icons-material/ReceiptLong";
import {
  Alert,
  Button,
  Card,
  CardContent,
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
    <Stack spacing={2.5}>
      <Card sx={{ borderRadius: 3 }}>
        <CardContent>
          <Typography variant="h5">
            Billing
          </Typography>
          <Typography color="text.secondary">
            Manage current plan, renewal, invoices, and headcount versus license utilization.
          </Typography>
          <Stack direction="row" spacing={1.1} mt={1.2}>
            <Chip label={`Current plan: ${billing.plan}`} color="primary" />
            <Chip label={`Cycle: ${billing.billingCycle}`} />
            <Chip label={`Next renewal: ${billing.nextRenewal}`} color="success" />
          </Stack>
          {overage && <Alert severity="warning" sx={{ mt: 1.2 }}>Headcount exceeded license count. Auto-upgrade recommended.</Alert>}
        </CardContent>
      </Card>

      <Card sx={{ borderRadius: 3 }}>
        <CardContent>
          <Typography variant="h6" fontWeight={700}>
            Upgrade plan (prorated)
          </Typography>
          <Stack direction="row" spacing={1} mt={1}>
            <Button variant="outlined" onClick={() => updateBillingPlan("Basic")}>Basic</Button>
            <Button variant="contained" onClick={() => updateBillingPlan("Pro")}>Pro</Button>
            <Button variant="outlined" onClick={() => updateBillingPlan("Enterprise")}>Enterprise</Button>
          </Stack>
          <Typography variant="body2" mt={1}>
            Licenses used: {billing.headcount} / {billing.licenses}
          </Typography>
        </CardContent>
      </Card>

      <Card sx={{ borderRadius: 3 }}>
        <CardContent>
          <Typography variant="h6" fontWeight={700}>Plan comparison</Typography>
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
                <TableRow key={plan.name}>
                  <TableCell>{plan.name}</TableCell>
                  <TableCell>{plan.cards}</TableCell>
                  <TableCell>{plan.approvals}</TableCell>
                  <TableCell>{plan.analytics}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      <Card sx={{ borderRadius: 3 }}>
        <CardContent>
          <Stack direction="row" spacing={1} alignItems="center">
            <ReceiptLong />
            <Typography variant="h6" fontWeight={700}>
              Billing history
            </Typography>
          </Stack>
          <Stack direction="row" spacing={1} mt={1}>
            {[0, 1, 2, 3].map((idx) => (
              <Button key={idx} startIcon={<Download />} variant="text">
                Invoice {dayjs().subtract(idx, "month").format("MMM YYYY")} (PDF)
              </Button>
            ))}
          </Stack>
        </CardContent>
      </Card>
    </Stack>
  );
};
