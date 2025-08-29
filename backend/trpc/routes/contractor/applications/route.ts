import { z } from "zod";
import { protectedProcedure } from "../../../create-context";
import { contractorApplicationsRepo } from "../../../../db/contractor-applications-repo";
import { subscriptionRepo } from "../../../../db/subscription-repo";
import { eventRepo } from "../../../../db/event-repo";
import { TRPCError } from "@trpc/server";

// Apply to an event
export const applyToEvent = protectedProcedure
  .input(z.object({
    eventId: z.string(),
    message: z.string().optional()
  }))
  .mutation(async ({ ctx, input }) => {
    if (!ctx.user) {
      throw new TRPCError({
        code: "UNAUTHORIZED",
        message: "User not authenticated"
      });
    }
    
    if (ctx.user.role !== "contractor") {
      throw new TRPCError({
        code: "FORBIDDEN",
        message: "Only contractors can apply to events"
      });
    }
    
    // Check application limits
    const monthlyUsage = await contractorApplicationsRepo.getMonthlyUsage(ctx.user.id);
    const subscription = await subscriptionRepo.findByUserId(ctx.user.id);
    const limits = subscriptionRepo.getSubscriptionLimits(subscription?.tier || "free");
    
    const applicationLimit = limits.contractorApplicationsLimit || 5;
    
    if (applicationLimit !== -1 && monthlyUsage >= applicationLimit) {
      throw new TRPCError({
        code: "FORBIDDEN",
        message: `Monthly application limit reached (${applicationLimit}). Upgrade to Pro for unlimited applications.`
      });
    }
    
    // Get event details
    const event = await eventRepo.findById(input.eventId);
    if (!event) {
      throw new TRPCError({
        code: "NOT_FOUND",
        message: "Event not found"
      });
    }
    
    // Create application
    try {
      const application = await contractorApplicationsRepo.createApplication({
        id: `app_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
        contractorId: ctx.user.id,
        eventId: input.eventId,
        hostId: event.createdBy,
        status: "pending",
        appliedAt: new Date().toISOString(),
        message: input.message,
        isEarlyAccess: limits.earlyAccessEnabled
      });
      
      return {
        success: true,
        application,
        remainingApplications: applicationLimit === -1 ? -1 : applicationLimit - monthlyUsage - 1
      };
    } catch (error: any) {
      if (error.message === "Already applied to this event") {
        throw new TRPCError({
          code: "BAD_REQUEST",
          message: "You have already applied to this event"
        });
      }
      throw error;
    }
  });

// Get my applications
export const getMyApplications = protectedProcedure
  .query(async ({ ctx }) => {
    if (!ctx.user) {
      throw new TRPCError({
        code: "UNAUTHORIZED",
        message: "User not authenticated"
      });
    }
    
    const applications = await contractorApplicationsRepo.getApplicationsByContractor(ctx.user.id);
    
    // Get event details for each application
    const applicationsWithEvents = await Promise.all(
      applications.map(async (app) => {
        const event = await eventRepo.findById(app.eventId);
        return {
          ...app,
          event
        };
      })
    );
    
    return applicationsWithEvents;
  });

// Get applications for my event (for hosts)
export const getEventApplications = protectedProcedure
  .input(z.object({
    eventId: z.string()
  }))
  .query(async ({ ctx, input }) => {
    if (!ctx.user) {
      throw new TRPCError({
        code: "UNAUTHORIZED",
        message: "User not authenticated"
      });
    }
    
    // Verify event ownership
    const event = await eventRepo.findById(input.eventId);
    if (!event || event.createdBy !== ctx.user.id) {
      throw new TRPCError({
        code: "FORBIDDEN",
        message: "You can only view applications for your own events"
      });
    }
    
    const applications = await contractorApplicationsRepo.getApplicationsByEvent(input.eventId);
    
    // Sort by early access first, then by date
    applications.sort((a, b) => {
      if (a.isEarlyAccess && !b.isEarlyAccess) return -1;
      if (!a.isEarlyAccess && b.isEarlyAccess) return 1;
      return new Date(a.appliedAt).getTime() - new Date(b.appliedAt).getTime();
    });
    
    return applications;
  });

// Respond to application (accept/reject)
export const respondToApplication = protectedProcedure
  .input(z.object({
    applicationId: z.string(),
    status: z.enum(["accepted", "rejected"])
  }))
  .mutation(async ({ ctx, input }) => {
    if (!ctx.user) {
      throw new TRPCError({
        code: "UNAUTHORIZED",
        message: "User not authenticated"
      });
    }
    
    // Get application
    const applications = await contractorApplicationsRepo.readAllApplications();
    const application = applications.find(a => a.id === input.applicationId);
    
    if (!application) {
      throw new TRPCError({
        code: "NOT_FOUND",
        message: "Application not found"
      });
    }
    
    // Verify ownership
    if (application.hostId !== ctx.user.id) {
      throw new TRPCError({
        code: "FORBIDDEN",
        message: "You can only respond to applications for your own events"
      });
    }
    
    const updated = await contractorApplicationsRepo.updateApplicationStatus(
      input.applicationId,
      input.status
    );
    
    return {
      success: true,
      application: updated
    };
  });

// Withdraw application
export const withdrawApplication = protectedProcedure
  .input(z.object({
    applicationId: z.string()
  }))
  .mutation(async ({ ctx, input }) => {
    if (!ctx.user) {
      throw new TRPCError({
        code: "UNAUTHORIZED",
        message: "User not authenticated"
      });
    }
    
    // Get application
    const applications = await contractorApplicationsRepo.readAllApplications();
    const application = applications.find(a => a.id === input.applicationId);
    
    if (!application) {
      throw new TRPCError({
        code: "NOT_FOUND",
        message: "Application not found"
      });
    }
    
    // Verify ownership
    if (application.contractorId !== ctx.user.id) {
      throw new TRPCError({
        code: "FORBIDDEN",
        message: "You can only withdraw your own applications"
      });
    }
    
    const updated = await contractorApplicationsRepo.updateApplicationStatus(
      input.applicationId,
      "withdrawn"
    );
    
    return {
      success: true,
      application: updated
    };
  });