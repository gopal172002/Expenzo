import RefreshOutlined from "@mui/icons-material/RefreshOutlined";
import {
  Alert,
  Button,
  Chip,
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableRow,
  Typography,
} from "@mui/material";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import dayjs from "dayjs";
import { Link as RouterLink, useLocation } from "react-router-dom";
import { adminApi } from "../../api/adminApi";
import {
  AdminCard,
  AdminEmptyState,
  AdminKpi,
  AdminKpiRow,
  AdminPage,
  AdminTableShell,
} from "../../components/admin/ui";
import { ClaimTicketStatusChip } from "../../components/verification/ClaimQueryThread";
import { VerificationScoreChip } from "../../components/verification/VerificationPanel";
import { adminKeys } from "../../query/adminKeys";
import { inr } from "../../utils/labels";

const QUEUE_LIMIT = 200;

export const AdminFraudPage = () => {
  const location = useLocation();
  const queryClient = useQueryClient();

  const queueQuery = useQuery({
    queryKey: adminKeys.verificationQueue(QUEUE_LIMIT),
    queryFn: () => adminApi.getVerificationQueue(QUEUE_LIMIT),
  });

  const items = queueQuery.data?.items ?? [];
  const counts = queueQuery.data?.counts ?? {
    total: 0,
    highRisk: 0,
    awaitingEmployee: 0,
    employeeReplied: 0,
  };
  const error = queueQuery.error ? (queueQuery.error as Error).message : "";
  const showFullLoader = queueQuery.isPending && !queueQuery.data;

  const reload = () => {
    void queryClient.invalidateQueries({ queryKey: adminKeys.verificationQueue(QUEUE_LIMIT) });
  };

  return (
    <AdminPage
      title="Claim review"
      description="Claims scored against AllPay payments, attendance, duplicates, policy, and the receipt image. A matched payment is the strongest evidence; image forensics only supports it."
      actions={
        <Button
          variant="outlined"
          size="small"
          startIcon={<RefreshOutlined />}
          onClick={reload}
          disabled={queueQuery.isFetching}
        >
          Refresh
        </Button>
      }
      alert={error ? <Alert severity="error">{error}</Alert> : null}
    >
      <AdminKpiRow>
        <AdminKpi label="Claims needing review" value={String(counts.total)} accent="primary" loading={showFullLoader} />
        <AdminKpi label="High risk" value={String(counts.highRisk)} accent="error" loading={showFullLoader} />
        <AdminKpi
          label="Waiting on employee"
          value={String(counts.awaitingEmployee)}
          accent="warning"
          loading={showFullLoader}
        />
        <AdminKpi
          label="Employee replied"
          value={String(counts.employeeReplied)}
          accent="success"
          loading={showFullLoader}
        />
      </AdminKpiRow>

      <AdminCard
        variant="flush"
        title="Review queue"
        description="Highest risk first. Open a claim to read the full check breakdown and the query thread with the employee."
        action={
          queueQuery.isFetching && queueQuery.data ? (
            <Typography variant="caption" color="text.secondary">
              Updating…
            </Typography>
          ) : null
        }
      >
        <AdminTableShell
          loading={showFullLoader}
          isEmpty={!showFullLoader && items.length === 0}
          empty={
            <AdminEmptyState
              title="Nothing waiting for review"
              description="Every claim either matched an AllPay payment or passed the checks."
            />
          }
          sx={{ border: "none", borderRadius: 0, minHeight: 120 }}
        >
          <Table size="small" sx={{ opacity: queueQuery.isFetching ? 0.85 : 1 }}>
            <TableHead>
              <TableRow>
                <TableCell>Claim</TableCell>
                <TableCell>Employee</TableCell>
                <TableCell>Department</TableCell>
                <TableCell>Category</TableCell>
                <TableCell align="right">Amount</TableCell>
                <TableCell>Date</TableCell>
                <TableCell>Risk</TableCell>
                <TableCell>Why</TableCell>
                <TableCell>Query</TableCell>
                <TableCell align="right" />
              </TableRow>
            </TableHead>
            <TableBody>
              {items.map((tx) => (
                <TableRow key={tx.id} hover>
                  <TableCell>
                    <Typography variant="body2" fontWeight={700}>
                      {tx.merchantName}
                    </Typography>
                    <Typography variant="caption" color="text.secondary">
                      {tx.id}
                    </Typography>
                  </TableCell>
                  <TableCell>
                    <Typography variant="body2">{tx.employeeName}</Typography>
                    <Typography variant="caption" color="text.secondary">
                      {tx.employeeId}
                    </Typography>
                  </TableCell>
                  <TableCell>{tx.department}</TableCell>
                  <TableCell>
                    <Chip size="small" variant="outlined" label={tx.category} />
                  </TableCell>
                    <TableCell align="right">{inr(tx.amount)}</TableCell>
                  <TableCell>{dayjs(tx.dateTime).format("DD MMM YYYY HH:mm")}</TableCell>
                  <TableCell>
                    <VerificationScoreChip
                      score={tx.verificationScore}
                      verdict={tx.verificationVerdict}
                    />
                  </TableCell>
                  <TableCell sx={{ maxWidth: 320 }}>
                    <Typography variant="caption" color="text.secondary">
                      {tx.verification?.headline ?? "Not verified yet"}
                    </Typography>
                  </TableCell>
                  <TableCell>
                    <ClaimTicketStatusChip status={tx.claimTicketStatus} />
                  </TableCell>
                  <TableCell align="right">
                    <Button
                      component={RouterLink}
                      to={`/admin/transaction/${tx.id}`}
                      state={{ returnTo: `${location.pathname}${location.search}` }}
                      size="small"
                      sx={{ textTransform: "none" }}
                    >
                      Review
                    </Button>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </AdminTableShell>
      </AdminCard>
    </AdminPage>
  );
};
