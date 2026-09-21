import CloudUpload from "@mui/icons-material/CloudUpload";
import {
  Alert,
  Button,
  Chip,
  Stack,
  TextField,
} from "@mui/material";
import dayjs from "dayjs";
import { useMemo, useState } from "react";
import { Link as RouterLink } from "react-router-dom";
import {
  AdminCard,
  AdminEmptyState,
  AdminPage,
} from "../../components/admin/ui";
import { AllOptionSelect } from "../../components/filters/AllOptionSelect";
import { ReceiptCard, ReceiptGrid } from "../../components/receipts/ReceiptCard";
import { useEmployeeData } from "../../context/EmployeeDataContext";
import type { PaymentProof, Transaction } from "../../types";

function proofStatus(status: PaymentProof["status"]): Transaction["status"] {
  if (status === "approved") return "approved";
  if (status === "rejected") return "rejected";
  return "pending";
}

export function EmployeeReceiptsPage() {
  const { transactions, paymentProofs, errorMessage } = useEmployeeData();
  const [search, setSearch] = useState("");
  const [status, setStatus] = useState("");

  const items = useMemo(() => {
    const fromTx = transactions
      .filter((tx) => Boolean(tx.receiptUrl))
      .map((tx) => ({
        id: tx.id,
        receiptUrl: tx.receiptUrl,
        employeeName: tx.employeeName,
        merchantName: tx.merchantName,
        amount: tx.amount,
        dateTime: tx.dateTime,
        status: tx.status,
        category: tx.category,
        detailTo: `/employee/transaction/${tx.id}`,
      }));

    const txIds = new Set(fromTx.map((item) => item.id));
    const fromProofs = paymentProofs
      .filter((proof) => Boolean(proof.receiptUrl))
      .filter((proof) => !proof.transactionId || !txIds.has(proof.transactionId))
      .map((proof) => ({
        id: proof.id,
        receiptUrl: proof.receiptUrl,
        employeeName: proof.employeeName,
        merchantName: proof.description || proof.paymentType,
        amount: proof.amount,
        dateTime: proof.createdAt,
        status: proofStatus(proof.status),
        category: proof.paymentType,
        detailTo: proof.transactionId
          ? `/employee/transaction/${proof.transactionId}`
          : "/employee/payment-proof",
      }));

    const q = search.trim().toLowerCase();
    return [...fromTx, ...fromProofs]
      .filter((item) => (status ? item.status === status : true))
      .filter((item) => {
        if (!q) return true;
        return [item.merchantName, item.id, item.category].join(" ").toLowerCase().includes(q);
      })
      .sort((a, b) => dayjs(b.dateTime).valueOf() - dayjs(a.dateTime).valueOf());
  }, [transactions, paymentProofs, search, status]);

  return (
    <AdminPage
      title="My receipts"
      description="Bills and payment proofs you uploaded. Finance reviews the same files from the admin receipts workspace."
      actions={
        <Button
          component={RouterLink}
          to="/employee/payment-proof"
          variant="contained"
          startIcon={<CloudUpload />}
        >
          Upload a receipt
        </Button>
      }
    >
      {errorMessage ? <Alert severity="error">{errorMessage}</Alert> : null}

      <AdminCard title="Filters">
        <Stack direction={{ xs: "column", md: "row" }} spacing={1.5} alignItems={{ md: "center" }}>
          <TextField
            size="small"
            placeholder="Search merchant or receipt"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            sx={{ flex: 1, minWidth: 220 }}
          />
          <AllOptionSelect
            label="Status"
            allLabel="All statuses"
            value={status}
            onChange={setStatus}
            minWidth={160}
            options={[
              { value: "pending", label: "Pending" },
              { value: "approved", label: "Approved" },
              { value: "rejected", label: "Rejected" },
              { value: "flagged", label: "Flagged" },
            ]}
          />
          <Chip label={`${items.length} receipts`} size="small" />
        </Stack>
      </AdminCard>

      {items.length === 0 ? (
        <AdminCard>
          <AdminEmptyState
            title="No receipts yet"
            description="Upload a screenshot or bill from Payment proof. It will show here and on the admin receipts dashboard."
            action={
              <Button component={RouterLink} to="/employee/payment-proof" variant="contained">
                Submit payment proof
              </Button>
            }
          />
        </AdminCard>
      ) : (
        <ReceiptGrid>
          {items.map((item) => (
            <ReceiptCard key={item.id} item={item} showEmployee={false} />
          ))}
        </ReceiptGrid>
      )}
    </AdminPage>
  );
}
