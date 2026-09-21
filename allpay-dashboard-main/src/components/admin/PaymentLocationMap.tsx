import LocationOnOutlined from "@mui/icons-material/LocationOnOutlined";
import { Box, CircularProgress, Typography } from "@mui/material";
import { useEffect, useRef, useState } from "react";
import { ADMIN } from "../../theme";
import { loadGoogleMapsApi } from "../../utils/loadGoogleMaps";

export type PaymentLocationCoords = {
  latitude: number;
  longitude: number;
  locationCapturedAt?: string | null;
};

type Props = {
  coords: PaymentLocationCoords | null;
  loading?: boolean;
  height?: number | string;
};

function LocationUnavailable({ detail }: { detail?: string }) {
  return (
    <Box
      sx={{
        position: "relative",
        minHeight: 200,
        height: "100%",
        overflow: "hidden",
        bgcolor: ADMIN.surface.subtle,
        backgroundImage: `
          linear-gradient(rgba(148,163,184,0.25) 1px, transparent 1px),
          linear-gradient(90deg, rgba(148,163,184,0.25) 1px, transparent 1px)
        `,
        backgroundSize: "28px 28px",
        display: "flex",
        alignItems: "flex-end",
      }}
    >
      <Box
        sx={{
          m: 1.5,
          px: 1.25,
          py: 1,
          bgcolor: "rgba(255,255,255,0.95)",
          border: "1px solid",
          borderColor: "divider",
          borderRadius: 1,
          width: "100%",
        }}
      >
        <Box sx={{ display: "flex", alignItems: "center", gap: 0.75, mb: 0.25 }}>
          <LocationOnOutlined sx={{ fontSize: 18, color: "text.secondary" }} />
          <Typography variant="body2" fontWeight={700}>
            Location data unavailable for this transaction
          </Typography>
        </Box>
        <Typography variant="caption" color="text.secondary">
          {detail ??
            "The employee denied location permission, disabled GPS capture, or the device could not provide a fix."}
        </Typography>
      </Box>
    </Box>
  );
}

/**
 * Static Google Map with a single marker for the payment GPS snapshot.
 */
export function PaymentLocationMap({ coords, loading = false, height = 220 }: Props) {
  const mapRef = useRef<HTMLDivElement | null>(null);
  const [mapError, setMapError] = useState<string | null>(null);
  const [mapReady, setMapReady] = useState(false);
  const apiKey = (import.meta.env.VITE_GOOGLE_MAPS_API_KEY as string | undefined)?.trim() ?? "";

  useEffect(() => {
    if (!coords || !apiKey) {
      setMapReady(false);
      return;
    }

    let cancelled = false;
    setMapError(null);
    setMapReady(false);

    void (async () => {
      try {
        const google = await loadGoogleMapsApi(apiKey);
        if (cancelled || !mapRef.current) return;

        const center = { lat: coords.latitude, lng: coords.longitude };
        const map = new google.maps.Map(mapRef.current, {
          center,
          zoom: 16,
          mapTypeControl: false,
          streetViewControl: false,
          fullscreenControl: true,
          zoomControl: true,
        });
        new google.maps.Marker({
          position: center,
          map,
          title: "Payment location",
        });
        if (!cancelled) setMapReady(true);
      } catch (err) {
        if (!cancelled) {
          setMapError((err as Error).message || "Could not load map");
          setMapReady(false);
        }
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [apiKey, coords]);

  if (loading) {
    return (
      <Box
        sx={{
          minHeight: height,
          height: "100%",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          bgcolor: ADMIN.surface.subtle,
        }}
      >
        <CircularProgress size={28} />
      </Box>
    );
  }

  if (!coords) {
    return <LocationUnavailable />;
  }

  if (!apiKey) {
    return (
      <LocationUnavailable detail="Set VITE_GOOGLE_MAPS_API_KEY to display the payment location map." />
    );
  }

  if (mapError) {
    return <LocationUnavailable detail={mapError} />;
  }

  return (
    <Box sx={{ position: "relative", minHeight: height, height: "100%" }}>
      <Box
        ref={mapRef}
        role="img"
        aria-label={`Payment location at ${coords.latitude.toFixed(5)}, ${coords.longitude.toFixed(5)}`}
        sx={{
          width: "100%",
          minHeight: height,
          height: "100%",
          borderRadius: 1,
          overflow: "hidden",
          border: "1px solid",
          borderColor: "divider",
          bgcolor: ADMIN.surface.subtle,
        }}
      />
      {!mapReady ? (
        <Box
          sx={{
            position: "absolute",
            inset: 0,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            bgcolor: "rgba(248,250,252,0.7)",
          }}
        >
          <CircularProgress size={28} />
        </Box>
      ) : null}
      <Box sx={{ mt: 1 }}>
        <Typography variant="caption" color="text.secondary" sx={{ fontFamily: "ui-monospace, monospace" }}>
          {coords.latitude.toFixed(6)}, {coords.longitude.toFixed(6)}
          {coords.locationCapturedAt ? ` · ${coords.locationCapturedAt}` : ""}
        </Typography>
      </Box>
    </Box>
  );
}
