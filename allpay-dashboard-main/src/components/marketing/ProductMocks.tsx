import CheckCircleOutline from "@mui/icons-material/CheckCircleOutline";
import CreditCardOutlined from "@mui/icons-material/CreditCardOutlined";
import ReceiptLongOutlined from "@mui/icons-material/ReceiptLongOutlined";
import TrendingUp from "@mui/icons-material/TrendingUp";
import { Box, LinearProgress, Stack, Typography } from "@mui/material";
import { landing } from "./landingTokens";

const panel = {
  bgcolor: "#fff",
  borderRadius: 2.5,
  border: `1px solid ${landing.line}`,
  boxShadow: landing.shadowSoft,
};

const insetPanel = {
  bgcolor: landing.wash,
  borderRadius: 2.5,
  border: `1px solid ${landing.line}`,
};

function MiniBar({ values, color = landing.blue }: { values: number[]; color?: string }) {
  const max = Math.max(...values, 1);
  return (
    <Stack direction="row" alignItems="flex-end" spacing={0.6} sx={{ height: 56 }}>
      {values.map((v, i) => (
        <Box
          key={i}
          sx={{
            flex: 1,
            height: `${(v / max) * 100}%`,
            minHeight: 8,
            borderRadius: 1,
            bgcolor: i === values.length - 1 ? color : landing.blueSoft,
            transition: "height 0.4s ease",
          }}
        />
      ))}
    </Stack>
  );
}

function Donut() {
  return (
    <Box sx={{ position: "relative", width: 72, height: 72, flexShrink: 0 }}>
      <Box
        sx={{
          width: "100%",
          height: "100%",
          borderRadius: "50%",
          background: `conic-gradient(${landing.blue} 0 42%, ${landing.green} 42% 68%, #94A3B8 68% 85%, #CBD5E1 85% 100%)`,
        }}
      />
      <Box
        sx={{
          position: "absolute",
          inset: 12,
          borderRadius: "50%",
          bgcolor: "#fff",
          display: "grid",
          placeItems: "center",
        }}
      >
        <Typography sx={{ fontSize: 11, fontWeight: 700, color: landing.ink }}>Spend</Typography>
      </Box>
    </Box>
  );
}

/** Rich product UI mock used in the homepage hero. */
export function HeroDashboardMock() {
  return (
    <Box
      className="landing-float"
      sx={{
        position: "relative",
        width: "100%",
        maxWidth: 560,
        mx: "auto",
        p: { xs: 1.5, sm: 2 },
        borderRadius: 4,
        bgcolor: "#fff",
        border: `1px solid ${landing.line}`,
        boxShadow: landing.shadow,
        overflow: "hidden",
      }}
    >
      <Stack spacing={1.5} sx={{ position: "relative" }}>
        <Stack direction="row" justifyContent="space-between" alignItems="center" sx={{ px: 0.5 }}>
          <Typography sx={{ color: landing.muted, fontSize: 12, fontWeight: 600 }}>
            Company workspace
          </Typography>
          <Box
            sx={{
              px: 1.25,
              py: 0.4,
              borderRadius: 99,
              bgcolor: landing.greenSoft,
              color: landing.green,
              fontSize: 11,
              fontWeight: 700,
            }}
          >
            Live
          </Box>
        </Stack>

        <Box sx={{ ...insetPanel, p: 2 }}>
          <Typography sx={{ fontSize: 12, color: landing.muted, fontWeight: 600 }}>Company balance</Typography>
          <Typography
            sx={{
              fontFamily: landing.fontDisplay,
              fontSize: { xs: 28, sm: 32 },
              fontWeight: 700,
              letterSpacing: "-0.03em",
              color: landing.ink,
              mt: 0.5,
            }}
          >
            ₹24,80,450
          </Typography>
          <Stack direction="row" spacing={1} alignItems="center" sx={{ mt: 1 }}>
            <TrendingUp sx={{ fontSize: 16, color: landing.green }} />
            <Typography sx={{ fontSize: 12, color: landing.green, fontWeight: 600 }}>
              +12.4% vs last month
            </Typography>
          </Stack>
        </Box>

        <Stack direction={{ xs: "column", sm: "row" }} spacing={1.5}>
          <Box sx={{ ...insetPanel, p: 1.75, flex: 1 }}>
            <Stack direction="row" spacing={1} alignItems="center" sx={{ mb: 1 }}>
              <CreditCardOutlined sx={{ fontSize: 18, color: landing.blue }} />
              <Typography sx={{ fontSize: 12, fontWeight: 700, color: landing.ink }}>Card spending</Typography>
            </Stack>
            <Typography sx={{ fontSize: 20, fontWeight: 700, color: landing.ink }}>₹3,42,800</Typography>
            <Typography sx={{ fontSize: 11, color: landing.muted, mt: 0.5 }}>This month · 48 cards</Typography>
            <Box sx={{ mt: 1.5 }}>
              <LinearProgress
                variant="determinate"
                value={68}
                sx={{
                  height: 6,
                  borderRadius: 99,
                  bgcolor: "#fff",
                  "& .MuiLinearProgress-bar": { bgcolor: landing.blue, borderRadius: 99 },
                }}
              />
            </Box>
          </Box>
          <Box sx={{ ...insetPanel, p: 1.75, flex: 1 }}>
            <Typography sx={{ fontSize: 12, fontWeight: 700, color: landing.ink, mb: 1 }}>
              Pending approvals
            </Typography>
            <Typography sx={{ fontSize: 20, fontWeight: 700, color: landing.ink }}>7</Typography>
            <Typography sx={{ fontSize: 11, color: landing.muted, mt: 0.5 }}>₹1,18,240 awaiting review</Typography>
            <Stack direction="row" spacing={0.75} sx={{ mt: 1.5 }}>
              {["Travel", "Meals", "Vendors"].map((t) => (
                <Box
                  key={t}
                  sx={{
                    px: 1,
                    py: 0.35,
                    borderRadius: 1,
                    bgcolor: "#fff",
                    border: `1px solid ${landing.line}`,
                    fontSize: 10,
                    fontWeight: 600,
                    color: landing.muted,
                  }}
                >
                  {t}
                </Box>
              ))}
            </Stack>
          </Box>
        </Stack>

        <Stack direction={{ xs: "column", sm: "row" }} spacing={1.5}>
          <Box sx={{ ...insetPanel, p: 1.75, flex: 1.2 }}>
            <Typography sx={{ fontSize: 12, fontWeight: 700, color: landing.ink, mb: 1.25 }}>
              Monthly spend
            </Typography>
            <MiniBar values={[42, 55, 38, 62, 48, 71, 58, 80]} />
            <Stack direction="row" justifyContent="space-between" sx={{ mt: 0.75 }}>
              <Typography sx={{ fontSize: 10, color: landing.muted }}>Jan</Typography>
              <Typography sx={{ fontSize: 10, color: landing.muted }}>Aug</Typography>
            </Stack>
          </Box>
          <Box sx={{ ...insetPanel, p: 1.75, flex: 1, display: "flex", gap: 1.5, alignItems: "center" }}>
            <Donut />
            <Stack spacing={0.5}>
              <Typography sx={{ fontSize: 12, fontWeight: 700, color: landing.ink }}>Categories</Typography>
              {[
                { l: "Travel", c: landing.blue },
                { l: "Software", c: landing.green },
                { l: "Vendors", c: "#94A3B8" },
              ].map((r) => (
                <Stack key={r.l} direction="row" spacing={0.75} alignItems="center">
                  <Box sx={{ width: 8, height: 8, borderRadius: "50%", bgcolor: r.c }} />
                  <Typography sx={{ fontSize: 11, color: landing.muted }}>{r.l}</Typography>
                </Stack>
              ))}
            </Stack>
          </Box>
        </Stack>

        <Box sx={{ ...insetPanel, p: 1.5 }}>
          <Typography sx={{ fontSize: 12, fontWeight: 700, color: landing.ink, mb: 1 }}>
            Finance activity
          </Typography>
          <Stack spacing={1}>
            {[
              {
                icon: <CheckCircleOutline sx={{ fontSize: 16, color: landing.green }} />,
                title: "UPI payment · CloudServe",
                meta: "₹24,500 · Settled",
              },
              {
                icon: <ReceiptLongOutlined sx={{ fontSize: 16, color: landing.blue }} />,
                title: "Reimbursement · Priya S.",
                meta: "₹3,280 · Approved",
              },
              {
                icon: <CreditCardOutlined sx={{ fontSize: 16, color: landing.navyMid }} />,
                title: "Virtual card spend · Ads",
                meta: "₹18,900 · Cleared",
              },
            ].map((row) => (
              <Stack
                key={row.title}
                direction="row"
                spacing={1.25}
                alignItems="center"
                sx={{
                  p: 1,
                  borderRadius: 1.5,
                  bgcolor: "#fff",
                  border: `1px solid ${landing.line}`,
                  transition: "border-color 0.2s, box-shadow 0.2s",
                  "&:hover": { borderColor: landing.blue, boxShadow: landing.shadowSoft },
                }}
              >
                <Box
                  sx={{
                    width: 28,
                    height: 28,
                    borderRadius: 1.25,
                    bgcolor: landing.wash,
                    display: "grid",
                    placeItems: "center",
                    border: `1px solid ${landing.line}`,
                  }}
                >
                  {row.icon}
                </Box>
                <Box sx={{ minWidth: 0, flex: 1 }}>
                  <Typography noWrap sx={{ fontSize: 12, fontWeight: 600, color: landing.ink }}>
                    {row.title}
                  </Typography>
                  <Typography sx={{ fontSize: 11, color: landing.muted }}>{row.meta}</Typography>
                </Box>
              </Stack>
            ))}
          </Stack>
        </Box>
      </Stack>
    </Box>
  );
}

export function CardsControlMock() {
  return (
    <Box sx={{ ...panel, p: { xs: 2, md: 3 }, overflow: "hidden" }}>
      <Stack spacing={2}>
        <Stack direction={{ xs: "column", sm: "row" }} spacing={2}>
          {[
            { label: "Virtual", last4: "4821", limit: "₹50,000", used: 62, tone: landing.blue },
            { label: "Physical", last4: "9033", limit: "₹1,00,000", used: 38, tone: landing.navy },
          ].map((card) => (
            <Box
              key={card.last4}
              sx={{
                flex: 1,
                p: 2.25,
                borderRadius: 3,
                bgcolor: landing.wash,
                border: `1px solid ${landing.line}`,
                color: landing.ink,
                minHeight: 140,
                display: "flex",
                flexDirection: "column",
                justifyContent: "space-between",
                transition: "transform 0.25s ease, box-shadow 0.25s ease",
                "&:hover": { transform: "translateY(-3px)", boxShadow: landing.shadowSoft },
              }}
            >
              <Stack direction="row" justifyContent="space-between">
                <Typography sx={{ fontSize: 12, fontWeight: 600, color: landing.muted }}>{card.label} card</Typography>
                <Typography sx={{ fontSize: 11, color: landing.muted }}>•••• {card.last4}</Typography>
              </Stack>
              <Box>
                <Typography sx={{ fontSize: 11, color: landing.muted }}>Spend limit</Typography>
                <Typography sx={{ fontWeight: 700, fontSize: 18, color: landing.ink }}>{card.limit}</Typography>
                <LinearProgress
                  variant="determinate"
                  value={card.used}
                  sx={{
                    mt: 1,
                    height: 5,
                    borderRadius: 99,
                    bgcolor: "#fff",
                    "& .MuiLinearProgress-bar": { bgcolor: card.tone, borderRadius: 99 },
                  }}
                />
              </Box>
            </Box>
          ))}
        </Stack>
        <Box sx={{ p: 2, borderRadius: 2, bgcolor: landing.wash }}>
          <Typography sx={{ fontSize: 13, fontWeight: 700, color: landing.ink, mb: 1.25 }}>
            Team permissions
          </Typography>
          {[
            { name: "Ananya R.", role: "Can spend · Travel", status: "Active" },
            { name: "Vikram M.", role: "Approver · Ops", status: "Active" },
            { name: "Card · Marketing", role: "Frozen pending review", status: "Frozen" },
          ].map((row) => (
            <Stack
              key={row.name}
              direction="row"
              justifyContent="space-between"
              alignItems="center"
              sx={{ py: 1, borderBottom: `1px solid ${landing.line}`, "&:last-child": { borderBottom: 0 } }}
            >
              <Box>
                <Typography sx={{ fontSize: 13, fontWeight: 600, color: landing.ink }}>{row.name}</Typography>
                <Typography sx={{ fontSize: 11, color: landing.muted }}>{row.role}</Typography>
              </Box>
              <Box
                sx={{
                  px: 1.1,
                  py: 0.35,
                  borderRadius: 99,
                  fontSize: 11,
                  fontWeight: 700,
                  bgcolor: row.status === "Frozen" ? "#FEF3C7" : landing.greenSoft,
                  color: row.status === "Frozen" ? "#B45309" : landing.green,
                }}
              >
                {row.status}
              </Box>
            </Stack>
          ))}
        </Box>
      </Stack>
    </Box>
  );
}

export function ExpenseWorkflowMock() {
  return (
    <Box sx={{ ...panel, p: { xs: 2, md: 3 } }}>
      <Stack spacing={2}>
        <Stack direction={{ xs: "column", md: "row" }} spacing={2}>
          <Box
            sx={{
              flex: 1,
              p: 2,
              borderRadius: 2.5,
              border: `1px dashed ${landing.blue}`,
              bgcolor: landing.blueSoft,
              minHeight: 150,
              display: "flex",
              flexDirection: "column",
              justifyContent: "center",
              alignItems: "center",
              textAlign: "center",
              gap: 1,
            }}
          >
            <ReceiptLongOutlined sx={{ fontSize: 32, color: landing.blue }} />
            <Typography sx={{ fontWeight: 700, color: landing.ink, fontSize: 14 }}>Receipt uploaded</Typography>
            <Typography sx={{ fontSize: 12, color: landing.muted }}>IMG_2841.jpg · 1.2 MB</Typography>
          </Box>
          <Box sx={{ flex: 1.2, p: 2, borderRadius: 2.5, bgcolor: landing.wash }}>
            <Typography sx={{ fontSize: 12, fontWeight: 700, color: landing.ink, mb: 1.25 }}>
              Extracted fields
            </Typography>
            {[
              ["Merchant", "Indigo Airlines"],
              ["Amount", "₹8,420"],
              ["Date", "12 Sep 2026"],
              ["Category", "Travel"],
            ].map(([k, v]) => (
              <Stack key={k} direction="row" justifyContent="space-between" sx={{ py: 0.6 }}>
                <Typography sx={{ fontSize: 12, color: landing.muted }}>{k}</Typography>
                <Typography sx={{ fontSize: 12, fontWeight: 600, color: landing.ink }}>{v}</Typography>
              </Stack>
            ))}
          </Box>
        </Stack>
        <Stack direction={{ xs: "column", sm: "row" }} spacing={1.5}>
          <Box sx={{ flex: 1, p: 1.75, borderRadius: 2, bgcolor: landing.greenSoft }}>
            <Typography sx={{ fontSize: 11, color: landing.green, fontWeight: 700 }}>APPROVAL</Typography>
            <Typography sx={{ fontSize: 14, fontWeight: 700, color: landing.ink, mt: 0.5 }}>Approved</Typography>
            <Typography sx={{ fontSize: 12, color: landing.muted }}>Reimburse ₹8,420</Typography>
          </Box>
          <Box sx={{ flex: 1, p: 1.75, borderRadius: 2, bgcolor: "#FEF3C7" }}>
            <Typography sx={{ fontSize: 11, color: "#B45309", fontWeight: 700 }}>POLICY</Typography>
            <Typography sx={{ fontSize: 14, fontWeight: 700, color: landing.ink, mt: 0.5 }}>
              Within limit
            </Typography>
            <Typography sx={{ fontSize: 12, color: landing.muted }}>Travel cap ₹15,000 / trip</Typography>
          </Box>
        </Stack>
      </Stack>
    </Box>
  );
}

export function VendorPayMock() {
  return (
    <Box sx={{ ...panel, p: { xs: 2, md: 3 } }}>
      <Stack direction="row" justifyContent="space-between" alignItems="center" sx={{ mb: 2 }}>
        <Typography sx={{ fontWeight: 700, color: landing.ink }}>Invoice queue</Typography>
        <Typography sx={{ fontSize: 13, fontWeight: 700, color: landing.blue }}>Payable ₹6,42,000</Typography>
      </Stack>
      <Stack spacing={1.25}>
        {[
          { vendor: "Nova Logistics", amount: "₹1,85,000", step: "Maker reviewed", pct: 50 },
          { vendor: "Pixel Studio", amount: "₹72,400", step: "Checker pending", pct: 75 },
          { vendor: "OfficeMart", amount: "₹28,900", step: "Scheduled", pct: 90 },
        ].map((inv) => (
          <Box key={inv.vendor} sx={{ p: 1.75, borderRadius: 2, bgcolor: landing.wash }}>
            <Stack direction="row" justifyContent="space-between" sx={{ mb: 1 }}>
              <Box>
                <Typography sx={{ fontSize: 13, fontWeight: 700, color: landing.ink }}>{inv.vendor}</Typography>
                <Typography sx={{ fontSize: 11, color: landing.muted }}>{inv.step}</Typography>
              </Box>
              <Typography sx={{ fontSize: 13, fontWeight: 700, color: landing.ink }}>{inv.amount}</Typography>
            </Stack>
            <LinearProgress
              variant="determinate"
              value={inv.pct}
              sx={{
                height: 6,
                borderRadius: 99,
                bgcolor: "#fff",
                "& .MuiLinearProgress-bar": { bgcolor: landing.blue, borderRadius: 99 },
              }}
            />
          </Box>
        ))}
      </Stack>
      <Box sx={{ mt: 2, p: 1.5, borderRadius: 2, border: `1px solid ${landing.line}` }}>
        <Typography sx={{ fontSize: 12, fontWeight: 700, color: landing.ink, mb: 1 }}>
          Approval timeline
        </Typography>
        <Stack direction="row" spacing={1} alignItems="center">
          {["Submitted", "Maker", "Checker", "Paid"].map((s, i) => (
            <Stack key={s} direction="row" alignItems="center" spacing={1} sx={{ flex: 1 }}>
              <Box
                sx={{
                  width: 22,
                  height: 22,
                  borderRadius: "50%",
                  bgcolor: i < 3 ? landing.blue : landing.line,
                  color: i < 3 ? "#fff" : landing.muted,
                  fontSize: 11,
                  fontWeight: 700,
                  display: "grid",
                  placeItems: "center",
                }}
              >
                {i + 1}
              </Box>
              <Typography sx={{ fontSize: 11, color: landing.muted, display: { xs: "none", sm: "block" } }}>
                {s}
              </Typography>
            </Stack>
          ))}
        </Stack>
      </Box>
    </Box>
  );
}

export function AnalyticsMock() {
  return (
    <Box sx={{ ...panel, p: { xs: 2, md: 3 } }}>
      <Stack spacing={2}>
        <Stack direction={{ xs: "column", sm: "row" }} spacing={2}>
          <Box sx={{ flex: 1.4 }}>
            <Typography sx={{ fontSize: 13, fontWeight: 700, color: landing.ink, mb: 1 }}>
              Cash flow (90 days)
            </Typography>
            <MiniBar values={[30, 45, 38, 60, 52, 70, 64, 78, 72, 88]} color={landing.green} />
          </Box>
          <Box sx={{ flex: 1, display: "flex", gap: 1.5, alignItems: "center" }}>
            <Donut />
            <Stack spacing={0.4}>
              <Typography sx={{ fontSize: 13, fontWeight: 700, color: landing.ink }}>Category mix</Typography>
              <Typography sx={{ fontSize: 11, color: landing.muted }}>Travel 42% · SaaS 26%</Typography>
              <Typography sx={{ fontSize: 11, color: landing.muted }}>Vendors 17% · Other 15%</Typography>
            </Stack>
          </Box>
        </Stack>
        <Box sx={{ overflowX: "auto" }}>
          <Box component="table" sx={{ width: "100%", borderCollapse: "collapse", minWidth: 360 }}>
            <Box component="thead">
              <Box component="tr" sx={{ textAlign: "left" }}>
                {["Activity", "Amount", "Status"].map((h) => (
                  <Box
                    component="th"
                    key={h}
                    sx={{
                      fontSize: 11,
                      color: landing.muted,
                      fontWeight: 700,
                      pb: 1,
                      borderBottom: `1px solid ${landing.line}`,
                    }}
                  >
                    {h}
                  </Box>
                ))}
              </Box>
            </Box>
            <Box component="tbody">
              {[
                ["Payroll transfer", "₹12,40,000", "Synced"],
                ["Vendor batch", "₹3,18,200", "Exported"],
                ["Card settlement", "₹2,05,600", "Posted"],
              ].map((row) => (
                <Box component="tr" key={row[0]}>
                  {row.map((cell, i) => (
                    <Box
                      component="td"
                      key={cell}
                      sx={{
                        py: 1.1,
                        fontSize: 12,
                        fontWeight: i === 0 ? 650 : 500,
                        color: i === 2 ? landing.green : landing.ink,
                        borderBottom: `1px solid ${landing.line}`,
                      }}
                    >
                      {cell}
                    </Box>
                  ))}
                </Box>
              ))}
            </Box>
          </Box>
        </Box>
      </Stack>
    </Box>
  );
}
