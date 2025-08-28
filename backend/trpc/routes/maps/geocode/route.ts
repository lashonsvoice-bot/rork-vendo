import { z } from "zod";
import { protectedProcedure } from "../../../create-context";
import { config } from "../../../../config/env";

const inputSchema = z.object({
  placeId: z.string().optional(),
  address: z.string().optional(),
});

const locationSchema = z.object({
  lat: z.number(),
  lng: z.number(),
});

const geocodeResultSchema = z.object({
  formatted_address: z.string(),
  place_id: z.string(),
  geometry: z.object({
    location: locationSchema,
  }),
});

export type GeocodeResult = z.infer<typeof geocodeResultSchema>;

export default protectedProcedure
  .input(inputSchema.refine((v) => !!v.placeId || !!v.address, {
    message: "Provide placeId or address",
  }))
  .query(async ({ input }) => {
    if (!config.google?.mapsApiKey) {
      throw new Error("Google Maps API key is not configured");
    }

    const params = new URLSearchParams();
    params.set("key", config.google.mapsApiKey);
    if (input.placeId) params.set("place_id", input.placeId);
    if (input.address) params.set("address", input.address);

    const url = `https://maps.googleapis.com/maps/api/geocode/json?${params.toString()}`;

    try {
      const res = await fetch(url);
      if (!res.ok) {
        throw new Error(`Geocoding failed: ${res.status}`);
      }
      const data = (await res.json()) as {
        status: string;
        results?: unknown[];
        error_message?: string;
      };

      if (data.status !== "OK" && data.status !== "ZERO_RESULTS") {
        throw new Error(data.error_message || `Geocoding error: ${data.status}`);
      }

      const results = (data.results ?? []).map((r) => geocodeResultSchema.parse(r));
      return { results };
    } catch (e) {
      console.error("[maps.geocode] error", e);
      throw e;
    }
  });