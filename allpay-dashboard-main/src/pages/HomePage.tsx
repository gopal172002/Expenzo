import ArrowForward from "@mui/icons-material/ArrowForward";
import DirectionsCarOutlined from "@mui/icons-material/DirectionsCarOutlined";
import ExpandMore from "@mui/icons-material/ExpandMore";
import LocalGroceryStoreOutlined from "@mui/icons-material/LocalGroceryStoreOutlined";
import GroupsOutlined from "@mui/icons-material/GroupsOutlined";
import HealthAndSafetyOutlined from "@mui/icons-material/HealthAndSafetyOutlined";
import HotelOutlined from "@mui/icons-material/HotelOutlined";
import LocalGasStationOutlined from "@mui/icons-material/LocalGasStationOutlined";
import LockOutlined from "@mui/icons-material/LockOutlined";
import PaymentsOutlined from "@mui/icons-material/PaymentsOutlined";
import PersonOutline from "@mui/icons-material/PersonOutline";
import PolicyOutlined from "@mui/icons-material/PolicyOutlined";
import QrCode2Outlined from "@mui/icons-material/QrCode2Outlined";
import ReceiptLongOutlined from "@mui/icons-material/ReceiptLongOutlined";
import RestaurantOutlined from "@mui/icons-material/RestaurantOutlined";
import StorefrontOutlined from "@mui/icons-material/StorefrontOutlined";
import SyncAltOutlined from "@mui/icons-material/SyncAltOutlined";
import TravelExploreOutlined from "@mui/icons-material/TravelExploreOutlined";
import VerifiedUserOutlined from "@mui/icons-material/VerifiedUserOutlined";
import VisibilityOutlined from "@mui/icons-material/VisibilityOutlined";
import WifiOutlined from "@mui/icons-material/WifiOutlined";
import WorkspacePremiumOutlined from "@mui/icons-material/WorkspacePremiumOutlined";
import {
  Accordion,
  AccordionDetails,
  AccordionSummary,
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
  ExpenseWorkflowMock,
  HeroDashboardMock,
  PhonePayMock,
  PolicyLockMock,
  ReconciliationMock,
  VerificationMock,
} from "../components/marketing/ProductMocks";
import { focusRing, landing } from "../components/marketing/landingTokens";
import { TrustLogoMarquee, type TrustBrand } from "../components/marketing/TrustLogoMarquee";

const trustedBrands: TrustBrand[] = [
  { name: "Porter", logo: "https://logo.uplead.com/porter.in", fallback: "/logos/porter.png" },
  { name: "Matrix Partners", logo: "https://logo.uplead.com/matrixpartners.com", fallback: "/logos/matrix-partners.png" },
  { name: "Urban Company", logo: "https://logo.uplead.com/urbanclap.com", fallback: "/logos/urban-company.png" },
  { name: "MPL", logo: "https://logo.uplead.com/mplgaming.com", fallback: "/logos/mpl.png" },
  { name: "Nasher Miles", logo: "https://nashermiles.com/cdn/shop/files/logoW.png?width=400", fallback: "/logos/nasher-miles.png" },
  { name: "Bluestone", logo: "https://logo.uplead.com/bluestone.com", fallback: "/logos/bluestone.png" },
  { name: "Pocket FM", logo: "https://logo.uplead.com/pocketfm.com", fallback: "/logos/pocket-fm.png" },
  { name: "Rapido", logo: "https://logo.uplead.com/rapido.bike", fallback: "/logos/rapido.png" },
];

const proofPoints = [
  { title: "UPI-first", body: "Pay on PhonePe, GPay, or any UPI app" },
  { title: "Purpose-locked", body: "Fuel, meals, travel — spend only where allowed" },
  { title: "Payment-matched", body: "Every claim is checked against the real UPI payment" },
  { title: "Auto-reconciled", body: "Payment, receipt, and verdict in one record" },
];

const pillars = [
  {
    title: "Pay on UPI",
    body: "Employees scan the shop’s existing QR and pay with the UPI app they already use. No new card. No new wallet.",
    icon: PaymentsOutlined,
  },
  {
    title: "Lock the purpose",
    body: "Finance sets category, amount, and day rules before money is spent — so a fuel limit cannot become a restaurant bill.",
    icon: LockOutlined,
  },
  {
    title: "Track every rupee",
    body: "The dashboard records merchant, UPI reference, receipt, location, and policy result the moment the payment happens.",
    icon: VisibilityOutlined,
  },
];

const trackSteps = [
  {
    n: "01",
    title: "Set the rules",
    body: "Create category policies: meals, fuel, travel, office. Cap each transaction and the month. Pick allowed days.",
  },
  {
    n: "02",
    title: "Employee pays on UPI",
    body: "They open AllPay, scan the merchant QR, and complete the payment in PhonePe, GPay, or another UPI app.",
  },
  {
    n: "03",
    title: "Spend is captured",
    body: "Amount, merchant, MCC, UPI reference, receipt, and purpose land on the company dashboard automatically.",
  },
  {
    n: "04",
    title: "Verify & close the books",
    body: "AllPay matches the payment, checks policy and attendance, flags fraud, and finance approves from one queue.",
  },
];

const lockItems = [
  {
    title: "Category lock",
    body: "Restrict a spend to fuel, meals, travel, groceries, or office — the same way you already think about allowances.",
  },
  {
    title: "Amount lock",
    body: "Per-transaction and monthly caps. A ₹500 meal voucher cannot become a ₹5,000 bill.",
  },
  {
    title: "Merchant / MCC lock",
    body: "The payment’s merchant category is compared with the claimed purpose, so fuel cannot be filed as food.",
  },
];

const noChange = [
  {
    title: "No change for employees",
    body: "They pay with PhonePe, GPay, or Paytm — the apps they already open every day.",
    icon: PersonOutline,
  },
  {
    title: "No change for merchants",
    body: "The shop accepts the payment on the QR already stuck on the counter.",
    icon: QrCode2Outlined,
  },
  {
    title: "A real change for finance",
    body: "Slips, WhatsApp forwards, and month-end Excel are replaced by a live UPI ledger.",
    icon: ReceiptLongOutlined,
  },
];

const solutions = [
  {
    title: "Business expense management",
    body: "Issue allowances, collect receipts, approve claims, and see every UPI spend across the team.",
    points: ["Employee allowances", "Policy by category", "Digital approval queue"],
    icon: GroupsOutlined,
  },
  {
    title: "Fleet & fuel",
    body: "Drivers pay at the pump on UPI. You restrict the purpose to fuel and see the station, amount, and time.",
    points: ["Fuel-only policy", "Stop cash leakage", "Pump-level trail"],
    icon: DirectionsCarOutlined,
  },
  {
    title: "Petty cash, without cash",
    body: "Store managers get a UPI spend limit instead of a cash tin. Every rupee has a merchant and a receipt.",
    points: ["Multi-location payouts", "No float to chase", "Instant record"],
    icon: StorefrontOutlined,
  },
  {
    title: "Reimbursements",
    body: "If the employee paid first, they submit the UPI payment plus receipt. Finance does not re-type the bill.",
    points: ["Purpose + note", "Query threads", "Faster payouts"],
    icon: SyncAltOutlined,
  },
];

const businessBenefits = [
  {
    title: "Money is visible the moment it moves",
    body: "You do not wait for a claim form. The UPI payment is the expense record.",
  },
  {
    title: "Purpose is locked before spend",
    body: "Budgets and category rules sit on the payment, not on a policy PDF nobody reads.",
  },
  {
    title: "Bill fraud has fewer places to hide",
    body: "Duplicate UPI references, edited receipts, and office-hours travel claims are flagged automatically.",
  },
  {
    title: "Reconciliation is digital",
    body: "Payment match, receipt, verdict, and export live in one row — not three systems.",
  },
];

const userBenefits = [
  {
    title: "Pay the way they already pay",
    body: "No extra card to carry. No new wallet to load. Scan, pay, done.",
  },
  {
    title: "Onboard with an invite code",
    body: "Employees join from the AllPay app. Finance does not run a KYC circus for every new joiner.",
  },
  {
    title: "Any merchant QR",
    body: "Pumps, cafes, travel desks, kiranas — if it has a UPI QR, it can be a tracked business expense.",
  },
  {
    title: "No reimbursement hassle",
    body: "The payment is already in the system. Attach a receipt and a purpose; wait for approval.",
  },
];

const features = [
  {
    title: "Instant UPI capture",
    body: "Scan a merchant QR in the AllPay app. The payment, UPI reference, and merchant details are stored immediately.",
    icon: PaymentsOutlined,
  },
  {
    title: "Smart spend controls",
    body: "Lock usage by category, transaction cap, monthly budget, and allowed weekdays.",
    icon: PolicyOutlined,
  },
  {
    title: "Receipt + payment match",
    body: "A claim cannot be larger than the rupee that actually left via UPI.",
    icon: ReceiptLongOutlined,
  },
  {
    title: "Automatic verification",
    body: "Seven checks: payment match, attendance, duplicates, policy, MCC, amount pattern, and receipt forensics.",
    icon: VerifiedUserOutlined,
  },
  {
    title: "Query instead of reject",
    body: "When something looks off, finance asks a plain-language question in-thread instead of bouncing the claim.",
    icon: VisibilityOutlined,
  },
  {
    title: "Role-based access",
    body: "Admins, approvers, and employees each see only what they should — on web and in the app.",
    icon: LockOutlined,
  },
];

const categories = [
  { label: "Fuel", icon: LocalGasStationOutlined },
  { label: "Meals & food", icon: RestaurantOutlined },
  { label: "Travel", icon: TravelExploreOutlined },
  { label: "Stay", icon: HotelOutlined },
  { label: "Office", icon: StorefrontOutlined },
  { label: "Groceries", icon: LocalGroceryStoreOutlined },
  { label: "Health", icon: HealthAndSafetyOutlined },
  { label: "Telecom", icon: WifiOutlined },
];

const faqs = [
  {
    q: "What is AllPay, in one sentence?",
    a: "AllPay is business expense management on UPI: employees pay at existing merchant QR codes, and finance tracks, verifies, and reconciles every rupee on one dashboard.",
  },
  {
    q: "How is this different from prepaid cards or wallets?",
    a: "Employees do not carry a new card or load a new wallet. They pay with the UPI apps they already use. The control sits in AllPay policy and in the payment record — not in a closed-loop card network.",
  },
  {
    q: "How do you track expenses?",
    a: "When an employee pays through AllPay, the UPI payment itself becomes the expense: merchant, amount, category, UPI reference, time, and (when uploaded) the receipt. Finance does not re-enter bills. The dashboard then runs verification checks and shows a verdict.",
  },
  {
    q: "Can we lock spend to a purpose?",
    a: "Yes. Policies lock a category (fuel, meals, travel, office, groceries), a per-transaction cap, a monthly cap, and allowed days. Merchant category codes are compared with the claimed purpose.",
  },
  {
    q: "Do employees need a new app to pay?",
    a: "They use the AllPay app to scan the merchant QR and start the payment. The actual debit happens in their existing UPI app — PhonePe, Google Pay, and others.",
  },
  {
    q: "Do merchants need to change anything?",
    a: "No. They accept the payment on the QR they already display.",
  },
  {
    q: "How does verification work?",
    a: "Each claim is scored against the AllPay payment record, attendance, duplicate UPI references, expense policy, category vs MCC, unusual amounts, and the receipt image. Payment evidence outweighs a photo. A clean check does not cancel a real warning.",
  },
  {
    q: "What happens at month-end?",
    a: "You export a reconciled ledger: every UPI reference, merchant, category, receipt, and approval state. That is the close — not a folder of slips.",
  },
  {
    q: "What if a payment is unused or a claim looks wrong?",
    a: "Finance can query the employee in-product, approve a different amount, or reject with a reason. Unused limits simply do not get spent.",
  },
];

const testimonials = [
  {
    quote:
      "I issue a fuel limit to drivers. They pay at the pump on UPI. Cash never changes hands, and I can see the station and the amount the same day.",
    role: "Fleet owner",
    org: "300 cabs",
  },
  {
    quote:
      "Month-end used to be chasing slips and rebuilding Excel. Now every UPI payment is already on the dashboard, matched to a receipt and a verdict.",
    role: "Business owner",
    org: "50 employees",
  },
  {
    quote:
      "Store managers no longer hold petty cash. They pay vendors on UPI within a daily cap. We finally know where the float went.",
    role: "Store operations",
    org: "15 outlets",
  },
];

const plans = [
  {
    name: "Essentials",
    blurb: "Start tracking UPI expenses for a small team.",
    cta: "Get started",
    to: "/signup",
    featured: false,
    points: ["UPI expense capture", "Category policies", "Receipt + claim review", "Standard exports"],
  },
  {
    name: "Growth",
    blurb: "Verification, attendance checks, and a live finance queue.",
    cta: "Get started",
    to: "/signup",
    featured: true,
    points: [
      "Purpose locks & monthly caps",
      "Automatic verification (7 checks)",
      "Query threads",
      "Analytics by category",
      "Accounting exports",
    ],
  },
  {
    name: "Enterprise",
    blurb: "Multi-location rollout, roles, and dedicated onboarding.",
    cta: "Talk to sales",
    to: "/signup",
    featured: false,
    points: ["Custom approval chains", "Role-based access", "Dedicated onboarding", "Priority support", "Advanced integrations"],
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

function Eyebrow({ children }: { children: ReactNode }) {
  return (
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
      {children}
    </Typography>
  );
}

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
            <Eyebrow>{eyebrow}</Eyebrow>
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

      <Box
        component="section"
        aria-labelledby="hero-heading"
        sx={{ position: "relative", pt: { xs: 5, md: 8 }, pb: { xs: 7, md: 10 }, bgcolor: "#fff" }}
      >
        <Container maxWidth="lg">
          <Grid container spacing={{ xs: 5, md: 6 }} alignItems="center">
            <Grid item xs={12} md={6}>
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
                Business expenses on UPI
              </Typography>
              <Typography
                id="hero-heading"
                component="h1"
                className="landing-reveal landing-delay-2"
                sx={{
                  fontFamily: landing.fontDisplay,
                  fontWeight: 700,
                  fontSize: { xs: 32, sm: 42, md: 48 },
                  letterSpacing: "-0.03em",
                  color: landing.navy,
                  lineHeight: 1.12,
                  mb: 2,
                }}
              >
                Business expenses
                <br />
                made seamless like your
                <br />
                personal UPI spends
              </Typography>
              <Typography className="landing-reveal landing-delay-3" sx={{ ...leadSx, mb: 3.5, maxWidth: 520 }}>
                Issue purpose-locked spend, pay at any merchant QR, and track every rupee on one dashboard — with
                automatic verification and digital reconciliation.
              </Typography>
              <Stack className="landing-reveal landing-delay-4" direction={{ xs: "column", sm: "row" }} spacing={1.5} sx={{ mb: 2.5 }}>
                <Button component={RouterLink} to="/signup" variant="contained" size="large" endIcon={<ArrowForward />} sx={primaryBtn}>
                  Start tracking expenses
                </Button>
                <Button href="#how-it-works" variant="outlined" size="large" sx={secondaryBtn}>
                  See how tracking works
                </Button>
              </Stack>
              <Typography className="landing-reveal landing-delay-5" sx={{ fontSize: 13, color: landing.muted, fontWeight: 500 }}>
                Existing UPI apps · Existing merchant QR · Finance sees every payment
              </Typography>
            </Grid>
            <Grid item xs={12} md={6} className="landing-reveal landing-delay-3">
              <HeroDashboardMock />
            </Grid>
          </Grid>
        </Container>
      </Box>

      <Box component="section" aria-labelledby="trust-heading" sx={{ py: { xs: 5, md: 7 }, bgcolor: "#fff", borderTop: `1px solid ${landing.line}` }}>
        <Container maxWidth="lg">
          <Typography id="trust-heading" component="h2" textAlign="center" sx={{ ...h2Sx, fontSize: { xs: 22, md: 28 }, mb: { xs: 3, md: 4 } }}>
            Built for Indian teams that already live on UPI
          </Typography>
          <TrustLogoMarquee brands={trustedBrands} />
          <Grid container spacing={1.5}>
            {proofPoints.map((item) => (
              <Grid item xs={12} sm={6} md={3} key={item.title}>
                <Box sx={{ p: 2, height: "100%", borderRadius: 2.5, bgcolor: landing.wash, border: `1px solid ${landing.line}` }}>
                  <Typography sx={{ fontWeight: 800, fontSize: 14, color: landing.navy, mb: 0.5 }}>{item.title}</Typography>
                  <Typography sx={{ fontSize: 13, color: landing.muted, lineHeight: 1.5 }}>{item.body}</Typography>
                </Box>
              </Grid>
            ))}
          </Grid>
        </Container>
      </Box>

      <Box id="product" component="section" aria-labelledby="product-heading" sx={{ ...sectionPad, bgcolor: landing.wash }}>
        <Container maxWidth="lg">
          <Stack alignItems="center" textAlign="center" sx={{ mb: 5 }}>
            <Eyebrow>The product</Eyebrow>
            <Typography id="product-heading" component="h2" sx={{ ...h2Sx, mb: 2, maxWidth: 720 }}>
              Meet the all-in-one business expense solution on UPI
            </Typography>
            <Typography sx={{ ...leadSx, mx: "auto" }}>
              AllPay helps a company issue purpose-specific spend, let employees pay like they already do on UPI, and
              give finance a live trail of where every rupee went.
            </Typography>
          </Stack>
          <Grid container spacing={2.5}>
            {pillars.map((p) => {
              const Icon = p.icon;
              return (
                <Grid item xs={12} md={4} key={p.title}>
                  <Box
                    sx={{
                      height: "100%",
                      p: 3,
                      borderRadius: 3,
                      bgcolor: "#fff",
                      border: `1px solid ${landing.line}`,
                      boxShadow: landing.shadowSoft,
                    }}
                  >
                    <Box
                      sx={{
                        width: 44,
                        height: 44,
                        borderRadius: 2,
                        bgcolor: landing.blueSoft,
                        color: landing.blue,
                        display: "grid",
                        placeItems: "center",
                        mb: 2,
                      }}
                    >
                      <Icon fontSize="small" />
                    </Box>
                    <Typography sx={{ fontWeight: 700, fontSize: 20, color: landing.ink, mb: 1, fontFamily: landing.fontDisplay }}>
                      {p.title}
                    </Typography>
                    <Typography sx={{ fontSize: 15, color: landing.muted, lineHeight: 1.65 }}>{p.body}</Typography>
                  </Box>
                </Grid>
              );
            })}
          </Grid>
        </Container>
      </Box>

      <Box component="section" aria-labelledby="why-upi-heading" sx={sectionPad}>
        <Container maxWidth="lg">
          <Grid container spacing={6} alignItems="center">
            <Grid item xs={12} md={6}>
              <Eyebrow>Why UPI for business</Eyebrow>
              <Typography id="why-upi-heading" component="h2" sx={{ ...h2Sx, mb: 2 }}>
                UPI is convenient. Business still needs control.
              </Typography>
              <Typography sx={{ ...leadSx, mb: 2 }}>
                We already trust UPI for personal spends. Companies do not — because a personal UPI payment has no
                purpose, no policy, and no audit trail.
              </Typography>
              <Typography sx={{ ...leadSx }}>
                AllPay keeps the same tap-and-pay habit, then adds the missing business layer: lock the purpose, match
                the receipt to the real UPI payment, and show finance what happened.
              </Typography>
            </Grid>
            <Grid item xs={12} md={6}>
              <Stack spacing={1.5}>
                {[
                  ["Personal UPI", "Pay anyone. No questions. No ledger for the company."],
                  ["Cash / prepaid cards", "Money leaves the account early. Paperwork follows later."],
                  ["AllPay UPI expenses", "Pay at the shop. Purpose is locked. Dashboard has the trail."],
                ].map(([title, body], i) => (
                  <Box
                    key={title}
                    sx={{
                      p: 2.25,
                      borderRadius: 2.5,
                      border: `1px solid ${i === 2 ? landing.blue : landing.line}`,
                      bgcolor: i === 2 ? landing.blueSoft : landing.wash,
                    }}
                  >
                    <Typography sx={{ fontWeight: 700, color: landing.ink }}>{title}</Typography>
                    <Typography sx={{ fontSize: 14, color: landing.muted, mt: 0.5 }}>{body}</Typography>
                  </Box>
                ))}
              </Stack>
            </Grid>
          </Grid>
        </Container>
      </Box>

      <Box id="how-it-works" component="section" aria-labelledby="how-heading" sx={{ ...sectionPad, bgcolor: landing.wash }}>
        <Container maxWidth="lg">
          <Stack alignItems="center" textAlign="center" sx={{ mb: 5 }}>
            <Eyebrow>How expense tracking works</Eyebrow>
            <Typography id="how-heading" component="h2" sx={{ ...h2Sx, mb: 2 }}>
              From policy to UPI payment to a closed book
            </Typography>
            <Typography sx={{ ...leadSx, mx: "auto" }}>
              Tracking is not a form employees fill later. The payment is the track. Finance reviews what AllPay already
              recorded.
            </Typography>
          </Stack>
          <Grid container spacing={2.5}>
            {trackSteps.map((s) => (
              <Grid item xs={12} sm={6} md={3} key={s.n}>
                <Box sx={{ height: "100%", p: 3, borderRadius: 3, bgcolor: "#fff", border: `1px solid ${landing.line}` }}>
                  <Typography sx={{ fontFamily: landing.fontDisplay, fontSize: 40, fontWeight: 800, color: landing.blueSoft, lineHeight: 1 }}>
                    {s.n}
                  </Typography>
                  <Typography sx={{ fontWeight: 700, fontSize: 18, color: landing.ink, mt: 1, mb: 1, fontFamily: landing.fontDisplay }}>
                    {s.title}
                  </Typography>
                  <Typography sx={{ fontSize: 14, color: landing.muted, lineHeight: 1.65 }}>{s.body}</Typography>
                </Box>
              </Grid>
            ))}
          </Grid>
          <Grid container spacing={4} alignItems="center" sx={{ mt: { xs: 4, md: 6 } }}>
            <Grid item xs={12} md={5}>
              <PhonePayMock />
            </Grid>
            <Grid item xs={12} md={7}>
              <Eyebrow>Employee view</Eyebrow>
              <Typography component="h3" sx={{ ...h2Sx, fontSize: { xs: 24, md: 30 }, mb: 1.5 }}>
                Scan the shop QR. Pay in PhonePe or GPay. AllPay records it.
              </Typography>
              <Typography sx={leadSx}>
                Tracking does not start when someone uploads a bill next week. It starts when the UPI payment succeeds —
                merchant, amount, reference, and purpose are already on the company dashboard.
              </Typography>
            </Grid>
          </Grid>
        </Container>
      </Box>

      <Showcase
        id="controls"
        eyebrow="Can it be locked?"
        title="Lock spend to a category, a cap, and a merchant type"
        body="Business UPI is useful only when the purpose is fixed before the employee reaches the counter. AllPay policies do that — without issuing a new card."
        bullets={[
          "Category locks for fuel, meals, travel, office, groceries",
          "Per-transaction and monthly amount caps",
          "Allowed weekdays — weekend meal claims can be blocked",
          "MCC check so the shop type must match the purpose",
        ]}
        mock={<PolicyLockMock />}
      />

      <Box component="section" aria-labelledby="lock-types-heading" sx={{ pb: { xs: 7, md: 11 }, bgcolor: "#fff" }}>
        <Container maxWidth="lg">
          <Typography id="lock-types-heading" component="h2" sx={{ ...h2Sx, mb: 3, fontSize: { xs: 24, md: 30 } }}>
            Three locks. One UPI payment.
          </Typography>
          <Grid container spacing={2.5}>
            {lockItems.map((item) => (
              <Grid item xs={12} md={4} key={item.title}>
                <Box sx={{ p: 3, height: "100%", borderRadius: 3, bgcolor: landing.wash, border: `1px solid ${landing.line}` }}>
                  <LockOutlined sx={{ color: landing.blue, mb: 1.5 }} />
                  <Typography sx={{ fontWeight: 700, fontSize: 18, mb: 1, fontFamily: landing.fontDisplay }}>{item.title}</Typography>
                  <Typography sx={{ fontSize: 14, color: landing.muted, lineHeight: 1.65 }}>{item.body}</Typography>
                </Box>
              </Grid>
            ))}
          </Grid>
        </Container>
      </Box>

      <Box component="section" aria-labelledby="no-change-heading" sx={{ ...sectionPad, bgcolor: landing.navy, color: "#fff" }}>
        <Container maxWidth="lg">
          <Typography id="no-change-heading" component="h2" sx={{ ...h2Sx, color: "#fff", mb: 1.5, textAlign: "center" }}>
            All this on the existing UPI ecosystem
          </Typography>
          <Typography sx={{ ...leadSx, mx: "auto", color: "rgba(255,255,255,0.72)", textAlign: "center", mb: 5 }}>
            The habit stays. The control is new.
          </Typography>
          <Grid container spacing={2.5}>
            {noChange.map((item) => {
              const Icon = item.icon;
              return (
                <Grid item xs={12} md={4} key={item.title}>
                  <Box sx={{ p: 3, height: "100%", borderRadius: 3, bgcolor: "rgba(255,255,255,0.06)", border: "1px solid rgba(255,255,255,0.1)" }}>
                    <Icon sx={{ color: "#93C5FD", mb: 1.5 }} />
                    <Typography sx={{ fontWeight: 700, fontSize: 18, mb: 1 }}>{item.title}</Typography>
                    <Typography sx={{ fontSize: 14, color: "rgba(255,255,255,0.7)", lineHeight: 1.65 }}>{item.body}</Typography>
                  </Box>
                </Grid>
              );
            })}
          </Grid>
        </Container>
      </Box>

      <Showcase
        reverse
        eyebrow="Issuance & tracking"
        title="The payment is the expense record"
        body="Employees do not reconstruct a week of spends from memory. AllPay already has the UPI reference, the merchant, and the amount. They add a receipt and a purpose; finance reviews the rest."
        bullets={[
          "UPI reference stored with every payment",
          "Receipt upload next to the payment, not in a separate inbox",
          "Purpose and note for the approval queue",
          "Status the employee can see: pending, queried, approved",
        ]}
        mock={<ExpenseWorkflowMock />}
      />

      <Box id="solutions" component="section" aria-labelledby="solutions-heading" sx={{ ...sectionPad, bgcolor: landing.wash }}>
        <Container maxWidth="lg">
          <Stack alignItems="center" textAlign="center" sx={{ mb: 5 }}>
            <Eyebrow>Solutions</Eyebrow>
            <Typography id="solutions-heading" component="h2" sx={{ ...h2Sx, mb: 2 }}>
              Smarter, traceable business expenses on UPI
            </Typography>
          </Stack>
          <Grid container spacing={2.5}>
            {solutions.map((s) => {
              const Icon = s.icon;
              return (
                <Grid item xs={12} sm={6} key={s.title}>
                  <Box sx={{ height: "100%", p: 3, borderRadius: 3, bgcolor: "#fff", border: `1px solid ${landing.line}`, boxShadow: landing.shadowSoft }}>
                    <Icon sx={{ color: landing.blue, mb: 1.5 }} />
                    <Typography sx={{ fontWeight: 700, fontSize: 20, mb: 1, fontFamily: landing.fontDisplay }}>{s.title}</Typography>
                    <Typography sx={{ fontSize: 14, color: landing.muted, lineHeight: 1.65, mb: 2 }}>{s.body}</Typography>
                    <Stack spacing={0.75}>
                      {s.points.map((p) => (
                        <Typography key={p} sx={{ fontSize: 13, color: landing.ink, fontWeight: 600 }}>
                          · {p}
                        </Typography>
                      ))}
                    </Stack>
                  </Box>
                </Grid>
              );
            })}
          </Grid>
        </Container>
      </Box>

      <Box id="why" component="section" aria-labelledby="why-heading" sx={sectionPad}>
        <Container maxWidth="lg">
          <Stack alignItems="center" textAlign="center" sx={{ mb: 5 }}>
            <Eyebrow>Why AllPay</Eyebrow>
            <Typography id="why-heading" component="h2" sx={{ ...h2Sx, mb: 2, maxWidth: 760 }}>
              Move off cash, prepaid cards, and wallets — keep UPI
            </Typography>
          </Stack>
          <Grid container spacing={4}>
            <Grid item xs={12} md={6}>
              <Typography sx={{ fontWeight: 800, fontSize: 13, letterSpacing: "0.08em", textTransform: "uppercase", color: landing.blue, mb: 2 }}>
                For the business
              </Typography>
              <Stack spacing={2}>
                {businessBenefits.map((b) => (
                  <Box key={b.title} sx={{ p: 2.25, borderRadius: 2.5, border: `1px solid ${landing.line}` }}>
                    <Typography sx={{ fontWeight: 700, color: landing.ink }}>{b.title}</Typography>
                    <Typography sx={{ fontSize: 14, color: landing.muted, mt: 0.5, lineHeight: 1.6 }}>{b.body}</Typography>
                  </Box>
                ))}
              </Stack>
            </Grid>
            <Grid item xs={12} md={6}>
              <Typography sx={{ fontWeight: 800, fontSize: 13, letterSpacing: "0.08em", textTransform: "uppercase", color: landing.green, mb: 2 }}>
                For the employee
              </Typography>
              <Stack spacing={2}>
                {userBenefits.map((b) => (
                  <Box key={b.title} sx={{ p: 2.25, borderRadius: 2.5, border: `1px solid ${landing.line}`, bgcolor: landing.wash }}>
                    <Typography sx={{ fontWeight: 700, color: landing.ink }}>{b.title}</Typography>
                    <Typography sx={{ fontSize: 14, color: landing.muted, mt: 0.5, lineHeight: 1.6 }}>{b.body}</Typography>
                  </Box>
                ))}
              </Stack>
            </Grid>
          </Grid>
        </Container>
      </Box>

      <Showcase
        id="verification"
        reverse
        eyebrow="Verification"
        title="Finance does not approve a photo. It approves a matched payment."
        body="A receipt is an opinion. A UPI payment is proof. AllPay scores every claim so obvious matches close fast and odd ones get a question, not a rubber stamp."
        bullets={[
          "UPI payment match outweighs image analysis",
          "Attendance conflict: travel claimed while punched in",
          "Duplicate UPI references cannot be reimbursed twice",
          "Plain-language queries instead of silent rejection",
        ]}
        mock={<VerificationMock />}
      />

      <Showcase
        id="reconciliation"
        eyebrow="Reconciliation"
        title="Close the month from the dashboard"
        body="Because the payment, the receipt, and the verdict share one record, you are not stitching bank files to WhatsApp bills at month-end."
        bullets={[
          "Every row has a UPI reference",
          "Verified, approved, or queried — visible in one queue",
          "Export for accounting without re-keying merchants",
          "Less leakage from missing slips and duplicate claims",
        ]}
        mock={<ReconciliationMock />}
      />

      <Box id="features" component="section" aria-labelledby="features-heading" sx={{ ...sectionPad, bgcolor: landing.wash }}>
        <Container maxWidth="lg">
          <Stack alignItems="center" textAlign="center" sx={{ mb: 5 }}>
            <Typography id="features-heading" component="h2" sx={{ ...h2Sx, mb: 2 }}>
              What the platform actually does
            </Typography>
            <Typography sx={{ ...leadSx, mx: "auto" }}>
              Not a generic finance suite. These are the pieces that make UPI usable as a business expense system.
            </Typography>
          </Stack>
          <Grid container spacing={2.5}>
            {features.map((f) => {
              const Icon = f.icon;
              return (
                <Grid item xs={12} sm={6} md={4} key={f.title}>
                  <Box sx={{ height: "100%", p: 3, borderRadius: 3, bgcolor: "#fff", border: `1px solid ${landing.line}` }}>
                    <Icon sx={{ color: landing.blue, mb: 1.5 }} />
                    <Typography sx={{ fontWeight: 700, fontSize: 17, mb: 1, fontFamily: landing.fontDisplay }}>{f.title}</Typography>
                    <Typography sx={{ fontSize: 14, color: landing.muted, lineHeight: 1.65 }}>{f.body}</Typography>
                  </Box>
                </Grid>
              );
            })}
          </Grid>
        </Container>
      </Box>

      <Box id="categories" component="section" aria-labelledby="categories-heading" sx={sectionPad}>
        <Container maxWidth="lg">
          <Stack alignItems="center" textAlign="center" sx={{ mb: 5 }}>
            <Eyebrow>Purpose categories</Eyebrow>
            <Typography id="categories-heading" component="h2" sx={{ ...h2Sx, mb: 2 }}>
              Lock a voucher-like purpose on a UPI payment
            </Typography>
            <Typography sx={{ ...leadSx, mx: "auto" }}>
              Same idea as an allowance: the employee can spend, but only on the thing you intended.
            </Typography>
          </Stack>
          <Grid container spacing={2}>
            {categories.map((c) => {
              const Icon = c.icon;
              return (
                <Grid item xs={6} sm={4} md={3} key={c.label}>
                  <Stack
                    alignItems="center"
                    spacing={1}
                    sx={{
                      py: 2.5,
                      px: 1,
                      borderRadius: 3,
                      border: `1px solid ${landing.line}`,
                      bgcolor: landing.wash,
                    }}
                  >
                    <Box
                      sx={{
                        width: 44,
                        height: 44,
                        borderRadius: "50%",
                        bgcolor: "#fff",
                        border: `1px solid ${landing.line}`,
                        display: "grid",
                        placeItems: "center",
                      }}
                    >
                      <Icon sx={{ color: landing.blue }} />
                    </Box>
                    <Typography sx={{ fontWeight: 700, fontSize: 14, color: landing.ink }}>{c.label}</Typography>
                  </Stack>
                </Grid>
              );
            })}
          </Grid>
        </Container>
      </Box>

      <Box id="company" component="section" aria-labelledby="about-heading" sx={{ ...sectionPad, bgcolor: landing.wash }}>
        <Container maxWidth="lg">
          <Grid container spacing={6}>
            <Grid item xs={12} md={5}>
              <Eyebrow>About AllPay</Eyebrow>
              <Typography id="about-heading" component="h2" sx={h2Sx}>
                Make business expenses as easy as personal UPI
              </Typography>
            </Grid>
            <Grid item xs={12} md={7}>
              <Typography sx={{ ...leadSx, maxWidth: "none", mb: 2 }}>
                UPI is how India pays. Businesses still run expenses on cash, prepaid cards, and reimbursement forms
                because raw UPI has no purpose and no control. AllPay is the layer that adds both.
              </Typography>
              <Typography sx={{ ...leadSx, maxWidth: "none" }}>
                We onboard employees with an invite code, let them pay at existing merchant QRs, lock the purpose with
                policy, and give finance a verification engine plus a reconciled ledger. Petty cash, travel, fuel,
                meals, and allowances become UPI payments you can actually audit.
              </Typography>
            </Grid>
          </Grid>
        </Container>
      </Box>

      <Box id="faq" component="section" aria-labelledby="faq-heading" sx={sectionPad}>
        <Container maxWidth="md">
          <Typography id="faq-heading" component="h2" sx={{ ...h2Sx, mb: 1.5, textAlign: "center" }}>
            FAQs
          </Typography>
          <Typography sx={{ ...leadSx, mx: "auto", textAlign: "center", mb: 4 }}>
            The short version of how AllPay issues, tracks, and closes business expenses on UPI.
          </Typography>
          {faqs.map((item) => (
            <Accordion
              key={item.q}
              disableGutters
              elevation={0}
              sx={{
                border: `1px solid ${landing.line}`,
                borderRadius: "12px !important",
                mb: 1.25,
                "&:before": { display: "none" },
                "&.Mui-expanded": { boxShadow: landing.shadowSoft },
              }}
            >
              <AccordionSummary expandIcon={<ExpandMore />}>
                <Typography sx={{ fontWeight: 700, fontSize: 15, color: landing.ink, pr: 2 }}>{item.q}</Typography>
              </AccordionSummary>
              <AccordionDetails>
                <Typography sx={{ fontSize: 14, color: landing.muted, lineHeight: 1.7 }}>{item.a}</Typography>
              </AccordionDetails>
            </Accordion>
          ))}
        </Container>
      </Box>

      <Box id="stories" component="section" aria-labelledby="stories-heading" sx={{ ...sectionPad, bgcolor: landing.wash }}>
        <Container maxWidth="lg">
          <Typography id="stories-heading" component="h2" textAlign="center" sx={{ ...h2Sx, mb: 5 }}>
            What teams use it for
          </Typography>
          <Grid container spacing={2.5}>
            {testimonials.map((t) => (
              <Grid item xs={12} md={4} key={t.role}>
                <Box
                  sx={{
                    height: "100%",
                    p: 3,
                    borderRadius: 3,
                    bgcolor: "#fff",
                    border: `1px solid ${landing.line}`,
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

      <Box id="pricing" component="section" aria-labelledby="pricing-heading" sx={sectionPad}>
        <Container maxWidth="lg">
          <Stack alignItems="center" textAlign="center" sx={{ mb: 5 }}>
            <Typography id="pricing-heading" component="h2" sx={{ ...h2Sx, mb: 2 }}>
              Plans for the way you track spend
            </Typography>
            <Typography sx={{ ...leadSx, mx: "auto" }}>
              Start with capture and policy. Add verification and multi-location control when the team grows.
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
                  <Typography sx={{ fontSize: 14, color: landing.muted, mb: 3, lineHeight: 1.6, minHeight: 48 }}>
                    {plan.blurb}
                  </Typography>
                  <Stack spacing={1.1} sx={{ mb: 3, flex: 1 }}>
                    {plan.points.map((p) => (
                      <Stack key={p} direction="row" spacing={1} alignItems="flex-start">
                        <Box sx={{ mt: "6px", width: 6, height: 6, borderRadius: "50%", bgcolor: landing.blue, flexShrink: 0 }} />
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
                      "&:hover": { bgcolor: plan.featured ? "#1558D6" : landing.blueSoft, borderColor: landing.blue },
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

      <Box
        component="section"
        aria-labelledby="final-cta-heading"
        sx={{ py: { xs: 7, md: 9 }, bgcolor: landing.navy, color: "#fff" }}
      >
        <Container maxWidth="md">
          <Stack alignItems="center" textAlign="center" spacing={2}>
            <WorkspacePremiumOutlined sx={{ fontSize: 36, color: "#93C5FD" }} />
            <Typography id="final-cta-heading" component="h2" sx={{ ...h2Sx, color: "#fff" }}>
              Shift business expenses onto UPI
            </Typography>
            <Typography sx={{ ...leadSx, mx: "auto", color: "rgba(255,255,255,0.72)" }}>
              Create a company workspace, invite employees, set a purpose lock, and watch the first payment appear on
              the dashboard.
            </Typography>
            <Stack direction={{ xs: "column", sm: "row" }} spacing={1.5} sx={{ pt: 1 }}>
              <Button component={RouterLink} to="/signup" variant="contained" size="large" endIcon={<ArrowForward />} sx={primaryBtn}>
                Get started free
              </Button>
              <Button href="#faq" variant="outlined" size="large" sx={{ ...secondaryBtn, bgcolor: "transparent", color: "#fff", borderColor: "rgba(255,255,255,0.28)" }}>
                Read the FAQs
              </Button>
            </Stack>
          </Stack>
        </Container>
      </Box>

      <MarketingFooter />
    </Box>
  );
}
