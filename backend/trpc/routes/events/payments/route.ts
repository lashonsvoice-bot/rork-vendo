import { z } from "zod";
import { protectedProcedure } from "../../../create-context";
import { eventRepo } from "../../../../db/event-repo";
import { walletRepo } from "../../../../db/wallet-repo";

export const setupEventEscrowProcedure = protectedProcedure
  .input(z.object({
    eventId: z.string(),
    totalAmount: z.number(),
    stipendAmount: z.number().optional(),
  }))
  .mutation(async ({ input, ctx }) => {
    console.log('[Events] Setting up event escrow:', input.eventId, input.totalAmount);
    
    if (!ctx.user?.id) {
      throw new Error('User not authenticated');
    }
    
    // Check if business owner has sufficient funds
    const wallet = await walletRepo.getBalance(ctx.user.id);
    if (wallet.available < input.totalAmount) {
      throw new Error('Insufficient funds in wallet');
    }
    
    // Hold funds in escrow
    await walletRepo.createHold(ctx.user.id, input.totalAmount, input.eventId, 'Event escrow hold');
    
    // Update event with escrow info
    const updatedEvent = await eventRepo.update(input.eventId, {
      escrowEnabled: true,
      stipendReleaseMethod: 'escrow',
    });
    
    return {
      event: updatedEvent,
      escrowAmount: input.totalAmount,
      remainingBalance: wallet.balance - input.totalAmount,
    };
  });

export const releaseEscrowFundsProcedure = protectedProcedure
  .input(z.object({
    eventId: z.string(),
    vendorId: z.string(),
    amount: z.number(),
    type: z.enum(['stipend', 'final_payment']),
    forceRelease: z.boolean().optional(),
  }))
  .mutation(async ({ input, ctx }) => {
    console.log('[Events] Releasing escrow funds:', input.eventId, input.vendorId, input.amount);
    
    if (!ctx.user?.id) {
      throw new Error('User not authenticated');
    }
    
    const event = await eventRepo.findById(input.eventId);
    if (!event) {
      throw new Error('Event not found');
    }
    
    const vendor = event.vendors?.find(v => v.id === input.vendorId);
    if (!vendor || !vendor.contractorId) {
      throw new Error('Vendor or contractor not found');
    }
    
    // Check time restrictions for fund release
    const eventDateTime = new Date(`${event.date} ${event.time}`);
    const now = new Date();
    const eventEndTime = new Date(eventDateTime.getTime() + (4 * 60 * 60 * 1000)); // Assume 4 hour event duration
    const oneHourBeforeEnd = new Date(eventEndTime.getTime() - (60 * 60 * 1000));
    
    const isEarlyRelease = now < oneHourBeforeEnd;
    const isHost = event.eventHostId === ctx.user.id;
    const isBusinessOwner = event.businessOwnerId === ctx.user.id;
    
    // Time restriction logic
    if (isEarlyRelease && !input.forceRelease) {
      if (isHost) {
        // Host trying to release early - notify business owner
        await notifyBusinessOwnerOfEarlyRelease({
          eventId: input.eventId,
          hostId: ctx.user.id,
          vendorId: input.vendorId,
          amount: input.amount,
          type: input.type,
          requestedAt: now,
          eventEndTime,
        });
        
        throw new Error(`Funds cannot be released more than 1 hour before event end time (${eventEndTime.toLocaleString()}). Business owner has been notified of early release request.`);
      }
      
      if (isBusinessOwner) {
        // Business owner can override but we log it
        console.log(`[Events] Business owner ${ctx.user.id} releasing funds early for event ${input.eventId}`);
      }
    }
    
    // Capture held funds from business owner's wallet
    if (event.businessOwnerId) {
      await walletRepo.captureHold(event.businessOwnerId, input.amount, input.eventId, `${input.type} payment captured for ${event.title}`);
    }
    
    // Add funds to contractor's wallet
    await walletRepo.deposit(vendor.contractorId, input.amount, `${input.type} payment for ${event.title}`);
    
    // Update vendor status
    const updateData = input.type === 'stipend' 
      ? { stipendReleased: true, stipendReleasedAt: now.toISOString(), stipendReleasedBy: ctx.user.id }
      : { fundsReleased: true, fundsReleasedAt: now.toISOString(), fundsReleasedBy: ctx.user.id };
    
    await eventRepo.updateVendorCheckIn(input.eventId, input.vendorId, updateData);
    
    return {
      success: true,
      amount: input.amount,
      type: input.type,
      releasedAt: now.toISOString(),
      releasedBy: ctx.user.id,
      wasEarlyRelease: isEarlyRelease,
    };
  });

export const getEventFinancialsProcedure = protectedProcedure
  .input(z.object({
    eventId: z.string(),
  }))
  .query(async ({ input }) => {
    console.log('[Events] Getting event financials:', input.eventId);
    
    const event = await eventRepo.findById(input.eventId);
    if (!event) {
      throw new Error('Event not found');
    }
    
    const vendors = event.vendors || [];
    const totalStipendReleased = vendors.filter(v => v.stipendReleased).length * (event.foodStipend || 0);
    const totalFinalPaymentsReleased = vendors.filter(v => v.fundsReleased).length * event.contractorPay;
    const totalPending = vendors.filter(v => !v.fundsReleased).length * event.contractorPay;
    
    return {
      event,
      financials: {
        contractorPay: event.contractorPay,
        hostSupervisionFee: event.hostSupervisionFee,
        foodStipend: event.foodStipend || 0,
        travelStipend: event.travelStipend || 0,
        totalStipendReleased,
        totalFinalPaymentsReleased,
        totalPending,
        escrowEnabled: event.escrowEnabled || false,
        stipendMode: event.stipendMode || 'in_app',
      },
    };
  });

export const uploadEventFundsProcedure = protectedProcedure
  .input(z.object({
    eventId: z.string(),
    amount: z.number(),
    description: z.string().optional(),
  }))
  .mutation(async ({ input, ctx }) => {
    console.log('[Events] Uploading event funds:', input.eventId, input.amount);
    
    if (!ctx.user?.id) {
      throw new Error('User not authenticated');
    }
    
    // Add funds to business owner's wallet for this event
    const { balance } = await walletRepo.deposit(
      ctx.user.id, 
      input.amount, 
      input.description || `Funds uploaded for event ${input.eventId}`
    );
    
    // Update event to indicate funds are available
    const updatedEvent = await eventRepo.update(input.eventId, {
      escrowEnabled: true,
    });
    
    return {
      event: updatedEvent,
      newBalance: balance.balance,
      amountAdded: input.amount,
    };
  });

export const approveEarlyReleaseProcedure = protectedProcedure
  .input(z.object({
    eventId: z.string(),
    vendorId: z.string(),
    amount: z.number(),
    type: z.enum(['stipend', 'final_payment']),
    hostId: z.string(),
  }))
  .mutation(async ({ input, ctx }) => {
    console.log('[Events] Business owner approving early release:', input.eventId, input.vendorId);
    
    if (!ctx.user?.id) {
      throw new Error('User not authenticated');
    }
    
    const event = await eventRepo.findById(input.eventId);
    if (!event) {
      throw new Error('Event not found');
    }
    
    // Verify business owner
    if (event.businessOwnerId !== ctx.user.id) {
      throw new Error('Only the business owner can approve early fund releases');
    }
    
    // Directly call the release logic with force flag
    const vendor = event.vendors?.find(v => v.id === input.vendorId);
    if (!vendor || !vendor.contractorId) {
      throw new Error('Vendor or contractor not found');
    }
    
    const now = new Date();
    
    // Capture held funds from business owner's wallet
    if (event.businessOwnerId) {
      await walletRepo.captureHold(event.businessOwnerId, input.amount, input.eventId, `${input.type} payment captured for ${event.title} (early release approved)`);
    }
    
    // Add funds to contractor's wallet
    await walletRepo.deposit(vendor.contractorId, input.amount, `${input.type} payment for ${event.title} (early release approved)`);
    
    // Update vendor status
    const updateData = input.type === 'stipend' 
      ? { stipendReleased: true, stipendReleasedAt: now.toISOString(), stipendReleasedBy: ctx.user.id }
      : { fundsReleased: true, fundsReleasedAt: now.toISOString(), fundsReleasedBy: ctx.user.id };
    
    await eventRepo.updateVendorCheckIn(input.eventId, input.vendorId, updateData);
    
    return {
      success: true,
      amount: input.amount,
      type: input.type,
      releasedAt: now.toISOString(),
      releasedBy: ctx.user.id,
      wasEarlyRelease: true,
      approvedByBusinessOwner: true,
    };
  });

export const getEarlyReleaseRequestsProcedure = protectedProcedure
  .input(z.object({
    eventId: z.string().optional(),
  }))
  .query(async ({ input, ctx }) => {
    console.log('[Events] Getting early release requests for business owner:', ctx.user?.id);
    
    if (!ctx.user?.id) {
      throw new Error('User not authenticated');
    }
    
    // This would typically come from a notifications/requests table
    // For now, we'll return a mock structure
    return {
      requests: [],
      totalPending: 0,
    };
  });

// Helper function to notify business owner of early release request
async function notifyBusinessOwnerOfEarlyRelease(data: {
  eventId: string;
  hostId: string;
  vendorId: string;
  amount: number;
  type: 'stipend' | 'final_payment';
  requestedAt: Date;
  eventEndTime: Date;
}) {
  console.log('[Events] Notifying business owner of early release request:', data);
  
  // In a real implementation, this would:
  // 1. Send push notification to business owner
  // 2. Send email notification
  // 3. Store the request in a database for approval workflow
  // 4. Create an in-app notification
  
  // For now, we'll just log it
  console.log(`Early release request: Host ${data.hostId} wants to release ${data.amount} (${data.type}) for vendor ${data.vendorId} in event ${data.eventId}`);
  console.log(`Event ends at: ${data.eventEndTime.toISOString()}`);
  console.log(`Requested at: ${data.requestedAt.toISOString()}`);
}