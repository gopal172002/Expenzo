import {
  Box,
  Button,
  Stack,
  Typography,
} from "@mui/material";
import dayjs from "dayjs";
import { lazy, Suspense } from "react";
import { Link as RouterLink } from "react-router-dom";
import {
  AdminCard,
  AdminEmptyState,
  AdminKpi,
  AdminKpiRow,
  AdminPage,
} from "../../components/admin/ui";

const DailySpendChart = lazy(() =>
  import("../../components/charts/DailySpendChart").then((m) => ({ default: m.DailySpendChart }))
);
import { EmployeeNavButton } from "../../components/layout/EmployeeLayout";
import { ReceiptCard, ReceiptGrid } from "../../components/receipts/ReceiptCard";
import { useEmployeeData } from "../../context/EmployeeDataContext";
import { ADMIN } from "../../theme";

const fmt = (n: number) => `₹${n.toLocaleString("en-IN")}`;

const HOME_LINKS = [
  {
    title: "My receipts",
    body: "Review bills you uploaded. Finance sees the same receipts in the admin dashboard.",
    to: "/employee/receipts",
    label: "Open receipts",
    variant: "contained" as const,
  },
  {
    title: "My transactions",
    body: "Track payment and reimbursement status. Approvals happen in the admin workspace.",
    to: "/employee/transactions",
    label: "Open transactions",
    variant: "contained" as const,
  },
  {
    title: "Payment proof",
    body: "Upload proof for bank transfer, cash, or other manual payments and request review.",
    to: "/employee/payment-proof",
    label: "Submit proof",
    variant: "contained" as const,
  },
  {
    title: "My spend",
    body: "Category and daily trend for your expenses only.",
    to: "/employee/spend",
    label: "View spend",
    variant: "outlined" as const,
  },
  {
    title: "Activity & flags",
    body: "See risk flags and requests for information on your claims.",
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

  const recentTx = [...transactions]
    .sort((a, b) => dayjs(b.dateTime).valueOf() - dayjs(a.dateTime).valueOf())
    .slice(0, 12);

  return (
    <AdminPage
      title="Home"
      description="Your company expense workspace. Payments made via UPI apps are recorded here for finance review — AllPay does not settle bank payments."
    >
      <AdminKpiRow>
        <AdminKpi label="Pending review" value={String(s.pendingReview)} accent="warning" />
        <AdminKpi label="With flags" value={String(s.withFlags)} accent="error" />
        <AdminKpi label="Approved this month" value={fmt(s.approvedThisMonth)} accent="success" />
        <AdminKpi
          label="Proofs awaiting"
          value={String(s.proofsAwaitingReview ?? s.proofsAwaiting)}
          accent="info"
        />
      </AdminKpiRow>

      <Suspense fallback={null}>
        <DailySpendChart transactions={transactions} portal="employee" />
      </Suspense>

      <AdminCard
        title="Quick actions"
        description="Most employees start with receipts or transaction history."
      >
        <Stack
          direction={{ xs: "column", sm: "row" }}
          spacing={1.25}
          useFlexGap
          flexWrap="wrap"
        >
          {HOME_LINKS.map((link) => (
            <EmployeeNavButton
              key={link.title}
              label={link.label}
              to={link.to}
              variant={link.variant}
            />
          ))}
        </Stack>
      </AdminCard>

      <Stack
        direction={{ xs: "column", lg: "row" }}
        spacing={ADMIN.sectionGap}
        useFlexGap
        alignItems="stretch"
      >
        <Box sx={{ flex: 1, minWidth: 0, display: "flex" }}>
          <AdminCard
            title="Recent transactions"
            action={
              <Button component={RouterLink} to="/employee/transactions" size="small">
                See all
              </Button>
            }
            sx={{ width: "100%", height: "100%", display: "flex", flexDirection: "column" }}
            contentSx={{ flex: 1, display: "flex", flexDirection: "column" }}
          >
            {recentTx.length === 0 ? (
              <AdminEmptyState
                title="No transactions yet"
                description="When you pay via the AllPay mobile app or submit payment proof, expenses appear here."
              />
            ) : (
              <Stack spacing={1.25} sx={{ flex: 1 }}>
                {recentTx.map((tx) => (
                  <Box
                    key={tx.id}
                    component={RouterLink}
                    to={`/employee/transaction/${tx.id}`}
                    sx={{
                      display: "flex",
                      justifyContent: "space-between",
                      gap: 2,
                      textDecoration: "none",
                      color: "inherit",
                      border: `1px solid ${ADMIN.border.default}`,
                      borderRadius: 1,
                      px: 1.5,
                      py: 1.25,
                      "&:hover": { bgcolor: ADMIN.surface.hover },
                    }}
                  >
                    <Box sx={{ minWidth: 0 }}>
                      <Typography fontWeight={700} noWrap>
                        {tx.merchantName}
                      </Typography>
                      <Typography variant="caption" color="text.secondary">
                        {dayjs(tx.dateTime).format("DD MMM YYYY, HH:mm")} · {tx.status}
                      </Typography>
                    </Box>
                    <Typography fontWeight={700}>{fmt(tx.amount)}</Typography>
                  </Box>
                ))}
              </Stack>
            )}
          </AdminCard>
        </Box>

        <Box sx={{ flex: 1, minWidth: 0, display: "flex" }}>
          <AdminCard
            title="Workspace"
            description="Each area mirrors what finance sees for your account."
            sx={{ width: "100%", height: "100%", display: "flex", flexDirection: "column" }}
            contentSx={{ flex: 1, display: "flex", flexDirection: "column" }}
          >
            <Stack spacing={1.5} sx={{ flex: 1, height: "100%" }}>
              {HOME_LINKS.map((link) => (
                <Box
                  key={link.title}
                  sx={{
                    flex: 1,
                    display: "flex",
                    flexDirection: "column",
                    justifyContent: "center",
                    alignItems: "flex-start",
                    border: `1px solid ${ADMIN.border.default}`,
                    borderRadius: 1,
                    p: 1.5,
                    minHeight: 0,
                  }}
                >
                  <Typography fontWeight={700} sx={{ width: "100%" }}>{link.title}</Typography>
                  <Typography variant="body2" color="text.secondary" sx={{ mt: 0.5, mb: 1.25, width: "100%" }}>
                    {link.body}
                  </Typography>
                  <EmployeeNavButton label={link.label} to={link.to} variant={link.variant} />
                </Box>
              ))}
            </Stack>
          </AdminCard>
        </Box>
      </Stack>

      {recentReceipts.length > 0 ? (
        <AdminCard
          title="Recent receipts"
          action={
            <Button component={RouterLink} to="/employee/receipts" size="small" variant="outlined">
              See all
            </Button>
          }
        >
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
        </AdminCard>
      ) : null}
    </AdminPage>
  );
}
