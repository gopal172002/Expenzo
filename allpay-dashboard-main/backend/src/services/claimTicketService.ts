import dayjs from "dayjs";
import type { VerificationResult } from "./verification/types";

export type ClaimTicketStatus =
  | "none"
  | "awaiting_employee"
  | "employee_replied"
  | "resolved_approved"
  | "resolved_rejected";

export type ClaimTicketMessage = {
  id: string;
  author: string;
  authorRole: "system" | "employee" | "admin";
  body: string;
  createdAt: string;
};

export type ClaimTicket = {
  status: ClaimTicketStatus;
  openedAt: string;
  reason: string;
  messages: ClaimTicketMessage[];
  closedAt?: string;
  closedBy?: string;
};

export const CLAIM_TICKET_LABELS: Record<ClaimTicketStatus, string> = {
  none: "No query",
  awaiting_employee: "Waiting on employee",
  employee_replied: "Employee replied",
  resolved_approved: "Resolved — approved",
  resolved_rejected: "Resolved — rejected",
};

function messageId(prefix: string): string {
  return `${prefix}-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 7)}`;
}

/** Checks whose internal wording must never reach the employee portal. */
const EMPLOYEE_SAFE_SUMMARY: Record<string, string> = {
  receipt_forensics: "The uploaded receipt image could not be read clearly enough to verify.",
  allpay_match: "This spend could not be matched to a payment recorded in AllPay.",
};

/**
 * Turn a failed check into a plain-language question the employee can actually answer,
 * rather than showing them a rule name or our detection internals.
 */
export function questionForVerification(result: VerificationResult): string {
  const failed = result.checks.filter((check) => check.outcome === "fail");
  if (failed.length === 0) {
    return "Finance needs a little more detail on this claim before it can be approved. Please describe what this expense was for.";
  }

  const intro = failed
    .map((check) => EMPLOYEE_SAFE_SUMMARY[check.id] ?? check.explanation)
    .join(" ");
  const asks: Record<string, string> = {
    attendance_conflict:
      "Could you explain where you were at that time, for example a client visit or an approved off-site trip?",
    allpay_match:
      "Could you confirm how this was paid, and share the payment reference if it was not made through AllPay?",
    duplicate_claim: "Could you confirm this is a separate spend and not the same bill submitted twice?",
    amount_anomaly: "Could you explain why this claim is larger than your usual spend in this category?",
    category_mismatch: "Could you confirm the correct expense category for this spend?",
    receipt_forensics: "Could you upload a clearer photo of the original printed bill?",
    policy_violation: "Could you note any approval you had for this spend outside policy?",
    timing_anomaly: "Could you confirm the correct date and time of this spend?",
  };

  const question =
    asks[failed[0]!.id] ?? "Could you add any detail that would help finance verify this claim?";
  return `${intro} ${question}`;
}

export function openClaimTicket(result: VerificationResult): ClaimTicket {
  const now = dayjs().toISOString();
  return {
    status: "awaiting_employee",
    openedAt: now,
    reason: result.headline,
    messages: [
      {
        id: messageId("msg"),
        author: "AllPay verification",
        authorRole: "system",
        body: questionForVerification(result),
        createdAt: now,
      },
    ],
  };
}

export function appendTicketMessage(
  ticket: ClaimTicket | undefined,
  message: { author: string; authorRole: ClaimTicketMessage["authorRole"]; body: string }
): ClaimTicket {
  const now = dayjs().toISOString();
  const base: ClaimTicket = ticket ?? {
    status: "awaiting_employee",
    openedAt: now,
    reason: "Manual query",
    messages: [],
  };

  const nextStatus: ClaimTicketStatus =
    base.status === "resolved_approved" || base.status === "resolved_rejected"
      ? base.status
      : message.authorRole === "employee"
        ? "employee_replied"
        : "awaiting_employee";

  return {
    ...base,
    status: nextStatus,
    messages: [
      ...base.messages,
      {
        id: messageId("msg"),
        author: message.author,
        authorRole: message.authorRole,
        body: message.body,
        createdAt: now,
      },
    ],
  };
}

export function closeClaimTicket(
  ticket: ClaimTicket | undefined,
  decision: "approved" | "rejected",
  actor: string
): ClaimTicket | undefined {
  if (!ticket) return undefined;
  return {
    ...ticket,
    status: decision === "approved" ? "resolved_approved" : "resolved_rejected",
    closedAt: dayjs().toISOString(),
    closedBy: actor,
  };
}
