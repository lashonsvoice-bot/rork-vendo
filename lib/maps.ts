import { trpcClient } from '@/lib/trpc';

export interface GeocodeSelection {
  description: string;
  placeId?: string;
  lat?: number;
  lng?: number;
  address?: string;
}

export async function geocodeAddress(address: string): Promise<GeocodeSelection | null> {
  try {
    const res = await trpcClient.maps.geocode.query({ address });
    const best = res.results[0];
    if (!best) return null;
    return {
      description: best.formatted_address,
      placeId: best.place_id,
      lat: best.geometry.location.lat,
      lng: best.geometry.location.lng,
      address: best.formatted_address,
    };
  } catch (e) {
    console.log('[lib/maps] geocodeAddress error', e);
    return null;
  }
}

export async function geocodePlaceId(placeId: string): Promise<GeocodeSelection | null> {
  try {
    const res = await trpcClient.maps.geocode.query({ placeId });
    const best = res.results[0];
    if (!best) return null;
    return {
      description: best.formatted_address,
      placeId: best.place_id,
      lat: best.geometry.location.lat,
      lng: best.geometry.location.lng,
      address: best.formatted_address,
    };
  } catch (e) {
    console.log('[lib/maps] geocodePlaceId error', e);
    return null;
  }
}
