type GoogleMapsApi = {
  maps: {
    Map: new (
      el: HTMLElement,
      opts: {
        center: { lat: number; lng: number };
        zoom: number;
        mapTypeControl?: boolean;
        streetViewControl?: boolean;
        fullscreenControl?: boolean;
        zoomControl?: boolean;
      }
    ) => { setCenter: (c: { lat: number; lng: number }) => void };
    Marker: new (opts: {
      position: { lat: number; lng: number };
      map: unknown;
      title?: string;
    }) => unknown;
  };
};

declare global {
  interface Window {
    google?: GoogleMapsApi;
    __allpayGoogleMapsCb?: () => void;
  }
}

let mapsPromise: Promise<GoogleMapsApi> | null = null;

/**
 * Loads the official Google Maps JavaScript API once per page session.
 */
export function loadGoogleMapsApi(apiKey: string): Promise<GoogleMapsApi> {
  if (typeof window === "undefined") {
    return Promise.reject(new Error("Google Maps can only load in the browser"));
  }
  if (window.google?.maps) {
    return Promise.resolve(window.google);
  }
  if (mapsPromise) {
    return mapsPromise;
  }
  if (!apiKey.trim()) {
    return Promise.reject(new Error("Missing Google Maps API key"));
  }

  mapsPromise = new Promise<GoogleMapsApi>((resolve, reject) => {
    const existing = document.querySelector<HTMLScriptElement>("script[data-allpay-gmaps]");
    if (existing) {
      const check = () => {
        if (window.google?.maps) {
          resolve(window.google);
        } else {
          reject(new Error("Google Maps script present but API unavailable"));
        }
      };
      if (window.google?.maps) {
        resolve(window.google);
        return;
      }
      existing.addEventListener("load", check);
      existing.addEventListener("error", () => reject(new Error("Failed to load Google Maps")));
      return;
    }

    const callbackName = "__allpayGoogleMapsCb";
    window[callbackName] = () => {
      delete window[callbackName];
      if (window.google?.maps) {
        resolve(window.google);
      } else {
        reject(new Error("Google Maps loaded without maps namespace"));
      }
    };

    const script = document.createElement("script");
    script.dataset.allpayGmaps = "1";
    script.async = true;
    script.defer = true;
    script.src = `https://maps.googleapis.com/maps/api/js?key=${encodeURIComponent(apiKey)}&callback=${callbackName}`;
    script.onerror = () => {
      mapsPromise = null;
      delete window[callbackName];
      reject(new Error("Failed to load Google Maps script"));
    };
    document.head.appendChild(script);
  });

  return mapsPromise;
}
