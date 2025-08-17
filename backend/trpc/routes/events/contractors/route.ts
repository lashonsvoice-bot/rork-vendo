import { z } from "zod";
import { protectedProcedure } from "../../../create-context";
import { eventRepo } from "../../../../db/event-repo";

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
  .mutation(async ({ input }) => {
    console.log('[Events] Selecting contractors:', input.eventId, input.selectedContractorIds);
    
    const event = await eventRepo.findById(input.eventId);
    if (!event || !event.contractorApplications) {
      throw new Error('Event not found or no applications');
    }
    
    const updatedApplications = event.contractorApplications.map(app => ({
      ...app,
      status: input.selectedContractorIds.includes(app.contractorId) ? 'accepted' as const : 'rejected' as const,
    }));
    
    const updatedEvent = await eventRepo.update(input.eventId, {
      contractorApplications: updatedApplications,
      selectedContractors: input.selectedContractorIds,
      contractorsHiredAt: new Date().toISOString(),
      status: 'contractors_hired',
    });
    
    return updatedEvent;
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