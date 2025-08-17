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
  isVerified: z.boolean().default(false),
  isRevoVendMember: z.boolean().default(false),
});

const searchBusinessSchema = z.object({
  query: z.string().min(1),
  location: z.string().optional(),
});

export const addBusinessToDirectoryProcedure = protectedProcedure
  .input(addBusinessSchema)
  .mutation(async ({ input, ctx }: { input: any; ctx: any }) => {
    console.log("Adding business to directory:", input);
    
    if (ctx.user.role !== "event_host") {
      throw new Error("Only event hosts can add businesses to directory");
    }
    
    try {
      const business = await businessDirectoryRepo.addBusinessToDirectory({
        ...input,
        addedBy: ctx.user.id,
      });
      
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
        input.location
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