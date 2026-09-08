import ExpandMore from "@mui/icons-material/ExpandMore";
import {
  AppBar,
  Box,
  Button,
  Container,
  Link,
  Menu,
  MenuItem,
  Stack,
  Toolbar,
  Typography,
} from "@mui/material";
import { useState } from "react";
import { Link as RouterLink, useNavigate } from "react-router-dom";
import { useAuth } from "../../context/AuthContext";

const linkSx = {
  color: "text.primary",
  fontWeight: 500,
  fontSize: 15,
  textDecoration: "none",
  "&:hover": { color: "primary.main" },
};

export function MarketingHeader() {
  const navigate = useNavigate();
  const { user, signOut } = useAuth();
  const [productAnchor, setProductAnchor] = useState<null | HTMLElement>(null);
  const [resourceAnchor, setResourceAnchor] = useState<null | HTMLElement>(null);

  return (
    <AppBar
      position="sticky"
      elevation={0}
      sx={{
        bgcolor: "#fff",
        borderBottom: "1px solid",
        borderColor: "rgba(0,0,0,0.06)",
      }}
    >
      <Container maxWidth="lg">
        <Toolbar disableGutters sx={{ minHeight: 72, gap: 2, justifyContent: "space-between" }}>
          <RouterLink to="/" style={{ textDecoration: "none", color: "inherit" }}>
            <Typography
              variant="h6"
              sx={{
                fontWeight: 800,
                letterSpacing: "-0.02em",
                color: "#0f172a",
                fontSize: { xs: 22, sm: 24 },
              }}
            >
              allpay
            </Typography>
          </RouterLink>

          <Stack direction="row" spacing={0.5} alignItems="center" sx={{ display: { xs: "none", md: "flex" } }}>
            <Button
              endIcon={<ExpandMore sx={{ fontSize: 18 }} />}
              onClick={(e) => setProductAnchor(e.currentTarget)}
              sx={{ color: "text.primary", fontWeight: 500, textTransform: "none" }}
            >
              Product
            </Button>
            <Menu anchorEl={productAnchor} open={Boolean(productAnchor)} onClose={() => setProductAnchor(null)}>
              <MenuItem onClick={() => setProductAnchor(null)}>Corporate cards</MenuItem>
              <MenuItem onClick={() => setProductAnchor(null)}>Expense management</MenuItem>
              <MenuItem onClick={() => setProductAnchor(null)}>Accounts payable</MenuItem>
              <MenuItem onClick={() => setProductAnchor(null)}>Business accounts</MenuItem>
            </Menu>
            <Button
              endIcon={<ExpandMore sx={{ fontSize: 18 }} />}
              onClick={(e) => setResourceAnchor(e.currentTarget)}
              sx={{ color: "text.primary", fontWeight: 500, textTransform: "none" }}
            >
              Resources
            </Button>
            <Menu anchorEl={resourceAnchor} open={Boolean(resourceAnchor)} onClose={() => setResourceAnchor(null)}>
              <MenuItem onClick={() => setResourceAnchor(null)}>Help center</MenuItem>
              <MenuItem onClick={() => setResourceAnchor(null)}>Blog</MenuItem>
              <MenuItem onClick={() => setResourceAnchor(null)}>Customer stories</MenuItem>
            </Menu>
            <Link component={RouterLink} to="/#pricing" sx={{ ...linkSx, px: 1.5, py: 1 }}>
              Pricing
            </Link>
          </Stack>

          <Stack direction="row" spacing={1} alignItems="center">
            <Box
              sx={{
                width: 32,
                height: 32,
                borderRadius: "50%",
                overflow: "hidden",
                border: "1px solid #eee",
                display: { xs: "none", sm: "block" },
              }}
            >
              <Box component="span" sx={{ fontSize: 22, lineHeight: "32px", display: "block", textAlign: "center" }}>
                🇮🇳
              </Box>
            </Box>
            {user ? (
              <>
                <Button variant="outlined" color="inherit" onClick={() => navigate("/admin/transactions")} sx={{ textTransform: "none", borderColor: "#cbd5e1", color: "#334155" }}>
                  Dashboard
                </Button>
                <Button variant="contained" onClick={() => signOut()} sx={{ textTransform: "none" }}>
                  Log out
                </Button>
              </>
            ) : (
              <>
                <Button component={RouterLink} to="/login" variant="outlined" sx={{ textTransform: "none", borderColor: "#cbd5e1", color: "#334155" }}>
                  Log in
                </Button>
                <Button component={RouterLink} to="/signup" variant="contained" sx={{ textTransform: "none", px: 2.5 }}>
                  Sign up
                </Button>
              </>
            )}
          </Stack>
        </Toolbar>
      </Container>
    </AppBar>
  );
}
