import { z } from "zod";
import { protectedProcedure } from "../../../create-context";
import { eventRepo } from "../../../../db/event-repo";
import { taxRepo } from "../../../../db/tax-repo";
import { checkVerificationRequirement, createVerificationError } from "../../../../lib/verification-helper";

export const submitContractorApplicationProcedure = protectedProcedure
  .input(z.object({
    eventId: z.string(),
    message: z.string().optional(),
    experience: z.string().optional(),
  }))
  .mutation(async ({ input, ctx }) => {
    console.log('[Events] Submitting contractor application:', input.eventId, ctx.user?.id);
    
    if (!ctx.user?.id || !ctx.user?.name) {
      throw new Error('User not authenticated');
    }
    
    // Check if contractor verification is required
    const verificationReq = await checkVerificationRequirement(ctx.user.id, 'apply_to_job');
    if (verificationReq.isRequired) {
      throw createVerificationError(verificationReq);
    }
    
    const application = {
      id: Date.now().toString(),
      contractorId: ctx.user.id,
      contractorName: ctx.user.name,
      appliedAt: new Date().toISOString(),
      status: 'pending' as const,
      message: input.message,
      experience: input.experience,
    };
    
    return await eventRepo.addContractorApplication(input.eventId, application);
  });

export const selectContractorsProcedure = protectedProcedure
  .input(z.object({
    eventId: z.string(),
    selectedContractorIds: z.array(z.string()),
  }))
  .mutation(async ({ input, ctx }) => {
    console.log('[Events] Selecting contractors:', input.eventId, input.selectedContractorIds);
    
    if (!ctx.user?.id) {
      throw new Error('User not authenticated');
    }
    
    // Check if business owner verification is required for hiring contractors
    const verificationReq = await checkVerificationRequirement(ctx.user.id, 'hire_contractor');
    if (verificationReq.isRequired) {
      throw createVerificationError(verificationReq);
    }
    
    const event = await eventRepo.findById(input.eventId);
    if (!event || !event.contractorApplications) {
      throw new Error('Event not found or no applications');
    }
    
    // Check W9 status for selected contractors
    const contractorsNeedingW9: string[] = [];
    for (const contractorId of input.selectedContractorIds) {
      const w9Form = await taxRepo.getW9ByContractor(contractorId);
      if (!w9Form || w9Form.status !== 'verified') {
        contractorsNeedingW9.push(contractorId);
      }
    }
    
    const updatedApplications = event.contractorApplications.map(app => ({
      ...app,
      status: input.selectedContractorIds.includes(app.contractorId) ? 'accepted' as const : 'rejected' as const,
      w9Required: input.selectedContractorIds.includes(app.contractorId) && contractorsNeedingW9.includes(app.contractorId),
    }));
    
    const updatedEvent = await eventRepo.update(input.eventId, {
      contractorApplications: updatedApplications,
      selectedContractors: input.selectedContractorIds,
      contractorsHiredAt: new Date().toISOString(),
      status: contractorsNeedingW9.length > 0 ? 'pending_w9_forms' : 'contractors_hired',
      contractorsNeedingW9,
    });
    
    return {
      ...updatedEvent,
      contractorsNeedingW9,
    };
  });

export const getContractorApplicationsProcedure = protectedProcedure
  .input(z.object({
    eventId: z.string(),
  }))
  .query(async ({ input }) => {
    console.log('[Events] Getting contractor applications:', input.eventId);
    
    const event = await eventRepo.findById(input.eventId);
    return event?.contractorApplications || [];
  });