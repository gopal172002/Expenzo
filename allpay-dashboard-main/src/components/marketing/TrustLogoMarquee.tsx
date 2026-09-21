import { Box, Stack, Typography } from "@mui/material";
import { useState } from "react";
import { landing } from "./landingTokens";

export type TrustBrand = {
  name: string;
  /** Primary logo URL from the web */
  logo: string;
  /** Local fallback if the remote logo fails */
  fallback: string;
};

function BrandMark({ brand }: { brand: TrustBrand }) {
  const [src, setSrc] = useState(brand.logo);
  const [failed, setFailed] = useState(false);

  return (
    <Box
      sx={{
        flex: "0 0 auto",
        width: { xs: 168, md: 190 },
        height: { xs: 76, md: 84 },
        px: 2.5,
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        borderRadius: 2.5,
        border: `1px solid ${landing.line}`,
        bgcolor: "#fff",
        boxShadow: "0 1px 2px rgba(7, 26, 47, 0.04)",
      }}
    >
      {failed ? (
        <Typography
          sx={{
            fontFamily: landing.fontDisplay,
            fontWeight: 700,
            fontSize: 14,
            color: landing.navyMid,
            textAlign: "center",
          }}
        >
          {brand.name}
        </Typography>
      ) : (
        <Box
          component="img"
          src={src}
          alt={`${brand.name} logo`}
          loading="lazy"
          decoding="async"
          onError={() => {
            if (src !== brand.fallback) {
              setSrc(brand.fallback);
            } else {
              setFailed(true);
            }
          }}
          sx={{
            maxWidth: "100%",
            maxHeight: { xs: 36, md: 42 },
            width: "auto",
            height: "auto",
            objectFit: "contain",
          }}
        />
      )}
    </Box>
  );
}

type Props = {
  brands: TrustBrand[];
};

/** Infinite right-to-left logo marquee. */
export function TrustLogoMarquee({ brands }: Props) {
  const loop = [...brands, ...brands];

  return (
    <Box
      aria-label="Customer logos"
      sx={{
        position: "relative",
        overflow: "hidden",
        borderRadius: 3,
        border: `1px solid ${landing.line}`,
        bgcolor: landing.wash,
        py: { xs: 2, md: 2.5 },
        mb: { xs: 3, md: 4 },
        maskImage: "linear-gradient(90deg, transparent, #000 8%, #000 92%, transparent)",
        WebkitMaskImage: "linear-gradient(90deg, transparent, #000 8%, #000 92%, transparent)",
      }}
    >
      <Stack
        className="trust-marquee-track"
        direction="row"
        spacing={1.5}
        sx={{
          width: "max-content",
          animation: "trustMarquee 38s linear infinite",
          "&:hover": { animationPlayState: "paused" },
        }}
      >
        {loop.map((brand, i) => (
          <BrandMark key={`${brand.name}-${i}`} brand={brand} />
        ))}
      </Stack>
    </Box>
  );
}
