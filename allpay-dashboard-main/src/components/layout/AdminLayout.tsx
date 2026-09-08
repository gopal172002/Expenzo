import AnalyticsOutlined from "@mui/icons-material/AnalyticsOutlined";
import CampaignOutlined from "@mui/icons-material/CampaignOutlined";
import CreditCardOutlined from "@mui/icons-material/CreditCardOutlined";
import Download from "@mui/icons-material/Download";
import GroupOutlined from "@mui/icons-material/GroupOutlined";
import HomeOutlined from "@mui/icons-material/HomeOutlined";
import KeyboardArrowDown from "@mui/icons-material/KeyboardArrowDown";
import LogoutOutlined from "@mui/icons-material/LogoutOutlined";
import Menu from "@mui/icons-material/Menu";
import MenuOpen from "@mui/icons-material/MenuOpen";
import PolicyOutlined from "@mui/icons-material/PolicyOutlined";
import ReceiptLongOutlined from "@mui/icons-material/ReceiptLongOutlined";
import SecurityOutlined from "@mui/icons-material/SecurityOutlined";
import SettingsOutlined from "@mui/icons-material/SettingsOutlined";
import SpaceDashboardOutlined from "@mui/icons-material/SpaceDashboardOutlined";
import {
  AppBar,
  Avatar,
  Box,
  Button,
  Divider,
  Drawer,
  IconButton,
  LinearProgress,
  List,
  ListItemButton,
  ListItemIcon,
  ListItemText,
  ListSubheader,
  Menu as MuiMenu,
  MenuItem,
  Stack,
  Toolbar,
  Tooltip,
  Typography,
  useMediaQuery,
  useTheme,
} from "@mui/material";
import { useState } from "react";
import { Link as RouterLink, Outlet, useLocation, useNavigate } from "react-router-dom";
import { useAdminData } from "../../context/AdminDataContext";
import { useAuth } from "../../context/AuthContext";
import { SIDEBAR } from "../../theme";

type NavItem = { label: string; to: string; icon: React.ReactNode };
type NavGroup = { heading: string; items: NavItem[] };

const NAV_GROUPS: NavGroup[] = [
  {
    heading: "Overview",
    items: [
      { label: "Dashboard", to: "/admin", icon: <SpaceDashboardOutlined /> },
      { label: "Spend analytics", to: "/admin/analytics", icon: <AnalyticsOutlined /> },
    ],
  },
  {
    heading: "Claims",
    items: [
      { label: "Employee receipts", to: "/admin/receipts", icon: <ReceiptLongOutlined /> },
      { label: "Transactions", to: "/admin/transactions", icon: <CreditCardOutlined /> },
      { label: "Claim review", to: "/admin/fraud", icon: <SecurityOutlined /> },
    ],
  },
  {
    heading: "Governance",
    items: [
      { label: "Expense policies", to: "/admin/policies", icon: <PolicyOutlined /> },
      { label: "Policy alerts", to: "/admin/alerts", icon: <CampaignOutlined /> },
      { label: "Exports", to: "/admin/exports", icon: <Download /> },
    ],
  },
  {
    heading: "Workspace",
    items: [
      { label: "Employees", to: "/admin/employees", icon: <GroupOutlined /> },
      { label: "Billing", to: "/admin/billing", icon: <CreditCardOutlined /> },
    ],
  },
];

const drawerWidthExpanded = 248;
const drawerWidthCollapsed = 72;

function initials(value: string): string {
  const parts = value.replace(/@.*/, "").split(/[\s._-]+/).filter(Boolean);
  if (parts.length === 0) return "A";
  return (parts[0]![0]! + (parts[1]?.[0] ?? "")).toUpperCase();
}

export const AdminLayout = () => {
  const location = useLocation();
  const navigate = useNavigate();
  const { user, signOut } = useAuth();
  const { isBootstrapping } = useAdminData();
  const theme = useTheme();
  const isDesktop = useMediaQuery(theme.breakpoints.up("md"));
  const [mobileOpen, setMobileOpen] = useState(false);
  const [collapsed, setCollapsed] = useState(false);
  const [accountAnchor, setAccountAnchor] = useState<null | HTMLElement>(null);
  const currentWidth = isDesktop ? (collapsed ? drawerWidthCollapsed : drawerWidthExpanded) : 0;
  const displayName = user?.fullName || user?.email || "Administrator";

  const isSelected = (to: string) =>
    to === "/admin" ? location.pathname === "/admin" : location.pathname.startsWith(to);

  return (
    <Box sx={{ display: "flex", minHeight: "100vh", bgcolor: "background.default" }}>
      <AppBar
        color="inherit"
        elevation={0}
        sx={{
          width: { md: `calc(100% - ${currentWidth}px)` },
          ml: { md: `${currentWidth}px` },
          borderBottom: "1px solid",
          borderColor: "divider",
          bgcolor: "background.paper",
        }}
      >
        {isBootstrapping ? <LinearProgress /> : null}
        <Toolbar sx={{ justifyContent: "space-between", gap: 1, minHeight: 64 }}>
          <Stack direction="row" spacing={1} alignItems="center" sx={{ minWidth: 0 }}>
            <IconButton
              onClick={() => (isDesktop ? setCollapsed((prev) => !prev) : setMobileOpen((prev) => !prev))}
              aria-label={collapsed ? "Expand navigation" : "Collapse navigation"}
            >
              {collapsed ? <Menu /> : <MenuOpen />}
            </IconButton>
            <Box sx={{ minWidth: 0 }}>
              <Typography variant="subtitle1" noWrap>
                AllPay
              </Typography>
              <Typography variant="caption" color="text.secondary" noWrap>
                Expense control
              </Typography>
            </Box>
          </Stack>

          <Button
            onClick={(e) => setAccountAnchor(e.currentTarget)}
            endIcon={<KeyboardArrowDown />}
            sx={{ color: "text.primary", gap: 0.5, pl: 1 }}
            aria-haspopup="menu"
            aria-expanded={Boolean(accountAnchor)}
          >
            <Avatar sx={{ width: 30, height: 30, bgcolor: "primary.main", fontSize: 12, fontWeight: 700 }}>
              {initials(displayName)}
            </Avatar>
            <Box sx={{ display: { xs: "none", sm: "block" }, textAlign: "left", ml: 1 }}>
              <Typography variant="body2" fontWeight={650} noWrap sx={{ maxWidth: 180 }}>
                {displayName}
              </Typography>
              <Typography variant="caption" color="text.secondary" noWrap>
                Administrator
              </Typography>
            </Box>
          </Button>

          <MuiMenu
            anchorEl={accountAnchor}
            open={Boolean(accountAnchor)}
            onClose={() => setAccountAnchor(null)}
            anchorOrigin={{ vertical: "bottom", horizontal: "right" }}
            transformOrigin={{ vertical: "top", horizontal: "right" }}
            slotProps={{ paper: { sx: { minWidth: 260, mt: 1 } } }}
          >
            <Box sx={{ px: 2, py: 1.5 }}>
              <Typography fontWeight={650} noWrap>
                {displayName}
              </Typography>
              <Typography variant="body2" color="text.secondary" noWrap>
                {user?.email}
              </Typography>
            </Box>
            <Divider />
            <MenuItem
              onClick={() => {
                setAccountAnchor(null);
                navigate("/admin/console");
              }}
            >
              <ListItemIcon>
                <SettingsOutlined fontSize="small" />
              </ListItemIcon>
              <ListItemText primary="Admin console" secondary="Users, storage, destinations, jobs" />
            </MenuItem>
            <MenuItem
              onClick={() => {
                setAccountAnchor(null);
                navigate("/");
              }}
            >
              <ListItemIcon>
                <HomeOutlined fontSize="small" />
              </ListItemIcon>
              <ListItemText primary="Marketing site" />
            </MenuItem>
            <Divider />
            <MenuItem
              onClick={() => {
                setAccountAnchor(null);
                signOut();
                navigate("/login", { replace: true });
              }}
            >
              <ListItemIcon>
                <LogoutOutlined fontSize="small" />
              </ListItemIcon>
              <ListItemText primary="Sign out" />
            </MenuItem>
          </MuiMenu>
        </Toolbar>
      </AppBar>

      <Drawer
        variant={isDesktop ? "permanent" : "temporary"}
        open={isDesktop ? true : mobileOpen}
        onClose={() => setMobileOpen(false)}
        sx={{
          width: currentWidth || drawerWidthExpanded,
          flexShrink: 0,
          [`& .MuiDrawer-paper`]: {
            width: currentWidth || drawerWidthExpanded,
            boxSizing: "border-box",
            bgcolor: SIDEBAR.bg,
            color: SIDEBAR.text,
            borderRight: `1px solid ${SIDEBAR.border}`,
            overflowX: "hidden",
          },
        }}
      >
        <Toolbar sx={{ gap: 1, px: collapsed ? 1.25 : 2, minHeight: 64 }}>
          <Avatar
            variant="rounded"
            sx={{ bgcolor: SIDEBAR.selected, width: 30, height: 30, fontSize: 12, fontWeight: 700 }}
          >
            AP
          </Avatar>
          {!collapsed ? (
            <Box>
              <Typography fontWeight={700} lineHeight={1.1} sx={{ color: "#F9FAFB" }}>
                AllPay
              </Typography>
              <Typography variant="caption" sx={{ color: SIDEBAR.muted }}>
                Admin
              </Typography>
            </Box>
          ) : null}
        </Toolbar>
        <Divider sx={{ borderColor: SIDEBAR.border }} />

        {NAV_GROUPS.map((group) => (
          <List
            key={group.heading}
            dense
            sx={{ px: 1, pt: 0.75 }}
            subheader={
              !collapsed ? (
                <ListSubheader
                  disableSticky
                  sx={{
                    bgcolor: "transparent",
                    fontSize: 10,
                    letterSpacing: 1.1,
                    textTransform: "uppercase",
                    color: SIDEBAR.heading,
                    lineHeight: 2.2,
                    fontWeight: 700,
                  }}
                >
                  {group.heading}
                </ListSubheader>
              ) : null
            }
          >
            {group.items.map((item) => {
              const selected = isSelected(item.to);
              const button = (
                <ListItemButton
                  key={item.label}
                  component={RouterLink}
                  to={item.to}
                  selected={selected}
                  onClick={() => setMobileOpen(false)}
                  sx={{
                    mb: 0.25,
                    borderRadius: 1.5,
                    minHeight: 38,
                    px: collapsed ? 1.1 : 1.25,
                    justifyContent: collapsed ? "center" : "flex-start",
                    color: selected ? "#fff" : SIDEBAR.text,
                    "&.Mui-selected": { bgcolor: SIDEBAR.selected },
                    "&.Mui-selected:hover": { bgcolor: "#1D4ED8" },
                    "&:hover": { bgcolor: selected ? "#1D4ED8" : SIDEBAR.bgHover },
                    "&.Mui-selected .MuiListItemIcon-root": { color: "#fff" },
                  }}
                >
                  <ListItemIcon sx={{ minWidth: collapsed ? 0 : 34, color: selected ? "#fff" : SIDEBAR.muted }}>
                    {item.icon}
                  </ListItemIcon>
                  {!collapsed ? (
                    <ListItemText
                      primary={item.label}
                      primaryTypographyProps={{ fontSize: 13.5, fontWeight: 600 }}
                    />
                  ) : null}
                </ListItemButton>
              );
              return collapsed ? (
                <Tooltip key={item.label} title={item.label} placement="right">
                  <span>{button}</span>
                </Tooltip>
              ) : (
                button
              );
            })}
          </List>
        ))}
      </Drawer>

      <Box component="main" sx={{ flexGrow: 1, p: { xs: 2, md: 3 }, mt: 8, minWidth: 0 }}>
        <Outlet />
      </Box>
    </Box>
  );
};
