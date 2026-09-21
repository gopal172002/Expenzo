import FilterList from "@mui/icons-material/FilterList";
import WarningAmber from "@mui/icons-material/WarningAmber";
import {
  Alert,
  Chip,
  Stack,
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableRow,
  TextField,
  Typography,
} from "@mui/material";
import dayjs from "dayjs";
import { Link as RouterLink } from "react-router-dom";
import {
  AdminCard,
  AdminEmptyState,
  AdminPage,
  AdminTableShell,
} from "../../components/admin/ui";
import { AllOptionSelect } from "../../components/filters/AllOptionSelect";
import { useEmployeeData } from "../../context/EmployeeDataContext";
import { ADMIN, ADMIN_FILTER_FIELD_SX } from "../../theme";

const fmt = (value: number) => `₹${value.toLocaleString("en-IN")}`;

export function EmployeeTransactionsPage() {
  const { filteredTransactions, transactions, statusFilter, setStatusFilter, search, setSearch, errorMessage } =
    useEmployeeData();
  const total = filteredTransactions.reduce((acc, tx) => acc + tx.amount, 0);

  return (
    <AdminPage
      title="My transactions"
      description="Payment records for your account. Finance approves or rejects reimbursement from the admin Transactions screen — a recorded payment is not an approved claim."
    >
      {errorMessage ? <Alert severity="error">{errorMessage}</Alert> : null}

      <AdminCard title="Filters">
        <Stack direction={{ xs: "column", md: "row" }} spacing={2} alignItems={{ md: "center" }}>
          <Stack direction="row" spacing={1} alignItems="center">
            <FilterList color="action" fontSize="small" />
            <Typography fontWeight={700} variant="body2">
              Narrow results
            </Typography>
          </Stack>
          <AllOptionSelect
            label="Status"
            allLabel="All statuses"
            value={statusFilter}
            onChange={setStatusFilter}
            minWidth={160}
            options={[
              { value: "pending", label: "Pending" },
              { value: "approved", label: "Approved" },
              { value: "rejected", label: "Rejected" },
              { value: "flagged", label: "Flagged" },
            ]}
          />
          <TextField
            size="small"
            placeholder="Search merchant, reference, or ID"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            sx={{ flex: 1, ...ADMIN_FILTER_FIELD_SX }}
          />
        </Stack>
      </AdminCard>

      <Alert severity="info" sx={{ borderRadius: 1 }}>
        Showing {filteredTransactions.length} of {transactions.length} records · Total{" "}
        {fmt(total)}
      </Alert>

      <AdminCard title="Transactions" variant="flush">
        <AdminTableShell
          isEmpty={filteredTransactions.length === 0}
          empty={
            <AdminEmptyState
              title="No matching transactions"
              description="Try another status filter or clear search. New expenses appear after mobile Scan & Pay or payment proof upload."
            />
          }
        >
          <Table size="small">
            <TableHead>
              <TableRow>
                <TableCell>Merchant</TableCell>
                <TableCell>Category</TableCell>
                <TableCell>Amount</TableCell>
                <TableCell>Date</TableCell>
                <TableCell>Status</TableCell>
                <TableCell align="right">Actions</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {filteredTransactions.map((tx) => (
                <TableRow key={tx.id} hover>
                  <TableCell>
                    <Typography fontWeight={600}>{tx.merchantName}</Typography>
                    <Typography variant="caption" color="text.secondary">
                      {tx.upiRefId || "—"}
                    </Typography>
                  </TableCell>
                  <TableCell>{tx.category}</TableCell>
                  <TableCell>{fmt(tx.amount)}</TableCell>
                  <TableCell>{dayjs(tx.dateTime).format("DD MMM YYYY, HH:mm")}</TableCell>
                  <TableCell>
                    <Chip
                      size="small"
                      label={tx.status}
                      color={
                        tx.status === "flagged"
                          ? "warning"
                          : tx.status === "approved"
                            ? "success"
                            : tx.status === "rejected"
                              ? "error"
                              : "default"
                      }
                      icon={tx.status === "flagged" ? <WarningAmber /> : undefined}
                      sx={{ borderRadius: `${ADMIN.radius.sm}px` }}
                    />
                  </TableCell>
                  <TableCell align="right">
                    <Typography
                      component={RouterLink}
                      to={`/employee/transaction/${tx.id}`}
                      sx={{ color: "primary.main", fontWeight: 700, textDecoration: "none" }}
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
