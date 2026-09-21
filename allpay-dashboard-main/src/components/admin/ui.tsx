import InboxOutlined from "@mui/icons-material/InboxOutlined";
import ErrorOutline from "@mui/icons-material/ErrorOutline";
import WarningAmberOutlined from "@mui/icons-material/WarningAmberOutlined";
import InfoOutlined from "@mui/icons-material/InfoOutlined";
import {
  Box,
  Breadcrumbs,
  Card,
  CardContent,
  CircularProgress,
  Link,
  Skeleton,
  Stack,
  Typography,
  type CardProps,
  type SxProps,
  type Theme,
} from "@mui/material";
import type { ReactNode } from "react";
import { Link as RouterLink } from "react-router-dom";
import { PageHeader } from "../layout/PageHeader";
import { ADMIN } from "../../theme";

type AccentKey = keyof typeof ADMIN.accent;

/** Standard page shell: constrained width, header, vertical rhythm. */
export function AdminPage({
  title,
  description,
  actions,
  breadcrumbs,
  children,
  alert,
}: {
  title: string;
  description?: string;
  actions?: ReactNode;
  breadcrumbs?: ReactNode;
  children: ReactNode;
  alert?: ReactNode;
}) {
  return (
    <Stack
      spacing={ADMIN.pageGap}
      sx={{
        width: "100%",
        maxWidth: ADMIN.contentMaxWidth,
        mx: "auto",
        minWidth: 0,
      }}
    >
      <PageHeader title={title} description={description} actions={actions} breadcrumbs={breadcrumbs} />
      {alert}
      {children}
    </Stack>
  );
}

type AdminCardProps = {
  title?: ReactNode;
  description?: ReactNode;
  action?: ReactNode;
  children: ReactNode;
  /** Default bordered paper card. `flush` removes inner content padding for tables. */
  variant?: "default" | "flush" | "muted";
  sx?: SxProps<Theme>;
  contentSx?: SxProps<Theme>;
} & Omit<CardProps, "title" | "variant" | "children">;

/** Unified content panel used across admin pages. */
export function AdminCard({
  title,
  description,
  action,
  children,
  variant = "default",
  sx,
  contentSx,
  ...cardProps
}: AdminCardProps) {
  const muted = variant === "muted";
  const flush = variant === "flush";

  return (
    <Card
      {...cardProps}
      sx={{
        bgcolor: muted ? ADMIN.surface.muted : "background.paper",
        overflow: "hidden",
        ...sx,
      }}
    >
      {title || description || action ? (
        <Box
          sx={{
            px: ADMIN.cardPadding,
            pt: ADMIN.cardPadding,
            pb: flush || children ? 1.25 : ADMIN.cardPadding,
            borderBottom: flush ? "1px solid" : "none",
            borderColor: "divider",
          }}
        >
          <Stack direction="row" spacing={1.5} alignItems="flex-start" justifyContent="space-between">
            <Box sx={{ minWidth: 0 }}>
              {title ? (
                typeof title === "string" ? (
                  <Typography variant="h6">{title}</Typography>
                ) : (
                  title
                )
              ) : null}
              {description ? (
                typeof description === "string" ? (
                  <Typography variant="body2" color="text.secondary" sx={{ mt: 0.35 }}>
                    {description}
                  </Typography>
                ) : (
                  description
                )
              ) : null}
            </Box>
            {action ? <Box sx={{ flexShrink: 0 }}>{action}</Box> : null}
          </Stack>
        </Box>
      ) : null}
      {flush ? (
        <Box sx={contentSx}>{children}</Box>
      ) : (
        <CardContent
          sx={{
            pt: title || description || action ? 0 : undefined,
            ...contentSx,
          }}
        >
          {children}
        </CardContent>
      )}
    </Card>
  );
}

/** KPI strip tile with left accent. */
export function AdminKpi({
  label,
  value,
  accent = "primary",
  loading,
  hint,
}: {
  label: string;
  value: ReactNode;
  accent?: AccentKey;
  loading?: boolean;
  hint?: ReactNode;
}) {
  return (
    <Box
      sx={{
        flex: 1,
        minWidth: 0,
        bgcolor: "background.paper",
        border: "1px solid",
        borderColor: "divider",
        borderLeft: "3px solid",
        borderLeftColor: ADMIN.accent[accent],
        borderRadius: 1,
        px: 1.75,
        py: 1.5,
        opacity: loading ? 0.65 : 1,
        transition: "opacity 0.15s ease",
      }}
    >
      <Typography variant="overline" display="block">
        {label}
      </Typography>
      {loading ? (
        <Skeleton variant="text" width="56%" height={32} sx={{ mt: 0.35 }} />
      ) : (
        <Typography variant="h5" sx={{ mt: 0.35 }}>
          {value}
        </Typography>
      )}
      {hint ? (
        <Typography variant="caption" color="text.secondary" sx={{ display: "block", mt: 0.5 }}>
          {hint}
        </Typography>
      ) : null}
    </Box>
  );
}

export function AdminKpiRow({ children }: { children: ReactNode }) {
  return (
    <Stack direction={{ xs: "column", sm: "row" }} spacing={ADMIN.sectionGap} useFlexGap sx={{ width: "100%" }}>
      {children}
    </Stack>
  );
}

/** Bordered table container with optional loading overlay and empty state. */
export function AdminTableShell({
  children,
  loading,
  empty,
  isEmpty,
  sx,
}: {
  children: ReactNode;
  loading?: boolean;
  empty?: ReactNode;
  isEmpty?: boolean;
  sx?: SxProps<Theme>;
}) {
  return (
    <Box
      sx={{
        border: "1px solid",
        borderColor: "divider",
        borderRadius: 1,
        overflow: "hidden",
        bgcolor: "background.paper",
        position: "relative",
        width: "100%",
        maxWidth: "100%",
        ...sx,
      }}
    >
      <Box sx={{ overflowX: "auto", width: "100%", WebkitOverflowScrolling: "touch" }}>
        {isEmpty && !loading ? empty ?? <AdminEmptyState title="No results" /> : children}
      </Box>
      {loading ? (
        <Box
          sx={{
            position: "absolute",
            inset: 0,
            bgcolor: "rgba(255,255,255,0.72)",
            display: "grid",
            placeItems: "center",
            zIndex: 1,
          }}
          role="status"
          aria-live="polite"
          aria-label="Loading"
        >
          <CircularProgress size={28} />
        </Box>
      ) : null}
    </Box>
  );
}

/** Filter / toolbar strip for list pages. */
export function AdminFilterBar({
  children,
  actions,
}: {
  children: ReactNode;
  actions?: ReactNode;
}) {
  return (
    <AdminCard>
      <Stack
        direction={{ xs: "column", md: "row" }}
        spacing={ADMIN.filterGap}
        alignItems={{ md: "center" }}
        justifyContent="space-between"
        useFlexGap
        flexWrap="wrap"
      >
        <Stack
          direction={{ xs: "column", sm: "row" }}
          spacing={ADMIN.filterGap}
          useFlexGap
          flexWrap="wrap"
          sx={{ flex: 1, minWidth: 0 }}
        >
          {children}
        </Stack>
        {actions ? (
          <Stack direction="row" spacing={1} flexShrink={0} flexWrap="wrap" useFlexGap>
            {actions}
          </Stack>
        ) : null}
      </Stack>
    </AdminCard>
  );
}

export function AdminEmptyState({
  title,
  description,
  action,
  icon,
}: {
  title: string;
  description?: string;
  action?: ReactNode;
  icon?: ReactNode;
}) {
  return (
    <Stack alignItems="center" justifyContent="center" spacing={1} sx={{ py: 5, px: 2, textAlign: "center" }}>
      <Box
        sx={{
          width: 48,
          height: 48,
          borderRadius: 2,
          bgcolor: ADMIN.surface.muted,
          color: "text.secondary",
          display: "grid",
          placeItems: "center",
          mb: 0.5,
          border: "1px solid",
          borderColor: "divider",
        }}
        aria-hidden
      >
        {icon ?? <InboxOutlined />}
      </Box>
      <Typography variant="subtitle1">{title}</Typography>
      {description ? (
        <Typography variant="body2" color="text.secondary" sx={{ maxWidth: 420 }}>
          {description}
        </Typography>
      ) : null}
      {action}
    </Stack>
  );
}

/** Full-page / section loading panel. */
export function AdminPageLoader({ label = "Loading…" }: { label?: string }) {
  return (
    <Stack
      alignItems="center"
      justifyContent="center"
      spacing={1.5}
      role="status"
      aria-live="polite"
      sx={{
        minHeight: "48vh",
        bgcolor: "background.paper",
        border: "1px solid",
        borderColor: "divider",
        borderRadius: 1,
        px: 2,
      }}
    >
      <CircularProgress size={32} thickness={4} />
      <Typography variant="body2" color="text.secondary" fontWeight={600}>
        {label}
      </Typography>
    </Stack>
  );
}

/** Skeleton placeholder for table-like content. */
export function AdminTableSkeleton({ rows = 6, cols = 5 }: { rows?: number; cols?: number }) {
  return (
    <Box sx={{ p: 2 }} aria-hidden>
      <Stack spacing={1.25}>
        <Skeleton variant="rounded" height={36} />
        {Array.from({ length: rows }).map((_, i) => (
          <Stack key={i} direction="row" spacing={1.5}>
            {Array.from({ length: cols }).map((__, j) => (
              <Skeleton key={j} variant="rounded" height={28} sx={{ flex: 1 }} />
            ))}
          </Stack>
        ))}
      </Stack>
    </Box>
  );
}

type CalloutTone = "info" | "warning" | "error" | "success";

const CALLOUT: Record<
  CalloutTone,
  { border: string; icon: ReactNode; accent: string }
> = {
  info: { border: "#BFDBFE", icon: <InfoOutlined fontSize="small" />, accent: ADMIN.accent.info },
  warning: { border: "#FDE68A", icon: <WarningAmberOutlined fontSize="small" />, accent: ADMIN.accent.warning },
  error: { border: "#FECACA", icon: <ErrorOutline fontSize="small" />, accent: ADMIN.accent.error },
  success: { border: "#A7F3D0", icon: <InfoOutlined fontSize="small" />, accent: ADMIN.accent.success },
};

/** Inline callout panel (pending work, notices) — prefer over ad-hoc bordered Boxes. */
export function AdminCallout({
  tone = "info",
  title,
  children,
  action,
}: {
  tone?: CalloutTone;
  title?: ReactNode;
  children: ReactNode;
  action?: ReactNode;
}) {
  const cfg = CALLOUT[tone];
  return (
    <Box
      sx={{
        bgcolor: "background.paper",
        border: "1px solid",
        borderColor: cfg.border,
        borderLeft: "3px solid",
        borderLeftColor: cfg.accent,
        borderRadius: 1,
        p: ADMIN.cardPadding,
      }}
    >
      <Stack direction="row" spacing={1.25} alignItems="flex-start" justifyContent="space-between">
        <Stack direction="row" spacing={1.25} alignItems="flex-start" sx={{ minWidth: 0, flex: 1 }}>
          <Box sx={{ color: cfg.accent, mt: 0.15, flexShrink: 0 }} aria-hidden>
            {cfg.icon}
          </Box>
          <Box sx={{ minWidth: 0 }}>
            {title ? (
              typeof title === "string" ? (
                <Typography variant="subtitle2" sx={{ mb: 0.5 }}>
                  {title}
                </Typography>
              ) : (
                title
              )
            ) : null}
            {typeof children === "string" ? (
              <Typography variant="body2" color="text.secondary">
                {children}
              </Typography>
            ) : (
              children
            )}
          </Box>
        </Stack>
        {action ? <Box sx={{ flexShrink: 0 }}>{action}</Box> : null}
      </Stack>
    </Box>
  );
}

/** Segmented control for range / view toggles. */
export function AdminSegmentedControl<T extends string>({
  value,
  options,
  onChange,
  disabled,
  "aria-label": ariaLabel,
}: {
  value: T;
  options: readonly { value: T; label: string }[];
  onChange: (next: T) => void;
  disabled?: boolean;
  "aria-label"?: string;
}) {
  return (
    <Stack
      direction="row"
      spacing={0.5}
      role="group"
      aria-label={ariaLabel}
      sx={{
        bgcolor: "background.paper",
        p: 0.5,
        border: "1px solid",
        borderColor: "divider",
        borderRadius: 1,
        opacity: disabled ? 0.7 : 1,
      }}
    >
      {options.map((opt) => {
        const active = value === opt.value;
        return (
          <Box
            key={opt.value}
            component="button"
            type="button"
            disabled={disabled}
            aria-pressed={active}
            onClick={() => onChange(opt.value)}
            sx={{
              border: 0,
              cursor: disabled ? "wait" : "pointer",
              px: 1.5,
              py: 0.65,
              fontSize: 13,
              fontWeight: 700,
              fontFamily: "inherit",
              borderRadius: 0.75,
              bgcolor: active ? "primary.main" : "transparent",
              color: active ? "primary.contrastText" : "text.secondary",
              transition: "background-color 0.12s ease, color 0.12s ease",
              "&:hover": disabled
                ? undefined
                : {
                    bgcolor: active ? "primary.dark" : ADMIN.surface.muted,
                  },
              "&:focus-visible": {
                outline: ADMIN.focusRing,
                outlineOffset: ADMIN.focusOffset,
              },
            }}
          >
            {opt.label}
          </Box>
        );
      })}
    </Stack>
  );
}

export type AdminBreadcrumbItem = {
  label: string;
  to?: string;
};

/** Consistent breadcrumb row for detail pages. */
export function AdminBreadcrumbs({ items }: { items: AdminBreadcrumbItem[] }) {
  return (
    <Breadcrumbs aria-label="Breadcrumb">
      {items.map((item, index) => {
        const last = index === items.length - 1;
        if (last || !item.to) {
          return (
            <Typography key={`${item.label}-${index}`} variant="body2" color="text.primary" fontWeight={600}>
              {item.label}
            </Typography>
          );
        }
        return (
          <Link
            key={`${item.label}-${index}`}
            component={RouterLink}
            to={item.to}
            variant="body2"
            color="text.secondary"
            underline="hover"
          >
            {item.label}
          </Link>
        );
      })}
    </Breadcrumbs>
  );
}

/** Result / summary strip under filters. */
export function AdminResultBar({ children }: { children: ReactNode }) {
  return (
    <Box
      sx={{
        px: ADMIN.cardPadding,
        py: 1.25,
        bgcolor: ADMIN.surface.muted,
        borderTop: "1px solid",
        borderColor: "divider",
        display: "flex",
        alignItems: "center",
        gap: 1,
        flexWrap: "wrap",
      }}
    >
      {children}
    </Box>
  );
}

export function AdminSectionLabel({ children }: { children: ReactNode }) {
  return (
    <Typography variant="overline" display="block" sx={{ mb: 1 }}>
      {children}
    </Typography>
  );
}
