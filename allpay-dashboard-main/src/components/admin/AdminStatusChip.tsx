import { Chip, type ChipProps } from "@mui/material";

const STATUS_MAP: Record<string, { label: string; color: ChipProps["color"] }> = {
  pending: { label: "Pending", color: "warning" },
  approved: { label: "Approved", color: "success" },
  rejected: { label: "Rejected", color: "error" },
  flagged: { label: "Flagged", color: "warning" },
  queried: { label: "Queried", color: "warning" },
  reimbursed: { label: "Reimbursed", color: "success" },
  submitted: { label: "Submitted", color: "info" },
  draft: { label: "Draft", color: "default" },
  active: { label: "Active", color: "success" },
  inactive: { label: "Inactive", color: "default" },
  connected: { label: "Connected", color: "success" },
  disconnected: { label: "Disconnected", color: "default" },
  not_tested: { label: "Not tested", color: "default" },
  error: { label: "Needs attention", color: "error" },
  running: { label: "Running", color: "info" },
  failed: { label: "Failed", color: "error" },
  succeeded: { label: "Succeeded", color: "success" },
  success: { label: "Success", color: "success" },
  onboarded: { label: "Onboarded", color: "primary" },
  invited: { label: "Invited", color: "warning" },
  needs_attention: { label: "Needs attention", color: "error" },
  // UPI payment statuses (aligned with mobile app)
  initiated: { label: "Initiated", color: "info" },
  upi_app_opened: { label: "UPI app opened", color: "info" },
  success_reported: { label: "Success reported", color: "success" },
  user_confirmed: { label: "Confirmed by you", color: "success" },
  cancelled: { label: "Cancelled", color: "error" },
  unknown: { label: "Unknown", color: "warning" },
  recorded: { label: "Recorded", color: "info" },
  abandoned: { label: "Abandoned", color: "error" },
  pending_approval: { label: "Pending approval", color: "warning" },
  queued: { label: "Queued", color: "warning" },
  synced: { label: "Synced", color: "success" },
};

function normalize(status: string) {
  return status.trim().toLowerCase().replace(/[\s-]+/g, "_");
}

/** Shared status chip for transactions, jobs, connections, and directory rows. */
export function AdminStatusChip({
  status,
  label,
  size = "small",
  icon,
  ...rest
}: {
  status: string;
  label?: string;
  size?: ChipProps["size"];
  icon?: ChipProps["icon"];
} & Omit<ChipProps, "label" | "color" | "size" | "icon">) {
  const key = normalize(status);
  const mapped = STATUS_MAP[key] ?? STATUS_MAP[status.toLowerCase()];
  const color = mapped?.color ?? "default";
  return (
    <Chip
      size={size}
      icon={icon}
      label={label ?? mapped?.label ?? status}
      color={color}
      variant={color !== "default" ? "filled" : "outlined"}
      {...rest}
    />
  );
}
