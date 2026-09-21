/** Validated one-shot GPS snapshot attached to a payment / expense. */
export type PaymentLocationSnapshot = {
  latitude: number;
  longitude: number;
  locationCapturedAt: string;
};

export type MobileLocationShape = {
  latitude: number;
  longitude: number;
  capturedAt: string;
};

function asFiniteNumber(value: unknown): number | null {
  if (typeof value === "number" && Number.isFinite(value)) {
    return value;
  }
  if (typeof value === "string" && value.trim() !== "") {
    const n = Number(value);
    if (Number.isFinite(n)) return n;
  }
  return null;
}

function isValidLatLng(lat: number, lng: number): boolean {
  return Math.abs(lat) <= 90 && Math.abs(lng) <= 180;
}

/**
 * Parse optional location from a payment POST body.
 * Accepts top-level latitude/longitude or a nested `location` object.
 * Invalid or missing values resolve to null — never reject the payment.
 */
export function parsePaymentLocation(body: unknown): PaymentLocationSnapshot | null {
  if (!body || typeof body !== "object") {
    return null;
  }
  const raw = body as Record<string, unknown>;

  let latitude = asFiniteNumber(raw.latitude ?? raw.lat);
  let longitude = asFiniteNumber(raw.longitude ?? raw.lng ?? raw.lon);
  let capturedAt =
    (typeof raw.locationCapturedAt === "string" && raw.locationCapturedAt.trim()) ||
    (typeof raw.location_captured_at === "string" && raw.location_captured_at.trim()) ||
    null;

  const nested = raw.location;
  if (
    (latitude == null || longitude == null) &&
    nested &&
    typeof nested === "object" &&
    !Array.isArray(nested)
  ) {
    const loc = nested as Record<string, unknown>;
    latitude = latitude ?? asFiniteNumber(loc.latitude ?? loc.lat);
    longitude = longitude ?? asFiniteNumber(loc.longitude ?? loc.lng ?? loc.lon);
    if (!capturedAt) {
      capturedAt =
        (typeof loc.capturedAt === "string" && loc.capturedAt.trim()) ||
        (typeof loc.locationCapturedAt === "string" && loc.locationCapturedAt.trim()) ||
        (typeof loc.location_captured_at === "string" && loc.location_captured_at.trim()) ||
        null;
    }
  }

  if (latitude == null || longitude == null || !isValidLatLng(latitude, longitude)) {
    return null;
  }

  const iso =
    capturedAt && !Number.isNaN(Date.parse(capturedAt))
      ? new Date(capturedAt).toISOString()
      : new Date().toISOString();

  return {
    latitude,
    longitude,
    locationCapturedAt: iso,
  };
}

export function toMobileLocation(
  snapshot: PaymentLocationSnapshot | null | undefined
): MobileLocationShape | null {
  if (!snapshot) return null;
  return {
    latitude: snapshot.latitude,
    longitude: snapshot.longitude,
    capturedAt: snapshot.locationCapturedAt,
  };
}

/** Apply snapshot fields onto a mongoose-like document / plain object. */
export function applyLocationToRecord(
  target: {
    latitude?: number | null;
    longitude?: number | null;
    locationCapturedAt?: string | null;
    mobileLocation?: unknown;
  },
  snapshot: PaymentLocationSnapshot | null | undefined
): void {
  if (!snapshot) {
    return;
  }
  target.latitude = snapshot.latitude;
  target.longitude = snapshot.longitude;
  target.locationCapturedAt = snapshot.locationCapturedAt;
  target.mobileLocation = toMobileLocation(snapshot);
}

export function locationFieldsFromMobile(
  location: MobileLocationShape | null | undefined
): {
  latitude: number | null;
  longitude: number | null;
  locationCapturedAt: string | null;
  mobileLocation: MobileLocationShape | null;
} {
  if (
    !location ||
    typeof location.latitude !== "number" ||
    typeof location.longitude !== "number" ||
    !isValidLatLng(location.latitude, location.longitude)
  ) {
    return {
      latitude: null,
      longitude: null,
      locationCapturedAt: null,
      mobileLocation: null,
    };
  }
  const capturedAt =
    typeof location.capturedAt === "string" && location.capturedAt.trim()
      ? new Date(location.capturedAt).toISOString()
      : new Date().toISOString();
  const normalized: MobileLocationShape = {
    latitude: location.latitude,
    longitude: location.longitude,
    capturedAt,
  };
  return {
    latitude: normalized.latitude,
    longitude: normalized.longitude,
    locationCapturedAt: capturedAt,
    mobileLocation: normalized,
  };
}
