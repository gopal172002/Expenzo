import { useEffect, useMemo, useState } from "react";
import { useNavigate, Link as RouterLink } from "react-router-dom";
import ChevronLeft from "@mui/icons-material/ChevronLeft";
import ChevronRight from "@mui/icons-material/ChevronRight";
import KeyboardReturn from "@mui/icons-material/KeyboardReturn";
import {
  Alert,
  Box,
  Button,
  FormControl,
  FormControlLabel,
  Grid,
  IconButton,
  InputLabel,
  MenuItem,
  Radio,
  RadioGroup,
  Select,
  Stack,
  TextField,
  Typography,
  Link,
} from "@mui/material";
import { MarketingHeader } from "../../components/marketing/MarketingHeader";
import { useAuth } from "../../context/AuthContext";
import {
  COMPANY_SIZE_OPTIONS,
  COMPANY_TYPES,
  MONTHLY_SPEND_OPTIONS,
} from "../../types/auth";

const STEPS = 7;

const emailOk = (v: string) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v.trim());

const fieldError = (show: boolean, msg: string) => (show ? msg : "");

export function SignUpPage() {
  const { signUp, user, isReady } = useAuth();
  const navigate = useNavigate();
  const [step, setStep] = useState(0);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const [email, setEmail] = useState("");
  const [fullName, setFullName] = useState("");
  const [companyName, setCompanyName] = useState("");
  const [companySize, setCompanySize] = useState("");
  const [monthlySpend, setMonthlySpend] = useState("");
  const [companyType, setCompanyType] = useState("");
  const [jobTitle, setJobTitle] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");

  useEffect(() => {
    if (!isReady) return;
    if (user) navigate("/admin/transactions", { replace: true });
  }, [isReady, user, navigate]);

  const canNext = useMemo(() => {
    switch (step) {
      case 0:
        return emailOk(email);
      case 1:
        return fullName.trim().length >= 2;
      case 2:
        return companyName.trim().length >= 2;
      case 3:
        return Boolean(companySize);
      case 4:
        return Boolean(monthlySpend);
      case 5:
        return Boolean(companyType);
      case 6:
        return password.length >= 8 && password === confirmPassword;
      default:
        return false;
    }
  }, [step, email, fullName, companyName, companySize, monthlySpend, companyType, password, confirmPassword]);

  const goNext = () => {
    setError("");
    if (!canNext) {
      setError("Please complete this step before continuing.");
      return;
    }
    setStep((s) => Math.min(s + 1, STEPS - 1));
  };

  const goBack = () => {
    setError("");
    setStep((s) => Math.max(s - 1, 0));
  };

  const handleFinish = async () => {
    setError("");
    if (!canNext) {
      setError("Please fix the errors above.");
      return;
    }
    setLoading(true);
    const result = await signUp({
      email: email.trim().toLowerCase(),
      fullName: fullName.trim(),
      companyName: companyName.trim(),
      companySize,
      monthlySpend,
      companyType,
      password,
      jobTitle: jobTitle.trim() || undefined,
    });
    setLoading(false);
    if (!result.ok) {
      setError(result.message);
      return;
    }
    navigate("/admin/transactions", { replace: true });
  };

  return (
    <Box sx={{ minHeight: "100vh", bgcolor: "#fff" }}>
      <MarketingHeader />

      <Grid container sx={{ minHeight: "calc(100vh - 120px)" }}>
        <Grid
          item
          xs={12}
          md={4}
          sx={{
            display: { xs: "none", md: "flex" },
            flexDirection: "column",
            bgcolor: "#f8fafc",
            borderRight: "1px solid #eef2f6",
            p: 4,
          }}
        >
          <Typography variant="h6" fontWeight={800} sx={{ mb: 4, color: "#0f172a" }}>
            allpay
          </Typography>
          <Box sx={{ mb: 2, width: 48, height: 48, borderRadius: 1, bgcolor: "#111", color: "#fbbf24", display: "flex", alignItems: "center", justifyContent: "center", fontWeight: 800 }}>
            SW
          </Box>
          <Typography sx={{ color: "#334155", lineHeight: 1.75, fontSize: 16, mb: 3 }}>
            We struggled with tracking employee expenses and compiling monthly reports. allpay was able to{" "}
            <strong>streamline</strong> card expenses, reimbursements, and receipt management with an{" "}
            <strong>easy-to-use interface</strong>. We have been using them a while and have <strong>saved 10+ hours</strong> per week on
            expense management.
          </Typography>
          <Typography fontWeight={700} color="#0f172a">
            Vijay Khemka
          </Typography>
          <Typography variant="body2" color="text.secondary">
            Finance Manager
          </Typography>
        </Grid>

        <Grid item xs={12} md={8} sx={{ px: { xs: 2, sm: 4, md: 6 }, py: { xs: 4, md: 6 } }}>
          <Stack direction="row" spacing={1} sx={{ mb: 3 }}>
            <IconButton onClick={goBack} disabled={step === 0} size="small" sx={{ border: "1px solid #e2e8f0", borderRadius: 1 }}>
              <ChevronLeft />
            </IconButton>
            <IconButton onClick={goNext} disabled={!canNext || step === STEPS - 1} size="small" sx={{ border: "1px solid #e2e8f0", borderRadius: 1 }}>
              <ChevronRight />
            </IconButton>
          </Stack>

          {error ? (
            <Alert severity="error" sx={{ mb: 2 }}>
              {error}
            </Alert>
          ) : null}

          {step === 0 && (
            <Box>
              <Typography variant="h5" fontWeight={800} sx={{ mb: 3, color: "#0f172a" }}>
                Please enter your work email id
              </Typography>
              <TextField
                fullWidth
                label="What's your work email?"
                placeholder="e.g. yourname@company.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                error={email.length > 0 && !emailOk(email)}
                helperText={email.length > 0 && !emailOk(email) ? "Enter a valid work email" : " "}
                sx={{
                  "& .MuiOutlinedInput-root": {
                    borderRadius: 2,
                    bgcolor: email.length > 0 && !emailOk(email) ? "#fef2f2" : "transparent",
                  },
                }}
              />
            </Box>
          )}

          {step === 1 && (
            <Box>
              <Typography variant="h5" fontWeight={800} sx={{ mb: 3, color: "#0f172a" }}>
                What is your full name?
              </Typography>
              <TextField fullWidth label="Your name" value={fullName} onChange={(e) => setFullName(e.target.value)} error={fullName.length > 0 && fullName.trim().length < 2} helperText={fieldError(fullName.length > 0 && fullName.trim().length < 2, "This field is required")} />
            </Box>
          )}

          {step === 2 && (
            <Box>
              <Typography variant="h5" fontWeight={800} sx={{ mb: 3, color: "#0f172a" }}>
                What is your registered company name?
              </Typography>
              <TextField fullWidth label="Company legal name" value={companyName} onChange={(e) => setCompanyName(e.target.value)} error={companyName.length > 0 && companyName.trim().length < 2} helperText={fieldError(companyName.length > 0 && companyName.trim().length < 2, "This field is required")} />
            </Box>
          )}

          {step === 3 && (
            <Box>
              <Typography variant="h5" fontWeight={800} sx={{ mb: 3, color: "#0f172a" }}>
                What is the size of your company?
              </Typography>
              <FormControl fullWidth>
                <InputLabel id="size-label">Select company size</InputLabel>
                <Select labelId="size-label" label="Select company size" value={companySize} onChange={(e) => setCompanySize(e.target.value)}>
                  {COMPANY_SIZE_OPTIONS.map((opt) => (
                    <MenuItem key={opt} value={opt}>
                      {opt}
                    </MenuItem>
                  ))}
                </Select>
              </FormControl>
            </Box>
          )}

          {step === 4 && (
            <Box>
              <Typography variant="h5" fontWeight={800} sx={{ mb: 3, color: "#0f172a" }}>
                What is the average monthly spends of your company?
              </Typography>
              <FormControl fullWidth>
                <InputLabel id="spend-label">Select range</InputLabel>
                <Select labelId="spend-label" label="Select range" value={monthlySpend} onChange={(e) => setMonthlySpend(e.target.value)}>
                  {MONTHLY_SPEND_OPTIONS.map((opt) => (
                    <MenuItem key={opt} value={opt}>
                      {opt}
                    </MenuItem>
                  ))}
                </Select>
              </FormControl>
            </Box>
          )}

          {step === 5 && (
            <Box>
              <Typography variant="h5" fontWeight={800} sx={{ mb: 2, color: "#0f172a" }}>
                Please specify the type of company
              </Typography>
              <FormControl component="fieldset" fullWidth>
                <RadioGroup value={companyType} onChange={(e) => setCompanyType(e.target.value)}>
                  {COMPANY_TYPES.map((t) => (
                    <FormControlLabel key={t} value={t} control={<Radio />} label={t} sx={{ alignItems: "flex-start", ml: 0, "& .MuiFormControlLabel-label": { fontSize: 15, lineHeight: 1.5 } }} />
                  ))}
                </RadioGroup>
              </FormControl>
            </Box>
          )}

          {step === 6 && (
            <Box>
              <Typography variant="h5" fontWeight={800} sx={{ mb: 2, color: "#0f172a" }}>
                Almost done — secure your account
              </Typography>
              <Typography color="text.secondary" sx={{ mb: 2 }}>
                Set a password for your company admin login. You&apos;ll use this with your work email on the next screen.
              </Typography>
              <Stack spacing={2}>
                <TextField fullWidth label="Job title (optional)" value={jobTitle} onChange={(e) => setJobTitle(e.target.value)} />
                <TextField
                  fullWidth
                  label="Password"
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  error={password.length > 0 && password.length < 8}
                  helperText={password.length > 0 && password.length < 8 ? "At least 8 characters" : " "}
                />
                <TextField
                  fullWidth
                  label="Confirm password"
                  type="password"
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  error={confirmPassword.length > 0 && confirmPassword !== password}
                  helperText={confirmPassword.length > 0 && confirmPassword !== password ? "Passwords must match" : " "}
                />
              </Stack>
            </Box>
          )}

          <Stack direction="row" alignItems="center" spacing={2} sx={{ mt: 4 }}>
            {step < STEPS - 1 ? (
              <Button variant="contained" onClick={goNext} disabled={!canNext} sx={{ textTransform: "none", px: 3, bgcolor: "#5A58F2" }}>
                Next
              </Button>
            ) : (
              <Button variant="contained" onClick={handleFinish} disabled={!canNext || loading} sx={{ textTransform: "none", px: 3, bgcolor: "#5A58F2" }}>
                {loading ? "Creating account…" : "Create account"}
              </Button>
            )}
            <Stack direction="row" alignItems="center" spacing={0.5} color="text.secondary">
              <Typography variant="body2">enter</Typography>
              <KeyboardReturn fontSize="small" />
            </Stack>
          </Stack>

          <Typography sx={{ mt: 3 }} color="text.secondary">
            Already have an account?{" "}
            <Link component={RouterLink} to="/login" fontWeight={700} underline="hover">
              Log in
            </Link>
          </Typography>
        </Grid>
      </Grid>
    </Box>
  );
}
