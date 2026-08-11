import { matchMunicipioFromLabels } from '../data/municipios';

interface NominatimAddress {
  city?: string;
  town?: string;
  municipality?: string;
  city_district?: string;
  county?: string;
  state_district?: string;
  state?: string;
}

interface NominatimReverseResponse {
  address?: NominatimAddress;
}

/** Resolve municipio from coordinates using OSM Nominatim (requires network). */
export async function reverseGeocodeMunicipio(
  lat: number,
  lng: number
): Promise<string | null> {
  try {
    const url = new URL('https://nominatim.openstreetmap.org/reverse');
    url.searchParams.set('lat', String(lat));
    url.searchParams.set('lon', String(lng));
    url.searchParams.set('format', 'json');
    url.searchParams.set('addressdetails', '1');
    url.searchParams.set('accept-language', 'es');

    const res = await fetch(url.toString(), {
      headers: {
        Accept: 'application/json',
        'Accept-Language': 'es',
        'User-Agent': 'ColombiaDePie/1.0 (shelter registry; contact: colombiadepie.com)',
      },
    });

    if (!res.ok) return null;

    const data = (await res.json()) as NominatimReverseResponse;
    const addr = data.address;
    if (!addr) return null;

    return matchMunicipioFromLabels([
      addr.city,
      addr.town,
      addr.municipality,
      addr.city_district,
      addr.county,
      addr.state_district,
      addr.state,
    ]);
  } catch {
    return null;
  }
}
