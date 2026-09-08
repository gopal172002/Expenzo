import Close from "@mui/icons-material/Close";
import ReceiptLongOutlined from "@mui/icons-material/ReceiptLongOutlined";
import ZoomIn from "@mui/icons-material/ZoomIn";
import {
  Box,
  Dialog,
  DialogContent,
  DialogTitle,
  IconButton,
  Typography,
} from "@mui/material";
import { useState } from "react";
import { receiptSrc } from "../../utils/receiptSrc";

export function ReceiptImage({
  url,
  alt,
  height = 220,
  expandable = true,
  /** `contain` keeps a fixed box (letterboxes). `width` fills the card width with no side gaps. */
  fit = "contain",
}: {
  url?: string | null;
  alt: string;
  height?: number;
  expandable?: boolean;
  fit?: "contain" | "width";
}) {
  const src = receiptSrc(url);
  const [failed, setFailed] = useState(false);
  const [open, setOpen] = useState(false);
  const fillWidth = fit === "width";

  if (!src || failed) {
    return (
      <Box
        sx={{
          height: fillWidth ? 220 : height,
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          justifyContent: "center",
          bgcolor: "#f1f5f9",
          color: "text.secondary",
          gap: 0.5,
          borderRadius: 2,
        }}
      >
        <ReceiptLongOutlined />
        <Typography variant="caption">{src ? "Receipt failed to load" : "No receipt image"}</Typography>
      </Box>
    );
  }

  return (
    <>
      <Box
        role={expandable ? "button" : undefined}
        tabIndex={expandable ? 0 : undefined}
        aria-label={expandable ? `View full ${alt}` : undefined}
        onClick={expandable ? () => setOpen(true) : undefined}
        onKeyDown={
          expandable
            ? (e) => {
                if (e.key === "Enter" || e.key === " ") {
                  e.preventDefault();
                  setOpen(true);
                }
              }
            : undefined
        }
        sx={{
          position: "relative",
          width: "100%",
          height: fillWidth ? undefined : height,
          bgcolor: fillWidth ? "transparent" : "#fffaf5",
          cursor: expandable ? "zoom-in" : "default",
          overflow: "hidden",
          borderRadius: 0,
          border: "none",
          "&:hover .receipt-zoom-hint": expandable ? { opacity: 1 } : undefined,
        }}
      >
        <Box
          sx={{
            width: "100%",
            height: fillWidth ? undefined : "100%",
            maxHeight: fillWidth ? { xs: 520, lg: 640 } : undefined,
            overflow: fillWidth ? "auto" : "hidden",
          }}
        >
          <Box
            component="img"
            src={src}
            alt={alt}
            onError={() => setFailed(true)}
            sx={
              fillWidth
                ? {
                    width: "100%",
                    height: "auto",
                    display: "block",
                    pointerEvents: "none",
                  }
                : {
                    width: "100%",
                    height: "100%",
                    objectFit: "contain",
                    display: "block",
                    pointerEvents: "none",
                  }
            }
          />
        </Box>
        {expandable && (fillWidth || height >= 120) ? (
          <Box
            className="receipt-zoom-hint"
            sx={{
              position: "absolute",
              right: 8,
              bottom: 8,
              zIndex: 1,
              display: "flex",
              alignItems: "center",
              gap: 0.5,
              px: 1,
              py: 0.5,
              borderRadius: 1,
              bgcolor: "rgba(15, 23, 42, 0.72)",
              color: "#fff",
              opacity: 0.85,
              transition: "opacity 0.15s ease",
              pointerEvents: "none",
            }}
          >
            <ZoomIn sx={{ fontSize: 16 }} />
            <Typography variant="caption" fontWeight={600}>
              Click to enlarge
            </Typography>
          </Box>
        ) : null}
      </Box>

      <Dialog
        open={open}
        onClose={() => setOpen(false)}
        fullWidth
        maxWidth="lg"
        PaperProps={{
          sx: {
            height: { xs: "100%", sm: "92vh" },
            maxHeight: { xs: "100%", sm: "92vh" },
            m: { xs: 0, sm: 2 },
            borderRadius: { xs: 0, sm: 2 },
          },
        }}
      >
        <DialogTitle
          sx={{
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            gap: 1,
            py: 1.5,
            pr: 1,
          }}
        >
          <Typography component="span" variant="h6" fontWeight={700} noWrap>
            {alt}
          </Typography>
          <IconButton aria-label="Close receipt preview" onClick={() => setOpen(false)} edge="end">
            <Close />
          </IconButton>
        </DialogTitle>
        <DialogContent
          dividers
          sx={{
            p: 0,
            bgcolor: "#0f172a",
            display: "flex",
            overflow: "auto",
          }}
        >
          <Box
            component="img"
            src={src}
            alt={alt}
            sx={{
              display: "block",
              width: "100%",
              height: "auto",
              maxWidth: "100%",
              objectFit: "contain",
              margin: "auto",
              bgcolor: "#fff",
            }}
          />
        </DialogContent>
      </Dialog>
    </>
  );
}
