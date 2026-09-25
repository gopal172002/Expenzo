import ArrowBack from "@mui/icons-material/ArrowBack";
import CheckCircleOutline from "@mui/icons-material/CheckCircleOutline";
import ContentCopy from "@mui/icons-material/ContentCopy";
import HighlightOff from "@mui/icons-material/HighlightOff";
import Print from "@mui/icons-material/Print";
import UploadFile from "@mui/icons-material/UploadFile";
import {
  Alert,
  Box,
  Button,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  Stack,
  TextField,
  Typography,
} from "@mui/material";
import dayjs from "dayjs";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useLocation, useNavigate, useParams } from "react-router-dom";
import { adminApi } from "../../api/adminApi";
import { AdminStatusChip } from "../../components/admin/AdminStatusChip";
import {
  PaymentLocationMap,
  type PaymentLocationCoords,
} from "../../components/admin/PaymentLocationMap";
import { ReceiptFraudScoreChip } from "../../components/admin/ReceiptFraudScoreChip";
import { AdminBreadcrumbs, AdminCard, AdminEmptyState, AdminPage } from "../../components/admin/ui";
import { ReceiptImage } from "../../components/receipts/ReceiptImage";
import { ClaimQueryThread } from "../../components/verification/ClaimQueryThread";
import { ClaimReviewInsight } from "../../components/verification/ClaimReviewInsight";
import { VerificationPanel, VerificationScoreChip } from "../../components/verification/VerificationPanel";
import { useAdminData } from "../../context/AdminDataContext";
import { ADMIN } from "../../theme";
import type { ClaimTicket, VerificationResult } from "../../types";
import { inr, statusLabel } from "../../utils/labels";

function isSafeInternalPath(value: unknown): value is string {
  return typeof value === "string" && value.startsWith("/") && !value.startsWith("//");
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
            bgcolor: ADMIN.surface.muted,
            borderRadius: 1,
            border: "1px solid",
            borderColor: "divider",
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
            fontWeight={600}
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

function resolveCoords(input: {
  latitude?: number | null;
  longitude?: number | null;
  locationCapturedAt?: string | null;
  mobileLocation?: {
    latitude: number;
    longitude: number;
    capturedAt: string;
  } | null;
}): PaymentLocationCoords | null {
  const lat = input.latitude ?? input.mobileLocation?.latitude;
  const lng = input.longitude ?? input.mobileLocation?.longitude;
  if (
    typeof lat !== "number" ||
    typeof lng !== "number" ||
    !Number.isFinite(lat) ||
    !Number.isFinite(lng)
  ) {
    return null;
  }
  return {
    latitude: lat,
    longitude: lng,
    locationCapturedAt: input.locationCapturedAt ?? input.mobileLocation?.capturedAt ?? null,
  };
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
  const [paymentCoords, setPaymentCoords] = useState<PaymentLocationCoords | null>(null);
  const [locationLoading, setLocationLoading] = useState(false);

  const verification = verificationOverride ?? transaction?.verification;
  const ticket = ticketOverride ?? transaction?.claimTicket;
  const canDecide = transaction?.status === "pending" || transaction?.status === "flagged";

  useEffect(() => {
    if (!id) {
      setPaymentCoords(null);
      return;
    }

    const fromList = transaction ? resolveCoords(transaction) : null;
    if (fromList) {
      setPaymentCoords(fromList);
    }

    let cancelled = false;
    setLocationLoading(true);
    void adminApi
      .getPayment(id)
      .then((res) => {
        if (cancelled) return;
        const coords = resolveCoords({
          latitude: res.latitude,
          longitude: res.longitude,
          locationCapturedAt: res.locationCapturedAt,
          mobileLocation: res.mobileLocation ?? res.transaction?.mobileLocation ?? null,
        });
        setPaymentCoords(coords);
      })
      .catch(() => {
        if (!cancelled && !fromList) {
          setPaymentCoords(null);
        }
      })
      .finally(() => {
        if (!cancelled) setLocationLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, [id, transaction]);

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

  const crumbParentTo = returnTo ?? "/admin";
  const crumbParentLabel = returnTo?.startsWith("/admin/transactions")
    ? "Transactions"
    : returnTo?.startsWith("/admin/receipts")
      ? "Employee receipts"
      : returnTo?.startsWith("/admin/fraud")
        ? "Claim review"
        : "Latest receipts";

  const breadcrumbs = (
    <Stack direction="row" spacing={1.5} alignItems="center" flexWrap="wrap" useFlexGap>
      <Button size="small" startIcon={<ArrowBack />} onClick={goBack} variant="outlined">
        Back
      </Button>
      <AdminBreadcrumbs
        items={[
          { label: crumbParentLabel, to: crumbParentTo },
          { label: transaction?.id ?? id ?? "—" },
        ]}
      />
    </Stack>
  );

  if (!transaction) {
    return (
      <AdminPage title="Transaction" breadcrumbs={breadcrumbs}>
        <AdminEmptyState
          title="Transaction not found"
          description="It may have been removed, or you no longer have access."
          action={
            <Button variant="contained" onClick={goBack}>
              Go back
            </Button>
          }
        />
      </AdminPage>
    );
  }

  const accent =
    transaction.status === "flagged" ||
    verification?.verdict === "needs_review" ||
    verification?.verdict === "high_risk"
      ? ADMIN.accent.warning
      : transaction.status === "approved" || verification?.verdict === "verified"
        ? ADMIN.accent.success
        : transaction.status === "rejected"
          ? ADMIN.accent.error
          : ADMIN.accent.primary;

  return (
    <AdminPage
      title={transaction.merchantName}
      description={`${transaction.employeeName} · ${transaction.department} · ${dayjs(transaction.dateTime).format("DD MMM YYYY, HH:mm")}`}
      breadcrumbs={breadcrumbs}
      actions={
        <Stack direction="row" spacing={1} flexWrap="wrap" useFlexGap>
          {canDecide ? (
            <>
              <Button
                variant="contained"
                color="success"
                startIcon={<CheckCircleOutline />}
                disabled={isSaving}
                onClick={openApprove}
              >
                Approve
              </Button>
              <Button
                variant="outlined"
                color="error"
                startIcon={<HighlightOff />}
                disabled={isSaving}
                onClick={openReject}
              >
                Reject
              </Button>
            </>
          ) : null}
          <Button startIcon={<ContentCopy />} onClick={() => void copyUpi()}>
            {copied ? "Copied" : "Copy UPI Ref"}
          </Button>
          <Button variant="outlined" startIcon={<Print />} onClick={() => window.print()}>
            Print
          </Button>
        </Stack>
      }
      alert={
        <>
          {errorMessage ? <Alert severity="error">{errorMessage}</Alert> : null}
          {verifyError ? (
            <Alert severity="error" onClose={() => setVerifyError("")}>
              {verifyError}
            </Alert>
          ) : null}
        </>
      }
    >
      <Box
        className="claim-fade-up claim-fade-up-delay-1"
        sx={{
          pl: 1.5,
          borderLeft: "3px solid",
          borderColor: accent,
        }}
      >
        <Stack direction="row" spacing={1} alignItems="center" flexWrap="wrap" useFlexGap sx={{ mb: 0.75 }}>
          <AdminStatusChip status={transaction.status} label={statusLabel(transaction.status)} />
          <VerificationScoreChip score={verification?.riskScore} verdict={verification?.verdict} />
          <ReceiptFraudScoreChip
            score={transaction.receiptFraudScore}
            tier={transaction.receiptFraudTier}
          />
        </Stack>
        <Typography variant="h6" fontWeight={700} color="text.primary">
          {inr(transaction.claimedAmount)}
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

      <Box
        sx={{
          display: "grid",
          gridTemplateColumns: { xs: "1fr", lg: "1fr 1.05fr" },
          gap: 1.25,
          alignItems: "stretch",
          "& > .MuiCard-root, & > .detail-panel > .MuiCard-root": {
            height: "100%",
          },
        }}
      >
        <AdminCard className="claim-fade-up claim-fade-up-delay-1">
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
            sx={{ mt: 1.5 }}
          >
            {isSaving ? "Uploading…" : "Replace receipt"}
          </Button>
          {errorMessage ? (
            <Typography color="error" variant="body2" sx={{ mt: 1 }}>
              {errorMessage}
            </Typography>
          ) : null}
        </AdminCard>

        <Box className="detail-panel claim-fade-up claim-fade-up-delay-2" sx={{ minWidth: 0 }}>
          <VerificationPanel
            verification={verification}
            onRerun={() => void runVerification()}
            rerunning={verifying}
          />
        </Box>

        <AdminCard className="claim-fade-up claim-fade-up-delay-3" title="Claim details">
          <FieldGrid
            items={[
              { label: "Employee", value: transaction.employeeName },
              { label: "Department", value: transaction.department },
              { label: "Merchant", value: transaction.merchantName },
              { label: "Merchant UPI", value: transaction.merchantVpa || "—" },
              { label: "MCC", value: transaction.mcc || "—" },
              { label: "Pay rail", value: transaction.paymentMethod || transaction.upiApp },
              { label: "Payment status", value: transaction.paymentStatus || "—" },
              { label: "UPI / payout ref", value: transaction.payoutUtr || transaction.upiRefId, mono: true },
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
        </AdminCard>

        <AdminCard
          className="claim-fade-up claim-fade-up-delay-4"
          title="Payment location"
          contentSx={{ height: "100%", display: "flex", flexDirection: "column" }}
        >
          <Box sx={{ flex: 1, minHeight: 220 }}>
            <PaymentLocationMap coords={paymentCoords} loading={locationLoading && !paymentCoords} />
          </Box>
        </AdminCard>
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
    </AdminPage>
  );
};
