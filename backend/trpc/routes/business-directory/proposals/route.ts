import { z } from "zod";
import { protectedProcedure } from "@/backend/trpc/create-context";
import { businessDirectoryRepo } from "@/backend/db/business-directory-repo";

const sendReverseProposalSchema = z.object({
  businessId: z.string().min(1),
  eventId: z.string().min(1),
  invitationCost: z.number().default(1),
  emailSent: z.boolean().default(true),
  smsSent: z.boolean().default(true),
});

const updateProposalStatusSchema = z.object({
  proposalId: z.string().min(1),
  status: z.enum(['sent', 'viewed', 'accepted', 'declined', 'expired']),
  isNewSignup: z.boolean().optional(),
});

export const sendReverseProposalProcedure = protectedProcedure
  .input(sendReverseProposalSchema)
  .mutation(async ({ input, ctx }: { input: any; ctx: any }) => {
    console.log("Sending reverse proposal:", input);
    
    if (ctx.user.role !== "event_host") {
      throw new Error("Only event hosts can send reverse proposals");
    }
    
    try {
      const proposal = await businessDirectoryRepo.sendReverseProposal({
        ...input,
        hostId: ctx.user.id,
        status: 'sent' as const,
      });
      
      console.log("Reverse proposal sent:", proposal.id);
      return proposal;
    } catch (error) {
      console.error("Error sending reverse proposal:", error);
      throw error;
    }
  });

export const updateReverseProposalStatusProcedure = protectedProcedure
  .input(updateProposalStatusSchema)
  .mutation(async ({ input, ctx }: { input: any; ctx: any }) => {
    console.log("Updating reverse proposal status:", input);
    
    try {
      const proposal = await businessDirectoryRepo.updateReverseProposalStatus(
        input.proposalId,
        input.status,
        input.isNewSignup
      );
      
      console.log("Reverse proposal status updated:", proposal.id);
      return proposal;
    } catch (error) {
      console.error("Error updating reverse proposal status:", error);
      throw error;
    }
  });

export const getHostReverseProposalsProcedure = protectedProcedure
  .query(async ({ ctx }: { ctx: any }) => {
    console.log("Getting host reverse proposals");
    
    if (ctx.user.role !== "event_host") {
      throw new Error("Only event hosts can view their proposals");
    }
    
    try {
      const proposals = await businessDirectoryRepo.getHostReverseProposals(ctx.user.id);
      console.log(`Retrieved ${proposals.length} reverse proposals for host`);
      return proposals;
    } catch (error) {
      console.error("Error getting host reverse proposals:", error);
      throw error;
    }
  });

export const getBusinessReverseProposalsProcedure = protectedProcedure
  .query(async ({ ctx }: { ctx: any }) => {
    console.log("Getting business reverse proposals");
    
    if (ctx.user.role !== "business_owner") {
      throw new Error("Only business owners can view their proposals");
    }
    
    try {
      const proposals = await businessDirectoryRepo.getBusinessReverseProposals(ctx.user.id);
      console.log(`Retrieved ${proposals.length} reverse proposals for business`);
      return proposals;
    } catch (error) {
      console.error("Error getting business reverse proposals:", error);
      throw error;
    }
  });