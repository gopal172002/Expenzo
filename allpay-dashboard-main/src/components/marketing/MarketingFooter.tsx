import LinkedIn from "@mui/icons-material/LinkedIn";
import Twitter from "@mui/icons-material/Twitter";
import { Box, Container, Divider, Grid, IconButton, Link, Stack, Typography } from "@mui/material";
import { Link as RouterLink } from "react-router-dom";
import { AllpayLogo } from "./AllpayLogo";
import { focusRing, landing } from "./landingTokens";

const columns = [
  {
    title: "Product",
    links: [
      { label: "Corporate cards", to: "/#product" },
      { label: "Expense management", to: "/#product" },
      { label: "Accounts payable", to: "/#product" },
      { label: "Business accounts", to: "/#product" },
      { label: "UPI payments", to: "/#product" },
      { label: "Accounting sync", to: "/#product" },
      { label: "Pricing", to: "/#pricing" },
    ],
  },
  {
    title: "Solutions",
    links: [
      { label: "Finance teams", to: "/#solutions" },
      { label: "Founders", to: "/#solutions" },
      { label: "Operations", to: "/#solutions" },
      { label: "Employees", to: "/#solutions" },
    ],
  },
  {
    title: "Resources",
    links: [
      { label: "How it works", to: "/#how-it-works" },
      { label: "Security", to: "/#security" },
      { label: "Customer stories", to: "/#stories" },
    ],
  },
  {
    title: "Company",
    links: [
      { label: "About", to: "/#company" },
      { label: "Contact", to: "/#footer" },
      { label: "Login", to: "/login" },
      { label: "Sign up", to: "/signup" },
    ],
  },
];

const linkSx = {
  color: "rgba(255,255,255,0.72)",
  fontSize: 14,
  fontFamily: landing.fontBody,
  textDecoration: "none",
  display: "inline-block",
  py: 0.4,
  "&:hover": { color: "#fff" },
  "&:focus-visible": { ...focusRing, outlineColor: "#93C5FD" },
};

export function MarketingFooter() {
  return (
    <Box
      id="footer"
      component="footer"
      sx={{
        bgcolor: landing.navy,
        color: "#fff",
        pt: { xs: 6, md: 8 },
        pb: 3,
      }}
    >
      <Container maxWidth="lg">
        <Grid container spacing={4}>
          <Grid item xs={12} md={4}>
            <AllpayLogo inverted />
            <Typography
              sx={{
                mt: 2,
                pr: { md: 4 },
                color: "rgba(255,255,255,0.68)",
                fontSize: 14,
                lineHeight: 1.7,
                maxWidth: 320,
                fontFamily: landing.fontBody,
              }}
            >
              A modern business account designed to save money with corporate cards, credit, money transfers, expense
              reimbursements, and automated accounting, all in one place.
            </Typography>
            <Stack direction="row" spacing={0.5} sx={{ mt: 2 }}>
              <IconButton aria-label="LinkedIn (placeholder)" size="small" sx={{ color: "rgba(255,255,255,0.7)", "&:focus-visible": focusRing }}>
                <LinkedIn fontSize="small" />
              </IconButton>
              <IconButton aria-label="X / Twitter (placeholder)" size="small" sx={{ color: "rgba(255,255,255,0.7)", "&:focus-visible": focusRing }}>
                <Twitter fontSize="small" />
              </IconButton>
            </Stack>
          </Grid>

          {columns.map((col) => (
            <Grid item xs={6} sm={3} md={2} key={col.title}>
              <Typography sx={{ fontWeight: 700, fontSize: 13, letterSpacing: "0.04em", textTransform: "uppercase", mb: 1.5, color: "rgba(255,255,255,0.9)" }}>
                {col.title}
              </Typography>
              <Stack>
                {col.links.map((l) =>
                  l.to.startsWith("/") && !l.to.includes("#") ? (
                    <Link key={l.label} component={RouterLink} to={l.to} sx={linkSx}>
                      {l.label}
                    </Link>
                  ) : (
                    <Link
                      key={l.label}
                      href={l.to}
                      onClick={(e) => {
                        if (l.to.includes("#")) {
                          e.preventDefault();
                          const id = l.to.split("#")[1];
                          document.getElementById(id)?.scrollIntoView({ behavior: "smooth" });
                        }
                      }}
                      sx={linkSx}
                    >
                      {l.label}
                    </Link>
                  )
                )}
              </Stack>
            </Grid>
          ))}
        </Grid>

        <Divider sx={{ borderColor: "rgba(255,255,255,0.1)", my: 3 }} />

        <Stack
          direction={{ xs: "column", sm: "row" }}
          justifyContent="space-between"
          alignItems={{ xs: "flex-start", sm: "center" }}
          spacing={1.5}
        >
          <Typography sx={{ fontSize: 13, color: "rgba(255,255,255,0.55)" }}>
            © {new Date().getFullYear()} allpay. All rights reserved.
          </Typography>
          <Stack direction="row" spacing={2}>
            <Link href="#footer" sx={linkSx}>
              Privacy policy
            </Link>
            <Link href="#footer" sx={linkSx}>
              Terms of service
            </Link>
          </Stack>
        </Stack>
      </Container>
    </Box>
  );
}
