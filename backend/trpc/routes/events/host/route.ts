import { z } from "zod";
import { protectedProcedure } from "../../../create-context";
import { eventRepo } from "../../../../db/event-repo";
import { checkVerificationRequirement, createVerificationError } from "../../../../lib/verification-helper";

export const getHostDashboardProcedure = protectedProcedure
  .input(z.object({
    hostId: z.string().optional(),
  }))
  .query(async ({ input, ctx }) => {
    const hostId = input.hostId || ctx.user?.id;
    if (!hostId) {
      throw new Error('Host ID required');
    }
    
    console.log('[Events] Getting host dashboard for:', hostId);
    
    const allEvents = await eventRepo.findByUserId(hostId, 'event_host');
    const today = new Date().toISOString().split('T')[0];
    
    const activeEvents = allEvents.filter(event => 
      event.date === today && 
      (event.status === 'ready_for_event' || event.status === 'active')
    );
    
    const upcomingEvents = allEvents.filter(event => 
      event.date > today && 
      event.status !== 'completed' && 
      event.status !== 'cancelled'
    );
    
    const completedEvents = allEvents.filter(event => 
      event.status === 'completed'
    );
    
    return {
      activeEvents,
      upcomingEvents,
      completedEvents,
      totalEvents: allEvents.length,
    };
  });

export const confirmPaymentReceivedProcedure = protectedProcedure
  .input(z.object({
    eventId: z.string(),
    confirmationNumber: z.string().optional(),
  }))
  .mutation(async ({ input, ctx }) => {
    console.log('[Events] Confirming payment received:', input.eventId);
    
    if (!ctx.user?.id) {
      throw new Error('User not authenticated');
    }
    
    // Check if event host verification is required for accepting payments
    const verificationReq = await checkVerificationRequirement(ctx.user.id, 'accept_payment');
    if (verificationReq.isRequired) {
      throw createVerificationError(verificationReq);
    }
    
    return await eventRepo.update(input.eventId, {
      paymentReceived: true,
      paymentReceivedDate: new Date().toISOString(),
      paymentConfirmationNumber: input.confirmationNumber,
    });
  });

export const confirmMaterialsReceivedProcedure = protectedProcedure
  .input(z.object({
    eventId: z.string(),
    description: z.string().optional(),
  }))
  .mutation(async ({ input }) => {
    console.log('[Events] Confirming materials received:', input.eventId);
    
    return await eventRepo.update(input.eventId, {
      materialsReceived: true,
      materialsReceivedDate: new Date().toISOString(),
      materialsDescription: input.description,
    });
  });

export const markInventoryCheckedProcedure = protectedProcedure
  .input(z.object({
    eventId: z.string(),
  }))
  .mutation(async ({ input }) => {
    console.log('[Events] Marking inventory checked:', input.eventId);
    
    return await eventRepo.update(input.eventId, {
      inventoryChecked: true,
    });
  });

export const connectHostToEventProcedure = protectedProcedure
  .input(z.object({
    eventId: z.string(),
    hostId: z.string().optional(),
  }))
  .mutation(async ({ input, ctx }) => {
    const hostId = input.hostId || ctx.user?.id;
    if (!hostId) {
      throw new Error('Host ID required');
    }
    
    console.log('[Events] Connecting host to event:', input.eventId, hostId);
    
    return await eventRepo.update(input.eventId, {
      eventHostId: hostId,
      eventHostName: ctx.user?.name,
      hostConnected: true,
      hostConnectedAt: new Date().toISOString(),
      status: 'host_connected',
      isPublicListing: true,
    });
  });

export const sendMaterialsProcedure = protectedProcedure
  .input(z.object({
    eventId: z.string(),
    trackingNumber: z.string(),
    description: z.string().optional(),
  }))
  .mutation(async ({ input }) => {
    console.log('[Events] Sending materials:', input.eventId, input.trackingNumber);
    
    return await eventRepo.update(input.eventId, {
      materialsSentAt: new Date().toISOString(),
      trackingNumber: input.trackingNumber,
      materialsDescription: input.description,
      status: 'materials_sent',
    });
  });

const inventoryItemSchema = z.object({
  id: z.string(),
  name: z.string(),
  expectedQuantity: z.number(),
  receivedQuantity: z.number(),
  discrepancyType: z.enum(['damaged', 'missing', 'lost_package', 'extra']).optional(),
  discrepancyExplanation: z.string().optional(),
  checkedAt: z.string().optional(),
});



export const updateInventoryProcedure = protectedProcedure
  .input(z.object({
    eventId: z.string(),
    items: z.array(inventoryItemSchema),
  }))
  .mutation(async ({ input }) => {
    console.log('[Events] Updating inventory for event:', input.eventId);
    
    return await eventRepo.update(input.eventId, {
      inventoryItems: input.items,
      inventoryChecked: true,
    });
  });

export const reportInventoryDiscrepancyProcedure = protectedProcedure
  .input(z.object({
    eventId: z.string(),
    items: z.array(inventoryItemSchema),
    notes: z.string().optional(),
  }))
  .mutation(async ({ input, ctx }) => {
    console.log('[Events] Reporting inventory discrepancy for event:', input.eventId);
    
    const discrepancyItems = input.items.filter(item => 
      item.discrepancyType && item.receivedQuantity !== item.expectedQuantity
    );

    if (discrepancyItems.length === 0) {
      throw new Error('No discrepancies found in the provided items');
    }

    const discrepancy = {
      id: Date.now().toString(),
      eventId: input.eventId,
      items: discrepancyItems,
      totalDiscrepancies: discrepancyItems.length,
      reportedAt: new Date().toISOString(),
      reportedBy: ctx.user?.id || 'unknown',
      businessOwnerNotified: true, // Will be handled by notification system
      resolved: false,
      notes: input.notes,
    };

    // Get current event to update discrepancies
    const event = await eventRepo.findById(input.eventId);
    if (!event) {
      throw new Error('Event not found');
    }

    const existingDiscrepancies = event.inventoryDiscrepancies || [];
    const updatedDiscrepancies = [...existingDiscrepancies, discrepancy];

    await eventRepo.update(input.eventId, {
      inventoryItems: input.items,
      inventoryDiscrepancies: updatedDiscrepancies,
    });

    // TODO: Send urgent notification to business owner
    // This would integrate with the notification system
    console.log('[Events] URGENT: Inventory discrepancy reported - business owner should be notified immediately');
    
    return discrepancy;
  });

export const resolveInventoryDiscrepancyProcedure = protectedProcedure
  .input(z.object({
    eventId: z.string(),
    discrepancyId: z.string(),
    notes: z.string().optional(),
  }))
  .mutation(async ({ input }) => {
    console.log('[Events] Resolving inventory discrepancy:', input.discrepancyId);
    
    const event = await eventRepo.findById(input.eventId);
    if (!event) {
      throw new Error('Event not found');
    }

    const discrepancies = event.inventoryDiscrepancies || [];
    const updatedDiscrepancies = discrepancies.map((d: any) => 
      d.id === input.discrepancyId 
        ? { ...d, resolved: true, resolvedAt: new Date().toISOString(), notes: input.notes }
        : d
    );

    return await eventRepo.update(input.eventId, {
      inventoryDiscrepancies: updatedDiscrepancies,
    });
  });