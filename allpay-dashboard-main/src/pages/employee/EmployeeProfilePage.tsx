import BadgeOutlined from "@mui/icons-material/BadgeOutlined";
import BusinessOutlined from "@mui/icons-material/BusinessOutlined";
import EmailOutlined from "@mui/icons-material/EmailOutlined";
import PersonOutline from "@mui/icons-material/PersonOutline";
import PhoneOutlined from "@mui/icons-material/PhoneOutlined";
import WorkOutline from "@mui/icons-material/WorkOutline";
import {
  Avatar,
  Box,
  Button,
  Link,
  Stack,
  Table,
  TableBody,
  TableCell,
  TableRow,
  Typography,
} from "@mui/material";
import type { SvgIconComponent } from "@mui/icons-material";
import { Link as RouterLink, useNavigate } from "react-router-dom";
import { useAuth } from "../../context/AuthContext";
import { useEmployeeData } from "../../context/EmployeeDataContext";

function initialsOf(name: string): string {
  const parts = name.replace(/@.*/, "").split(/[\s._-]+/).filter(Boolean);
  if (parts.length === 0) return "E";
  return (parts[0]![0]! + (parts[1]?.[0] ?? "")).toUpperCase();
}

function titleCase(value: string): string {
  if (!value) return "—";
  return value.charAt(0).toUpperCase() + value.slice(1);
}

const rowCell = {
  borderColor: "#E8EAED",
  py: 1.75,
  px: 0,
  verticalAlign: "middle" as const,
};

export function EmployeeProfilePage() {
  const navigate = useNavigate();
  const { user, signOut } = useAuth();
  const { employee, transactions, summary } = useEmployeeData();

  const name = employee?.name ?? user?.fullName ?? "—";
  const email = employee?.email ?? user?.email ?? "—";
  const employeeId = employee?.id ?? user?.employeeId ?? "—";
  const department = employee?.department ?? user?.employeeDepartment ?? "—";
  const role = titleCase(employee?.role ?? user?.employeeRole ?? "employee");
  const phone = employee?.phone?.trim() || "—";
  const company = "Your company";
  const pendingCount = summary?.pendingReview ?? transactions.filter((t) => t.status === "pending").length;

  const rows: { label: string; value: string; icon: SvgIconComponent }[] = [
    { label: "Name", value: name, icon: PersonOutline },
    { label: "Email", value: email, icon: EmailOutlined },
    { label: "Employee ID", value: employeeId, icon: BadgeOutlined },
    { label: "Department", value: department, icon: BusinessOutlined },
    { label: "Role", value: role, icon: WorkOutline },
    { label: "Mobile", value: phone, icon: PhoneOutlined },
  ];

  const statusLine = [
    employee?.active === false ? "Inactive" : "Active",
    employee?.onboarded ? "Onboarding complete" : "Onboarding pending",
    employee?.travelApproved ? "Travel approved" : "Travel not approved",
  ].join("  ·  ");

  return (
    <Stack
      spacing={3.5}
      sx={{
        width: "100%",
        maxWidth: 760,
        mx: "auto",
        minWidth: 0,
        pt: { xs: 1, md: 2 },
      }}
    >
      <Stack direction="row" spacing={2.5} alignItems="center">
        <Avatar
          sx={{
            width: 72,
            height: 72,
            fontSize: 26,
            fontWeight: 700,
            bgcolor: "#1A73E8",
          }}
        >
          {initialsOf(name)}
        </Avatar>
        <Box sx={{ minWidth: 0, flex: 1 }}>
          <Typography
            sx={{
              fontSize: { xs: 24, sm: 28 },
              fontWeight: 500,
              letterSpacing: "-0.02em",
              color: "#202124",
              lineHeight: 1.2,
            }}
          >
            {name}
          </Typography>
          <Typography sx={{ mt: 0.4, fontSize: 14, color: "#5F6368" }}>
            {email}
          </Typography>
          <Typography sx={{ mt: 0.2, fontSize: 13, color: "#80868B" }}>
            {company} · {transactions.length} expenses · {pendingCount} pending
          </Typography>
        </Box>
        <Button
          component={RouterLink}
          to="/employee/transactions"
          variant="outlined"
          sx={{
            display: { xs: "none", sm: "inline-flex" },
            textTransform: "none",
            fontWeight: 600,
            borderColor: "#DADCE0",
            color: "#1A73E8",
            borderRadius: 5,
            px: 2,
            "&:hover": { borderColor: "#1A73E8", bgcolor: "#F8FBFF" },
          }}
        >
          My expenses
        </Button>
      </Stack>

      <Box>
        <Typography sx={{ fontSize: 14, fontWeight: 500, color: "#202124", mb: 1.25 }}>
          Basic info
        </Typography>
        <Box
          sx={{
            bgcolor: "#fff",
            borderRadius: 0,
            border: "1px solid #DADCE0",
            overflow: "hidden",
          }}
        >
          <Table sx={{ width: "100%" }}>
            <TableBody>
              {rows.map((row, index) => {
                const Icon = row.icon;
                const last = index === rows.length - 1;
                return (
                  <TableRow
                    key={row.label}
                    sx={{
                      "&:hover": { bgcolor: "#F8F9FA" },
                      "& td": { borderBottom: last ? "none" : "1px solid #E8EAED" },
                    }}
                  >
                    <TableCell sx={{ ...rowCell, width: { xs: 140, sm: 200 }, pl: 2.5 }}>
                      <Stack direction="row" spacing={1.25} alignItems="center">
                        <Icon sx={{ fontSize: 20, color: "#5F6368" }} />
                        <Typography sx={{ fontSize: 14, color: "#5F6368" }}>{row.label}</Typography>
                      </Stack>
                    </TableCell>
                    <TableCell sx={{ ...rowCell, pr: 2.5 }}>
                      <Typography sx={{ fontSize: 14, color: "#202124", fontWeight: 500, wordBreak: "break-word" }}>
                        {row.value}
                      </Typography>
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        </Box>
        <Typography sx={{ mt: 1.5, fontSize: 13, color: "#80868B" }}>{statusLine}</Typography>
      </Box>

      <Stack
        direction={{ xs: "column", sm: "row" }}
        spacing={{ xs: 1, sm: 3 }}
        alignItems={{ xs: "flex-start", sm: "center" }}
      >
        <Link component={RouterLink} to="/employee/receipts" underline="none" sx={{ fontSize: 14, fontWeight: 500, color: "#1A73E8" }}>
          My receipts
        </Link>
        <Link component={RouterLink} to="/employee/spend" underline="none" sx={{ fontSize: 14, fontWeight: 500, color: "#1A73E8" }}>
          My spend
        </Link>
        <Link component={RouterLink} to="/employee/activity" underline="none" sx={{ fontSize: 14, fontWeight: 500, color: "#1A73E8" }}>
          Activity & flags
        </Link>
        <Box sx={{ flex: 1 }} />
        <Button
          onClick={() => {
            signOut();
            navigate("/", { replace: true });
          }}
          sx={{ textTransform: "none", fontWeight: 500, color: "#D93025", px: 0 }}
        >
          Log out
        </Button>
      </Stack>
    </Stack>
  );
}
