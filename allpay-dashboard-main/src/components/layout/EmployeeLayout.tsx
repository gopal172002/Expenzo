import Menu from "@mui/icons-material/Menu";
import MenuOpen from "@mui/icons-material/MenuOpen";
import HomeOutlined from "@mui/icons-material/HomeOutlined";
import LogoutOutlined from "@mui/icons-material/LogoutOutlined";
import CreditCardOutlined from "@mui/icons-material/CreditCardOutlined";
import PhotoLibraryOutlined from "@mui/icons-material/PhotoLibraryOutlined";
import ReceiptLongOutlined from "@mui/icons-material/ReceiptLongOutlined";
import BarChartOutlined from "@mui/icons-material/BarChartOutlined";
import WarningAmberOutlined from "@mui/icons-material/WarningAmberOutlined";
import PersonOutline from "@mui/icons-material/PersonOutline";
import ArrowForward from "@mui/icons-material/ArrowForward";
import {
  AppBar,
  Avatar,
  Box,
  Button,
  Drawer,
  IconButton,
  LinearProgress,
  List,
  ListItemButton,
  ListItemIcon,
  ListItemText,
  Stack,
  Toolbar,
  Typography,
  useMediaQuery,
  useTheme,
} from "@mui/material";
import { useMemo, useState } from "react";
import { Link as RouterLink, Outlet, useLocation, useNavigate } from "react-router-dom";
import { useEmployeeData } from "../../context/EmployeeDataContext";
import { useAuth } from "../../context/AuthContext";
import { ADMIN, SIDEBAR } from "../../theme";

const navItems = [
  { label: "Home", to: "/employee", icon: <HomeOutlined fontSize="small" /> },
  { label: "My receipts", to: "/employee/receipts", icon: <PhotoLibraryOutlined fontSize="small" /> },
  { label: "My transactions", to: "/employee/transactions", icon: <CreditCardOutlined fontSize="small" /> },
  { label: "Payment proof", to: "/employee/payment-proof", icon: <ReceiptLongOutlined fontSize="small" /> },
  { label: "My spend", to: "/employee/spend", icon: <BarChartOutlined fontSize="small" /> },
  { label: "Activity & flags", to: "/employee/activity", icon: <WarningAmberOutlined fontSize="small" /> },
  { label: "Profile", to: "/employee/profile", icon: <PersonOutline fontSize="small" /> },
];

export const EmployeeLayout = () => {
  const location = useLocation();
  const navigate = useNavigate();
  const { user, signOut } = useAuth();
  const { isBootstrapping, summary } = useEmployeeData();
  const theme = useTheme();
  const isDesktop = useMediaQuery(theme.breakpoints.up("md"));
  const [mobileOpen, setMobileOpen] = useState(false);
  const [collapsed, setCollapsed] = useState(false);
  const currentWidth = isDesktop
    ? collapsed
      ? SIDEBAR.widthCollapsed
      : SIDEBAR.widthExpanded
    : 0;

  const initials = useMemo(() => {
    const email = user?.email ?? "E";
    return email.slice(0, 1).toUpperCase();
  }, [user?.email]);

  const pageTitle = useMemo(() => {
    const match = navItems.find((item) =>
      item.to === "/employee" ? location.pathname === "/employee" : location.pathname.startsWith(item.to),
    );
    return match?.label ?? "Employee";
  }, [location.pathname]);

  const drawer = (
    <Box sx={{ display: "flex", flexDirection: "column", height: "100%", bgcolor: SIDEBAR.bg }}>
      <Box sx={{ px: collapsed ? 1.5 : 2, py: 2, borderBottom: `1px solid ${SIDEBAR.border}` }}>
        <Stack direction="row" spacing={1.25} alignItems="center" justifyContent={collapsed ? "center" : "flex-start"}>
          <Avatar
            sx={{
              width: 34,
              height: 34,
              bgcolor: SIDEBAR.selected,
              fontSize: 13,
              fontWeight: 800,
            }}
          >
            AP
          </Avatar>
          {!collapsed ? (
            <Box sx={{ minWidth: 0 }}>
              <Typography sx={{ color: SIDEBAR.brand, fontWeight: 800, fontSize: 15, lineHeight: 1.2 }}>
                AllPay
              </Typography>
              <Typography sx={{ color: SIDEBAR.muted, fontSize: 11, fontWeight: 600 }}>
                Employee portal
              </Typography>
            </Box>
          ) : null}
        </Stack>
      </Box>

      <List sx={{ px: 1, py: 1.5, flex: 1 }}>
        {navItems.map((item) => {
          const selected =
            item.to === "/employee"
              ? location.pathname === "/employee"
              : location.pathname.startsWith(item.to);
          return (
            <ListItemButton
              key={item.label}
              component={RouterLink}
              to={item.to}
              selected={selected}
              onClick={() => setMobileOpen(false)}
              sx={{
                mb: 0.5,
                borderRadius: 1.5,
                minHeight: 42,
                color: selected ? "#fff" : SIDEBAR.text,
                bgcolor: selected ? SIDEBAR.selected : "transparent",
                "&:hover": {
                  bgcolor: selected ? SIDEBAR.selectedHover : SIDEBAR.bgHover,
                },
                "&.Mui-selected": {
                  bgcolor: SIDEBAR.selected,
                  color: "#fff",
                  "&:hover": { bgcolor: SIDEBAR.selectedHover },
                },
                justifyContent: collapsed ? "center" : "flex-start",
                px: collapsed ? 1 : 1.5,
              }}
            >
              <ListItemIcon
                sx={{
                  minWidth: collapsed ? 0 : 34,
                  color: "inherit",
                  justifyContent: "center",
                }}
              >
                {item.icon}
              </ListItemIcon>
              {!collapsed ? (
                <ListItemText
                  primary={item.label}
                  primaryTypographyProps={{ fontSize: 13.5, fontWeight: selected ? 700 : 600 }}
                />
              ) : null}
            </ListItemButton>
          );
        })}
      </List>

      {!collapsed ? (
        <Box sx={{ px: 2, py: 2, borderTop: `1px solid ${SIDEBAR.border}` }}>
          <Typography sx={{ color: SIDEBAR.muted, fontSize: 11, lineHeight: 1.45 }}>
            View your expenses and receipts. Finance approves claims in the admin workspace.
            {(summary?.pendingReview ?? 0) > 0
              ? ` ${summary?.pendingReview} pending review.`
              : ""}
          </Typography>
        </Box>
      ) : null}
    </Box>
  );

  return (
    <Box sx={{ display: "flex", minHeight: "100vh", bgcolor: ADMIN.surface.page }}>
      <AppBar
        color="inherit"
        elevation={0}
        sx={{
          width: { md: `calc(100% - ${currentWidth}px)` },
          ml: { md: `${currentWidth}px` },
          borderBottom: `1px solid ${ADMIN.border.default}`,
          bgcolor: ADMIN.surface.paper,
        }}
      >
        {isBootstrapping ? <LinearProgress sx={{ height: 2 }} /> : null}
        <Toolbar sx={{ justifyContent: "space-between", gap: 2, minHeight: 64 }}>
          <Stack direction="row" spacing={1.5} alignItems="center" sx={{ minWidth: 0 }}>
            <IconButton
              onClick={() => (isDesktop ? setCollapsed((p) => !p) : setMobileOpen((p) => !p))}
              aria-label="Toggle navigation"
              size="small"
            >
              {collapsed ? <Menu /> : <MenuOpen />}
            </IconButton>
            <Box sx={{ minWidth: 0 }}>
              <Typography variant="subtitle1" sx={{ fontWeight: 700 }} noWrap>
                {pageTitle}
              </Typography>
              <Typography variant="caption" color="text.secondary" noWrap>
                {user?.email ?? "Signed in"}
              </Typography>
            </Box>
          </Stack>
          <Stack direction="row" spacing={1} alignItems="center">
            <Avatar sx={{ width: 32, height: 32, bgcolor: ADMIN.accent.primary, fontSize: 13 }}>
              {initials}
            </Avatar>
            <IconButton
              onClick={() => {
                signOut();
                navigate("/", { replace: true });
              }}
              aria-label="Log out"
              size="small"
            >
              <LogoutOutlined fontSize="small" />
            </IconButton>
          </Stack>
        </Toolbar>
      </AppBar>

      <Drawer
        variant={isDesktop ? "permanent" : "temporary"}
        open={isDesktop ? true : mobileOpen}
        onClose={() => setMobileOpen(false)}
        sx={{
          width: currentWidth || SIDEBAR.widthExpanded,
          flexShrink: 0,
          [`& .MuiDrawer-paper`]: {
            width: currentWidth || SIDEBAR.widthExpanded,
            boxSizing: "border-box",
            borderRight: "none",
            bgcolor: SIDEBAR.bg,
          },
        }}
      >
        {drawer}
      </Drawer>

      <Box
        component="main"
        sx={{
          flexGrow: 1,
          p: { xs: 2, md: 3 },
          mt: 8,
          width: { md: `calc(100% - ${currentWidth}px)` },
          minWidth: 0,
        }}
      >
        <Outlet />
      </Box>
    </Box>
  );
};

export function EmployeeNavButton({
  label,
  to,
  variant = "contained",
}: {
  label: string;
  to: string;
  variant?: "contained" | "outlined";
}) {
  const navigate = useNavigate();
  return (
    <Button
      variant={variant}
      endIcon={<ArrowForward sx={{ fontSize: 16 }} />}
      onClick={() => navigate(to)}
      size="small"
    >
      {label}
    </Button>
  );
}
