import { TypeAnimation } from "react-type-animation";
import ArrowForward from "@mui/icons-material/ArrowForward";
import {
  Box,
  Button,
  Container,
  Grid,
  Stack,
  Typography,
} from "@mui/material";
import { Link as RouterLink } from "react-router-dom";
import { MarketingHeader } from "../components/marketing/MarketingHeader";

const g2Badges = [
  "Leader Asia Pacific",
  "Best support small business",
  "Leader Small Business 2024",
  "Easiest setup 2024",
  "High performer 2024",
];

const trusted = ["Porter", "Matrix Partners", "Urban Company", "MPL", "Nasher Miles", "Bluestone", "Pocket FM", "Rapido"];

export function HomePage() {
  return (
    <Box sx={{ bgcolor: "#fff", minHeight: "100vh" }}>
      <MarketingHeader />

      <Box sx={{ pt: { xs: 4, md: 6 }, pb: 6 }}>
        <Container maxWidth="lg">
          <Stack spacing={2} alignItems="center" textAlign="center">
            <Typography
              component="h1"
              sx={{
                fontWeight: 800,
                fontSize: { xs: 32, sm: 42, md: 48 },
                lineHeight: 1.15,
                color: "#0f172a",
                maxWidth: 900,
              }}
            >
              Expense Management System Made Easy
            </Typography>

            <Stack direction="row" spacing={1} alignItems="center" justifyContent="center" flexWrap="wrap" sx={{ minHeight: 56 }}>
              <Typography sx={{ fontSize: { xs: 22, md: 28 }, fontWeight: 700, color: "#5A58F2" }}>
                <TypeAnimation
                  sequence={["Spend smarter", 2200, "Control better", 2200, "Save time", 2200, "Scale faster", 2200]}
                  wrapper="span"
                  repeat={Infinity}
                />
              </Typography>
            </Stack>

            <Typography
              sx={{
                color: "#64748b",
                fontSize: { xs: 16, md: 18 },
                maxWidth: 720,
                lineHeight: 1.65,
                mt: 1,
              }}
            >
              A modern business account designed to save money with corporate cards, credit, money transfers, expense
              reimbursements, and automated accounting—all in one place.
            </Typography>

            <Stack direction="row" flexWrap="wrap" spacing={1} justifyContent="center" sx={{ py: 2 }}>
              {g2Badges.map((b) => (
                <Box
                  key={b}
                  sx={{
                    px: 1.5,
                    py: 0.75,
                    borderRadius: 1,
                    bgcolor: "#f8fafc",
                    border: "1px solid #e2e8f0",
                    fontSize: 12,
                    fontWeight: 600,
                    color: "#475569",
                  }}
                >
                  {b}
                </Box>
              ))}
            </Stack>

            <Button
              component={RouterLink}
              to="/signup"
              variant="contained"
              size="large"
              endIcon={<ArrowForward />}
              sx={{
                mt: 1,
                textTransform: "none",
                fontWeight: 700,
                px: 4,
                py: 1.5,
                fontSize: 16,
                borderRadius: 1.5,
                bgcolor: "#5A58F2",
                "&:hover": { bgcolor: "#4845d4" },
              }}
            >
              Book a demo
            </Button>
          </Stack>
        </Container>
      </Box>

      <Box sx={{ py: 5, bgcolor: "#fafafa", borderTop: "1px solid #f1f5f9" }}>
        <Container maxWidth="lg">
          <Typography textAlign="center" sx={{ fontWeight: 600, color: "#0f172a", mb: 3, fontSize: 18 }}>
            Trusted by finance teams at startups to enterprises
          </Typography>
          <Grid container spacing={2} justifyContent="center" alignItems="center">
            {trusted.map((name) => (
              <Grid item key={name} xs={6} sm={4} md={3}>
                <Box
                  sx={{
                    py: 2,
                    px: 2,
                    textAlign: "center",
                    borderRadius: 2,
                    bgcolor: "#fff",
                    border: "1px solid #eef2f6",
                    color: "#94a3b8",
                    fontWeight: 700,
                    fontSize: 14,
                    letterSpacing: "0.02em",
                  }}
                >
                  {name}
                </Box>
              </Grid>
            ))}
          </Grid>
        </Container>
      </Box>

      <Box id="suite" sx={{ py: { xs: 6, md: 10 } }}>
        <Container maxWidth="lg">
          <Typography textAlign="center" sx={{ fontWeight: 800, fontSize: { xs: 26, md: 34 }, color: "#0f172a", mb: 2 }}>
            A fully integrated suite of financial tools
          </Typography>
          <Typography textAlign="center" color="text.secondary" sx={{ maxWidth: 760, mx: "auto", mb: 5, lineHeight: 1.7 }}>
            allpay brings together corporate cards, UPI spend, reimbursements, vendor payouts, approvals, and accounting
            sync—so finance teams escape painful admin work and get real-time visibility.
          </Typography>
          <Grid container spacing={3}>
            {[
              { title: "Corporate cards", body: "Physical and virtual cards with limits, categories, and instant controls." },
              { title: "Expense management", body: "Capture receipts, enforce policy, and close books faster every month." },
              { title: "Accounts payable", body: "Invoice workflows, bulk payouts, and maker-checker for secure payments." },
              { title: "Business accounts", body: "Domestic and global money movement with a unified ledger and reporting." },
            ].map((card) => (
              <Grid item xs={12} sm={6} md={3} key={card.title}>
                <Box sx={{ p: 3, borderRadius: 3, height: "100%", border: "1px solid #eef2f6", bgcolor: "#fff" }}>
                  <Typography fontWeight={700} sx={{ mb: 1, color: "#0f172a" }}>
                    {card.title}
                  </Typography>
                  <Typography variant="body2" color="text.secondary" sx={{ lineHeight: 1.65 }}>
                    {card.body}
                  </Typography>
                </Box>
              </Grid>
            ))}
          </Grid>
        </Container>
      </Box>

      <Box id="pricing" sx={{ py: 6, bgcolor: "#f8fafc" }}>
        <Container maxWidth="sm">
          <Typography textAlign="center" fontWeight={800} fontSize={28} sx={{ mb: 1 }}>
            Ready to simplify spend?
          </Typography>
          <Typography textAlign="center" color="text.secondary" sx={{ mb: 3 }}>
            Create your company account in minutes. No credit card required for the guided tour.
          </Typography>
          <Stack direction="row" spacing={2} justifyContent="center">
            <Button component={RouterLink} to="/signup" variant="contained" size="large" sx={{ textTransform: "none", bgcolor: "#5A58F2" }}>
              Get started
            </Button>
            <Button component={RouterLink} to="/login" variant="outlined" size="large" sx={{ textTransform: "none" }}>
              Log in
            </Button>
          </Stack>
        </Container>
      </Box>
    </Box>
  );
}
