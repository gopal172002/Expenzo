import CancelOutlined from "@mui/icons-material/CancelOutlined";
import CheckCircleOutline from "@mui/icons-material/CheckCircleOutline";
import HelpOutline from "@mui/icons-material/HelpOutline";
import RefreshOutlined from "@mui/icons-material/RefreshOutlined";
import WarningAmberOutlined from "@mui/icons-material/WarningAmberOutlined";
import {
  Box,
  Button,
  Card,
  CardContent,
  Chip,
  LinearProgress,
  Stack,
  Tooltip,
  Typography,
} from "@mui/material";
import dayjs from "dayjs";
import type { VerificationCheck, VerificationResult, VerificationVerdict } from "../../types";

const VERDICT_COLOR: Record<VerificationVerdict, "success" | "info" | "warning" | "error"> = {
  verified: "success",
  low_risk: "info",
  needs_review: "warning",
  high_risk: "error",
};

const EVIDENCE_LABEL: Record<VerificationResult["evidenceStrength"], string> = {
  transaction_matched: "Matched to an AllPay payment",
  partial_evidence: "Supported by attendance or policy data",
  heuristic_only: "Pattern-based only — no payment match",
};

function outcomeIcon(outcome: VerificationCheck["outcome"]) {
  if (outcome === "pass") return <CheckCircleOutline fontSize="small" color="success" />;
  if (outcome === "warn") return <WarningAmberOutlined fontSize="small" color="warning" />;
  if (outcome === "fail") return <CancelOutlined fontSize="small" color="error" />;
  return <HelpOutline fontSize="small" color="disabled" />;
}

function outcomeLabel(check: VerificationCheck): string {
  if (check.outcome === "skipped") return "Not applicable";
  if (check.outcome === "pass") return "Passed";
  if (check.outcome === "warn") return "Needs attention";
  return check.severity === "critical" ? "Failed" : "Failed";
}

export function VerificationScoreChip({
  score,
  verdict,
}: {
  score?: number;
  verdict?: VerificationVerdict;
}) {
  if (score == null || !verdict) {
    return <Chip size="small" variant="outlined" label="Not verified" />;
  }
  const label =
    verdict === "verified"
      ? `Verified (${score})`
      : verdict === "low_risk"
        ? `Low risk (${score})`
        : verdict === "needs_review"
          ? `Needs review (${score})`
          : `High risk (${score})`;
  return <Chip size="small" color={VERDICT_COLOR[verdict]} label={label} />;
}

export function VerificationPanel({
  verification,
  onRerun,
  rerunning,
}: {
  verification?: VerificationResult;
  onRerun?: () => void;
  rerunning?: boolean;
}) {
  if (!verification) {
    return (
      <Card>
        <CardContent>
          <Stack direction="row" justifyContent="space-between" alignItems="flex-start" spacing={1}>
            <Box>
              <Typography variant="subtitle1" fontWeight={700}>
                Verification
              </Typography>
              <Typography variant="body2" color="text.secondary" sx={{ mt: 0.5 }}>
                Run checks against AllPay payments, attendance, policy, and the receipt.
              </Typography>
            </Box>
            {onRerun ? (
              <Button
                size="small"
                variant="contained"
                startIcon={<RefreshOutlined />}
                disabled={rerunning}
                onClick={onRerun}
                sx={{ textTransform: "none", flexShrink: 0 }}
              >
                {rerunning ? "Running…" : "Verify"}
              </Button>
            ) : null}
          </Stack>
        </CardContent>
      </Card>
    );
  }

  const color = VERDICT_COLOR[verification.verdict];
  const ordered = [...verification.checks].sort((a, b) => {
    const rank = { fail: 0, warn: 1, pass: 2, skipped: 3 } as const;
    return rank[a.outcome] - rank[b.outcome];
  });

  return (
    <Card>
      <CardContent>
        <Stack
          direction="row"
          justifyContent="space-between"
          alignItems="flex-start"
          spacing={1.25}
          sx={{ width: "100%" }}
        >
          <Box sx={{ minWidth: 0, flex: 1 }}>
            <Typography variant="subtitle1" fontWeight={700}>
              Verification
            </Typography>
            <Typography variant="caption" color="text.secondary" sx={{ display: "block" }}>
              {dayjs(verification.evaluatedAt).format("DD MMM YYYY, HH:mm")} ·{" "}
              {EVIDENCE_LABEL[verification.evidenceStrength]}
            </Typography>
            <Chip
              color={color}
              label={`${verification.verdictLabel} · ${verification.riskScore}/100`}
              sx={{ mt: 1 }}
            />
          </Box>
          {onRerun ? (
            <Button
              size="small"
              variant="outlined"
              startIcon={<RefreshOutlined />}
              disabled={rerunning}
              onClick={onRerun}
              sx={{ textTransform: "none", flexShrink: 0, alignSelf: "flex-start" }}
            >
              {rerunning ? "Running…" : "Re-run"}
            </Button>
          ) : null}
        </Stack>

        <Box sx={{ mt: 2, mb: 1.25 }}>
          <LinearProgress
            className="claim-progress-bar"
            variant="determinate"
            value={verification.riskScore}
            color={color}
            sx={{ height: 7, borderRadius: 999, bgcolor: "#E5E7EB" }}
          />
          <Stack direction="row" justifyContent="space-between" sx={{ mt: 0.5 }}>
            <Typography variant="caption" color="text.secondary">
              Lower risk
            </Typography>
            <Typography variant="caption" color="text.secondary">
              Higher risk
            </Typography>
          </Stack>
        </Box>

        <Typography variant="body2" fontWeight={650} sx={{ mb: 1.5, color: "text.primary" }}>
          {verification.headline}
        </Typography>

        <Stack spacing={1}>
          {ordered.map((check, index) => (
            <Stack
              key={check.id}
              className={`claim-fade-up claim-fade-up-delay-${Math.min(index + 1, 5)}`}
              direction="row"
              spacing={1.25}
              alignItems="flex-start"
              sx={{
                p: 1.1,
                bgcolor:
                  check.outcome === "fail"
                    ? "#FEF2F2"
                    : check.outcome === "warn"
                      ? "#FFFBEB"
                      : check.outcome === "pass"
                        ? "#F8FAFC"
                        : "#F9FAFB",
                borderLeft: "3px solid",
                borderColor:
                  check.outcome === "fail"
                    ? "error.main"
                    : check.outcome === "warn"
                      ? "warning.main"
                      : check.outcome === "pass"
                        ? "success.light"
                        : "divider",
              }}
            >
              <Box sx={{ pt: 0.2 }}>{outcomeIcon(check.outcome)}</Box>
              <Box sx={{ minWidth: 0, flex: 1 }}>
                <Stack direction="row" spacing={1} alignItems="center" flexWrap="wrap" useFlexGap>
                  <Typography fontWeight={700} variant="body2">
                    {check.label}
                  </Typography>
                  <Tooltip title={`Weight ${check.weight}× in overall score`}>
                    <Chip
                      size="small"
                      variant="outlined"
                      label={outcomeLabel(check)}
                      color={
                        check.outcome === "fail"
                          ? "error"
                          : check.outcome === "warn"
                            ? "warning"
                            : check.outcome === "pass"
                              ? "success"
                              : "default"
                      }
                    />
                  </Tooltip>
                </Stack>
                <Typography variant="body2" color="text.secondary" sx={{ mt: 0.25 }}>
                  {check.explanation}
                </Typography>
              </Box>
            </Stack>
          ))}
        </Stack>
      </CardContent>
    </Card>
  );
}
