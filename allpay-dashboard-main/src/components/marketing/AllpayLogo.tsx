import { Box, Stack, Typography } from "@mui/material";
import { landing } from "./landingTokens";

type Props = {
  size?: "sm" | "md" | "lg";
  inverted?: boolean;
};

const sizes = {
  sm: { mark: 28, text: 18 },
  md: { mark: 34, text: 22 },
  lg: { mark: 44, text: 28 },
};

export function AllpayLogo({ size = "md", inverted = false }: Props) {
  const s = sizes[size];
  const fg = inverted ? "#fff" : landing.navy;

  return (
    <Stack direction="row" alignItems="center" spacing={1} sx={{ textDecoration: "none", color: "inherit" }}>
      <Box
        aria-hidden
        sx={{
          width: s.mark,
          height: s.mark,
          borderRadius: 1.5,
          background: inverted
            ? "linear-gradient(145deg, #3B82F6 0%, #1B6EF5 55%, #0E9F6E 120%)"
            : "linear-gradient(145deg, #1B6EF5 0%, #0C2744 70%)",
          display: "grid",
          placeItems: "center",
          boxShadow: inverted ? "none" : "0 6px 16px rgba(27, 110, 245, 0.28)",
          flexShrink: 0,
        }}
      >
        <Box
          sx={{
            width: "46%",
            height: "46%",
            borderRadius: 0.6,
            border: "2px solid #fff",
            borderTopColor: "transparent",
            borderLeftColor: "transparent",
            transform: "rotate(-45deg) translateY(-8%)",
          }}
        />
      </Box>
      <Typography
        component="span"
        sx={{
          fontFamily: landing.fontDisplay,
          fontWeight: 700,
          fontSize: s.text,
          letterSpacing: "-0.04em",
          color: fg,
          lineHeight: 1,
        }}
      >
        allpay
      </Typography>
    </Stack>
  );
}
