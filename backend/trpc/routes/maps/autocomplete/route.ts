import { z } from "zod";
import { protectedProcedure } from "../../../create-context";
import { config } from "../../../../config/env";

const inputSchema = z.object({
  query: z.string().min(1),
  sessionToken: z.string().optional(),
  locationBias: z
    .object({
      lat: z.number(),
      lng: z.number(),
      radiusMeters: z.number().optional(),
    })
    .optional(),
});

const predictionSchema = z.object({
  description: z.string(),
  place_id: z.string(),
  structured_formatting: z
    .object({
      main_text: z.string(),
      secondary_text: z.string().optional(),
    })
    .optional(),
});

export type PlacesPrediction = z.infer<typeof predictionSchema>;

export default protectedProcedure
  .input(inputSchema)
  .query(async ({ input }) => {
    if (!config.google?.mapsApiKey) {
      throw new Error("Google Maps API key is not configured");
    }

    try {
      const params = new URLSearchParams();
      params.set("input", input.query);
      params.set("types", "geocode");
      params.set("key", config.google.mapsApiKey);
      if (input.sessionToken) params.set("sessiontoken", input.sessionToken);
      if (input.locationBias) {
        const { lat, lng } = input.locationBias;
        params.set("location", `${lat},${lng}`);
        if (input.locationBias.radiusMeters) params.set("radius", String(input.locationBias.radiusMeters));
      }

      const url = `https://maps.googleapis.com/maps/api/place/autocomplete/json?${params.toString()}`;
      const res = await fetch(url);
      if (!res.ok) {
        throw new Error(`Autocomplete failed: ${res.status}`);
      }
      const data = (await res.json()) as {
        status: string;
        predictions?: unknown[];
        error_message?: string;
      };

      if (data.status !== "OK" && data.status !== "ZERO_RESULTS") {
        throw new Error(data.error_message || `Autocomplete error: ${data.status}`);
      }

      const predictions = (data.predictions ?? []).map((p) => predictionSchema.parse(p));
      return { predictions };
    } catch (e) {
      console.error("[maps.autocomplete] error", e);
      throw e;
    }
  });