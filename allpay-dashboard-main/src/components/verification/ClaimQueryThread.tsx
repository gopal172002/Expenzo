import ChatOutlined from "@mui/icons-material/ChatOutlined";
import Close from "@mui/icons-material/Close";
import SendOutlined from "@mui/icons-material/SendOutlined";
import {
  Alert,
  Badge,
  Box,
  Card,
  CardContent,
  Chip,
  Fab,
  IconButton,
  Paper,
  Stack,
  TextField,
  Typography,
} from "@mui/material";
import dayjs from "dayjs";
import { useEffect, useRef, useState } from "react";
import type { ClaimTicket, ClaimTicketStatus } from "../../types";

const STATUS_LABEL: Record<ClaimTicketStatus, string> = {
  none: "No query",
  awaiting_employee: "Waiting on employee",
  employee_replied: "Employee replied",
  resolved_approved: "Resolved — approved",
  resolved_rejected: "Resolved — rejected",
};

const STATUS_COLOR: Record<ClaimTicketStatus, "default" | "warning" | "info" | "success" | "error"> = {
  none: "default",
  awaiting_employee: "warning",
  employee_replied: "info",
  resolved_approved: "success",
  resolved_rejected: "error",
};

export function ClaimTicketStatusChip({ status }: { status?: ClaimTicketStatus }) {
  if (!status || status === "none") return null;
  return <Chip size="small" color={STATUS_COLOR[status]} label={STATUS_LABEL[status]} />;
}

function MessageBubble({
  message,
  role,
}: {
  message: NonNullable<ClaimTicket["messages"]>[number];
  role: "admin" | "employee";
}) {
  const mine =
    (role === "admin" && message.authorRole === "admin") ||
    (role === "employee" && message.authorRole === "employee");

  return (
    <Box
      sx={{
        alignSelf: mine ? "flex-end" : "flex-start",
        maxWidth: "85%",
        p: 1.25,
        borderRadius: 2,
        bgcolor:
          message.authorRole === "system" ? "#fff7ed" : mine ? "primary.main" : "#f1f5f9",
        color: mine ? "#fff" : "text.primary",
      }}
    >
      <Typography variant="caption" sx={{ opacity: 0.8, fontWeight: 700, display: "block" }}>
        {message.author} · {dayjs(message.createdAt).format("DD MMM HH:mm")}
      </Typography>
      <Typography variant="body2" sx={{ mt: 0.25, whiteSpace: "pre-wrap" }}>
        {message.body}
      </Typography>
    </Box>
  );
}

function Composer({
  role,
  draft,
  setDraft,
  sending,
  onSend,
  compact,
}: {
  role: "admin" | "employee";
  draft: string;
  setDraft: (value: string) => void;
  sending: boolean;
  onSend: () => void;
  compact?: boolean;
}) {
  return (
    <Stack direction="row" spacing={1} alignItems="flex-end">
      <TextField
        fullWidth
        multiline
        minRows={compact ? 1 : 2}
        maxRows={4}
        size="small"
        placeholder={
          role === "admin" ? "Ask the employee for more detail…" : "Explain what this expense was for…"
        }
        value={draft}
        onChange={(e) => setDraft(e.target.value)}
        onKeyDown={(e) => {
          if (e.key === "Enter" && !e.shiftKey) {
            e.preventDefault();
            onSend();
          }
        }}
      />
      <IconButton
        color="primary"
        disabled={!draft.trim() || sending}
        onClick={onSend}
        aria-label="Send message"
        sx={{
          bgcolor: "primary.main",
          color: "#fff",
          borderRadius: 2,
          "&:hover": { bgcolor: "primary.dark" },
          "&.Mui-disabled": { bgcolor: "#e2e8f0", color: "#94a3b8" },
        }}
      >
        <SendOutlined fontSize="small" />
      </IconButton>
    </Stack>
  );
}

function useClaimQueryState(onSend: (message: string) => Promise<void>) {
  const [draft, setDraft] = useState("");
  const [sending, setSending] = useState(false);
  const [error, setError] = useState("");

  const send = async () => {
    const message = draft.trim();
    if (!message) return;
    setSending(true);
    setError("");
    try {
      await onSend(message);
      setDraft("");
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setSending(false);
    }
  };

  return { draft, setDraft, sending, error, setError, send };
}

export function ClaimQueryThread({
  ticket,
  role,
  onSend,
  emptyMessage,
  variant = "card",
  employeeName,
}: {
  ticket?: ClaimTicket;
  role: "admin" | "employee";
  onSend: (message: string) => Promise<void>;
  emptyMessage: string;
  /** `widget` = floating side chat; `card` = inline panel. */
  variant?: "card" | "widget";
  employeeName?: string;
}) {
  const { draft, setDraft, sending, error, setError, send } = useClaimQueryState(onSend);
  const [open, setOpen] = useState(false);
  const listRef = useRef<HTMLDivElement | null>(null);

  const closed =
    ticket?.status === "resolved_approved" || ticket?.status === "resolved_rejected";
  const canSend = role === "admin" ? true : Boolean(ticket) && !closed;
  const messageCount = ticket?.messages.length ?? 0;
  const needsAttention =
    (role === "admin" && ticket?.status === "employee_replied") ||
    (role === "employee" && ticket?.status === "awaiting_employee");

  useEffect(() => {
    if (!open && variant === "widget") return;
    const el = listRef.current;
    if (el) el.scrollTop = el.scrollHeight;
  }, [messageCount, open, variant]);

  if (variant === "widget") {
    const title =
      role === "admin"
        ? employeeName
          ? `Ask ${employeeName}`
          : "Ask employe"
        : "Claim query";

    return (
      <Box
        sx={{
          position: "fixed",
          right: { xs: 16, sm: 24 },
          bottom: { xs: 16, sm: 24 },
          zIndex: (theme) => theme.zIndex.speedDial,
          display: "flex",
          flexDirection: "column",
          alignItems: "flex-end",
          gap: 1.5,
        }}
      >
        {open ? (
          <Paper
            elevation={8}
            sx={{
              width: { xs: "min(100vw - 32px, 380px)", sm: 380 },
              height: 480,
              maxHeight: "min(480px, calc(100vh - 120px))",
              display: "flex",
              flexDirection: "column",
              overflow: "hidden",
              borderRadius: 3,
              border: "1px solid",
              borderColor: "divider",
            }}
          >
            <Box
              sx={{
                px: 1.5,
                py: 1.25,
                bgcolor: "primary.main",
                color: "#fff",
                display: "flex",
                alignItems: "center",
                gap: 1,
              }}
            >
              <ChatOutlined fontSize="small" />
              <Box sx={{ flex: 1, minWidth: 0 }}>
                <Typography variant="subtitle2" fontWeight={700} noWrap>
                  {title}
                </Typography>
                <Typography variant="caption" sx={{ opacity: 0.9 }} noWrap>
                  {ticket
                    ? STATUS_LABEL[ticket.status]
                    : "Start a query about this claim"}
                </Typography>
              </Box>
              <IconButton
                size="small"
                onClick={() => setOpen(false)}
                aria-label="Close chat"
                sx={{ color: "#fff" }}
              >
                <Close fontSize="small" />
              </IconButton>
            </Box>

            <Box
              ref={listRef}
              sx={{
                flex: 1,
                overflow: "auto",
                p: 1.5,
                bgcolor: "#f8fafc",
                display: "flex",
                flexDirection: "column",
                gap: 1.25,
              }}
            >
              {!ticket ? (
                <Typography variant="body2" color="text.secondary" sx={{ m: "auto", textAlign: "center", px: 2 }}>
                  {emptyMessage}
                </Typography>
              ) : (
                ticket.messages.map((message) => (
                  <MessageBubble key={message.id} message={message} role={role} />
                ))
              )}
            </Box>

            {error ? (
              <Alert severity="error" sx={{ mx: 1.5, mt: 1 }} onClose={() => setError("")}>
                {error}
              </Alert>
            ) : null}

            <Box sx={{ p: 1.5, borderTop: "1px solid", borderColor: "divider", bgcolor: "#fff" }}>
              {closed ? (
                <Alert severity="info">This query is closed.</Alert>
              ) : canSend ? (
                <Composer
                  role={role}
                  draft={draft}
                  setDraft={setDraft}
                  sending={sending}
                  onSend={() => void send()}
                  compact
                />
              ) : null}
            </Box>
          </Paper>
        ) : null}

        <Badge
          color="error"
          variant="dot"
          invisible={!needsAttention || open}
          overlap="circular"
          anchorOrigin={{ vertical: "top", horizontal: "left" }}
        >
          <Fab
            color="primary"
            variant="extended"
            onClick={() => setOpen((value) => !value)}
            aria-label={open ? "Close claim chat" : "Open claim chat"}
            sx={{
              px: 2.5,
              textTransform: "none",
              boxShadow: "0 8px 24px rgba(37, 99, 235, 0.35)",
            }}
          >
            {open ? <Close sx={{ mr: 1 }} /> : <ChatOutlined sx={{ mr: 1 }} />}
            {open ? "Close" : role === "admin" ? "Ask employe" : "Claim chat"}
            {!open && messageCount > 0 ? (
              <Chip
                size="small"
                label={messageCount}
                sx={{
                  ml: 1,
                  height: 22,
                  bgcolor: "rgba(255,255,255,0.2)",
                  color: "#fff",
                  "& .MuiChip-label": { px: 1, fontWeight: 700 },
                }}
              />
            ) : null}
          </Fab>
        </Badge>
      </Box>
    );
  }

  return (
    <Card sx={{ borderRadius: 3 }}>
      <CardContent>
        <Stack direction="row" justifyContent="space-between" alignItems="center" spacing={1}>
          <Typography variant="h6" fontWeight={700}>
            Claim query
          </Typography>
          <ClaimTicketStatusChip status={ticket?.status} />
        </Stack>

        {!ticket ? (
          <Typography color="text.secondary" sx={{ mt: 1 }}>
            {emptyMessage}
          </Typography>
        ) : (
          <>
            <Typography variant="body2" color="text.secondary" sx={{ mt: 0.5, mb: 2 }}>
              Opened {dayjs(ticket.openedAt).format("DD MMM YYYY HH:mm")}
              {ticket.closedAt
                ? ` · closed ${dayjs(ticket.closedAt).format("DD MMM YYYY HH:mm")}${ticket.closedBy ? ` by ${ticket.closedBy}` : ""}`
                : ""}
            </Typography>

            <Stack spacing={1.5} ref={listRef}>
              {ticket.messages.map((message) => (
                <MessageBubble key={message.id} message={message} role={role} />
              ))}
            </Stack>
          </>
        )}

        {error ? (
          <Alert severity="error" sx={{ mt: 2 }} onClose={() => setError("")}>
            {error}
          </Alert>
        ) : null}

        {closed ? (
          <Alert severity="info" sx={{ mt: 2 }}>
            This query is closed. Finance has already made a decision on the claim.
          </Alert>
        ) : canSend ? (
          <Box sx={{ mt: 2 }}>
            <Composer
              role={role}
              draft={draft}
              setDraft={setDraft}
              sending={sending}
              onSend={() => void send()}
            />
          </Box>
        ) : null}
      </CardContent>
    </Card>
  );
}
