import {
  locationFieldsFromMobile,
  parsePaymentLocation,
} from "../services/paymentLocation";

describe("parsePaymentLocation", () => {
  it("accepts top-level latitude/longitude", () => {
    const snap = parsePaymentLocation({
      latitude: 12.9716,
      longitude: 77.5946,
      locationCapturedAt: "2026-03-21T10:00:00.000Z",
    });
    expect(snap).toEqual({
      latitude: 12.9716,
      longitude: 77.5946,
      locationCapturedAt: "2026-03-21T10:00:00.000Z",
    });
  });

  it("accepts nested location object", () => {
    const snap = parsePaymentLocation({
      location: { latitude: 19.076, longitude: 72.8777, capturedAt: "2026-03-21T11:00:00.000Z" },
    });
    expect(snap?.latitude).toBe(19.076);
    expect(snap?.longitude).toBe(72.8777);
  });

  it("returns null for invalid coordinates without throwing", () => {
    expect(parsePaymentLocation({ latitude: 999, longitude: 1 })).toBeNull();
    expect(parsePaymentLocation({ latitude: null, longitude: null })).toBeNull();
    expect(parsePaymentLocation({})).toBeNull();
  });

  it("normalizes mobile location fields", () => {
    const fields = locationFieldsFromMobile({
      latitude: 28.6139,
      longitude: 77.209,
      capturedAt: "2026-03-21T12:00:00.000Z",
    });
    expect(fields.latitude).toBe(28.6139);
    expect(fields.mobileLocation?.capturedAt).toBe("2026-03-21T12:00:00.000Z");
  });
});
