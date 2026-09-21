import {PermissionsAndroid, Platform} from 'react-native';
import Geolocation from 'react-native-geolocation-service';
import type {LocationPoint} from '../types';

const CAPTURE_TIMEOUT_MS = 12_000;
const MAX_AGE_MS = 15_000;

export type LocationCaptureResult = {
  location: LocationPoint;
  /** Human-readable reason when location is null (never thrown). */
  reason?:
    | 'disabled'
    | 'permission_denied'
    | 'unavailable'
    | 'timeout'
    | 'error';
};

async function requestLocationPermission(): Promise<boolean> {
  if (Platform.OS === 'ios') {
    const status = await Geolocation.requestAuthorization('whenInUse');
    return status === 'granted' || status === 'restricted';
  }

  if (Platform.OS === 'android') {
    const already = await PermissionsAndroid.check(
      PermissionsAndroid.PERMISSIONS.ACCESS_FINE_LOCATION,
    );
    if (already) {
      return true;
    }
    const result = await PermissionsAndroid.request(
      PermissionsAndroid.PERMISSIONS.ACCESS_FINE_LOCATION,
      {
        title: 'Location permission',
        message:
          'AllPay needs a one-time GPS snapshot when you confirm a payment. Location is not tracked in the background.',
        buttonPositive: 'Allow',
        buttonNegative: 'Deny',
      },
    );
    return result === PermissionsAndroid.RESULTS.GRANTED;
  }

  return false;
}

function readCurrentPosition(): Promise<LocationPoint> {
  return new Promise(resolve => {
    Geolocation.getCurrentPosition(
      position => {
        const {latitude, longitude} = position.coords;
        if (
          !Number.isFinite(latitude) ||
          !Number.isFinite(longitude) ||
          Math.abs(latitude) > 90 ||
          Math.abs(longitude) > 180
        ) {
          resolve(null);
          return;
        }
        resolve({
          latitude,
          longitude,
          capturedAt: new Date().toISOString(),
        });
      },
      () => resolve(null),
      {
        enableHighAccuracy: true,
        timeout: CAPTURE_TIMEOUT_MS,
        maximumAge: MAX_AGE_MS,
        forceRequestLocation: true,
        showLocationDialog: true,
      },
    );
  });
}

/**
 * One-shot GPS capture for payment confirmation.
 * Never throws — returns null coordinates so payment can continue.
 */
export async function capturePaymentLocationSnapshot(
  enabled: boolean,
): Promise<LocationCaptureResult> {
  if (!enabled) {
    return {location: null, reason: 'disabled'};
  }

  try {
    const granted = await requestLocationPermission();
    if (!granted) {
      return {location: null, reason: 'permission_denied'};
    }

    const location = await Promise.race([
      readCurrentPosition(),
      new Promise<null>(resolve => {
        setTimeout(() => resolve(null), CAPTURE_TIMEOUT_MS + 500);
      }),
    ]);

    if (!location) {
      return {location: null, reason: 'unavailable'};
    }
    return {location};
  } catch {
    return {location: null, reason: 'error'};
  }
}

/** Flatten LocationPoint into HTTP body fields (null-safe). */
export function locationToPaymentPayload(location: LocationPoint): {
  latitude: number | null;
  longitude: number | null;
  locationCapturedAt: string | null;
} {
  if (!location) {
    return {latitude: null, longitude: null, locationCapturedAt: null};
  }
  return {
    latitude: location.latitude,
    longitude: location.longitude,
    locationCapturedAt: location.capturedAt,
  };
}
