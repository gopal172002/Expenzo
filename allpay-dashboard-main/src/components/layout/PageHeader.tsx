import { Box, Stack, Typography } from "@mui/material";
import type { ReactNode } from "react";
import { ADMIN } from "../../theme";

export function PageHeader({
  title,
  description,
  actions,
  breadcrumbs,
}: {
  title: string;
  description?: string;
  actions?: ReactNode;
  breadcrumbs?: ReactNode;
}) {
  return (
    <Stack spacing={1.25}>
      {breadcrumbs}
      <Stack
        direction={{ xs: "column", sm: "row" }}
        spacing={1.5}
        justifyContent="space-between"
        alignItems={{ xs: "stretch", sm: "flex-start" }}
      >
        <Box sx={{ minWidth: 0, flex: 1 }}>
          <Typography
            variant="h5"
            component="h1"
            sx={{ color: ADMIN.accent.navy, fontWeight: 700, letterSpacing: "-0.02em" }}
          >
            {title}
          </Typography>
          {description ? (
            <Typography
              variant="body2"
              sx={{
                mt: 0.5,
                maxWidth: 720,
                lineHeight: 1.55,
                color: ADMIN.text.secondary,
              }}
            >
              {description}
            </Typography>
          ) : null}
        </Box>
        {actions ? (
          <Box
            sx={{
              flexShrink: 0,
              display: "flex",
              flexWrap: "wrap",
              gap: 1,
              alignItems: "center",
              justifyContent: { xs: "flex-start", sm: "flex-end" },
            }}
          >
            {actions}
          </Box>
        ) : null}
      </Stack>
    </Stack>
  );
}
