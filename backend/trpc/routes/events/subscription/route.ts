import { z } from "zod";
import { protectedProcedure } from "../../../create-context";
import { eventRepo } from "../../../../db/event-repo";

export const recordEventCreationProcedure = protectedProcedure
  .input(z.object({
    eventId: z.string(),
  }))
  .mutation(async ({ input, ctx }) => {
    console.log('[Events] Recording event creation for subscription:', input.eventId, ctx.user?.id);
    
    if (!ctx.user?.id) {
      throw new Error('User not authenticated');
    }
    
    // This would integrate with the subscription system to track usage
    // For now, we'll just log it
    console.log(`Business owner ${ctx.user.id} created event ${input.eventId}`);
    
    return {
      success: true,
      eventId: input.eventId,
      userId: ctx.user.id,
    };
  });

export const getEventUsageStatsProcedure = protectedProcedure
  .input(z.object({
    userId: z.string().optional(),
    month: z.string().optional(), // YYYY-MM format
  }))
  .query(async ({ input, ctx }) => {
    const userId = input.userId || ctx.user?.id;
    if (!userId) {
      throw new Error('User ID required');
    }
    
    console.log('[Events] Getting event usage stats for:', userId);
    
    const events = await eventRepo.findByUserId(userId, 'business_owner');
    
    const currentMonth = input.month || new Date().toISOString().slice(0, 7);
    const monthEvents = events.filter(event => 
      event.createdAt?.startsWith(currentMonth)
    );
    
    return {
      totalEvents: events.length,
      monthlyEvents: monthEvents.length,
      currentMonth,
      events: monthEvents.map(event => ({
        id: event.id,
        title: event.title,
        date: event.date,
        status: event.status,
        createdAt: event.createdAt,
      })),
    };
  });

export const checkSubscriptionLimitsProcedure = protectedProcedure
  .query(async ({ ctx }) => {
    if (!ctx.user?.id) {
      throw new Error('User not authenticated');
    }
    
    console.log('[Events] Checking subscription limits for:', ctx.user.id);
    
    const events = await eventRepo.findByUserId(ctx.user.id, 'business_owner');
    const currentMonth = new Date().toISOString().slice(0, 7);
    const monthEvents = events.filter(event => 
      event.createdAt?.startsWith(currentMonth)
    );
    
    // Mock subscription tiers
    const subscriptionTiers = {
      free: { maxEvents: 5, price: 0 },
      basic: { maxEvents: 10, price: 29 },
      standard: { maxEvents: 20, price: 59 },
      premium: { maxEvents: Infinity, price: 99 },
    };
    
    // For now, assume free tier
    const currentTier = 'free';
    const maxEvents = subscriptionTiers[currentTier].maxEvents;
    const canCreateMore = monthEvents.length < maxEvents;
    
    return {
      currentTier,
      monthlyEventsUsed: monthEvents.length,
      maxEvents,
      canCreateMore,
      remainingEvents: Math.max(0, maxEvents - monthEvents.length),
      subscriptionTiers,
    };
  });