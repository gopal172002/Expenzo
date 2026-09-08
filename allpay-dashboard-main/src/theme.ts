import { createTheme } from "@mui/material";

/** Admin/employee product theme: dense, high-contrast, finance-ops — not a marketing site. */
export const appTheme = createTheme({
  palette: {
    primary: { main: "#2563EB", dark: "#1D4ED8", light: "#60A5FA", contrastText: "#fff" },
    secondary: { main: "#0F766E" },
    success: { main: "#059669" },
    warning: { main: "#D97706" },
    error: { main: "#DC2626" },
    background: { default: "#F3F4F6", paper: "#FFFFFF" },
    text: { primary: "#111827", secondary: "#6B7280" },
    divider: "#E5E7EB",
  },
  shape: { borderRadius: 8 },
  typography: {
    fontFamily: 'Inter, system-ui, -apple-system, "Segoe UI", Roboto, sans-serif',
    h5: { fontWeight: 600, fontSize: "1.25rem", letterSpacing: "-0.02em" },
    h6: { fontWeight: 600, fontSize: "1.05rem", letterSpacing: "-0.01em" },
    subtitle1: { fontWeight: 600 },
    subtitle2: { fontWeight: 600 },
    button: { textTransform: "none", fontWeight: 600 },
    caption: { letterSpacing: 0.1 },
  },
  components: {
    MuiCssBaseline: {
      styleOverrides: {
        body: { backgroundColor: "#F3F4F6" },
      },
    },
    MuiCard: {
      defaultProps: { elevation: 0 },
      styleOverrides: {
        root: {
          border: "1px solid #E5E7EB",
          boxShadow: "none",
        },
      },
    },
    MuiButton: {
      styleOverrides: {
        root: { borderRadius: 8 },
        contained: { boxShadow: "none", "&:hover": { boxShadow: "none" } },
      },
    },
    MuiChip: {
      styleOverrides: {
        root: { fontWeight: 600 },
      },
    },
    MuiTableHead: {
      styleOverrides: {
        root: {
          "& .MuiTableCell-head": {
            fontWeight: 600,
            fontSize: 12,
            color: "#6B7280",
            backgroundColor: "#F9FAFB",
            borderBottom: "1px solid #E5E7EB",
            whiteSpace: "nowrap",
          },
        },
      },
    },
    MuiTableCell: {
      styleOverrides: {
        root: { borderColor: "#F3F4F6", fontSize: 13 },
      },
    },
    MuiOutlinedInput: {
      styleOverrides: {
        root: { backgroundColor: "#fff" },
      },
    },
  },
});

export const SIDEBAR = {
  bg: "#111318",
  bgHover: "#1C1F26",
  selected: "#2563EB",
  text: "#E5E7EB",
  muted: "#9CA3AF",
  heading: "#6B7280",
  border: "#1F232B",
};
