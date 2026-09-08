import CloudUpload from "@mui/icons-material/CloudUpload";
import {
  Alert,
  Button,
  Card,
  CardContent,
  Chip,
  Stack,
  TextField,
  Typography,
} from "@mui/material";
import dayjs from "dayjs";
import { useMemo, useState } from "react";
import { Link as RouterLink } from "react-router-dom";
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
    <Stack spacing={2.5}>
      {errorMessage ? <Alert severity="error">{errorMessage}</Alert> : null}

      <Card sx={{ borderRadius: 3 }}>
        <CardContent>
          <Stack direction={{ xs: "column", sm: "row" }} spacing={2} justifyContent="space-between">
            <div>
              <Typography variant="h5" fontWeight={800}>
                My receipts
              </Typography>
              <Typography color="text.secondary" sx={{ mt: 0.5 }}>
                Bills and payment proofs you uploaded. Finance reviews these from the admin receipts dashboard.
              </Typography>
            </div>
            <Button
              component={RouterLink}
              to="/employee/payment-proof"
              variant="contained"
              startIcon={<CloudUpload />}
              sx={{ textTransform: "none", alignSelf: { sm: "center" } }}
            >
              Upload a receipt
            </Button>
          </Stack>
          <Stack direction={{ xs: "column", md: "row" }} spacing={1.5} sx={{ mt: 2 }}>
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
                { value: "pending", label: "pending" },
                { value: "approved", label: "approved" },
                { value: "rejected", label: "rejected" },
                { value: "flagged", label: "flagged" },
              ]}
            />
            <Chip label={`${items.length} receipts`} />
          </Stack>
        </CardContent>
      </Card>

      {items.length === 0 ? (
        <Card sx={{ borderRadius: 3 }}>
          <CardContent>
            <Typography fontWeight={700} gutterBottom>
              No receipts yet
            </Typography>
            <Typography color="text.secondary" sx={{ mb: 2 }}>
              Upload a screenshot or bill from Payment proof. It will show up here and on the admin receipts dashboard.
            </Typography>
            <Button component={RouterLink} to="/employee/payment-proof" variant="contained" sx={{ textTransform: "none" }}>
              Submit payment proof
            </Button>
          </CardContent>
        </Card>
      ) : (
        <ReceiptGrid>
          {items.map((item) => (
            <ReceiptCard key={item.id} item={item} showEmployee={false} />
          ))}
        </ReceiptGrid>
      )}
    </Stack>
  );
}
