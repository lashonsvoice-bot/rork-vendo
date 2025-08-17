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
    
    // Add funds to contractor's wallet
    await walletRepo.deposit(vendor.contractorId, input.amount, `${input.type} payment for ${event.title}`);
    
    // Update vendor status
    const updateData = input.type === 'stipend' 
      ? { stipendReleased: true }
      : { fundsReleased: true };
    
    await eventRepo.updateVendorCheckIn(input.eventId, input.vendorId, updateData);
    
    return {
      success: true,
      amount: input.amount,
      type: input.type,
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