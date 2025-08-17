import { z } from 'zod';
import { protectedProcedure } from '../../../create-context';
import { eventRepo } from '../../../../db/event-repo';
import { TRPCError } from '@trpc/server';

const cancelEventSchema = z.object({
  eventId: z.string(),
  reason: z.string().min(10, 'Cancellation reason must be at least 10 characters'),
});

const cancelContractorSchema = z.object({
  eventId: z.string(),
  reason: z.string().min(10, 'Cancellation reason must be at least 10 characters'),
  proofFiles: z.array(z.string()).optional().default([]),
});

const reportNoShowSchema = z.object({
  eventId: z.string(),
  contractorId: z.string(),
});

const submitAppealSchema = z.object({
  cancellationId: z.string(),
  appealReason: z.string().min(20, 'Appeal reason must be at least 20 characters'),
});

export const cancelEventProcedure = protectedProcedure
  .input(cancelEventSchema)
  .mutation(async ({ input, ctx }) => {
    const { eventId, reason } = input;
    
    if (!ctx.user) {
      throw new TRPCError({
        code: 'UNAUTHORIZED',
        message: 'User not authenticated',
      });
    }
    
    const userId = ctx.user.id;
    const userRole = ctx.user.role as 'host' | 'business_owner' | 'contractor';

    console.log('Cancelling event:', { eventId, userId, userRole, reason });

    // Check if user is suspended
    const isSuspended = await eventRepo.isUserSuspended(userId);
    if (isSuspended) {
      throw new TRPCError({
        code: 'FORBIDDEN',
        message: 'Account suspended. Please check your email for appeal instructions.',
      });
    }

    try {
      const result = await eventRepo.cancelEvent(eventId, userId, userRole, reason);
      
      console.log('Event cancelled successfully:', result);
      
      return {
        success: true,
        cancellation: result.cancellation,
        penalties: result.penalties,
        message: 'Event cancelled successfully',
      };
    } catch (error) {
      console.error('Error cancelling event:', error);
      throw new TRPCError({
        code: 'INTERNAL_SERVER_ERROR',
        message: 'Failed to cancel event',
      });
    }
  });

export const reportNoShowProcedure = protectedProcedure
  .input(reportNoShowSchema)
  .mutation(async ({ input, ctx }) => {
    const { eventId, contractorId } = input;
    
    if (!ctx.user) {
      throw new TRPCError({
        code: 'UNAUTHORIZED',
        message: 'User not authenticated',
      });
    }
    
    const reportedBy = ctx.user.id;

    console.log('Reporting no-show:', { eventId, contractorId, reportedBy });

    try {
      const record = await eventRepo.reportNoShow(eventId, contractorId, reportedBy);
      
      console.log('No-show reported successfully:', record);
      
      return {
        success: true,
        record,
        message: 'No-show reported and contractor suspended',
      };
    } catch (error) {
      console.error('Error reporting no-show:', error);
      throw new TRPCError({
        code: 'INTERNAL_SERVER_ERROR',
        message: 'Failed to report no-show',
      });
    }
  });

export const getCancellationStatsProcedure = protectedProcedure
  .query(async ({ ctx }) => {
    if (!ctx.user) {
      throw new TRPCError({
        code: 'UNAUTHORIZED',
        message: 'User not authenticated',
      });
    }
    
    const userId = ctx.user.id;
    
    console.log('Getting cancellation stats for user:', userId);
    
    try {
      const stats = await eventRepo.getCancellationStats(userId);
      const cancellations = await eventRepo.getCancellationsByUser(userId);
      
      return {
        stats,
        cancellations,
      };
    } catch (error) {
      console.error('Error getting cancellation stats:', error);
      throw new TRPCError({
        code: 'INTERNAL_SERVER_ERROR',
        message: 'Failed to get cancellation stats',
      });
    }
  });

export const submitAppealProcedure = protectedProcedure
  .input(submitAppealSchema)
  .mutation(async ({ input, ctx }) => {
    const { cancellationId, appealReason } = input;
    
    if (!ctx.user) {
      throw new TRPCError({
        code: 'UNAUTHORIZED',
        message: 'User not authenticated',
      });
    }
    
    const userId = ctx.user.id;

    console.log('Submitting appeal:', { cancellationId, userId, appealReason });

    try {
      await eventRepo.submitAppeal(cancellationId, appealReason);
      
      console.log('Appeal submitted successfully');
      
      return {
        success: true,
        message: 'Appeal submitted successfully. You will receive a response within 5-7 business days.',
      };
    } catch (error) {
      console.error('Error submitting appeal:', error);
      throw new TRPCError({
        code: 'INTERNAL_SERVER_ERROR',
        message: 'Failed to submit appeal',
      });
    }
  });

export const cancelContractorProcedure = protectedProcedure
  .input(cancelContractorSchema)
  .mutation(async ({ input, ctx }) => {
    const { eventId, reason, proofFiles } = input;
    
    if (!ctx.user) {
      throw new TRPCError({
        code: 'UNAUTHORIZED',
        message: 'User not authenticated',
      });
    }
    
    const userId = ctx.user.id;
    const userRole = ctx.user.role as 'contractor';

    console.log('Contractor cancelling event:', { eventId, userId, reason, proofFiles });

    // Check if user is already suspended
    const isSuspended = await eventRepo.isUserSuspended(userId);
    if (isSuspended) {
      throw new TRPCError({
        code: 'FORBIDDEN',
        message: 'Account suspended. Please check your email for appeal instructions.',
      });
    }

    try {
      const result = await eventRepo.cancelContractorEvent(eventId, userId, reason, proofFiles);
      
      console.log('Contractor event cancelled successfully:', result);
      
      return {
        success: true,
        cancellation: result.cancellation,
        penalties: result.penalties,
        suspended: result.suspended,
        message: result.suspended 
          ? 'Event cancelled. Account suspended due to cancellation within 12 hours.'
          : 'Event cancelled successfully',
      };
    } catch (error) {
      console.error('Error cancelling contractor event:', error);
      throw new TRPCError({
        code: 'INTERNAL_SERVER_ERROR',
        message: 'Failed to cancel event',
      });
    }
  });

export const checkSuspensionStatusProcedure = protectedProcedure
  .query(async ({ ctx }) => {
    if (!ctx.user) {
      throw new TRPCError({
        code: 'UNAUTHORIZED',
        message: 'User not authenticated',
      });
    }
    
    const userId = ctx.user.id;
    
    console.log('Checking suspension status for user:', userId);
    
    try {
      const isSuspended = await eventRepo.isUserSuspended(userId);
      const stats = await eventRepo.getCancellationStats(userId);
      
      return {
        isSuspended,
        suspensionDetails: stats?.suspensionStatus !== 'active' ? {
          status: stats?.suspensionStatus,
          reason: stats?.suspensionReason,
          date: stats?.suspensionDate,
          appealEmail: 'support@revovend.com',
        } : null,
      };
    } catch (error) {
      console.error('Error checking suspension status:', error);
      throw new TRPCError({
        code: 'INTERNAL_SERVER_ERROR',
        message: 'Failed to check suspension status',
      });
    }
  });