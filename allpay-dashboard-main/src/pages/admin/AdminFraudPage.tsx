import RefreshOutlined from "@mui/icons-material/RefreshOutlined";
import {
  Alert,
  Box,
  Button,
  Chip,
  CircularProgress,
  Stack,
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
import { PageHeader } from "../../components/layout/PageHeader";
import { ClaimTicketStatusChip } from "../../components/verification/ClaimQueryThread";
import { VerificationScoreChip } from "../../components/verification/VerificationPanel";
import { adminKeys } from "../../query/adminKeys";

const QUEUE_LIMIT = 200;
const fmt = (value: number) => `Rs.${value.toLocaleString("en-IN")}`;

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

  const stats = [
    { label: "Claims needing review", value: String(counts.total), accent: "#2563EB" },
    { label: "High risk", value: String(counts.highRisk), accent: "#DC2626" },
    { label: "Waiting on employee", value: String(counts.awaitingEmployee), accent: "#D97706" },
    { label: "Employee replied", value: String(counts.employeeReplied), accent: "#059669" },
  ];

  return (
    <Stack spacing={2.5}>
      <PageHeader
        title="Claim review"
        description="Claims scored against AllPay payments, attendance, duplicates, policy, and the receipt image. A matched payment is the strongest evidence; image forensics only supports it."
        actions={
          <Button
            variant="outlined"
            size="small"
            startIcon={<RefreshOutlined />}
            onClick={reload}
            disabled={queueQuery.isFetching}
            sx={{ textTransform: "none" }}
          >
            Refresh
          </Button>
        }
      />

      {error ? <Alert severity="error">{error}</Alert> : null}

      <Stack direction={{ xs: "column", sm: "row" }} spacing={1.25}>
        {stats.map((stat) => (
          <Box
            key={stat.label}
            sx={{
              flex: 1,
              minWidth: 0,
              bgcolor: "#fff",
              borderLeft: "3px solid",
              borderColor: stat.accent,
              px: 1.75,
              py: 1.5,
              opacity: showFullLoader ? 0.65 : 1,
            }}
          >
            <Typography
              variant="caption"
              color="text.secondary"
              sx={{ fontWeight: 650, letterSpacing: "0.04em", textTransform: "uppercase" }}
            >
              {stat.label}
            </Typography>
            <Typography variant="h5" fontWeight={800} sx={{ mt: 0.5, letterSpacing: "-0.02em" }}>
              {stat.value}
            </Typography>
          </Box>
        ))}
      </Stack>

      <Box
        sx={{
          bgcolor: "#fff",
          border: "1px solid",
          borderColor: "divider",
          borderRadius: 0,
          p: 2,
        }}
      >
        <Stack direction="row" spacing={1} alignItems="center" justifyContent="space-between" sx={{ mb: 0.5 }}>
          <Typography variant="h6" fontWeight={700}>
            Review queue
          </Typography>
          {queueQuery.isFetching && queueQuery.data ? (
            <Typography variant="caption" color="text.secondary">
              Updating…
            </Typography>
          ) : null}
        </Stack>
        <Typography variant="body2" color="text.secondary" sx={{ mb: 1.5 }}>
          Highest risk first. Open a claim to read the full check breakdown and the query thread with the
          employee.
        </Typography>

        <Box
          sx={{
            border: "1px solid",
            borderColor: "divider",
            borderRadius: 0,
            overflow: "hidden",
            bgcolor: "#fff",
            position: "relative",
            minHeight: 120,
          }}
        >
          {showFullLoader ? (
            <Stack alignItems="center" py={4}>
              <CircularProgress />
            </Stack>
          ) : items.length === 0 ? (
            <Box sx={{ p: 2 }}>
              <Alert severity="success">
                Nothing is waiting for review. Every claim either matched an AllPay payment or passed the checks.
              </Alert>
            </Box>
          ) : (
            <Box sx={{ overflowX: "auto", opacity: queueQuery.isFetching ? 0.85 : 1 }}>
              <Table size="small">
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
                      <TableCell align="right">{fmt(tx.amount)}</TableCell>
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
            </Box>
          )}
        </Box>
      </Box>
    </Stack>
  );
};
