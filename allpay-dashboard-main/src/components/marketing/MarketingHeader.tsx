import Close from "@mui/icons-material/Close";
import ExpandMore from "@mui/icons-material/ExpandMore";
import MenuIcon from "@mui/icons-material/Menu";
import {
  AppBar,
  Box,
  Button,
  Collapse,
  Container,
  Divider,
  Drawer,
  IconButton,
  Link,
  List,
  ListItemButton,
  ListItemText,
  Menu,
  MenuItem,
  Stack,
  Toolbar,
} from "@mui/material";
import { useState } from "react";
import { Link as RouterLink, useLocation, useNavigate } from "react-router-dom";
import { useAuth } from "../../context/AuthContext";
import { AllpayLogo } from "./AllpayLogo";
import { focusRing, landing } from "./landingTokens";

const productLinks = [
  { label: "UPI expenses", href: "/#product" },
  { label: "Spend locks", href: "/#controls" },
  { label: "How tracking works", href: "/#how-it-works" },
  { label: "Verification", href: "/#verification" },
  { label: "Reconciliation", href: "/#reconciliation" },
];

const solutionLinks = [
  { label: "Business expenses", href: "/#solutions" },
  { label: "Fleet & fuel", href: "/#solutions" },
  { label: "Petty cash", href: "/#solutions" },
  { label: "Reimbursements", href: "/#solutions" },
];

const resourceLinks = [
  { label: "How it works", href: "/#how-it-works" },
  { label: "Categories", href: "/#categories" },
  { label: "FAQs", href: "/#faq" },
];

const companyLinks = [
  { label: "About", href: "/#company" },
  { label: "Contact", href: "/#footer" },
];

const navBtnSx = {
  color: landing.ink,
  fontWeight: 600,
  textTransform: "none" as const,
  fontFamily: landing.fontBody,
  fontSize: 14,
  px: 1.25,
  "&:hover": { bgcolor: landing.blueSoft, color: landing.blue },
  "&:focus-visible": focusRing,
};

function scrollToHash(hash: string) {
  const id = hash.replace("#", "");
  const el = document.getElementById(id);
  if (el) el.scrollIntoView({ behavior: "smooth", block: "start" });
}

export function MarketingHeader({ elevated = false }: { elevated?: boolean }) {
  const navigate = useNavigate();
  const location = useLocation();
  const { user, signOut } = useAuth();
  const [productAnchor, setProductAnchor] = useState<null | HTMLElement>(null);
  const [solutionsAnchor, setSolutionsAnchor] = useState<null | HTMLElement>(null);
  const [resourceAnchor, setResourceAnchor] = useState<null | HTMLElement>(null);
  const [companyAnchor, setCompanyAnchor] = useState<null | HTMLElement>(null);
  const [mobileOpen, setMobileOpen] = useState(false);
  const [mobileSection, setMobileSection] = useState<string | null>(null);

  const goHash = (href: string) => {
    const [, hash = ""] = href.split("#");
    setProductAnchor(null);
    setSolutionsAnchor(null);
    setResourceAnchor(null);
    setCompanyAnchor(null);
    setMobileOpen(false);
    if (location.pathname === "/") {
      scrollToHash(hash);
    } else {
      navigate({ pathname: "/", hash });
      window.setTimeout(() => scrollToHash(hash), 80);
    }
  };

  return (
    <AppBar
      position="sticky"
      elevation={0}
      sx={{
        bgcolor: elevated ? "rgba(255,255,255,0.92)" : "#fff",
        backdropFilter: elevated ? "blur(12px)" : "none",
        borderBottom: `1px solid ${landing.line}`,
        color: landing.ink,
      }}
    >
      <Container maxWidth="lg">
        <Toolbar disableGutters sx={{ minHeight: { xs: 64, md: 72 }, gap: 1, justifyContent: "space-between" }}>
          <Link
            component={RouterLink}
            to="/"
            underline="none"
            aria-label="allpay home"
            sx={{ "&:focus-visible": focusRing, borderRadius: 1 }}
          >
            <AllpayLogo size="md" />
          </Link>

          <Stack direction="row" spacing={0.25} alignItems="center" sx={{ display: { xs: "none", lg: "flex" } }}>
            <Button endIcon={<ExpandMore sx={{ fontSize: 18 }} />} onClick={(e) => setProductAnchor(e.currentTarget)} sx={navBtnSx}>
              Product
            </Button>
            <Menu anchorEl={productAnchor} open={Boolean(productAnchor)} onClose={() => setProductAnchor(null)}>
              {productLinks.map((l) => (
                <MenuItem key={l.label} onClick={() => goHash(l.href)}>
                  {l.label}
                </MenuItem>
              ))}
            </Menu>

            <Button endIcon={<ExpandMore sx={{ fontSize: 18 }} />} onClick={(e) => setSolutionsAnchor(e.currentTarget)} sx={navBtnSx}>
              Solutions
            </Button>
            <Menu anchorEl={solutionsAnchor} open={Boolean(solutionsAnchor)} onClose={() => setSolutionsAnchor(null)}>
              {solutionLinks.map((l) => (
                <MenuItem key={l.label} onClick={() => goHash(l.href)}>
                  {l.label}
                </MenuItem>
              ))}
            </Menu>

            <Button endIcon={<ExpandMore sx={{ fontSize: 18 }} />} onClick={(e) => setResourceAnchor(e.currentTarget)} sx={navBtnSx}>
              Resources
            </Button>
            <Menu anchorEl={resourceAnchor} open={Boolean(resourceAnchor)} onClose={() => setResourceAnchor(null)}>
              {resourceLinks.map((l) => (
                <MenuItem key={l.label} onClick={() => goHash(l.href)}>
                  {l.label}
                </MenuItem>
              ))}
            </Menu>

            <Button onClick={() => goHash("/#pricing")} sx={navBtnSx}>
              Pricing
            </Button>

            <Button endIcon={<ExpandMore sx={{ fontSize: 18 }} />} onClick={(e) => setCompanyAnchor(e.currentTarget)} sx={navBtnSx}>
              Company
            </Button>
            <Menu anchorEl={companyAnchor} open={Boolean(companyAnchor)} onClose={() => setCompanyAnchor(null)}>
              {companyLinks.map((l) => (
                <MenuItem key={l.label} onClick={() => goHash(l.href)}>
                  {l.label}
                </MenuItem>
              ))}
            </Menu>
          </Stack>

          <Stack direction="row" spacing={1} alignItems="center">
            {user ? (
              <>
                <Button
                  variant="outlined"
                  onClick={() => navigate("/admin/transactions")}
                  sx={{
                    display: { xs: "none", sm: "inline-flex" },
                    textTransform: "none",
                    borderColor: landing.line,
                    color: landing.ink,
                    fontWeight: 600,
                    "&:focus-visible": focusRing,
                  }}
                >
                  Dashboard
                </Button>
                <Button
                  variant="contained"
                  onClick={() => signOut()}
                  sx={{
                    textTransform: "none",
                    bgcolor: landing.navy,
                    fontWeight: 700,
                    "&:hover": { bgcolor: landing.navyMid },
                    "&:focus-visible": focusRing,
                  }}
                >
                  Log out
                </Button>
              </>
            ) : (
              <>
                <Button
                  component={RouterLink}
                  to="/login"
                  sx={{
                    display: { xs: "none", sm: "inline-flex" },
                    ...navBtnSx,
                  }}
                >
                  Login
                </Button>
                <Button
                  component={RouterLink}
                  to="/signup"
                  variant="contained"
                  sx={{
                    textTransform: "none",
                    px: 2.25,
                    bgcolor: landing.blue,
                    fontWeight: 700,
                    borderRadius: 2,
                    boxShadow: "0 8px 20px rgba(27,110,245,0.28)",
                    "&:hover": { bgcolor: "#1558D6" },
                    "&:focus-visible": focusRing,
                  }}
                >
                  Get started
                </Button>
              </>
            )}

            <IconButton
              aria-label={mobileOpen ? "Close menu" : "Open menu"}
              onClick={() => setMobileOpen((v) => !v)}
              sx={{ display: { lg: "none" }, color: landing.ink, "&:focus-visible": focusRing }}
            >
              {mobileOpen ? <Close /> : <MenuIcon />}
            </IconButton>
          </Stack>
        </Toolbar>
      </Container>

      <Drawer
        anchor="top"
        open={mobileOpen}
        onClose={() => setMobileOpen(false)}
        ModalProps={{ keepMounted: true }}
        sx={{
          display: { lg: "none" },
          "& .MuiDrawer-paper": {
            top: 0,
            mt: "64px",
            maxHeight: "calc(100vh - 64px)",
            borderBottomLeftRadius: 16,
            borderBottomRightRadius: 16,
            boxShadow: landing.shadow,
          },
        }}
      >
        <Box sx={{ p: 2, pb: 3 }}>
          {[
            { key: "product", label: "Product", items: productLinks },
            { key: "solutions", label: "Solutions", items: solutionLinks },
            { key: "resources", label: "Resources", items: resourceLinks },
            { key: "company", label: "Company", items: companyLinks },
          ].map((section) => (
            <Box key={section.key}>
              <ListItemButton
                onClick={() => setMobileSection((s) => (s === section.key ? null : section.key))}
                sx={{ borderRadius: 1.5 }}
              >
                <ListItemText primary={section.label} primaryTypographyProps={{ fontWeight: 700 }} />
                <ExpandMore
                  sx={{
                    transform: mobileSection === section.key ? "rotate(180deg)" : "none",
                    transition: "transform 0.2s",
                  }}
                />
              </ListItemButton>
              <Collapse in={mobileSection === section.key}>
                <List dense disablePadding>
                  {section.items.map((item) => (
                    <ListItemButton key={item.label} sx={{ pl: 3 }} onClick={() => goHash(item.href)}>
                      <ListItemText primary={item.label} />
                    </ListItemButton>
                  ))}
                </List>
              </Collapse>
            </Box>
          ))}
          <ListItemButton onClick={() => goHash("/#pricing")} sx={{ borderRadius: 1.5 }}>
            <ListItemText primary="Pricing" primaryTypographyProps={{ fontWeight: 700 }} />
          </ListItemButton>
          <Divider sx={{ my: 1.5 }} />
          {!user && (
            <Stack spacing={1}>
              <Button component={RouterLink} to="/login" fullWidth variant="outlined" onClick={() => setMobileOpen(false)} sx={{ textTransform: "none", fontWeight: 700 }}>
                Login
              </Button>
              <Button component={RouterLink} to="/signup" fullWidth variant="contained" onClick={() => setMobileOpen(false)} sx={{ textTransform: "none", fontWeight: 700, bgcolor: landing.blue }}>
                Get started
              </Button>
            </Stack>
          )}
        </Box>
      </Drawer>
    </AppBar>
  );
}
