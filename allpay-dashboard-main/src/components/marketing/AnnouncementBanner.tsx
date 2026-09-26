import ArrowForward from "@mui/icons-material/ArrowForward";
import { Box, Container, Link, Stack, Typography } from "@mui/material";
import { Link as RouterLink } from "react-router-dom";
import { landing } from "./landingTokens";

export function AnnouncementBanner() {
  return (
    <Box
      component="aside"
      aria-label="Product announcement"
      sx={{
        bgcolor: landing.navy,
        color: "#fff",
        py: 1,
        borderBottom: "1px solid rgba(255,255,255,0.08)",
      }}
    >
      <Container maxWidth="lg">
        <Stack
          direction={{ xs: "column", sm: "row" }}
          alignItems="center"
          justifyContent="center"
          spacing={{ xs: 0.5, sm: 1.5 }}
          textAlign="center"
        >
          <Typography
            sx={{
              fontFamily: landing.fontBody,
              fontSize: { xs: 13, sm: 14 },
              fontWeight: 500,
              letterSpacing: "0.01em",
            }}
          >
            Business expenses on UPI - lock the purpose, track every rupee, reconcile automatically.
          </Typography>
          <Link
            component={RouterLink}
            to="/signup"
            underline="none"
            sx={{
              display: "inline-flex",
              alignItems: "center",
              gap: 0.5,
              color: "#93C5FD",
              fontWeight: 700,
              fontSize: { xs: 13, sm: 14 },
              fontFamily: landing.fontBody,
              "&:hover": { color: "#fff" },
              "&:focus-visible": {
                outline: "2px solid #93C5FD",
                outlineOffset: 2,
                borderRadius: 1,
              },
            }}
          >
            Sign up now
            <ArrowForward sx={{ fontSize: 16 }} />
          </Link>
        </Stack>
      </Container>
    </Box>
  );
}
