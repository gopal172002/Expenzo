import ScheduleOutlined from "@mui/icons-material/ScheduleOutlined";
import { Box, Chip, Stack, Typography } from "@mui/material";
import dayjs from "dayjs";
import relativeTime from "dayjs/plugin/relativeTime";
import { useMemo } from "react";
import type { TimelineEvent, TransactionFlag, TransactionStatus } from "../../types";
import { statusLabel } from "../../utils/labels";

dayjs.extend(relativeTime);

function statusInk(status: TransactionStatus): string {
  if (status === "approved") return "#059669";
  if (status === "rejected") return "#DC2626";
  if (status === "flagged") return "#D97706";
  return "#2563EB";
}

const METRIC_LABEL: Record<string, string> = {
  Metadata: "Image data",
  Sightengine: "Authenticity",
  OCR: "Text scan",
  ELA: "Edit check",
};

function stampLabel(rule: string): string {
  const r = rule.trim().toLowerCase();
  if (r.includes("receipt fraud")) return "Receipt risk";
  if (r.includes("ai-generated")) return "AI receipt";
  if (r === "mcc") return "MCC";
  if (r.length <= 18) return rule;
  return rule.slice(0, 16);
}

type ParsedFlag =
  | {
      kind: "fraud";
      headline: string;
      scoreLine?: string;
      metrics: { label: string; value: string }[];
      findings: string[];
    }
  | { kind: "simple"; headline: string; detail?: string };

function parseFlag(flag: TransactionFlag): ParsedFlag {
  const raw = (flag.details || flag.reason || "").trim();
  const looksFraud =
    /receipt fraud/i.test(flag.rule) ||
    /^Score:\s*\d+/i.test(raw) ||
    /Sightengine|ELA:|Metadata:/i.test(raw);

  if (!looksFraud) {
    return {
      kind: "simple",
      headline: flag.reason || flag.rule,
      detail: flag.details && flag.details !== flag.reason ? flag.details : undefined,
    };
  }

  const parts = raw.split(" · ").map((p) => p.trim()).filter(Boolean);
  const scorePart = parts.find((p) => /^Score:/i.test(p));
  const metrics = parts
    .map((p) => {
      const m = p.match(/^(Metadata|Sightengine|OCR|ELA):\s*(.+)$/i);
      if (!m) return null;
      const key = m[1]!.toLowerCase();
      const lookup =
        key === "metadata"
          ? "Metadata"
          : key === "sightengine"
            ? "Sightengine"
            : key === "ocr"
              ? "OCR"
              : key === "ela"
                ? "ELA"
                : null;
      if (!lookup) return null;
      return { label: METRIC_LABEL[lookup]!, value: m[2]!.trim() };
    })
    .filter(Boolean) as { label: string; value: string }[];

  const findings = parts.filter(
    (p) => !/^Score:/i.test(p) && !/^(Metadata|Sightengine|OCR|ELA):/i.test(p)
  );

  let headline = flag.reason || "Receipt requires review";
  if (/high risk/i.test(headline)) headline = "High receipt risk";
  else if (/manual review/i.test(headline)) headline = "Manual review recommended";

  const scoreMatch = scorePart?.match(/Score:\s*(\d+\/\d+)\s*(?:\((.+)\))?/i);

  return {
    kind: "fraud",
    headline,
    scoreLine: scoreMatch
      ? `${scoreMatch[1]}${scoreMatch[2] ? ` · ${scoreMatch[2]}` : ""}`
      : undefined,
    metrics,
    findings,
  };
}

function PolicyStamps({ flags }: { flags: TransactionFlag[] }) {
  if (flags.length === 0) {
    return (
      <Box
        sx={{
          position: "relative",
          minHeight: 148,
          display: "grid",
          placeItems: "center",
          px: 2,
        }}
      >
        <Box
          sx={{
            px: 2.25,
            py: 1,
            border: "2px solid #059669",
            color: "#047857",
            transform: "rotate(-4deg)",
            letterSpacing: "0.14em",
            fontWeight: 750,
            fontSize: 15,
            textTransform: "uppercase",
            userSelect: "none",
          }}
        >
          Cleared
        </Box>
        <Typography
          variant="body2"
          color="text.secondary"
          sx={{ position: "absolute", bottom: 10, textAlign: "center", px: 2 }}
        >
          No policy exceptions on this claim
        </Typography>
      </Box>
    );
  }

  return (
    <Stack spacing={2.25}>
      {flags.map((flag, index) => {
        const parsed = parseFlag(flag);
        return (
          <Box
            key={flag.id}
            sx={{
              display: "grid",
              gridTemplateColumns: { xs: "1fr", sm: "112px 1fr" },
              gap: 2,
              alignItems: "start",
            }}
          >
            <Box
              sx={{
                justifySelf: { xs: "start", sm: "center" },
                mt: 0.5,
                px: 1.25,
                py: 1,
                border: "2px solid #B45309",
                color: "#92400E",
                transform: `rotate(${index % 2 === 0 ? -4 : 3}deg)`,
                letterSpacing: "0.08em",
                fontWeight: 750,
                fontSize: 11,
                textTransform: "uppercase",
                textAlign: "center",
                lineHeight: 1.25,
                maxWidth: 120,
                bgcolor: "#FFFBEB",
                userSelect: "none",
              }}
            >
              {stampLabel(flag.rule)}
            </Box>

            <Box sx={{ minWidth: 0 }}>
              <Typography fontWeight={700} sx={{ letterSpacing: "-0.01em", mb: 0.35 }}>
                {parsed.headline}
              </Typography>

              {parsed.kind === "fraud" ? (
                <Stack spacing={1.25}>
                  {parsed.scoreLine ? (
                    <Typography variant="body2" color="text.secondary">
                      Risk score {parsed.scoreLine}
                    </Typography>
                  ) : null}

                  {parsed.metrics.length > 0 ? (
                    <Stack direction="row" spacing={0.75} flexWrap="wrap" useFlexGap>
                      {parsed.metrics.map((m) => (
                        <Chip
                          key={m.label}
                          size="small"
                          variant="outlined"
                          label={`${m.label} ${m.value}`}
                          sx={{ height: 24, "& .MuiChip-label": { px: 1, fontSize: 12 } }}
                        />
                      ))}
                    </Stack>
                  ) : null}

                  {parsed.findings.length > 0 ? (
                    <Stack spacing={0.5} component="ul" sx={{ m: 0, pl: 2 }}>
                      {parsed.findings.map((finding) => (
                        <Typography
                          key={finding}
                          component="li"
                          variant="body2"
                          color="text.secondary"
                          sx={{ display: "list-item" }}
                        >
                          {finding}
                        </Typography>
                      ))}
                    </Stack>
                  ) : null}
                </Stack>
              ) : parsed.detail ? (
                <Typography variant="body2" color="text.secondary">
                  {parsed.detail}
                </Typography>
              ) : null}
            </Box>
          </Box>
        );
      })}
    </Stack>
  );
}

type HistoryPoint = {
  id: string;
  label: string;
  sub?: string;
  at: number;
  tone: "muted" | "active" | "event";
};

function humanizeAction(action: string): string {
  const t = action.trim();
  if (!t) return "Update";
  return t.charAt(0).toUpperCase() + t.slice(1);
}

function buildHistory(args: {
  dateTime: string;
  status: TransactionStatus;
  timeline: TimelineEvent[];
  verifiedAt?: string;
  decidedAt?: string;
}): HistoryPoint[] {
  const { dateTime, status, timeline, verifiedAt, decidedAt } = args;
  const events = [...timeline].sort(
    (a, b) => dayjs(b.timestamp).valueOf() - dayjs(a.timestamp).valueOf()
  );

  if (events.length > 0) {
    return events.map((event, i) => ({
      id: event.id,
      label: humanizeAction(event.action),
      sub: `${event.actor} · ${dayjs(event.timestamp).format("DD MMM YYYY, HH:mm")}`,
      at: dayjs(event.timestamp).valueOf(),
      tone: i === 0 ? "active" : "event",
    }));
  }

  const points: HistoryPoint[] = [
    {
      id: "spend",
      label: "Transaction recorded",
      sub: dayjs(dateTime).format("DD MMM YYYY, HH:mm"),
      at: dayjs(dateTime).valueOf(),
      tone: "muted",
    },
  ];
  if (verifiedAt) {
    points.push({
      id: "verified",
      label: "Verification completed",
      sub: dayjs(verifiedAt).format("DD MMM YYYY, HH:mm"),
      at: dayjs(verifiedAt).valueOf(),
      tone: "event",
    });
  }
  if (decidedAt) {
    points.push({
      id: "decided",
      label: `Decision: ${statusLabel(status)}`,
      sub: dayjs(decidedAt).format("DD MMM YYYY, HH:mm"),
      at: dayjs(decidedAt).valueOf(),
      tone: "active",
    });
  } else {
    points.push({
      id: "now",
      label: "Awaiting decision",
      sub: statusLabel(status),
      at: Date.now(),
      tone: "active",
    });
  }

  return points
    .sort((a, b) => b.at - a.at)
    .map((point, i) => ({
      ...point,
      tone: i === 0 ? "active" : point.tone === "active" ? "event" : point.tone,
    }));
}

function ClaimHistoryTimeline({
  dateTime,
  status,
  timeline,
  verifiedAt,
  decidedAt,
}: {
  dateTime: string;
  status: TransactionStatus;
  timeline: TimelineEvent[];
  verifiedAt?: string;
  decidedAt?: string;
}) {
  const ink = statusInk(status);
  const age = dayjs(dateTime).fromNow(true);
  const points = useMemo(
    () => buildHistory({ dateTime, status, timeline, verifiedAt, decidedAt }),
    [dateTime, status, timeline, verifiedAt, decidedAt]
  );

  return (
    <Box sx={{ width: "100%", minWidth: 0 }}>
      <Box
        sx={{
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          gap: 1.5,
          flexWrap: "wrap",
          px: 1.5,
          py: 1.25,
          mb: 2,
          borderRadius: 2,
          bgcolor: "#F8FAFC",
          border: "1px solid",
          borderColor: "divider",
        }}
      >
        <Stack direction="row" spacing={1} alignItems="center" sx={{ minWidth: 0 }}>
          <Box
            sx={{
              width: 32,
              height: 32,
              borderRadius: "50%",
              bgcolor: `${ink}14`,
              color: ink,
              display: "grid",
              placeItems: "center",
              flexShrink: 0,
            }}
          >
            <ScheduleOutlined sx={{ fontSize: 16 }} />
          </Box>
          <Box sx={{ minWidth: 0 }}>
            <Typography fontWeight={800} sx={{ fontSize: 15, lineHeight: 1.2, color: ink }}>
              {age}
            </Typography>
            <Typography variant="caption" color="text.secondary">
              claim age
            </Typography>
          </Box>
        </Stack>
        <Typography
          variant="caption"
          fontWeight={700}
          sx={{
            px: 1,
            py: 0.5,
            borderRadius: 1,
            bgcolor: `${ink}14`,
            color: ink,
            letterSpacing: "0.03em",
            flexShrink: 0,
          }}
        >
          {statusLabel(status)}
        </Typography>
      </Box>

      <Box component="ol" sx={{ m: 0, p: 0, listStyle: "none", width: "100%", minWidth: 0 }}>
        {points.map((point, index) => {
          const color =
            point.tone === "active" ? ink : point.tone === "event" ? "#334155" : "#94A3B8";
          const isLast = index === points.length - 1;
          return (
            <Box
              component="li"
              key={point.id}
              sx={{
                display: "grid",
                gridTemplateColumns: "16px 1fr",
                columnGap: 1.25,
                minWidth: 0,
              }}
            >
              <Box
                sx={{
                  position: "relative",
                  display: "flex",
                  flexDirection: "column",
                  alignItems: "center",
                }}
              >
                <Box
                  className={point.tone === "active" ? "claim-orbit-active" : undefined}
                  sx={{
                    width: 10,
                    height: 10,
                    borderRadius: "50%",
                    bgcolor: color,
                    outline: point.tone === "active" ? `3px solid ${ink}33` : "none",
                    mt: "5px",
                    flexShrink: 0,
                    zIndex: 1,
                  }}
                />
                {!isLast ? (
                  <Box
                    sx={{
                      width: 2,
                      flex: 1,
                      minHeight: 12,
                      bgcolor: "#E2E8F0",
                      my: 0.5,
                      borderRadius: 1,
                    }}
                  />
                ) : null}
              </Box>

              <Box sx={{ minWidth: 0, pb: isLast ? 0 : 2 }}>
                <Typography
                  variant="body2"
                  fontWeight={650}
                  sx={{ wordBreak: "break-word", lineHeight: 1.35 }}
                >
                  {point.label}
                </Typography>
                {point.sub ? (
                  <Typography
                    variant="caption"
                    color="text.secondary"
                    component="div"
                    sx={{ mt: 0.25, wordBreak: "break-word" }}
                  >
                    {point.sub}
                  </Typography>
                ) : null}
              </Box>
            </Box>
          );
        })}
      </Box>
    </Box>
  );
}

export function ClaimReviewInsight({
  flags,
  timeline,
  dateTime,
  status,
  verifiedAt,
  decidedAt,
}: {
  flags: TransactionFlag[];
  timeline: TimelineEvent[];
  dateTime: string;
  status: TransactionStatus;
  verifiedAt?: string;
  decidedAt?: string;
}) {
  return (
    <Box
      sx={{
        display: "grid",
        gridTemplateColumns: { xs: "1fr", md: "1.15fr 0.85fr" },
        gap: { xs: 3, md: 4 },
        pt: 2.5,
        mt: 0.5,
        borderTop: "1px solid",
        borderColor: "divider",
        width: "100%",
        minWidth: 0,
      }}
    >
      <Box sx={{ minWidth: 0 }}>
        <Typography variant="subtitle2" fontWeight={700} color="text.primary">
          Policy review
        </Typography>
        <Typography variant="caption" color="text.secondary" sx={{ display: "block", mb: 1.5 }}>
          Exceptions that may affect approval
        </Typography>
        <Box sx={{ py: 0.5 }}>
          <PolicyStamps flags={flags} />
        </Box>
      </Box>

      <Box sx={{ minWidth: 0, overflow: "hidden" }}>
        <Typography variant="subtitle2" fontWeight={700} color="text.primary">
          Claim history
        </Typography>
        <Typography variant="caption" color="text.secondary" sx={{ display: "block", mb: 1.5 }}>
          Key moments on this claim
        </Typography>
        <ClaimHistoryTimeline
          dateTime={dateTime}
          status={status}
          timeline={timeline}
          verifiedAt={verifiedAt}
          decidedAt={decidedAt}
        />
      </Box>
    </Box>
  );
}
