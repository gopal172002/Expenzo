import CheckCircleOutline from "@mui/icons-material/CheckCircleOutline";
import LocalGasStationOutlined from "@mui/icons-material/LocalGasStationOutlined";
import QrCodeScanner from "@mui/icons-material/QrCodeScanner";
import ReceiptLongOutlined from "@mui/icons-material/ReceiptLongOutlined";
import RestaurantOutlined from "@mui/icons-material/RestaurantOutlined";
import WarningAmberOutlined from "@mui/icons-material/WarningAmberOutlined";
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
          background: `conic-gradient(${landing.blue} 0 38%, ${landing.green} 38% 64%, #F59E0B 64% 82%, #CBD5E1 82% 100%)`,
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
        <Typography sx={{ fontSize: 11, fontWeight: 700, color: landing.ink }}>UPI</Typography>
      </Box>
    </Box>
  );
}

function StatusPill({ label, tone }: { label: string; tone: "ok" | "warn" | "live" }) {
  const map = {
    ok: { bg: landing.greenSoft, fg: landing.green },
    warn: { bg: "#FEF3C7", fg: "#B45309" },
    live: { bg: landing.greenSoft, fg: landing.green },
  } as const;
  return (
    <Box
      sx={{
        px: 1.1,
        py: 0.35,
        borderRadius: 99,
        bgcolor: map[tone].bg,
        color: map[tone].fg,
        fontSize: 11,
        fontWeight: 700,
        whiteSpace: "nowrap",
      }}
    >
      {label}
    </Box>
  );
}

/** Finance dashboard: every UPI spend, verified and categorized. */
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
      <Stack spacing={1.5}>
        <Stack direction="row" justifyContent="space-between" alignItems="center" sx={{ px: 0.5 }}>
          <Typography sx={{ color: landing.muted, fontSize: 12, fontWeight: 600 }}>
            Business expense dashboard
          </Typography>
          <StatusPill label="Live UPI" tone="live" />
        </Stack>

        <Box sx={{ ...insetPanel, p: 2 }}>
          <Typography sx={{ fontSize: 12, color: landing.muted, fontWeight: 600 }}>
            Tracked UPI spend this month
          </Typography>
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
            ₹4,86,240
          </Typography>
          <Typography sx={{ fontSize: 12, color: landing.muted, mt: 0.75 }}>
            128 payments · 31 employees · auto-reconciled
          </Typography>
        </Box>

        <Stack direction={{ xs: "column", sm: "row" }} spacing={1.5}>
          {[
            { label: "Verified", value: "94", hint: "Payment + receipt matched" },
            { label: "Needs review", value: "7", hint: "Policy or attendance flag" },
            { label: "Pending receipt", value: "4", hint: "UPI paid, bill missing" },
          ].map((tile) => (
            <Box key={tile.label} sx={{ ...insetPanel, p: 1.5, flex: 1 }}>
              <Typography sx={{ fontSize: 11, color: landing.muted, fontWeight: 600 }}>{tile.label}</Typography>
              <Typography sx={{ fontSize: 20, fontWeight: 700, color: landing.ink, mt: 0.25 }}>{tile.value}</Typography>
              <Typography sx={{ fontSize: 10, color: landing.muted, mt: 0.4 }}>{tile.hint}</Typography>
            </Box>
          ))}
        </Stack>

        <Stack direction={{ xs: "column", sm: "row" }} spacing={1.5}>
          <Box sx={{ ...insetPanel, p: 1.75, flex: 1.2 }}>
            <Typography sx={{ fontSize: 12, fontWeight: 700, color: landing.ink, mb: 1.25 }}>
              Spend by week
            </Typography>
            <MiniBar values={[42, 55, 38, 62, 48, 71, 58, 80]} />
          </Box>
          <Box sx={{ ...insetPanel, p: 1.75, flex: 1, display: "flex", gap: 1.5, alignItems: "center" }}>
            <Donut />
            <Stack spacing={0.5}>
              <Typography sx={{ fontSize: 12, fontWeight: 700, color: landing.ink }}>Locked by purpose</Typography>
              {[
                { l: "Fuel 38%", c: landing.blue },
                { l: "Meals 26%", c: landing.green },
                { l: "Travel 18%", c: "#F59E0B" },
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
            Every UPI spend, as it happens
          </Typography>
          <Stack spacing={1}>
            {[
              {
                icon: <LocalGasStationOutlined sx={{ fontSize: 16, color: landing.blue }} />,
                title: "HP Petrol · Fuel",
                meta: "₹2,400 · UPI matched · Verified",
              },
              {
                icon: <RestaurantOutlined sx={{ fontSize: 16, color: landing.green }} />,
                title: "Cafe Madras · Meals",
                meta: "₹680 · Receipt + policy OK",
              },
              {
                icon: <WarningAmberOutlined sx={{ fontSize: 16, color: "#B45309" }} />,
                title: "Indigo · Travel",
                meta: "₹8,420 · Attendance conflict",
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

/** Employee phone: scan QR and pay with the UPI app they already use. */
export function PhonePayMock() {
  return (
    <Box
      sx={{
        width: 260,
        mx: "auto",
        borderRadius: "36px",
        border: `10px solid ${landing.navy}`,
        bgcolor: "#fff",
        boxShadow: landing.shadow,
        overflow: "hidden",
      }}
    >
      <Box sx={{ bgcolor: landing.navy, color: "#fff", px: 2, pt: 1.5, pb: 2 }}>
        <Typography sx={{ fontSize: 11, opacity: 0.7, fontWeight: 600 }}>AllPay · Pay at work</Typography>
        <Typography sx={{ fontFamily: landing.fontDisplay, fontWeight: 700, fontSize: 18, mt: 0.5 }}>
          Scan & pay on UPI
        </Typography>
      </Box>
      <Stack spacing={1.5} sx={{ p: 2 }}>
        <Box
          sx={{
            borderRadius: 2,
            border: `1.5px dashed ${landing.blue}`,
            bgcolor: landing.blueSoft,
            height: 120,
            display: "grid",
            placeItems: "center",
          }}
        >
          <Stack alignItems="center" spacing={0.75}>
            <QrCodeScanner sx={{ fontSize: 36, color: landing.blue }} />
            <Typography sx={{ fontSize: 12, fontWeight: 700, color: landing.navy }}>Merchant QR</Typography>
          </Stack>
        </Box>
        <Box sx={{ ...insetPanel, p: 1.5 }}>
          <Typography sx={{ fontSize: 11, color: landing.muted }}>Paying</Typography>
          <Typography sx={{ fontWeight: 700, color: landing.ink }}>Cafe Madras</Typography>
          <Typography sx={{ fontFamily: landing.fontDisplay, fontSize: 22, fontWeight: 700, color: landing.navy }}>
            ₹680
          </Typography>
          <Typography sx={{ fontSize: 11, color: landing.muted, mt: 0.5 }}>Purpose locked · Meals</Typography>
        </Box>
        <Box
          sx={{
            py: 1.15,
            borderRadius: 2,
            bgcolor: landing.blue,
            color: "#fff",
            textAlign: "center",
            fontSize: 13,
            fontWeight: 700,
          }}
        >
          Pay with PhonePe / GPay
        </Box>
        <Typography sx={{ fontSize: 10, color: landing.muted, textAlign: "center" }}>
          Same UPI apps. Expense recorded instantly.
        </Typography>
      </Stack>
    </Box>
  );
}

export function PolicyLockMock() {
  return (
    <Box sx={{ ...panel, p: { xs: 2, md: 3 } }}>
      <Typography sx={{ fontSize: 13, fontWeight: 700, color: landing.ink, mb: 2 }}>
        Lock spend to a purpose before anyone pays
      </Typography>
      <Stack spacing={1.25}>
        {[
          { cat: "Fuel", lock: "Petrol pumps only", cap: "₹3,000 / txn · ₹40,000 / mo", used: 62 },
          { cat: "Meals", lock: "Food & restaurants", cap: "₹500 / txn · ₹8,000 / mo", used: 44 },
          { cat: "Travel", lock: "Weekdays · travel MCC", cap: "₹15,000 / trip", used: 28 },
          { cat: "Office", lock: "Stationery & supplies", cap: "₹2,000 / txn", used: 18 },
        ].map((row) => (
          <Box key={row.cat} sx={{ p: 1.75, borderRadius: 2, bgcolor: landing.wash }}>
            <Stack direction="row" justifyContent="space-between" alignItems="baseline" sx={{ mb: 0.75 }}>
              <Box>
                <Typography sx={{ fontSize: 14, fontWeight: 700, color: landing.ink }}>{row.cat}</Typography>
                <Typography sx={{ fontSize: 11, color: landing.muted }}>{row.lock}</Typography>
              </Box>
              <Typography sx={{ fontSize: 11, fontWeight: 700, color: landing.blue }}>{row.cap}</Typography>
            </Stack>
            <LinearProgress
              variant="determinate"
              value={row.used}
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
            <Typography sx={{ fontWeight: 700, color: landing.ink, fontSize: 14 }}>Receipt + UPI payment</Typography>
            <Typography sx={{ fontSize: 12, color: landing.muted }}>UPI Ref · 3248 1902 5512</Typography>
          </Box>
          <Box sx={{ flex: 1.2, p: 2, borderRadius: 2.5, bgcolor: landing.wash }}>
            <Typography sx={{ fontSize: 12, fontWeight: 700, color: landing.ink, mb: 1.25 }}>
              Captured automatically
            </Typography>
            {[
              ["Merchant", "Indigo Airlines"],
              ["Amount", "₹8,420"],
              ["Purpose", "Travel"],
              ["UPI app", "PhonePe"],
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
            <Typography sx={{ fontSize: 11, color: landing.green, fontWeight: 700 }}>PAYMENT MATCH</Typography>
            <Typography sx={{ fontSize: 14, fontWeight: 700, color: landing.ink, mt: 0.5 }}>UPI confirmed</Typography>
            <Typography sx={{ fontSize: 12, color: landing.muted }}>Claim equals the rupee paid</Typography>
          </Box>
          <Box sx={{ flex: 1, p: 1.75, borderRadius: 2, bgcolor: "#FEF3C7" }}>
            <Typography sx={{ fontSize: 11, color: "#B45309", fontWeight: 700 }}>NEEDS A LOOK</Typography>
            <Typography sx={{ fontSize: 14, fontWeight: 700, color: landing.ink, mt: 0.5 }}>
              Punched in at office
            </Typography>
            <Typography sx={{ fontSize: 12, color: landing.muted }}>Travel claim at 09:38 · ask why</Typography>
          </Box>
        </Stack>
      </Stack>
    </Box>
  );
}

export function VerificationMock() {
  return (
    <Box sx={{ ...panel, p: { xs: 2, md: 3 } }}>
      <Stack direction="row" justifyContent="space-between" alignItems="center" sx={{ mb: 2 }}>
        <Box>
          <Typography sx={{ fontWeight: 700, color: landing.ink }}>Automatic verification</Typography>
          <Typography sx={{ fontSize: 12, color: landing.muted }}>Seven checks before finance approves</Typography>
        </Box>
        <StatusPill label="Needs review" tone="warn" />
      </Stack>
      <Stack spacing={1}>
        {[
          { label: "UPI payment match", detail: "₹8,420 paid = ₹8,420 claimed", ok: true },
          { label: "Expense policy", detail: "Within ₹15,000 travel cap", ok: true },
          { label: "Attendance", detail: "Punched in 09:30–18:30", ok: false },
          { label: "Duplicate claim", detail: "UPI reference is unique", ok: true },
          { label: "Category vs MCC", detail: "Airline MCC matches Travel", ok: true },
        ].map((row) => (
          <Stack
            key={row.label}
            direction="row"
            spacing={1.25}
            alignItems="center"
            sx={{ p: 1.25, borderRadius: 2, bgcolor: landing.wash }}
          >
            {row.ok ? (
              <CheckCircleOutline sx={{ fontSize: 18, color: landing.green }} />
            ) : (
              <WarningAmberOutlined sx={{ fontSize: 18, color: "#B45309" }} />
            )}
            <Box sx={{ minWidth: 0, flex: 1 }}>
              <Typography sx={{ fontSize: 13, fontWeight: 700, color: landing.ink }}>{row.label}</Typography>
              <Typography sx={{ fontSize: 11, color: landing.muted }}>{row.detail}</Typography>
            </Box>
          </Stack>
        ))}
      </Stack>
    </Box>
  );
}

export function ReconciliationMock() {
  return (
    <Box sx={{ ...panel, p: { xs: 2, md: 3 } }}>
      <Typography sx={{ fontWeight: 700, color: landing.ink, mb: 2 }}>
        One record: payment, receipt, verdict
      </Typography>
      <Box sx={{ overflowX: "auto" }}>
        <Box component="table" sx={{ width: "100%", borderCollapse: "collapse", minWidth: 380 }}>
          <Box component="thead">
            <Box component="tr" sx={{ textAlign: "left" }}>
              {["Expense", "UPI", "Receipt", "Verdict"].map((h) => (
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
              ["HP Petrol · ₹2,400", "Matched", "On file", "Verified"],
              ["Cafe Madras · ₹680", "Matched", "On file", "Approved"],
              ["OfficeMart · ₹1,150", "Matched", "On file", "Synced"],
            ].map((row) => (
              <Box component="tr" key={row[0]}>
                {row.map((cell, i) => (
                  <Box
                    component="td"
                    key={`${row[0]}-${cell}`}
                    sx={{
                      py: 1.15,
                      fontSize: 12,
                      fontWeight: i === 0 ? 650 : 500,
                      color: i === 0 ? landing.ink : landing.green,
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
      <Box sx={{ mt: 2, p: 1.5, borderRadius: 2, bgcolor: landing.blueSoft }}>
        <Typography sx={{ fontSize: 13, fontWeight: 700, color: landing.navy }}>
          Month-end is a dashboard, not an Excel chase.
        </Typography>
        <Typography sx={{ fontSize: 12, color: landing.muted, mt: 0.5 }}>
          Export every UPI reference, merchant, category, and approval — already tied together.
        </Typography>
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
              Team spend (90 days)
            </Typography>
            <MiniBar values={[30, 45, 38, 60, 52, 70, 64, 78, 72, 88]} color={landing.green} />
          </Box>
          <Box sx={{ flex: 1, display: "flex", gap: 1.5, alignItems: "center" }}>
            <Donut />
            <Stack spacing={0.4}>
              <Typography sx={{ fontSize: 13, fontWeight: 700, color: landing.ink }}>Purpose mix</Typography>
              <Typography sx={{ fontSize: 11, color: landing.muted }}>Fuel 38% · Meals 26%</Typography>
              <Typography sx={{ fontSize: 11, color: landing.muted }}>Travel 18% · Office 18%</Typography>
            </Stack>
          </Box>
        </Stack>
      </Stack>
    </Box>
  );
}

/** @deprecated Use PolicyLockMock — kept so older imports do not break. */
export const CardsControlMock = PolicyLockMock;
/** @deprecated Use ReconciliationMock */
export const VendorPayMock = ReconciliationMock;
