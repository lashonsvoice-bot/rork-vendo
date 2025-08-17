import { z } from "zod";
import { protectedProcedure } from "../../../create-context";
import { taxRepo } from "../../../../db/tax-repo";

export const generate1099Procedure = protectedProcedure
  .input(z.object({
    taxYear: z.number().int().min(2020).max(2030),
  }))
  .mutation(async ({ input }) => {
    console.log("Generating 1099 records for tax year:", input.taxYear);
    
    const records = await taxRepo.generate1099Records(input.taxYear);
    
    console.log("Generated", records.length, "1099 records");
    return records;
  });

export const update1099StatusProcedure = protectedProcedure
  .input(z.object({
    id: z.string(),
    status: z.enum(["draft", "generated", "sent", "filed"]),
    formUrl: z.string().optional(),
  }))
  .mutation(async ({ input }) => {
    console.log("Updating 1099 status:", input.id, "to", input.status);
    
    const updated = await taxRepo.update1099Status(input.id, input.status, input.formUrl);
    
    if (!updated) {
      throw new Error("1099 record not found");
    }
    
    console.log("1099 status updated successfully");
    return updated;
  });

export const getBusinessOwner1099sProcedure = protectedProcedure
  .input(z.object({
    businessOwnerId: z.string(),
    taxYear: z.number().int().optional(),
  }))
  .query(async ({ input }) => {
    console.log("Getting 1099s for business owner:", input.businessOwnerId, "tax year:", input.taxYear);
    
    const records = await taxRepo.get1099sByBusinessOwner(input.businessOwnerId, input.taxYear);
    
    console.log("Found", records.length, "1099 records");
    return records;
  });