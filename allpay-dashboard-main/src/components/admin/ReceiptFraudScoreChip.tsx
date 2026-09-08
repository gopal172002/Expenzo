import { Chip } from "@mui/material";
import type { Transaction } from "../../types";

export function ReceiptFraudScoreChip({
  score,
  tier,
  notScannedLabel = "Not scanned",
}: {
  score?: number;
  tier?: Transaction["receiptFraudTier"];
  notScannedLabel?: string;
}) {
  if (score == null && !tier) {
    return <Chip size="small" variant="outlined" label={notScannedLabel} />;
  }

  const label =
    tier === "high_risk"
      ? `High Risk (${score ?? "?"})`
      : tier === "manual_review"
        ? `Manual Review (${score ?? "?"})`
        : tier === "safe"
          ? `Safe (${score ?? "?"})`
          : `Score ${score ?? "?"}`;

  const color =
    tier === "high_risk" ? "error" : tier === "manual_review" ? "warning" : "success";

  return <Chip size="small" color={color} label={label} />;
}
