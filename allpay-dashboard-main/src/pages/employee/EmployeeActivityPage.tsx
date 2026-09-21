import WarningAmber from "@mui/icons-material/WarningAmber";
import {
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
import { useMemo } from "react";
import { Link as RouterLink } from "react-router-dom";
import {
  AdminCard,
  AdminEmptyState,
  AdminPage,
  AdminTableShell,
} from "../../components/admin/ui";
import { useEmployeeData } from "../../context/EmployeeDataContext";
import { ADMIN } from "../../theme";

const fmt = (n: number) => `₹${n.toLocaleString("en-IN")}`;

export function EmployeeActivityPage() {
  const { transactions } = useEmployeeData();
  const flagged = useMemo(() => {
    const rows: typeof transactions = [];
    for (const tx of transactions) {
      const visibleFlags = tx.flags.filter((f) => !f.adminOnly);
      if (visibleFlags.length > 0) {
        rows.push({ ...tx, flags: visibleFlags });
        continue;
      }
      if (tx.status === "flagged" && tx.flags.every((f) => !f.adminOnly)) {
        rows.push({ ...tx, flags: visibleFlags });
      }
    }
    return rows.sort((a, b) => dayjs(b.dateTime).valueOf() - dayjs(a.dateTime).valueOf());
  }, [transactions]);

  return (
    <AdminPage
      title="Activity & flags"
      description="Automated rule hits on your expenses. Finance investigates org-wide from Claim review. A flag is not a final rejection."
    >
      <AdminCard title="Flagged expenses" variant="flush">
        <AdminTableShell
          isEmpty={flagged.length === 0}
          empty={
            <AdminEmptyState
              title="No flagged activity"
              description="When a policy or verification rule hits one of your expenses, it appears here with a plain-language reason."
              icon={<WarningAmber color="warning" />}
            />
          }
        >
          <Table size="small">
            <TableHead>
              <TableRow>
                <TableCell>When</TableCell>
                <TableCell>Merchant</TableCell>
                <TableCell>Amount</TableCell>
                <TableCell>Rules</TableCell>
                <TableCell align="right">Open</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {flagged.map((tx) => (
                <TableRow key={tx.id} hover>
                  <TableCell>{dayjs(tx.dateTime).format("DD MMM YYYY HH:mm")}</TableCell>
                  <TableCell sx={{ fontWeight: 600 }}>{tx.merchantName}</TableCell>
                  <TableCell>{fmt(tx.amount)}</TableCell>
                  <TableCell>
                    <Stack direction="row" spacing={0.6} flexWrap="wrap" useFlexGap>
                      {tx.flags.map((flag) => (
                        <Chip
                          key={flag.id}
                          label={flag.reason}
                          size="small"
                          color="warning"
                          sx={{ fontWeight: 600, borderRadius: `${ADMIN.radius.sm}px` }}
                        />
                      ))}
                      {tx.flags.length === 0 ? (
                        <Chip label="Flagged" size="small" color="warning" />
                      ) : null}
                    </Stack>
                  </TableCell>
                  <TableCell align="right">
                    <Typography
                      component={RouterLink}
                      to={`/employee/transaction/${tx.id}`}
                      sx={{
                        color: "primary.main",
                        fontWeight: 700,
                        fontSize: 13,
                        textDecoration: "none",
                      }}
                    >
                      View
                    </Typography>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </AdminTableShell>
      </AdminCard>
    </AdminPage>
  );
}
