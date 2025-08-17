import { z } from "zod";
import { protectedProcedure } from "../../../create-context";
import { taxRepo } from "../../../../db/tax-repo";
import { eventRepo } from "../../../../db/event-repo";

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
  .mutation(async ({ input, ctx }) => {
    console.log("Submitting W-9 form for contractor:", input.contractorId);
    
    const form = await taxRepo.submitW9Form({
      ...input,
      status: "submitted",
    });
    
    // Check if this contractor was needed for any events
    const events = await eventRepo.findByUserId(input.contractorId, 'contractor');
    const pendingW9Events = events.filter(event => 
      event.status === 'pending_w9_forms' && 
      event.contractorsNeedingW9?.includes(input.contractorId)
    );
    
    // Update events to remove this contractor from needing W9
    for (const event of pendingW9Events) {
      const updatedContractorsNeedingW9 = event.contractorsNeedingW9?.filter(id => id !== input.contractorId) || [];
      
      // Update contractor application to mark W9 as completed
      const updatedApplications = event.contractorApplications?.map(app => 
        app.contractorId === input.contractorId 
          ? { ...app, w9Required: false }
          : app
      ) || [];
      
      await eventRepo.update(event.id, {
        contractorsNeedingW9: updatedContractorsNeedingW9,
        contractorApplications: updatedApplications,
        status: updatedContractorsNeedingW9.length === 0 ? 'contractors_hired' : 'pending_w9_forms'
      });
    }
    
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

export const checkW9RequiredProcedure = protectedProcedure
  .input(z.object({ contractorId: z.string() }))
  .query(async ({ input }) => {
    console.log("Checking W-9 requirement for contractor:", input.contractorId);
    
    const events = await eventRepo.findByUserId(input.contractorId, 'contractor');
    const hasW9RequiredEvents = events.some(event => 
      event.contractorApplications?.some(app => 
        app.contractorId === input.contractorId && app.w9Required
      )
    );
    
    const w9Form = await taxRepo.getW9ByContractor(input.contractorId);
    const hasValidW9 = w9Form && (w9Form.status === 'verified' || w9Form.status === 'submitted');
    
    return {
      w9Required: hasW9RequiredEvents,
      hasValidW9,
      w9Status: w9Form?.status || null,
      eventsRequiringW9: events.filter(event => 
        event.contractorApplications?.some(app => 
          app.contractorId === input.contractorId && app.w9Required
        )
      ).map(event => ({ id: event.id, title: event.title }))
    };
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
    
    // If W9 is verified, update any pending events
    if (input.status === 'verified') {
      const events = await eventRepo.findByUserId(updated.contractorId, 'contractor');
      const pendingW9Events = events.filter(event => 
        event.status === 'pending_w9_forms' && 
        event.contractorsNeedingW9?.includes(updated.contractorId)
      );
      
      for (const event of pendingW9Events) {
        const updatedContractorsNeedingW9 = event.contractorsNeedingW9?.filter(id => id !== updated.contractorId) || [];
        
        const updatedApplications = event.contractorApplications?.map(app => 
          app.contractorId === updated.contractorId 
            ? { ...app, w9Required: false }
            : app
        ) || [];
        
        await eventRepo.update(event.id, {
          contractorsNeedingW9: updatedContractorsNeedingW9,
          contractorApplications: updatedApplications,
          status: updatedContractorsNeedingW9.length === 0 ? 'contractors_hired' : 'pending_w9_forms'
        });
      }
    }
    
    console.log("W-9 status updated successfully");
    return updated;
  });