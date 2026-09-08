import ArrowBack from "@mui/icons-material/ArrowBack";
import CheckCircleOutline from "@mui/icons-material/CheckCircleOutline";
import ContentCopy from "@mui/icons-material/ContentCopy";
import HighlightOff from "@mui/icons-material/HighlightOff";
import LocationOnOutlined from "@mui/icons-material/LocationOnOutlined";
import Print from "@mui/icons-material/Print";
import UploadFile from "@mui/icons-material/UploadFile";
import {
  Alert,
  Box,
  Button,
  Card,
  CardContent,
  Chip,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  Link,
  Stack,
  TextField,
  Typography,
} from "@mui/material";
import dayjs from "dayjs";
import { useCallback, useMemo, useRef, useState } from "react";
import { Link as RouterLink, useLocation, useNavigate, useParams } from "react-router-dom";
import { adminApi } from "../../api/adminApi";
import { ReceiptFraudScoreChip } from "../../components/admin/ReceiptFraudScoreChip";
import { ReceiptImage } from "../../components/receipts/ReceiptImage";
import { ClaimQueryThread } from "../../components/verification/ClaimQueryThread";
import { ClaimReviewInsight } from "../../components/verification/ClaimReviewInsight";
import { VerificationPanel, VerificationScoreChip } from "../../components/verification/VerificationPanel";
import { useAdminData } from "../../context/AdminDataContext";
import type { ClaimTicket, TransactionStatus, VerificationResult } from "../../types";
import { inr, statusLabel } from "../../utils/labels";

function isSafeInternalPath(value: unknown): value is string {
  return typeof value === "string" && value.startsWith("/") && !value.startsWith("//");
}

function statusColor(status: TransactionStatus): "default" | "success" | "error" | "warning" | "info" {
  if (status === "approved") return "success";
  if (status === "rejected") return "error";
  if (status === "flagged") return "warning";
  return "default";
}

function FieldGrid({
  items,
}: {
  items: { label: string; value: string; mono?: boolean }[];
}) {
  return (
    <Box
      sx={{
        display: "grid",
        gridTemplateColumns: { xs: "1fr", sm: "1fr 1fr" },
        gap: 1.25,
      }}
    >
      {items.map((item) => (
        <Box
          key={item.label}
          sx={{
            py: 0.85,
            px: 1,
            bgcolor: "#F9FAFB",
            minWidth: 0,
          }}
        >
          <Typography
            variant="caption"
            color="text.secondary"
            sx={{ display: "block", fontWeight: 600, letterSpacing: "0.02em" }}
          >
            {item.label}
          </Typography>
          <Typography
            variant="body2"
            fontWeight={650}
            sx={{
              mt: 0.2,
              wordBreak: "break-word",
              fontFamily: item.mono ? "ui-monospace, SFMono-Regular, Menlo, monospace" : undefined,
              fontSize: item.mono ? 12.5 : undefined,
            }}
          >
            {item.value}
          </Typography>
        </Box>
      ))}
    </Box>
  );
}

function MapPlaceholder() {
  return (
    <Box
      sx={{
        position: "relative",
        mt: 1,
        minHeight: 200,
        height: "calc(100% - 36px)",
        overflow: "hidden",
        bgcolor: "#E8EEF7",
        backgroundImage: `
          linear-gradient(rgba(148,163,184,0.25) 1px, transparent 1px),
          linear-gradient(90deg, rgba(148,163,184,0.25) 1px, transparent 1px)
        `,
        backgroundSize: "28px 28px",
      }}
    >
      <Box
        sx={{
          position: "absolute",
          inset: "18% 22% 28% 18%",
          borderRadius: "40% 60% 55% 45%",
          bgcolor: "rgba(148, 163, 184, 0.22)",
        }}
      />
      <Box
        sx={{
          position: "absolute",
          inset: "40% 30% 22% 35%",
          borderRadius: "50%",
          bgcolor: "rgba(100, 116, 139, 0.18)",
        }}
      />
      <Box
        className="claim-map-pin"
        sx={{
          position: "absolute",
          left: "52%",
          top: "46%",
          color: "#DC2626",
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
        }}
      >
        <LocationOnOutlined sx={{ fontSize: 36, filter: "drop-shadow(0 2px 2px rgba(0,0,0,0.15))" }} />
      </Box>
      <Box
        sx={{
          position: "absolute",
          left: 12,
          right: 12,
          bottom: 12,
          px: 1.25,
          py: 1,
          bgcolor: "rgba(255,255,255,0.92)",
          border: "1px solid",
          borderColor: "divider",
        }}
      >
        <Typography variant="body2" fontWeight={700}>
          Location unavailable
        </Typography>
        <Typography variant="caption" color="text.secondary">
          Coordinates will appear here when the mobile capture includes GPS.
        </Typography>
      </Box>
    </Box>
  );
}

export const AdminTransactionDetailPage = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const location = useLocation();
  const {
    transactions,
    uploadReceipt,
    isSaving,
    errorMessage,
    refreshTransactions,
    approveTransaction,
    rejectTransaction,
  } = useAdminData();
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const transaction = useMemo(() => transactions.find((item) => item.id === id), [id, transactions]);

  const [verificationOverride, setVerificationOverride] = useState<VerificationResult | undefined>();
  const [ticketOverride, setTicketOverride] = useState<ClaimTicket | undefined>();
  const [verifying, setVerifying] = useState(false);
  const [verifyError, setVerifyError] = useState("");
  const [copied, setCopied] = useState(false);
  const [approveOpen, setApproveOpen] = useState(false);
  const [approveAmount, setApproveAmount] = useState("");
  const [rejectOpen, setRejectOpen] = useState(false);
  const [rejectReason, setRejectReason] = useState("Missing supporting bill");

  const verification = verificationOverride ?? transaction?.verification;
  const ticket = ticketOverride ?? transaction?.claimTicket;
  const canDecide =
    transaction?.status === "pending" || transaction?.status === "flagged";

  const openApprove = useCallback(() => {
    if (!transaction) return;
    setApproveAmount(String(transaction.claimedAmount ?? transaction.amount ?? ""));
    setApproveOpen(true);
  }, [transaction]);

  const openReject = useCallback(() => {
    setRejectReason("Missing supporting bill");
    setRejectOpen(true);
  }, []);

  const handleApprove = useCallback(async () => {
    if (!transaction || Number(approveAmount) <= 0) return;
    await approveTransaction(transaction.id, Number(approveAmount));
    setApproveOpen(false);
  }, [approveAmount, approveTransaction, transaction]);

  const handleReject = useCallback(async () => {
    if (!transaction || !rejectReason.trim()) return;
    await rejectTransaction(transaction.id, rejectReason.trim());
    setRejectOpen(false);
  }, [rejectReason, rejectTransaction, transaction]);

  const returnTo = isSafeInternalPath((location.state as { returnTo?: unknown } | null)?.returnTo)
    ? (location.state as { returnTo: string }).returnTo
    : null;

  const goBack = useCallback(() => {
    if (returnTo) {
      navigate(returnTo);
      return;
    }
    const idx = (window.history.state as { idx?: number } | null)?.idx;
    if (typeof idx === "number" && idx > 0) {
      navigate(-1);
      return;
    }
    navigate("/admin");
  }, [navigate, returnTo]);

  const runVerification = useCallback(async () => {
    if (!id) return;
    setVerifying(true);
    setVerifyError("");
    try {
      const result = await adminApi.verifyTransaction(id);
      setVerificationOverride(result.verification);
      await refreshTransactions();
    } catch (e) {
      setVerifyError((e as Error).message);
    } finally {
      setVerifying(false);
    }
  }, [id, refreshTransactions]);

  const copyUpi = useCallback(async () => {
    if (!transaction) return;
    await navigator.clipboard.writeText(transaction.upiRefId);
    setCopied(true);
    window.setTimeout(() => setCopied(false), 1600);
  }, [transaction]);

  if (!transaction) {
    return (
      <Stack spacing={2}>
        <Button startIcon={<ArrowBack />} onClick={goBack} sx={{ alignSelf: "flex-start", textTransform: "none" }}>
          Back
        </Button>
        <Typography>Transaction not found.</Typography>
      </Stack>
    );
  }

  const crumbParentTo = returnTo ?? "/admin";
  const crumbParentLabel = returnTo?.startsWith("/admin/transactions")
    ? "Transactions"
    : returnTo?.startsWith("/admin/receipts")
      ? "Employee receipts"
      : returnTo?.startsWith("/admin/fraud")
        ? "Claim review"
        : "Latest receipts";

  const accent =
    transaction.status === "flagged" || verification?.verdict === "needs_review" || verification?.verdict === "high_risk"
      ? "#D97706"
      : transaction.status === "approved" || verification?.verdict === "verified"
        ? "#059669"
        : transaction.status === "rejected"
          ? "#DC2626"
          : "#2563EB";

  return (
    <Stack spacing={2} className="claim-fade-up">
      <Stack direction="row" spacing={1} alignItems="center" flexWrap="wrap">
        <Button startIcon={<ArrowBack />} onClick={goBack} sx={{ textTransform: "none" }}>
          Back
        </Button>
        <Typography variant="body2" color="text.secondary" component="span">
          <Link component={RouterLink} to={crumbParentTo} underline="hover" color="inherit">
            {crumbParentLabel}
          </Link>
          {" / "}
          {transaction.id}
        </Typography>
      </Stack>

      <Box
        className="claim-fade-up claim-fade-up-delay-1"
        sx={{
          display: "grid",
          gridTemplateColumns: { xs: "1fr", lg: "1fr auto" },
          gap: 2,
          alignItems: "start",
          pl: 1.5,
          borderLeft: "3px solid",
          borderColor: accent,
        }}
      >
        <Box sx={{ minWidth: 0 }}>
          <Stack direction="row" spacing={1} alignItems="center" flexWrap="wrap" useFlexGap sx={{ mb: 0.75 }}>
            <Chip size="small" color={statusColor(transaction.status)} label={statusLabel(transaction.status)} />
            <VerificationScoreChip score={verification?.riskScore} verdict={verification?.verdict} />
            <ReceiptFraudScoreChip
              score={transaction.receiptFraudScore}
              tier={transaction.receiptFraudTier}
            />
          </Stack>
          <Typography variant="h5" fontWeight={800} sx={{ letterSpacing: "-0.02em" }}>
            {transaction.merchantName}
          </Typography>
          <Typography variant="h6" fontWeight={700} color="text.primary" sx={{ mt: 0.25 }}>
            {inr(transaction.claimedAmount)}
          </Typography>
          <Typography variant="body2" color="text.secondary" sx={{ mt: 0.75 }}>
            {transaction.employeeName} · {transaction.department} ·{" "}
            {dayjs(transaction.dateTime).format("DD MMM YYYY, HH:mm")}
          </Typography>
          {transaction.adminDecision ? (
            <Typography variant="caption" color="text.secondary" sx={{ display: "block", mt: 0.5 }}>
              Decision: {transaction.adminDecision}
              {transaction.adminDecisionAt
                ? ` · ${dayjs(transaction.adminDecisionAt).format("DD MMM YYYY, HH:mm")}`
                : ""}
            </Typography>
          ) : null}
        </Box>

        <Stack direction="row" spacing={1} flexWrap="wrap" useFlexGap>
          {canDecide ? (
            <>
              <Button
                variant="contained"
                color="success"
                startIcon={<CheckCircleOutline />}
                disabled={isSaving}
                onClick={openApprove}
                sx={{ textTransform: "none" }}
              >
                Approve
              </Button>
              <Button
                variant="outlined"
                color="error"
                startIcon={<HighlightOff />}
                disabled={isSaving}
                onClick={openReject}
                sx={{ textTransform: "none" }}
              >
                Reject
              </Button>
            </>
          ) : null}
          <Button startIcon={<ContentCopy />} onClick={() => void copyUpi()} sx={{ textTransform: "none" }}>
            {copied ? "Copied" : "Copy UPI Ref"}
          </Button>
          <Button variant="outlined" startIcon={<Print />} onClick={() => window.print()} sx={{ textTransform: "none" }}>
            Print
          </Button>
        </Stack>
      </Box>

      {errorMessage ? <Alert severity="error">{errorMessage}</Alert> : null}

      {verifyError ? (
        <Alert severity="error" onClose={() => setVerifyError("")}>
          {verifyError}
        </Alert>
      ) : null}

      <Box
        sx={{
          display: "grid",
          gridTemplateColumns: { xs: "1fr", lg: "1fr 1.05fr" },
          gap: 1.25,
          alignItems: "stretch",
          "& > .MuiCard-root, & > .detail-panel > .MuiCard-root": {
            height: "100%",
            border: 0,
            borderRadius: 0,
            boxShadow: "none",
            bgcolor: "#fff",
          },
          "& .MuiCardContent-root": {
            py: 1.75,
            px: 1.75,
            "&:last-child": { pb: 1.75 },
          },
        }}
      >
        <Card className="claim-fade-up claim-fade-up-delay-1">
          <CardContent>
            <Stack direction="row" justifyContent="space-between" alignItems="center" sx={{ mb: 1 }}>
              <Typography variant="subtitle1" fontWeight={700}>
                Receipt
              </Typography>
              <ReceiptFraudScoreChip
                score={transaction.receiptFraudScore}
                tier={transaction.receiptFraudTier}
              />
            </Stack>
            {transaction.receiptUrl ? (
              <ReceiptImage url={transaction.receiptUrl} alt={`${transaction.merchantName} receipt`} fit="width" />
            ) : (
              <Typography color="text.secondary" sx={{ py: 2 }}>
                No receipt on file yet.
              </Typography>
            )}
            <input
              ref={fileInputRef}
              type="file"
              accept="image/*,application/pdf"
              aria-label="Upload receipt image"
              style={{ display: "none" }}
              onChange={async (e) => {
                const file = e.target.files?.[0];
                e.target.value = "";
                if (!file || !id) return;
                await uploadReceipt(id, file);
              }}
            />
            <Button
              variant="outlined"
              size="small"
              startIcon={<UploadFile />}
              disabled={isSaving}
              onClick={() => fileInputRef.current?.click()}
              sx={{ mt: 1.5, textTransform: "none" }}
            >
              {isSaving ? "Uploading…" : "Replace receipt"}
            </Button>
            {errorMessage ? (
              <Typography color="error" variant="body2" sx={{ mt: 1 }}>
                {errorMessage}
              </Typography>
            ) : null}
          </CardContent>
        </Card>

        <Box className="detail-panel claim-fade-up claim-fade-up-delay-2" sx={{ minWidth: 0 }}>
          <VerificationPanel
            verification={verification}
            onRerun={() => void runVerification()}
            rerunning={verifying}
          />
        </Box>

        <Card className="claim-fade-up claim-fade-up-delay-3">
          <CardContent>
            <Typography variant="subtitle1" fontWeight={700} sx={{ mb: 1.25 }}>
              Claim details
            </Typography>
            <FieldGrid
              items={[
                { label: "Employee", value: transaction.employeeName },
                { label: "Department", value: transaction.department },
                { label: "Merchant", value: transaction.merchantName },
                { label: "MCC", value: transaction.mcc || "—" },
                { label: "UPI app", value: transaction.upiApp },
                { label: "UPI reference", value: transaction.upiRefId, mono: true },
                { label: "Captured amount", value: inr(transaction.amount) },
                { label: "Claimed amount", value: inr(transaction.claimedAmount) },
                { label: "Transaction time", value: dayjs(transaction.dateTime).format("DD MMM YYYY, HH:mm") },
                { label: "Status", value: statusLabel(transaction.status) },
                { label: "Decision", value: transaction.adminDecision || "Pending review" },
                {
                  label: "Decision time",
                  value: transaction.adminDecisionAt
                    ? dayjs(transaction.adminDecisionAt).format("DD MMM YYYY, HH:mm")
                    : "—",
                },
              ]}
            />
          </CardContent>
        </Card>

        <Card className="claim-fade-up claim-fade-up-delay-4">
          <CardContent sx={{ height: "100%", display: "flex", flexDirection: "column" }}>
            <Typography variant="subtitle1" fontWeight={700}>
              Location
            </Typography>
            <Box sx={{ flex: 1, minHeight: 200 }}>
              <MapPlaceholder />
            </Box>
          </CardContent>
        </Card>
      </Box>

      <ClaimQueryThread
        variant="widget"
        ticket={ticket}
        role="admin"
        employeeName={transaction.employeeName}
        emptyMessage="No query yet. Ask this employee for context on the claim."
        onSend={async (message) => {
          if (!id) return;
          const result = await adminApi.sendClaimMessage(id, message);
          setTicketOverride(result.claimTicket);
          await refreshTransactions();
        }}
      />

      <Box className="claim-fade-up claim-fade-up-delay-5">
        <ClaimReviewInsight
          flags={transaction.flags}
          timeline={transaction.timeline}
          dateTime={transaction.dateTime}
          status={transaction.status}
          verifiedAt={verification?.evaluatedAt}
          decidedAt={transaction.adminDecisionAt}
        />
      </Box>

      <Dialog open={approveOpen} onClose={() => !isSaving && setApproveOpen(false)} maxWidth="xs" fullWidth>
        <DialogTitle>Approve transaction</DialogTitle>
        <DialogContent>
          <Stack spacing={1.5} sx={{ mt: 1 }}>
            <Typography variant="body2" color="text.secondary">
              Enter the amount to approve for {transaction.merchantName}.
            </Typography>
            <TextField
              label="Approved amount (INR)"
              type="number"
              value={approveAmount}
              onChange={(e) => setApproveAmount(e.target.value)}
              fullWidth
              size="small"
              autoFocus
            />
          </Stack>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setApproveOpen(false)} disabled={isSaving}>
            Cancel
          </Button>
          <Button
            variant="contained"
            color="success"
            disabled={isSaving || Number(approveAmount) <= 0}
            onClick={() => void handleApprove()}
          >
            {isSaving ? "Saving…" : "Approve"}
          </Button>
        </DialogActions>
      </Dialog>

      <Dialog open={rejectOpen} onClose={() => !isSaving && setRejectOpen(false)} maxWidth="sm" fullWidth>
        <DialogTitle>Reject transaction</DialogTitle>
        <DialogContent>
          <Stack spacing={1.5} sx={{ mt: 1 }}>
            <Typography variant="body2" color="text.secondary">
              Provide a rejection reason for {transaction.merchantName}.
            </Typography>
            <TextField
              label="Rejection reason"
              value={rejectReason}
              onChange={(e) => setRejectReason(e.target.value.slice(0, 300))}
              fullWidth
              size="small"
              autoFocus
            />
          </Stack>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setRejectOpen(false)} disabled={isSaving}>
            Cancel
          </Button>
          <Button
            variant="contained"
            color="error"
            disabled={isSaving || !rejectReason.trim()}
            onClick={() => void handleReject()}
          >
            {isSaving ? "Saving…" : "Reject"}
          </Button>
        </DialogActions>
      </Dialog>
    </Stack>
  );
};
