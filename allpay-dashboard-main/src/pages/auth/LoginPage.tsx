import { useEffect, useState } from "react";
import { useLocation, useNavigate, Link as RouterLink } from "react-router-dom";
import {
  Alert,
  Box,
  Button,
  Container,
  Link,
  Paper,
  Stack,
  Tab,
  Tabs,
  TextField,
  Typography,
} from "@mui/material";
import AdminPanelSettingsOutlined from "@mui/icons-material/AdminPanelSettingsOutlined";
import BadgeOutlined from "@mui/icons-material/BadgeOutlined";
import { MarketingHeader } from "../../components/marketing/MarketingHeader";
import { useAuth } from "../../context/AuthContext";
import type { LoginPortal } from "../../types/auth";

export function LoginPage() {
  const { signIn, user, isReady } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const state = location.state as { from?: string; portal?: LoginPortal; employeeId?: string; email?: string } | null;
  const initialPortal: LoginPortal = state?.portal === "employee" ? "employee" : "admin";

  const [portal, setPortal] = useState<LoginPortal>(initialPortal);
  const [email, setEmail] = useState(state?.email ?? "");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [needPasswordSetup, setNeedPasswordSetup] = useState(false);
  const [setupEmail, setSetupEmail] = useState("");
  const [setupEmployeeId, setSetupEmployeeId] = useState("");
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!isReady || !user) return;
    if (user.portal === "employee" || (user.employeeId && !user.adminId)) {
      navigate("/employee", { replace: true });
      return;
    }
    if (user.adminId) {
      navigate("/admin", { replace: true });
    }
  }, [isReady, user, navigate]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setNeedPasswordSetup(false);
    setSetupEmail("");
    setSetupEmployeeId("");
    setLoading(true);

    const result = await signIn(email, password, portal);
    setLoading(false);
    if (!result.ok) {
      setError(result.message);
      const fail = result as { code?: string; employeeEmail?: string; employeeId?: string };
      if (fail.code === "NEED_PASSWORD_SETUP") {
        setNeedPasswordSetup(true);
        if (fail.employeeEmail) setSetupEmail(fail.employeeEmail);
        if (fail.employeeId) setSetupEmployeeId(fail.employeeId);
      }
      return;
    }
    const from = state?.from;
    if (portal === "employee") {
      navigate(from?.startsWith("/employee") ? from : "/employee", { replace: true });
      return;
    }
    navigate(from?.startsWith("/admin") ? from : "/admin", { replace: true });
  };

  return (
    <Box sx={{ minHeight: "100vh", bgcolor: "#fff" }}>
      <MarketingHeader />
      <Container maxWidth="sm" sx={{ py: 8 }}>
        <Paper elevation={0} sx={{ p: { xs: 3, sm: 5 }, border: "1px solid #eef2f6", borderRadius: 3 }}>
          <Typography variant="h5" fontWeight={800} gutterBottom>
            Log in to allpay
          </Typography>
          <Typography color="text.secondary" sx={{ mb: 2 }}>
            Choose your workspace — admin finance console or employee self-service.
          </Typography>

          <Tabs
            value={portal}
            onChange={(_, v) => setPortal(v as LoginPortal)}
            sx={{ mb: 3, borderBottom: 1, borderColor: "divider" }}
          >
            <Tab value="admin" icon={<AdminPanelSettingsOutlined />} iconPosition="start" label="Admin" />
            <Tab value="employee" icon={<BadgeOutlined />} iconPosition="start" label="Employee" />
          </Tabs>

          {portal === "admin" ? (
            <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
              Finance, HR, and auditors — approve transactions, policies, and exports.
            </Typography>
          ) : (
            <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
              Log in with your work email and password. Employee IDs (emp1, emp2, …) can be reused across
              companies, so email is the unique login.
            </Typography>
          )}

          {error ? (
            <Alert severity={needPasswordSetup ? "warning" : "error"} sx={{ mb: 2 }}>
              {error}
              {needPasswordSetup ? (
                <Box sx={{ mt: 1.5 }}>
                  <Button
                    component={RouterLink}
                    to="/employee/register"
                    state={{
                      complete: true,
                      employeeId: setupEmployeeId || undefined,
                      email: setupEmail || email.trim() || undefined,
                    }}
                    variant="outlined"
                    size="small"
                    sx={{ textTransform: "none" }}
                  >
                    Set password now
                  </Button>
                </Box>
              ) : null}
            </Alert>
          ) : null}
          <Box component="form" onSubmit={handleSubmit}>
            <Stack spacing={2}>
              <TextField
                label="Work email"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                fullWidth
                autoComplete="email"
              />
              <TextField
                label="Password"
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                fullWidth
                autoComplete="current-password"
              />
              <Button
                type="submit"
                variant="contained"
                size="large"
                disabled={loading}
                sx={{ textTransform: "none", mt: 1, bgcolor: "#5A58F2" }}
              >
                {loading ? "Signing in…" : portal === "admin" ? "Log in as Admin" : "Log in as Employee"}
              </Button>
            </Stack>
          </Box>
          {portal === "employee" ? (
            <>
              <Typography variant="caption" display="block" color="text.secondary" sx={{ mt: 2 }}>
                Demo: employee@demo.allpay.local / password123
              </Typography>
              <Typography sx={{ mt: 2 }} color="text.secondary">
                New employee?{" "}
                <Link component={RouterLink} to="/employee/register" fontWeight={700}>
                  Register
                </Link>
                {" · "}
                Have an ID but no password?{" "}
                <Link component={RouterLink} to="/employee/register" state={{ complete: true }} fontWeight={700}>
                  Complete setup
                </Link>
              </Typography>
            </>
          ) : (
            <>
              <Typography variant="caption" display="block" color="text.secondary" sx={{ mt: 2 }}>
                Demo admin: test@example.com / password123
              </Typography>
              <Typography sx={{ mt: 3 }} color="text.secondary">
                New to allpay?{" "}
                <Link component={RouterLink} to="/signup" fontWeight={700}>
                  Sign up your company
                </Link>
              </Typography>
            </>
          )}
        </Paper>
      </Container>
    </Box>
  );
}
