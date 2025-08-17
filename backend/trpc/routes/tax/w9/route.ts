import { z } from "zod";
import { protectedProcedure } from "../../../create-context";
import { taxRepo } from "../../../../db/tax-repo";

const entityTypeSchema = z.enum(["individual", "sole_proprietor", "partnership", "c_corp", "s_corp", "llc", "other"]);

const w9FormSchema = z.object({
  contractorId: z.string(),
  businessName: z.string().optional(),
  individualName: z.string(),
  federalTaxClassification: entityTypeSchema,
  otherEntityDescription: z.string().optional(),
  payeeAddress: z.object({
    street: z.string(),
    city: z.string(),
    state: z.string(),
    zipCode: z.string(),
  }),
  accountNumbers: z.array(z.string()).optional(),
  taxpayerIdNumber: z.string(),
  isBackupWithholdingSubject: z.boolean(),
  certificationDate: z.string(),
  status: z.enum(["pending", "submitted", "verified", "rejected"]),
  documentUrl: z.string().optional(),
});

export const submitW9Procedure = protectedProcedure
  .input(w9FormSchema.omit({ status: true }))
  .mutation(async ({ input }) => {
    console.log("Submitting W-9 form for contractor:", input.contractorId);
    
    const form = await taxRepo.submitW9Form({
      ...input,
      status: "submitted",
    });
    
    console.log("W-9 form submitted successfully:", form.id);
    return form;
  });

export const getW9Procedure = protectedProcedure
  .input(z.object({ contractorId: z.string() }))
  .query(async ({ input }) => {
    console.log("Getting W-9 form for contractor:", input.contractorId);
    
    const form = await taxRepo.getW9ByContractor(input.contractorId);
    
    console.log("W-9 form retrieved:", form ? "found" : "not found");
    return form;
  });

export const updateW9StatusProcedure = protectedProcedure
  .input(z.object({
    id: z.string(),
    status: z.enum(["pending", "submitted", "verified", "rejected"]),
    rejectionReason: z.string().optional(),
  }))
  .mutation(async ({ input }) => {
    console.log("Updating W-9 status:", input.id, "to", input.status);
    
    const updated = await taxRepo.updateW9Status(input.id, input.status, input.rejectionReason);
    
    if (!updated) {
      throw new Error("W-9 form not found");
    }
    
    console.log("W-9 status updated successfully");
    return updated;
  });