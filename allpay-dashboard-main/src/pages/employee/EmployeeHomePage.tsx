import { Box, Card, CardContent, Grid, Stack, Typography } from "@mui/material";
import { EmployeeNavButton } from "../../components/layout/EmployeeLayout";
import { ReceiptCard, ReceiptGrid } from "../../components/receipts/ReceiptCard";
import { useEmployeeData } from "../../context/EmployeeDataContext";
import dayjs from "dayjs";

const fmt = (n: number) => `Rs.${n.toLocaleString("en-IN")}`;

const HOME_LINKS = [
  {
    title: "My receipts",
    body: "See every bill you uploaded. Finance reviews the same receipts on the admin dashboard.",
    to: "/employee/receipts",
    label: "Open receipts",
    variant: "contained" as const,
  },
  {
    title: "My transactions",
    body: "Read-only list and detail — admins approve or reject from the Transactions screen.",
    to: "/employee/transactions",
    label: "Open transactions",
    variant: "contained" as const,
  },
  {
    title: "Payment proof",
    body: "Upload a receipt or screenshot for bank transfer, cash, or other manual pay — then request approval from finance.",
    to: "/employee/payment-proof",
    label: "Submit proof",
    variant: "contained" as const,
  },
  {
    title: "My spend",
    body: "Category and daily trend for your transactions only (mirrors admin Analytics scope).",
    to: "/employee/spend",
    label: "View spend",
    variant: "outlined" as const,
  },
  {
    title: "Activity & flags",
    body: "Same fraud-style flags as admin Fraud & Audit, limited to your spend lines.",
    to: "/employee/activity",
    label: "View activity",
    variant: "outlined" as const,
  },
];

export function EmployeeHomePage() {
  const { summary, transactions } = useEmployeeData();
  const s = summary ?? {
    pendingReview: 0,
    withFlags: 0,
    approvedThisMonth: 0,
    proofsAwaiting: 0,
    proofsAwaitingReview: 0,
  };

  const recentReceipts = transactions
    .filter((tx) => tx.receiptUrl)
    .sort((a, b) => dayjs(b.dateTime).valueOf() - dayjs(a.dateTime).valueOf())
    .slice(0, 4);

  const stats = [
    { label: "Pending review", value: String(s.pendingReview) },
    { label: "With flags", value: String(s.withFlags) },
    { label: "Approved (this month)", value: fmt(s.approvedThisMonth) },
    { label: "Proofs awaiting review", value: String(s.proofsAwaitingReview ?? s.proofsAwaiting) },
  ];

  const cards = HOME_LINKS.map((link) => ({
    title: link.title,
    body: link.body,
    action: <EmployeeNavButton label={link.label} to={link.to} variant={link.variant} />,
  }));

  return (
    <Stack spacing={2.5}>
      <Grid container spacing={2}>
        {stats.map((item) => (
          <Grid key={item.label} item xs={12} sm={6} md={3}>
            <Card sx={{ borderRadius: 3 }}>
              <CardContent>
                <Typography variant="body2" color="text.secondary">
                  {item.label}
                </Typography>
                <Typography variant="h5" fontWeight={800}>
                  {item.value}
                </Typography>
              </CardContent>
            </Card>
          </Grid>
        ))}
      </Grid>

      {recentReceipts.length > 0 ? (
        <Stack spacing={1.5}>
          <Stack direction="row" justifyContent="space-between" alignItems="center">
            <Typography variant="h6" fontWeight={800}>
              Recent receipts
            </Typography>
            <EmployeeNavButton label="See all" to="/employee/receipts" variant="outlined" />
          </Stack>
          <ReceiptGrid>
            {recentReceipts.map((tx) => (
              <ReceiptCard
                key={tx.id}
                showEmployee={false}
                item={{
                  id: tx.id,
                  receiptUrl: tx.receiptUrl,
                  employeeName: tx.employeeName,
                  merchantName: tx.merchantName,
                  amount: tx.amount,
                  dateTime: tx.dateTime,
                  status: tx.status,
                  category: tx.category,
                  detailTo: `/employee/transaction/${tx.id}`,
                }}
              />
            ))}
          </ReceiptGrid>
        </Stack>
      ) : null}

      <Grid container spacing={2}>
        {cards.map((c) => (
          <Grid key={c.title} item xs={12} md={6}>
            <Card sx={{ borderRadius: 3, height: "100%" }}>
              <CardContent>
                <Typography variant="h6" fontWeight={800} gutterBottom>
                  {c.title}
                </Typography>
                <Typography color="text.secondary" sx={{ mb: 2, minHeight: 48 }}>
                  {c.body}
                </Typography>
                <Box>{c.action}</Box>
              </CardContent>
            </Card>
          </Grid>
        ))}
      </Grid>
    </Stack>
  );
}
