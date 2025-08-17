import { z } from "zod";
import { protectedProcedure } from "@/backend/trpc/create-context";
import { businessDirectoryRepo } from "@/backend/db/business-directory-repo";

const addBusinessSchema = z.object({
  businessName: z.string().min(1),
  ownerName: z.string().min(1),
  email: z.string().email(),
  phone: z.string().min(1),
  businessType: z.string().min(1),
  description: z.string().min(1),
  website: z.string().optional(),
  location: z.string().min(1),
  latitude: z.number().optional(),
  longitude: z.number().optional(),
  zipCode: z.string().optional(),
  state: z.string().optional(),
  city: z.string().optional(),
  isVerified: z.boolean().default(false),
  isRevoVendMember: z.boolean().default(false),
});

const searchBusinessSchema = z.object({
  query: z.string().min(1),
  location: z.string().optional(),
  userLat: z.number().optional(),
  userLon: z.number().optional(),
  maxDistance: z.number().optional(),
});

const searchByDistanceSchema = z.object({
  userLat: z.number(),
  userLon: z.number(),
  maxDistance: z.number(),
  businessType: z.string().optional(),
});

// Geocoding function to get coordinates from address
async function geocodeAddress(address: string): Promise<{ lat: number; lon: number } | null> {
  try {
    // Using a free geocoding service (you can replace with your preferred service)
    const response = await fetch(
      `https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(address)}&limit=1`
    );
    const data = await response.json();
    
    if (data && data.length > 0) {
      return {
        lat: parseFloat(data[0].lat),
        lon: parseFloat(data[0].lon)
      };
    }
    return null;
  } catch (error) {
    console.error('Geocoding error:', error);
    return null;
  }
}

export const addBusinessToDirectoryProcedure = protectedProcedure
  .input(addBusinessSchema)
  .mutation(async ({ input, ctx }: { input: any; ctx: any }) => {
    console.log("Adding business to directory:", input);
    
    if (ctx.user.role !== "event_host") {
      throw new Error("Only event hosts can add businesses to directory");
    }
    
    try {
      let businessData = {
        ...input,
        addedBy: ctx.user.id,
      };
      
      // If coordinates not provided, try to geocode the location
      if (!input.latitude || !input.longitude) {
        const coords = await geocodeAddress(input.location);
        if (coords) {
          businessData.latitude = coords.lat;
          businessData.longitude = coords.lon;
        }
      }
      
      const business = await businessDirectoryRepo.addBusinessToDirectory(businessData);
      
      console.log("Business added to directory:", business.id);
      return business;
    } catch (error) {
      console.error("Error adding business to directory:", error);
      throw error;
    }
  });

export const searchBusinessDirectoryProcedure = protectedProcedure
  .input(searchBusinessSchema)
  .query(async ({ input, ctx }: { input: any; ctx: any }) => {
    console.log("Searching business directory:", input);
    
    if (ctx.user.role !== "event_host" && ctx.user.role !== "business_owner") {
      throw new Error("Only hosts and business owners can search directory");
    }
    
    try {
      const results = await businessDirectoryRepo.searchBusinessDirectory(
        input.query,
        input.location,
        input.userLat,
        input.userLon,
        input.maxDistance
      );
      
      console.log(`Found ${results.length} businesses`);
      return results;
    } catch (error) {
      console.error("Error searching business directory:", error);
      throw error;
    }
  });

export const getBusinessDirectoryProcedure = protectedProcedure
  .query(async ({ ctx }: { ctx: any }) => {
    console.log("Getting business directory");
    
    if (ctx.user.role !== "event_host" && ctx.user.role !== "business_owner") {
      throw new Error("Only hosts and business owners can view directory");
    }
    
    try {
      const businesses = await businessDirectoryRepo.readBusinessDirectory();
      console.log(`Retrieved ${businesses.length} businesses from directory`);
      return businesses;
    } catch (error) {
      console.error("Error getting business directory:", error);
      throw error;
    }
  });

export const searchBusinessesByDistanceProcedure = protectedProcedure
  .input(searchByDistanceSchema)
  .query(async ({ input, ctx }: { input: any; ctx: any }) => {
    console.log("Searching businesses by distance:", input);
    
    if (ctx.user.role !== "event_host" && ctx.user.role !== "business_owner") {
      throw new Error("Only hosts and business owners can search directory");
    }
    
    try {
      const results = await businessDirectoryRepo.searchBusinessesByDistance(
        input.userLat,
        input.userLon,
        input.maxDistance,
        input.businessType
      );
      
      console.log(`Found ${results.length} businesses within ${input.maxDistance} miles`);
      return results;
    } catch (error) {
      console.error("Error searching businesses by distance:", error);
      throw error;
    }
  });