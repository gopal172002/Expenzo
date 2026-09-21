import { createTheme } from "@mui/material";

/**
 * AllPay admin design tokens — single source of truth for the product shell.
 * Prefer these over page-local hex / spacing one-offs.
 */
export const ADMIN = {
  /** Max content width inside the main pane (fluid below this). */
  contentMaxWidth: 1440,
  pageGap: 2.5,
  cardPadding: 2,
  sectionGap: 1.5,
  filterGap: 1.25,

  radius: {
    sm: 6,
    md: 8,
    lg: 12,
  },

  /** Dense finance-ops table metrics */
  table: {
    headerHeight: 40,
    rowHeight: 48,
    cellPx: 14,
    cellPy: 10,
    fontSize: 13,
    headerFontSize: 12,
  },

  control: {
    height: 36,
    heightSm: 32,
  },

  shadow: {
    none: "none",
    sm: "0 1px 2px rgba(15, 23, 42, 0.04)",
    md: "0 4px 12px rgba(15, 23, 42, 0.06)",
  },

  accent: {
    primary: "#2563EB",
    primaryDark: "#1D4ED8",
    navy: "#0F172A",
    indigo: "#312E81",
    success: "#059669",
    warning: "#D97706",
    error: "#DC2626",
    teal: "#0F766E",
    slate: "#475569",
    info: "#0284C7",
  },

  surface: {
    page: "#F0F4FA",
    paper: "#FFFFFF",
    muted: "#F8FAFC",
    subtle: "#F1F5F9",
    hover: "#F8FAFC",
    selected: "#EFF6FF",
    hero: "#EFF6FF",
  },

  border: {
    default: "#E2E8F0",
    strong: "#CBD5E1",
    focus: "#2563EB",
  },

  text: {
    primary: "#0F172A",
    secondary: "#64748B",
    muted: "#94A3B8",
  },

  focusRing: "2px solid #2563EB",
  focusOffset: 2,
} as const;

/** Shared filter-field grid used by list pages. */
export const ADMIN_FILTER_GRID_SX = {
  display: "grid",
  gap: 1.5,
  gridTemplateColumns: {
    xs: "1fr",
    sm: "repeat(2, minmax(0, 1fr))",
    md: "repeat(4, minmax(0, 1fr))",
  },
} as const;

export const ADMIN_FILTER_FIELD_SX = { width: "100%", minWidth: 0 } as const;

export const SIDEBAR = {
  widthExpanded: 248,
  widthCollapsed: 72,
  bg: "#111318",
  bgHover: "#1C1F26",
  selected: "#2563EB",
  selectedHover: "#1D4ED8",
  text: "#E5E7EB",
  muted: "#9CA3AF",
  heading: "#6B7280",
  border: "#1F232B",
  brand: "#F9FAFB",
} as const;

const fontFamily = '"Plus Jakarta Sans", system-ui, -apple-system, "Segoe UI", sans-serif';

/** Admin/employee product theme: dense, high-contrast, finance-ops. */
export const appTheme = createTheme({
  palette: {
    mode: "light",
    primary: { main: ADMIN.accent.primary, dark: "#1D4ED8", light: "#60A5FA", contrastText: "#fff" },
    secondary: { main: ADMIN.accent.teal },
    success: { main: ADMIN.accent.success },
    warning: { main: ADMIN.accent.warning },
    error: { main: ADMIN.accent.error },
    info: { main: ADMIN.accent.info },
    background: { default: ADMIN.surface.page, paper: ADMIN.surface.paper },
    text: { primary: ADMIN.text.primary, secondary: ADMIN.text.secondary },
    divider: ADMIN.border.default,
    action: {
      hover: "rgba(15, 23, 42, 0.04)",
      selected: "rgba(37, 99, 235, 0.08)",
      disabled: "rgba(15, 23, 42, 0.26)",
      disabledBackground: "rgba(15, 23, 42, 0.08)",
    },
  },
  breakpoints: {
    values: { xs: 0, sm: 600, md: 900, lg: 1200, xl: 1536 },
  },
  shape: { borderRadius: ADMIN.radius.md },
  spacing: 8,
  typography: {
    fontFamily,
    h4: {
      fontWeight: 700,
      fontSize: "1.5rem",
      letterSpacing: "-0.025em",
      lineHeight: 1.3,
      color: ADMIN.text.primary,
    },
    h5: {
      fontWeight: 700,
      fontSize: "1.25rem",
      letterSpacing: "-0.02em",
      lineHeight: 1.35,
      color: ADMIN.text.primary,
    },
    h6: {
      fontWeight: 700,
      fontSize: "1.05rem",
      letterSpacing: "-0.01em",
      lineHeight: 1.4,
      color: ADMIN.text.primary,
    },
    subtitle1: { fontWeight: 600, lineHeight: 1.45 },
    subtitle2: { fontWeight: 600, lineHeight: 1.45 },
    body1: { fontSize: "0.9375rem", lineHeight: 1.55 },
    body2: { fontSize: "0.875rem", lineHeight: 1.5 },
    button: { textTransform: "none", fontWeight: 600, letterSpacing: 0 },
    caption: { fontSize: "0.75rem", letterSpacing: "0.01em", fontWeight: 500, lineHeight: 1.45 },
    overline: {
      fontSize: "0.6875rem",
      fontWeight: 700,
      letterSpacing: "0.06em",
      textTransform: "uppercase",
      lineHeight: 1.5,
      color: ADMIN.text.secondary,
    },
  },
  components: {
    MuiCssBaseline: {
      styleOverrides: {
        body: {
          backgroundColor: ADMIN.surface.page,
          color: ADMIN.text.primary,
          fontFamily,
        },
        "*, *::before, *::after": { boxSizing: "border-box" },
        "@media (prefers-reduced-motion: reduce)": {
          "*, *::before, *::after": {
            animationDuration: "0.01ms !important",
            animationIterationCount: "1 !important",
            transitionDuration: "0.01ms !important",
            scrollBehavior: "auto !important",
          },
        },
      },
    },
    MuiCard: {
      defaultProps: { elevation: 0 },
      styleOverrides: {
        root: {
          border: `1px solid ${ADMIN.border.default}`,
          boxShadow: ADMIN.shadow.none,
          borderRadius: ADMIN.radius.md,
          backgroundImage: "none",
        },
      },
    },
    MuiCardContent: {
      styleOverrides: {
        root: {
          padding: 16,
          "&:last-child": { paddingBottom: 16 },
        },
      },
    },
    MuiPaper: {
      defaultProps: { elevation: 0 },
      styleOverrides: {
        root: { backgroundImage: "none" },
        outlined: { borderColor: ADMIN.border.default },
      },
    },
    MuiButton: {
      defaultProps: { disableElevation: true },
      styleOverrides: {
        root: {
          borderRadius: ADMIN.radius.md,
          textTransform: "none",
          fontWeight: 600,
          minHeight: ADMIN.control.height,
          boxShadow: "none",
          "&:focus-visible": {
            outline: ADMIN.focusRing,
            outlineOffset: ADMIN.focusOffset,
          },
        },
        contained: {
          boxShadow: "none",
          "&:hover": { boxShadow: "none" },
        },
        sizeSmall: { minHeight: ADMIN.control.heightSm, fontSize: 13, paddingLeft: 10, paddingRight: 10 },
        sizeLarge: { minHeight: 40, fontSize: 15 },
      },
    },
    MuiIconButton: {
      styleOverrides: {
        root: {
          borderRadius: ADMIN.radius.md,
          "&:focus-visible": {
            outline: ADMIN.focusRing,
            outlineOffset: ADMIN.focusOffset,
          },
        },
        sizeSmall: { width: 32, height: 32 },
      },
    },
    MuiChip: {
      styleOverrides: {
        root: { fontWeight: 600, borderRadius: ADMIN.radius.sm },
        sizeSmall: { height: 24, fontSize: 12 },
        label: { paddingLeft: 8, paddingRight: 8 },
      },
    },
    MuiTable: {
      defaultProps: { size: "small" },
    },
    MuiTableHead: {
      styleOverrides: {
        root: {
          "& .MuiTableCell-head": {
            fontWeight: 600,
            fontSize: ADMIN.table.headerFontSize,
            color: ADMIN.text.secondary,
            backgroundColor: ADMIN.surface.muted,
            borderBottom: `1px solid ${ADMIN.border.default}`,
            whiteSpace: "nowrap",
            height: ADMIN.table.headerHeight,
            paddingTop: ADMIN.table.cellPy,
            paddingBottom: ADMIN.table.cellPy,
            paddingLeft: ADMIN.table.cellPx,
            paddingRight: ADMIN.table.cellPx,
            lineHeight: 1.35,
          },
        },
      },
    },
    MuiTableBody: {
      styleOverrides: {
        root: {
          "& .MuiTableRow-root": {
            height: ADMIN.table.rowHeight,
            transition: "background-color 0.12s ease",
          },
          "& .MuiTableRow-root:hover": {
            backgroundColor: ADMIN.surface.hover,
          },
          "& .MuiTableRow-root.Mui-selected": {
            backgroundColor: ADMIN.surface.selected,
          },
          "& .MuiTableRow-root.Mui-selected:hover": {
            backgroundColor: "#DBEAFE",
          },
        },
      },
    },
    MuiTableCell: {
      styleOverrides: {
        root: {
          borderColor: ADMIN.border.default,
          fontSize: ADMIN.table.fontSize,
          paddingTop: ADMIN.table.cellPy,
          paddingBottom: ADMIN.table.cellPy,
          paddingLeft: ADMIN.table.cellPx,
          paddingRight: ADMIN.table.cellPx,
          color: ADMIN.text.primary,
          verticalAlign: "middle",
        },
      },
    },
    MuiTablePagination: {
      styleOverrides: {
        root: {
          borderTop: `1px solid ${ADMIN.border.default}`,
          overflow: "hidden",
          backgroundColor: ADMIN.surface.paper,
        },
        toolbar: { minHeight: 52, paddingLeft: 12, paddingRight: 12 },
        selectLabel: { fontSize: 13 },
        displayedRows: { fontSize: 13 },
      },
    },
    MuiOutlinedInput: {
      styleOverrides: {
        root: {
          backgroundColor: "#fff",
          borderRadius: ADMIN.radius.md,
          minHeight: ADMIN.control.heightSm,
          "&:hover .MuiOutlinedInput-notchedOutline": { borderColor: ADMIN.border.strong },
          "&.Mui-focused .MuiOutlinedInput-notchedOutline": {
            borderWidth: 1.5,
            borderColor: ADMIN.border.focus,
          },
          "&.Mui-focused": {
            boxShadow: "0 0 0 3px rgba(37, 99, 235, 0.12)",
          },
        },
        input: { fontSize: 14, paddingTop: 8.5, paddingBottom: 8.5 },
        notchedOutline: { borderColor: ADMIN.border.default },
      },
    },
    MuiTextField: {
      defaultProps: { size: "small", variant: "outlined" },
    },
    MuiSelect: {
      defaultProps: { size: "small" },
    },
    MuiFormControl: {
      defaultProps: { size: "small" },
    },
    MuiInputLabel: {
      styleOverrides: {
        root: { fontSize: 14, fontWeight: 500 },
      },
    },
    MuiTabs: {
      styleOverrides: {
        root: { minHeight: 44 },
        indicator: { height: 2, borderRadius: 1 },
      },
    },
    MuiTab: {
      styleOverrides: {
        root: {
          textTransform: "none",
          fontWeight: 600,
          minHeight: 44,
          fontSize: 14,
          color: ADMIN.text.secondary,
          "&.Mui-selected": { color: ADMIN.accent.primary },
          "&:focus-visible": {
            outline: ADMIN.focusRing,
            outlineOffset: -2,
          },
        },
      },
    },
    MuiToggleButtonGroup: {
      styleOverrides: {
        root: {
          backgroundColor: ADMIN.surface.paper,
          border: `1px solid ${ADMIN.border.default}`,
          borderRadius: ADMIN.radius.md,
        },
      },
    },
    MuiToggleButton: {
      styleOverrides: {
        root: {
          textTransform: "none",
          fontWeight: 600,
          fontSize: 13,
          border: "none",
          borderRadius: `${ADMIN.radius.sm}px !important`,
          paddingLeft: 12,
          paddingRight: 12,
          paddingTop: 5,
          paddingBottom: 5,
          color: ADMIN.text.secondary,
          "&.Mui-selected": {
            backgroundColor: ADMIN.accent.primary,
            color: "#fff",
            "&:hover": { backgroundColor: "#1D4ED8" },
          },
          "&:focus-visible": {
            outline: ADMIN.focusRing,
            outlineOffset: 2,
          },
        },
      },
    },
    MuiDialog: {
      styleOverrides: {
        paper: {
          borderRadius: ADMIN.radius.lg,
          border: `1px solid ${ADMIN.border.default}`,
          boxShadow: ADMIN.shadow.md,
        },
      },
    },
    MuiDialogTitle: {
      styleOverrides: {
        root: {
          fontWeight: 700,
          fontSize: "1.1rem",
          paddingBottom: 8,
          letterSpacing: "-0.01em",
        },
      },
    },
    MuiDialogContent: {
      styleOverrides: {
        root: { fontSize: 14 },
      },
    },
    MuiDialogActions: {
      styleOverrides: {
        root: { paddingLeft: 24, paddingRight: 24, paddingBottom: 20, gap: 8 },
      },
    },
    MuiAlert: {
      styleOverrides: {
        root: { borderRadius: ADMIN.radius.md, alignItems: "center" },
        standardInfo: { border: "1px solid #BFDBFE" },
        standardSuccess: { border: "1px solid #A7F3D0" },
        standardWarning: { border: "1px solid #FDE68A" },
        standardError: { border: "1px solid #FECACA" },
      },
    },
    MuiTooltip: {
      defaultProps: { arrow: true, enterDelay: 400 },
      styleOverrides: {
        tooltip: {
          fontSize: 12,
          fontWeight: 500,
          borderRadius: ADMIN.radius.sm,
          backgroundColor: "#1F2937",
          padding: "6px 10px",
        },
        arrow: { color: "#1F2937" },
      },
    },
    MuiLinearProgress: {
      styleOverrides: {
        root: { borderRadius: 99, height: 3 },
      },
    },
    MuiSkeleton: {
      styleOverrides: {
        root: { borderRadius: ADMIN.radius.sm },
      },
    },
    MuiMenu: {
      styleOverrides: {
        paper: {
          borderRadius: ADMIN.radius.md,
          border: `1px solid ${ADMIN.border.default}`,
          boxShadow: ADMIN.shadow.md,
        },
      },
    },
    MuiMenuItem: {
      styleOverrides: {
        root: {
          fontSize: 14,
          minHeight: 40,
          borderRadius: ADMIN.radius.sm,
          marginLeft: 4,
          marginRight: 4,
          "&.Mui-focusVisible": {
            outline: ADMIN.focusRing,
            outlineOffset: -2,
          },
        },
      },
    },
    MuiDivider: {
      styleOverrides: {
        root: { borderColor: ADMIN.border.default },
      },
    },
    MuiBreadcrumbs: {
      styleOverrides: {
        li: { fontSize: 13 },
        separator: { marginLeft: 4, marginRight: 4, color: ADMIN.text.muted },
      },
    },
    MuiLink: {
      defaultProps: { underline: "hover" },
      styleOverrides: {
        root: {
          fontWeight: 600,
          "&:focus-visible": {
            outline: ADMIN.focusRing,
            outlineOffset: 2,
            borderRadius: 2,
          },
        },
      },
    },
    MuiCheckbox: {
      styleOverrides: {
        root: {
          "&:focus-visible": {
            outline: ADMIN.focusRing,
            outlineOffset: 2,
          },
        },
      },
    },
    MuiSwitch: {
      styleOverrides: {
        root: {
          "& .MuiSwitch-switchBase:focus-visible + .MuiSwitch-track": {
            outline: ADMIN.focusRing,
            outlineOffset: 2,
          },
        },
      },
    },
    MuiDrawer: {
      styleOverrides: {
        paper: { backgroundImage: "none" },
      },
    },
    MuiAppBar: {
      defaultProps: { elevation: 0, color: "inherit" },
      styleOverrides: {
        root: { backgroundImage: "none" },
      },
    },
    MuiToolbar: {
      styleOverrides: {
        root: { minHeight: 64 },
      },
    },
    MuiSnackbar: {
      defaultProps: { autoHideDuration: 5000 },
    },
    MuiAvatar: {
      styleOverrides: {
        root: { fontWeight: 700 },
      },
    },
  },
});
