import AccountBalanceOutlined from "@mui/icons-material/AccountBalanceOutlined";
import ArrowForward from "@mui/icons-material/ArrowForward";
import CreditCardOutlined from "@mui/icons-material/CreditCardOutlined";
import GroupsOutlined from "@mui/icons-material/GroupsOutlined";
import LockOutlined from "@mui/icons-material/LockOutlined";
import PaymentsOutlined from "@mui/icons-material/PaymentsOutlined";
import PersonOutline from "@mui/icons-material/PersonOutline";
import PolicyOutlined from "@mui/icons-material/PolicyOutlined";
import ReceiptLongOutlined from "@mui/icons-material/ReceiptLongOutlined";
import SecurityOutlined from "@mui/icons-material/SecurityOutlined";
import SyncAltOutlined from "@mui/icons-material/SyncAltOutlined";
import VerifiedUserOutlined from "@mui/icons-material/VerifiedUserOutlined";
import VisibilityOutlined from "@mui/icons-material/VisibilityOutlined";
import WorkspacePremiumOutlined from "@mui/icons-material/WorkspacePremiumOutlined";
import {
  Box,
  Button,
  Container,
  Grid,
  Stack,
  Typography,
} from "@mui/material";
import { useEffect, type ReactNode } from "react";
import { Link as RouterLink, useLocation } from "react-router-dom";
import { AnnouncementBanner } from "../components/marketing/AnnouncementBanner";
import { MarketingFooter } from "../components/marketing/MarketingFooter";
import { MarketingHeader } from "../components/marketing/MarketingHeader";
import {
  AnalyticsMock,
  CardsControlMock,
  ExpenseWorkflowMock,
  HeroDashboardMock,
  VendorPayMock,
} from "../components/marketing/ProductMocks";
import { focusRing, landing } from "../components/marketing/landingTokens";
import { TrustLogoMarquee, type TrustBrand } from "../components/marketing/TrustLogoMarquee";

const trustedBrands: TrustBrand[] = [
  {
    name: "Porter",
    logo: "https://logo.uplead.com/porter.in",
    fallback: "/logos/porter.png",
  },
  {
    name: "Matrix Partners",
    logo: "https://logo.uplead.com/matrixpartners.com",
    fallback: "/logos/matrix-partners.png",
  },
  {
    name: "Urban Company",
    logo: "https://logo.uplead.com/urbanclap.com",
    fallback: "/logos/urban-company.png",
  },
  {
    name: "MPL",
    logo: "https://logo.uplead.com/mplgaming.com",
    fallback: "/logos/mpl.png",
  },
  {
    name: "Nasher Miles",
    logo: "https://nashermiles.com/cdn/shop/files/logoW.png?width=400",
    fallback: "/logos/nasher-miles.png",
  },
  {
    name: "Bluestone",
    logo: "https://logo.uplead.com/bluestone.com",
    fallback: "/logos/bluestone.png",
  },
  {
    name: "Pocket FM",
    logo: "https://logo.uplead.com/pocketfm.com",
    fallback: "/logos/pocket-fm.png",
  },
  {
    name: "Rapido",
    logo: "https://logo.uplead.com/rapido.bike",
    fallback: "/logos/rapido.png",
  },
];

const credibility = [
  "Leader Asia Pacific",
  "Best support for small businesses",
  "Leader Small Business 2024",
  "Easiest setup 2024",
  "High performer 2024",
];

const productFeatures = [
  {
    title: "Corporate cards",
    body: "Physical and virtual cards with spending limits, category controls, and instant freezing.",
    icon: CreditCardOutlined,
    accent: landing.blueSoft,
    color: landing.blue,
  },
  {
    title: "Expense management",
    body: "Capture receipts, enforce company policy, and close books faster every month.",
    icon: ReceiptLongOutlined,
    accent: landing.greenSoft,
    color: landing.green,
  },
  {
    title: "Accounts payable",
    body: "Manage invoices, bulk payouts, approvals, and maker-checker controls in one workflow.",
    icon: AccountBalanceOutlined,
    accent: "#EEF2FF",
    color: landing.navyMid,
  },
  {
    title: "Business accounts",
    body: "Move domestic and global money with a unified ledger and clear reporting.",
    icon: PaymentsOutlined,
    accent: landing.blueSoft,
    color: landing.blue,
  },
  {
    title: "UPI payments",
    body: "Make and track business UPI payments with centralized visibility and approval controls.",
    icon: SyncAltOutlined,
    accent: landing.greenSoft,
    color: landing.green,
  },
  {
    title: "Accounting sync",
    body: "Keep financial records accurate with automated exports and accounting integrations.",
    icon: PolicyOutlined,
    accent: "#EEF2FF",
    color: landing.navyMid,
  },
];

const useCases = [
  {
    title: "Finance teams",
    body: "Reduce manual work, improve controls, and close books faster.",
    icon: AccountBalanceOutlined,
  },
  {
    title: "Founders and business owners",
    body: "Stay in control of company spending without slowing the team down.",
    icon: WorkspacePremiumOutlined,
  },
  {
    title: "Operations teams",
    body: "Issue cards, approve payments, and manage vendors from one place.",
    icon: GroupsOutlined,
  },
  {
    title: "Employees",
    body: "Submit expenses, access cards, and receive reimbursements without unnecessary back-and-forth.",
    icon: PersonOutline,
  },
];

const steps = [
  {
    n: "01",
    title: "Create your company account",
    body: "Set up your workspace and invite your team in minutes.",
  },
  {
    n: "02",
    title: "Connect your spending workflows",
    body: "Issue cards, configure policies, manage UPI payments, and set approval rules.",
  },
  {
    n: "03",
    title: "Run finance with confidence",
    body: "Track every payment, automate reimbursements, and keep your books up to date.",
  },
];

const securityItems = [
  { title: "Role-based permissions", icon: LockOutlined },
  { title: "Approval workflows", icon: VerifiedUserOutlined },
  { title: "Maker-checker controls", icon: PolicyOutlined },
  { title: "Real-time transaction monitoring", icon: VisibilityOutlined },
  { title: "Spend limits and policy rules", icon: CreditCardOutlined },
  { title: "Audit-friendly activity history", icon: ReceiptLongOutlined },
  { title: "Secure business payments", icon: SecurityOutlined },
];

const testimonials = [
  {
    quote:
      "allpay gives our finance team one place to manage cards, expenses, and vendor payments. We spend less time chasing receipts and more time planning the business.",
    role: "Finance Leader",
    org: "Growth Company",
  },
  {
    quote:
      "Issuing cards with limits and approving UPI spend from one dashboard changed how our operations team works day to day.",
    role: "Operations Lead",
    org: "Scale-up Team",
  },
  {
    quote:
      "Month-end used to mean scattered sheets and missing receipts. Now reimbursements and policy checks live in a single workflow.",
    role: "Controller",
    org: "Finance Team",
  },
];

const plans = [
  {
    name: "Essentials",
    blurb: "Core spend controls for early teams getting started.",
    cta: "Get started",
    to: "/signup",
    featured: false,
    points: ["Corporate cards & limits", "Expense submissions", "Basic approvals", "Standard reporting"],
  },
  {
    name: "Growth",
    blurb: "Stronger workflows for growing finance and ops teams.",
    cta: "Get started",
    to: "/signup",
    featured: true,
    points: [
      "Multi-level approvals",
      "UPI payment controls",
      "Vendor payout workflows",
      "Advanced analytics",
      "Accounting exports",
    ],
  },
  {
    name: "Enterprise",
    blurb: "Custom controls, deeper support, and tailored rollout.",
    cta: "Talk to sales",
    to: "/signup",
    featured: false,
    points: [
      "Custom approval chains",
      "Maker-checker at scale",
      "Dedicated onboarding",
      "Priority support",
      "Advanced integrations",
    ],
  },
];

const sectionPad = { py: { xs: 7, md: 11 } };
const h2Sx = {
  fontFamily: landing.fontDisplay,
  fontWeight: 700,
  fontSize: { xs: 28, sm: 34, md: 40 },
  letterSpacing: "-0.035em",
  color: landing.ink,
  lineHeight: 1.15,
};
const leadSx = {
  fontFamily: landing.fontBody,
  color: landing.muted,
  fontSize: { xs: 15, md: 17 },
  lineHeight: 1.7,
  maxWidth: 640,
};

const primaryBtn = {
  textTransform: "none" as const,
  fontWeight: 700,
  fontFamily: landing.fontBody,
  bgcolor: landing.blue,
  px: 2.75,
  py: 1.25,
  borderRadius: 2,
  boxShadow: "0 10px 24px rgba(27,110,245,0.28)",
  "&:hover": { bgcolor: "#1558D6" },
  "&:focus-visible": focusRing,
};

const secondaryBtn = {
  textTransform: "none" as const,
  fontWeight: 700,
  fontFamily: landing.fontBody,
  color: landing.ink,
  borderColor: landing.line,
  px: 2.75,
  py: 1.25,
  borderRadius: 2,
  bgcolor: "#fff",
  "&:hover": { borderColor: landing.blue, bgcolor: landing.blueSoft },
  "&:focus-visible": focusRing,
};

function Showcase({
  id,
  eyebrow,
  title,
  body,
  bullets,
  mock,
  reverse = false,
}: {
  id?: string;
  eyebrow: string;
  title: string;
  body: string;
  bullets: string[];
  mock: ReactNode;
  reverse?: boolean;
}) {
  return (
    <Box id={id} sx={{ ...sectionPad, bgcolor: reverse ? landing.wash : "#fff" }}>
      <Container maxWidth="lg">
        <Grid container spacing={{ xs: 4, md: 6 }} alignItems="center" direction={reverse ? "row-reverse" : "row"}>
          <Grid item xs={12} md={5}>
            <Typography
              sx={{
                fontSize: 12,
                fontWeight: 700,
                letterSpacing: "0.12em",
                textTransform: "uppercase",
                color: landing.blue,
                mb: 1.5,
              }}
            >
              {eyebrow}
            </Typography>
            <Typography component="h2" sx={{ ...h2Sx, mb: 2 }}>
              {title}
            </Typography>
            <Typography sx={{ ...leadSx, mb: 2.5 }}>{body}</Typography>
            <Stack spacing={1.25} component="ul" sx={{ m: 0, pl: 0, listStyle: "none" }}>
              {bullets.map((b) => (
                <Stack key={b} direction="row" spacing={1.25} alignItems="flex-start" component="li">
                  <Box
                    sx={{
                      mt: "7px",
                      width: 7,
                      height: 7,
                      borderRadius: "50%",
                      bgcolor: landing.blue,
                      flexShrink: 0,
                    }}
                  />
                  <Typography sx={{ fontSize: 15, color: landing.ink, lineHeight: 1.55 }}>{b}</Typography>
                </Stack>
              ))}
            </Stack>
          </Grid>
          <Grid item xs={12} md={7}>
            {mock}
          </Grid>
        </Grid>
      </Container>
    </Box>
  );
}

export function HomePage() {
  const location = useLocation();

  useEffect(() => {
    if (location.hash) {
      const id = location.hash.replace("#", "");
      window.setTimeout(() => {
        document.getElementById(id)?.scrollIntoView({ behavior: "smooth" });
      }, 50);
    }
  }, [location.hash]);

  return (
    <Box
      sx={{
        bgcolor: "#fff",
        minHeight: "100vh",
        fontFamily: landing.fontBody,
        overflowX: "hidden",
        scrollBehavior: "smooth",
      }}
    >
      <AnnouncementBanner />
      <MarketingHeader elevated />

      {/* Hero */}
      <Box
        component="section"
        aria-labelledby="hero-heading"
        sx={{
          position: "relative",
          pt: { xs: 5, md: 8 },
          pb: { xs: 7, md: 10 },
          bgcolor: "#fff",
          overflow: "hidden",
        }}
      >
        <Container maxWidth="lg">
          <Grid container spacing={{ xs: 5, md: 6 }} alignItems="center">
            <Grid item xs={12} md={6}>
              <Typography
                component="p"
                className="landing-reveal"
                sx={{
                  fontFamily: landing.fontDisplay,
                  fontWeight: 800,
                  fontSize: { xs: 36, sm: 44, md: 52 },
                  letterSpacing: "-0.045em",
                  color: landing.navy,
                  lineHeight: 0.95,
                  mb: 2,
                }}
              >
                allpay
              </Typography>
              <Typography
                className="landing-reveal landing-delay-1"
                sx={{
                  fontSize: 12,
                  fontWeight: 700,
                  letterSpacing: "0.14em",
                  textTransform: "uppercase",
                  color: landing.blue,
                  mb: 1.5,
                }}
              >
                Business spend, simplified
              </Typography>
              <Typography
                id="hero-heading"
                component="h1"
                className="landing-reveal landing-delay-2"
                sx={{
                  fontFamily: landing.fontDisplay,
                  fontWeight: 700,
                  fontSize: { xs: 32, sm: 40, md: 46 },
                  letterSpacing: "-0.035em",
                  color: landing.ink,
                  lineHeight: 1.12,
                  mb: 2,
                }}
              >
                Expense management made easy
              </Typography>
              <Typography className="landing-reveal landing-delay-3" sx={{ ...leadSx, mb: 3.5 }}>
                A modern business account designed to help companies control spending, move money faster, reimburse
                employees, and automate accounting from one connected platform.
              </Typography>
              <Stack
                className="landing-reveal landing-delay-4"
                direction={{ xs: "column", sm: "row" }}
                spacing={1.5}
                sx={{ mb: 2.5 }}
              >
                <Button component={RouterLink} to="/signup" variant="contained" size="large" endIcon={<ArrowForward />} sx={primaryBtn}>
                  Get started free
                </Button>
                <Button href="#product" variant="outlined" size="large" sx={secondaryBtn}>
                  Explore the platform
                </Button>
              </Stack>
              <Typography className="landing-reveal landing-delay-5" sx={{ fontSize: 13, color: landing.muted, fontWeight: 500 }}>
                No credit card required · Setup in minutes · Built for growing businesses
              </Typography>
            </Grid>
            <Grid item xs={12} md={6} className="landing-reveal landing-delay-3">
              <HeroDashboardMock />
            </Grid>
          </Grid>
        </Container>
      </Box>

      {/* Trust */}
      <Box component="section" aria-labelledby="trust-heading" sx={{ py: { xs: 5, md: 7 }, bgcolor: "#fff", borderTop: `1px solid ${landing.line}` }}>
        <Container maxWidth="lg">
          <Typography
            id="trust-heading"
            component="h2"
            textAlign="center"
            sx={{ ...h2Sx, fontSize: { xs: 22, md: 28 }, mb: { xs: 3, md: 4 } }}
          >
            Trusted by finance teams at startups to enterprises
          </Typography>

          <TrustLogoMarquee brands={trustedBrands} />

          <Box
            sx={{
              p: { xs: 1.5, md: 2 },
              borderRadius: 3,
              border: `1px solid ${landing.line}`,
              bgcolor: landing.wash,
            }}
          >
            <Typography
              sx={{
                textAlign: "center",
                fontSize: 11,
                fontWeight: 700,
                letterSpacing: "0.1em",
                textTransform: "uppercase",
                color: landing.muted,
                mb: 1.5,
              }}
            >
              Recognition
            </Typography>
            <Stack
              direction="row"
              flexWrap="wrap"
              justifyContent="center"
              gap={1.25}
              useFlexGap
            >
              {credibility.map((item) => (
                <Stack
                  key={item}
                  direction="row"
                  spacing={1}
                  alignItems="center"
                  justifyContent="center"
                  sx={{
                    flex: { xs: "1 1 100%", sm: "1 1 calc(50% - 10px)", md: "1 1 calc(20% - 10px)" },
                    minWidth: { md: 140 },
                    px: 1.5,
                    py: 1.35,
                    borderRadius: 2,
                    bgcolor: "#fff",
                    border: `1px solid ${landing.line}`,
                    boxShadow: "0 1px 2px rgba(7, 26, 47, 0.04)",
                    transition: "border-color 0.2s, box-shadow 0.2s",
                    "&:hover": {
                      borderColor: landing.blue,
                      boxShadow: landing.shadowSoft,
                    },
                  }}
                >
                  <WorkspacePremiumOutlined sx={{ fontSize: 18, color: landing.blue, flexShrink: 0 }} />
                  <Typography
                    sx={{
                      fontSize: { xs: 12, md: 12.5 },
                      fontWeight: 700,
                      color: landing.ink,
                      textAlign: "left",
                      lineHeight: 1.35,
                    }}
                  >
                    {item}
                  </Typography>
                </Stack>
              ))}
            </Stack>
          </Box>
        </Container>
      </Box>

      {/* Product overview */}
      <Box id="product" component="section" aria-labelledby="product-heading" sx={{ ...sectionPad, bgcolor: landing.wash }}>
        <Container maxWidth="lg">
          <Stack alignItems="center" textAlign="center" sx={{ mb: 5 }}>
            <Typography id="product-heading" component="h2" sx={{ ...h2Sx, mb: 2 }}>
              One platform for every business payment
            </Typography>
            <Typography sx={{ ...leadSx, mx: "auto" }}>
              allpay brings together corporate cards, UPI spend, reimbursements, vendor payouts, approvals, and
              accounting sync, giving finance teams real-time control without painful administrative work.
            </Typography>
          </Stack>
          <Grid container spacing={2.5}>
            {productFeatures.map((f) => {
              const Icon = f.icon;
              return (
                <Grid item xs={12} sm={6} md={4} key={f.title}>
                  <Box
                    sx={{
                      height: "100%",
                      p: 3,
                      borderRadius: 3,
                      bgcolor: "#fff",
                      border: `1px solid ${landing.line}`,
                      boxShadow: landing.shadowSoft,
                      transition: "transform 0.25s ease, box-shadow 0.25s ease",
                      "&:hover": {
                        transform: "translateY(-4px)",
                        boxShadow: landing.shadow,
                      },
                    }}
                  >
                    <Box
                      sx={{
                        width: 44,
                        height: 44,
                        borderRadius: 2,
                        bgcolor: f.accent,
                        color: f.color,
                        display: "grid",
                        placeItems: "center",
                        mb: 2,
                      }}
                    >
                      <Icon fontSize="small" />
                    </Box>
                    <Typography sx={{ fontWeight: 700, fontSize: 17, color: landing.ink, mb: 1, fontFamily: landing.fontDisplay }}>
                      {f.title}
                    </Typography>
                    <Typography sx={{ fontSize: 14, color: landing.muted, lineHeight: 1.65 }}>{f.body}</Typography>
                    <Box
                      sx={{
                        mt: 2.5,
                        height: 4,
                        width: 40,
                        borderRadius: 99,
                        bgcolor: f.color,
                        opacity: 0.35,
                      }}
                    />
                  </Box>
                </Grid>
              );
            })}
          </Grid>
        </Container>
      </Box>

      <Showcase
        eyebrow="Corporate cards"
        title="Control every rupee"
        body="Issue physical and virtual cards with spend limits, category rules, and employee permissions. Freeze cards instantly and stay informed with real-time notifications."
        bullets={[
          "Virtual and physical cards in one place",
          "Spend limits and category controls",
          "Team member permissions",
          "Live transaction status and freezes",
        ]}
        mock={<CardsControlMock />}
      />

      <Showcase
        reverse
        eyebrow="Expense management"
        title="Turn expenses into a simple workflow"
        body="Capture receipts, extract key fields, enforce policy, and move reimbursements through clear approval states so month-end closes faster."
        bullets={[
          "Receipt upload and review",
          "OCR-style field extraction",
          "Policy checks and warnings",
          "Clear reimbursement status",
        ]}
        mock={<ExpenseWorkflowMock />}
      />

      <Showcase
        eyebrow="Accounts payable"
        title="Pay vendors faster and safer"
        body="Review invoices, run maker-checker approvals, schedule bulk payouts, and track every vendor payment without losing control."
        bullets={[
          "Invoice queue with payable totals",
          "Approval timelines you can follow",
          "Maker-checker payment controls",
          "Vendor payment status tracking",
        ]}
        mock={<VendorPayMock />}
      />

      <Showcase
        reverse
        eyebrow="Visibility"
        title="See the complete financial picture"
        body="Unify balances, cash flow, spend analytics, and accounting sync so finance leaders can act with confidence."
        bullets={[
          "Monthly spend and cash flow charts",
          "Category breakdowns",
          "Recent activity in one table",
          "Exports ready for accounting sync",
        ]}
        mock={<AnalyticsMock />}
      />

      {/* Use cases */}
      <Box id="solutions" component="section" aria-labelledby="solutions-heading" sx={{ ...sectionPad, bgcolor: landing.wash }}>
        <Container maxWidth="lg">
          <Typography id="solutions-heading" component="h2" textAlign="center" sx={{ ...h2Sx, mb: 5 }}>
            Built for every team that manages money
          </Typography>
          <Grid container spacing={2.5}>
            {useCases.map((u, i) => {
              const Icon = u.icon;
              const iconBg = [landing.blueSoft, landing.greenSoft, "#EEF2FF", landing.blueSoft][i];
              const iconColor = [landing.blue, landing.green, landing.navyMid, landing.blue][i];
              return (
                <Grid item xs={12} sm={6} md={3} key={u.title}>
                  <Box
                    sx={{
                      height: "100%",
                      p: 3,
                      borderRadius: 3,
                      bgcolor: "#fff",
                      border: `1px solid ${landing.line}`,
                      boxShadow: landing.shadowSoft,
                      transition: "transform 0.25s ease, box-shadow 0.25s ease",
                      "&:hover": { transform: "translateY(-4px)", boxShadow: landing.shadow },
                    }}
                  >
                    <Box
                      sx={{
                        width: 42,
                        height: 42,
                        borderRadius: 2,
                        bgcolor: iconBg,
                        color: iconColor,
                        display: "grid",
                        placeItems: "center",
                        mb: 2,
                      }}
                    >
                      <Icon fontSize="small" />
                    </Box>
                    <Typography sx={{ fontWeight: 700, fontSize: 17, color: landing.ink, mb: 1, fontFamily: landing.fontDisplay }}>
                      {u.title}
                    </Typography>
                    <Typography sx={{ fontSize: 14, color: landing.muted, lineHeight: 1.65 }}>{u.body}</Typography>
                  </Box>
                </Grid>
              );
            })}
          </Grid>
        </Container>
      </Box>

      {/* How it works */}
      <Box id="how-it-works" component="section" aria-labelledby="how-heading" sx={sectionPad}>
        <Container maxWidth="lg">
          <Typography id="how-heading" component="h2" textAlign="center" sx={{ ...h2Sx, mb: 5 }}>
            How it works
          </Typography>
          <Grid container spacing={2.5}>
            {steps.map((s, i) => (
              <Grid item xs={12} md={4} key={s.n}>
                <Box
                  sx={{
                    height: "100%",
                    p: 3.25,
                    borderRadius: 3,
                    border: `1px solid ${landing.line}`,
                    bgcolor: "#fff",
                    position: "relative",
                    overflow: "hidden",
                  }}
                >
                  <Typography
                    sx={{
                      fontFamily: landing.fontDisplay,
                      fontSize: 48,
                      fontWeight: 800,
                      color: landing.blueSoft,
                      lineHeight: 1,
                      mb: 1,
                    }}
                  >
                    {s.n}
                  </Typography>
                  <Typography sx={{ fontWeight: 700, fontSize: 18, color: landing.ink, mb: 1, fontFamily: landing.fontDisplay }}>
                    {s.title}
                  </Typography>
                  <Typography sx={{ fontSize: 14, color: landing.muted, lineHeight: 1.65 }}>{s.body}</Typography>
                  {i < steps.length - 1 && (
                    <Box
                      aria-hidden
                      sx={{
                        display: { xs: "none", md: "block" },
                        position: "absolute",
                        right: -14,
                        top: "45%",
                        width: 28,
                        height: 2,
                        bgcolor: landing.line,
                      }}
                    />
                  )}
                </Box>
              </Grid>
            ))}
          </Grid>
        </Container>
      </Box>

      {/* Security */}
      <Box
        id="security"
        component="section"
        aria-labelledby="security-heading"
        sx={{
          ...sectionPad,
          bgcolor: "#fff",
          borderTop: `1px solid ${landing.line}`,
          borderBottom: `1px solid ${landing.line}`,
        }}
      >
        <Container maxWidth="lg">
          <Grid container spacing={4} alignItems="center">
            <Grid item xs={12} md={5}>
              <Typography
                sx={{
                  fontSize: 12,
                  fontWeight: 700,
                  letterSpacing: "0.12em",
                  textTransform: "uppercase",
                  color: landing.blue,
                  mb: 1.5,
                }}
              >
                Designed for control
              </Typography>
              <Typography id="security-heading" component="h2" sx={{ ...h2Sx, mb: 2 }}>
                Security-focused workflows built for visibility
              </Typography>
              <Typography sx={{ color: landing.muted, fontSize: 16, lineHeight: 1.7, mb: 2 }}>
                Give the right people the right access, keep approvals accountable, and monitor every payment without
                slowing the business down.
              </Typography>
            </Grid>
            <Grid item xs={12} md={7}>
              <Grid container spacing={1.5}>
                {securityItems.map((item) => {
                  const Icon = item.icon;
                  return (
                    <Grid item xs={12} sm={6} key={item.title}>
                      <Stack
                        direction="row"
                        spacing={1.5}
                        alignItems="center"
                        sx={{
                          p: 1.75,
                          borderRadius: 2.5,
                          bgcolor: landing.wash,
                          border: `1px solid ${landing.line}`,
                          transition: "background 0.2s, box-shadow 0.2s",
                          "&:hover": { bgcolor: landing.blueSoft, boxShadow: landing.shadowSoft },
                        }}
                      >
                        <Box
                          sx={{
                            width: 36,
                            height: 36,
                            borderRadius: 1.5,
                            bgcolor: "#fff",
                            border: `1px solid ${landing.line}`,
                            display: "grid",
                            placeItems: "center",
                            flexShrink: 0,
                          }}
                        >
                          <Icon sx={{ fontSize: 18, color: landing.blue }} />
                        </Box>
                        <Typography sx={{ fontSize: 14, fontWeight: 600, color: landing.ink }}>{item.title}</Typography>
                      </Stack>
                    </Grid>
                  );
                })}
              </Grid>
            </Grid>
          </Grid>
        </Container>
      </Box>

      {/* Testimonials */}
      <Box id="stories" component="section" aria-labelledby="stories-heading" sx={{ ...sectionPad, bgcolor: landing.wash }}>
        <Container maxWidth="lg">
          <Typography id="stories-heading" component="h2" textAlign="center" sx={{ ...h2Sx, mb: 1.5 }}>
            What finance teams value
          </Typography>
          <Typography textAlign="center" sx={{ ...leadSx, mx: "auto", mb: 5 }}>
            Editable placeholder stories for product messaging — replace with approved customer quotes when available.
          </Typography>
          <Grid container spacing={2.5}>
            {testimonials.map((t) => (
              <Grid item xs={12} md={4} key={t.role + t.org}>
                <Box
                  sx={{
                    height: "100%",
                    p: 3,
                    borderRadius: 3,
                    bgcolor: "#fff",
                    border: `1px solid ${landing.line}`,
                    boxShadow: landing.shadowSoft,
                    display: "flex",
                    flexDirection: "column",
                  }}
                >
                  <Typography sx={{ fontSize: 36, color: landing.blueSoft, lineHeight: 1, fontFamily: landing.fontDisplay }}>
                    “
                  </Typography>
                  <Typography sx={{ fontSize: 15, color: landing.ink, lineHeight: 1.7, flex: 1 }}>{t.quote}</Typography>
                  <Box sx={{ mt: 3, pt: 2, borderTop: `1px solid ${landing.line}` }}>
                    <Typography sx={{ fontWeight: 700, fontSize: 14, color: landing.ink }}>{t.role}</Typography>
                    <Typography sx={{ fontSize: 13, color: landing.muted }}>{t.org}</Typography>
                  </Box>
                </Box>
              </Grid>
            ))}
          </Grid>
        </Container>
      </Box>

      {/* Pricing */}
      <Box id="pricing" component="section" aria-labelledby="pricing-heading" sx={sectionPad}>
        <Container maxWidth="lg">
          <Stack alignItems="center" textAlign="center" sx={{ mb: 5 }}>
            <Typography id="pricing-heading" component="h2" sx={{ ...h2Sx, mb: 2 }}>
              Simple plans for growing businesses
            </Typography>
            <Typography sx={{ ...leadSx, mx: "auto" }}>
              Choose the level of control, approvals, reporting, and support your team needs. Talk with us for
              enterprise rollout details.
            </Typography>
          </Stack>
          <Grid container spacing={2.5} alignItems="stretch">
            {plans.map((plan) => (
              <Grid item xs={12} md={4} key={plan.name}>
                <Box
                  sx={{
                    height: "100%",
                    p: 3.25,
                    borderRadius: 3.5,
                    bgcolor: "#fff",
                    color: landing.ink,
                    border: plan.featured ? `2px solid ${landing.blue}` : `1px solid ${landing.line}`,
                    boxShadow: plan.featured ? landing.shadow : landing.shadowSoft,
                    display: "flex",
                    flexDirection: "column",
                    position: "relative",
                    transform: { md: plan.featured ? "scale(1.03)" : "none" },
                    zIndex: plan.featured ? 1 : 0,
                  }}
                >
                  {plan.featured && (
                    <Box
                      sx={{
                        position: "absolute",
                        top: 16,
                        right: 16,
                        px: 1.25,
                        py: 0.4,
                        borderRadius: 99,
                        bgcolor: landing.blueSoft,
                        color: landing.blue,
                        fontSize: 11,
                        fontWeight: 700,
                      }}
                    >
                      Popular
                    </Box>
                  )}
                  <Typography sx={{ fontFamily: landing.fontDisplay, fontWeight: 700, fontSize: 24, mb: 1 }}>
                    {plan.name}
                  </Typography>
                  <Typography
                    sx={{
                      fontSize: 14,
                      color: landing.muted,
                      mb: 3,
                      lineHeight: 1.6,
                      minHeight: 48,
                    }}
                  >
                    {plan.blurb}
                  </Typography>
                  <Stack spacing={1.1} sx={{ mb: 3, flex: 1 }}>
                    {plan.points.map((p) => (
                      <Stack key={p} direction="row" spacing={1} alignItems="flex-start">
                        <Box
                          sx={{
                            mt: "6px",
                            width: 6,
                            height: 6,
                            borderRadius: "50%",
                            bgcolor: landing.blue,
                            flexShrink: 0,
                          }}
                        />
                        <Typography sx={{ fontSize: 14 }}>{p}</Typography>
                      </Stack>
                    ))}
                  </Stack>
                  <Button
                    component={RouterLink}
                    to={plan.to}
                    fullWidth
                    variant={plan.featured ? "contained" : "outlined"}
                    sx={{
                      textTransform: "none",
                      fontWeight: 700,
                      borderRadius: 2,
                      py: 1.15,
                      bgcolor: plan.featured ? landing.blue : "transparent",
                      borderColor: plan.featured ? landing.blue : landing.line,
                      color: plan.featured ? "#fff" : landing.ink,
                      "&:hover": {
                        bgcolor: plan.featured ? "#1558D6" : landing.blueSoft,
                        borderColor: landing.blue,
                      },
                      "&:focus-visible": focusRing,
                    }}
                  >
                    {plan.cta}
                  </Button>
                </Box>
              </Grid>
            ))}
          </Grid>
        </Container>
      </Box>

      {/* Final CTA */}
      <Box
        id="company"
        component="section"
        aria-labelledby="final-cta-heading"
        sx={{
          py: { xs: 7, md: 9 },
          bgcolor: "#fff",
          borderTop: `1px solid ${landing.line}`,
        }}
      >
        <Container maxWidth="md">
          <Stack alignItems="center" textAlign="center" spacing={2}>
            <Typography id="final-cta-heading" component="h2" sx={h2Sx}>
              Ready to simplify business spend?
            </Typography>
            <Typography sx={{ ...leadSx, mx: "auto" }}>
              Create your company account in minutes. Start with a guided tour and see how allpay can bring cards,
              expenses, payments, and accounting together.
            </Typography>
            <Stack direction={{ xs: "column", sm: "row" }} spacing={1.5} sx={{ pt: 1 }}>
              <Button component={RouterLink} to="/signup" variant="contained" size="large" endIcon={<ArrowForward />} sx={primaryBtn}>
                Get started free
              </Button>
              <Button component={RouterLink} to="/signup" variant="outlined" size="large" sx={secondaryBtn}>
                Talk to sales
              </Button>
            </Stack>
            <Typography sx={{ fontSize: 13, color: landing.muted, pt: 1 }}>
              No credit card required · Built for modern finance teams
            </Typography>
          </Stack>
        </Container>
      </Box>

      <MarketingFooter />
    </Box>
  );
}
