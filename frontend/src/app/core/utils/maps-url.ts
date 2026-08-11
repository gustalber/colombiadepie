/**
 * Extract lat/lng from Google Maps / OSM / plain coordinate strings.
 *
 * Important: in Google Maps share URLs, `@lat,lng` is often the *camera*
 * center, not the place pin. The pin is usually in `!3dLAT!4dLNG`
 * (especially after `!8m2`). Prefer pin coords over `@`.
 *
 * Short links (goo.gl / maps.app.goo.gl) cannot be resolved offline.
 */

export interface LatLng {
  lat: number;
  lng: number;
}

export function parseMapsLocation(input: string): LatLng | null {
  const value = decodeURIComponent(input.trim());
  if (!value) return null;

  // 1) Explicit place pin: !8m2!3dLAT!4dLNG
  const pin8m = value.match(/!8m2!3d(-?\d{1,3}\.\d+)!4d(-?\d{1,3}\.\d+)/);
  if (pin8m) {
    const coords = toLatLng(pin8m[1], pin8m[2]);
    if (coords) return coords;
  }

  // 2) Any !3dLAT!4dLNG — use the last match (usually the place)
  const pinMatches = [...value.matchAll(/!3d(-?\d{1,3}\.\d+)!4d(-?\d{1,3}\.\d+)/g)];
  if (pinMatches.length) {
    const last = pinMatches[pinMatches.length - 1];
    const coords = toLatLng(last[1], last[2]);
    if (coords) return coords;
  }

  // 3) Query / destination style params (actual target, not viewport)
  const queryPatterns: RegExp[] = [
    /[?&](?:q|query|destination)=(-?\d{1,3}\.\d+)\s*,\s*(-?\d{1,3}\.\d+)/i,
    /[?&]ll=(-?\d{1,3}\.\d+)\s*,\s*(-?\d{1,3}\.\d+)/i,
    /\/search\/(-?\d{1,3}\.\d+)\s*,\s*\+?(-?\d{1,3}\.\d+)/,
  ];
  for (const pattern of queryPatterns) {
    const match = value.match(pattern);
    if (!match) continue;
    const coords = toLatLng(match[1], match[2]);
    if (coords) return coords;
  }

  // 4) OSM hash
  const osm = value.match(/#map=\d+\/(-?\d{1,3}\.\d+)\/(-?\d{1,3}\.\d+)/);
  if (osm) {
    const coords = toLatLng(osm[1], osm[2]);
    if (coords) return coords;
  }

  // 5) Viewport center — last resort (@lat,lng,zoom)
  const viewport = value.match(/@(-?\d{1,3}\.\d+),\s*(-?\d{1,3}\.\d+)/);
  if (viewport) {
    const coords = toLatLng(viewport[1], viewport[2]);
    if (coords) return coords;
  }

  // 6) Plain "lat, lng"
  const plain = value.match(/^(-?\d{1,3}\.\d+)\s*,\s*(-?\d{1,3}\.\d+)$/);
  if (plain) {
    const coords = toLatLng(plain[1], plain[2]);
    if (coords) return coords;
  }

  return null;
}

function toLatLng(a: string, b: string): LatLng | null {
  const lat = Number(a);
  const lng = Number(b);
  if (
    Number.isFinite(lat) &&
    Number.isFinite(lng) &&
    lat >= -90 &&
    lat <= 90 &&
    lng >= -180 &&
    lng <= 180
  ) {
    return { lat, lng };
  }
  return null;
}

function looksLikeCoords(value: string): boolean {
  return /^-?\d{1,3}\.\d+\s*,\s*-?\d{1,3}\.\d+$/.test(value.trim());
}

function cleanMapsLabel(raw: string): string {
  return decodeURIComponent(raw.replace(/\+/g, ' '))
    .replace(/\s+/g, ' ')
    .trim();
}

/** Place name or address embedded in a Maps / OSM share URL (offline). */
export function parseMapsAddress(input: string): string | null {
  const value = decodeURIComponent(input.trim());
  if (!value) return null;

  const pathPatterns = [
    /\/place\/([^/?@]+)/i,
    /\/search\/([^/?@]+)/i,
  ];

  for (const pattern of pathPatterns) {
    const match = value.match(pattern);
    if (!match?.[1]) continue;
    const label = cleanMapsLabel(match[1]);
    if (label && !looksLikeCoords(label) && label.length > 2) {
      return label;
    }
  }

  const queryPatterns = [
    /[?&]q=([^&@#]+)/i,
    /[?&]query=([^&@#]+)/i,
    /[?&]destination=([^&@#]+)/i,
  ];

  for (const pattern of queryPatterns) {
    const match = value.match(pattern);
    if (!match?.[1]) continue;
    const label = cleanMapsLabel(match[1]);
    if (label && !looksLikeCoords(label) && label.length > 2) {
      return label;
    }
  }

  const dataPlace = value.match(/!2s([^!]+)/);
  if (dataPlace?.[1]) {
    const label = cleanMapsLabel(dataPlace[1]);
    if (label && !looksLikeCoords(label) && label.length > 2) {
      return label;
    }
  }

  return null;
}

export function isShortMapsLink(input: string): boolean {
  return /maps\.app\.goo\.gl|goo\.gl\/maps/i.test(input);
}

export interface DirectionsTarget {
  lat: number;
  lng: number;
  name?: string;
}

/** Links to open turn-by-turn in common navigation apps. */
export function buildDirectionsLinks(target: DirectionsTarget): {
  google: string;
  waze: string;
  apple: string;
  geo: string;
} {
  const { lat, lng } = target;
  const label = encodeURIComponent(target.name?.trim() || 'Destino');
  const dest = `${lat},${lng}`;
  return {
    google: `https://www.google.com/maps/dir/?api=1&destination=${encodeURIComponent(dest)}&travelmode=driving`,
    waze: `https://waze.com/ul?ll=${dest}&navigate=yes&q=${label}`,
    apple: `https://maps.apple.com/?daddr=${dest}&q=${label}`,
    // Lets the OS offer installed map apps (esp. Android)
    geo: `geo:${dest}?q=${dest}(${label})`,
  };
}

export function openExternalUrl(url: string): void {
  if (typeof window === 'undefined') return;
  window.open(url, '_blank', 'noopener,noreferrer');
}

