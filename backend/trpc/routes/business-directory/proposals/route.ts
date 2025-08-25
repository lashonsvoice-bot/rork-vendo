import { z } from "zod";
import { protectedProcedure } from "@/backend/trpc/create-context";
import { businessDirectoryRepo } from "@/backend/db/business-directory-repo";
import { subscriptionRepo } from "@/backend/db/subscription-repo";
import { twilioService } from "@/backend/lib/twilio";
import sgMail from "@sendgrid/mail";
import { config } from "@/backend/config/env";
import { checkVerificationRequirement, createVerificationError } from "@/backend/lib/verification-helper";

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

const sendReverseProposalWithNotificationsSchema = z.object({
  businessId: z.string().min(1),
  businessName: z.string().min(1),
  businessEmail: z.string().email().optional(),
  businessPhone: z.string().optional(),
  eventId: z.string().min(1),
  eventTitle: z.string().min(1),
  eventDate: z.string().min(1),
  eventLocation: z.string().min(1),
  hostName: z.string().min(1),
  hostEmail: z.string().email(),
  proposedAmount: z.number().positive(),
  supervisoryFee: z.number().positive(),
  contractorsNeeded: z.number().optional(),
  message: z.string().min(1),
  invitationCost: z.number().default(1),
});

export const sendReverseProposalProcedure = protectedProcedure
  .input(sendReverseProposalSchema)
  .mutation(async ({ input, ctx }: { input: any; ctx: any }) => {
    console.log("Sending reverse proposal:", input);
    
    if (ctx.user.role !== "event_host") {
      throw new Error("Only event hosts can send reverse proposals");
    }
    
    // Check if event host verification is required for sending proposals
    const verificationReq = await checkVerificationRequirement(ctx.user.id, 'send_proposal');
    if (verificationReq.isRequired) {
      throw createVerificationError(verificationReq);
    }
    
    // Check subscription status for business owners
    if (ctx.user.role === "business_owner") {
      const subscription = await subscriptionRepo.findByUserId(ctx.user.id);
      if (!subscription || subscription.status === "trialing") {
        throw new Error("Proposals are not available during the free trial. Please upgrade your subscription to send proposals.");
      }
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

export const sendReverseProposalWithNotificationsProcedure = protectedProcedure
  .input(sendReverseProposalWithNotificationsSchema)
  .mutation(async ({ input, ctx }: { input: any; ctx: any }) => {
    console.log("Sending reverse proposal with notifications:", input);
    
    if (ctx.user.role !== "event_host") {
      throw new Error("Only event hosts can send reverse proposals");
    }
    
    // Check if event host verification is required for sending proposals
    const verificationReq = await checkVerificationRequirement(ctx.user.id, 'send_proposal');
    if (verificationReq.isRequired) {
      throw createVerificationError(verificationReq);
    }
    
    // Check subscription status for business owners
    if (ctx.user.role === "business_owner") {
      const subscription = await subscriptionRepo.findByUserId(ctx.user.id);
      if (!subscription || subscription.status === "trialing") {
        throw new Error("Proposals are not available during the free trial. Please upgrade your subscription to send proposals.");
      }
    }
    
    const {
      businessId,
      businessName,
      businessEmail,
      businessPhone,
      eventId,
      eventTitle,
      eventDate,
      eventLocation,
      hostName,
      hostEmail,
      proposedAmount,
      supervisoryFee,
      contractorsNeeded,
      message,
      invitationCost,
    } = input;

    const results = {
      emailSent: false,
      smsSent: false,
      errors: [] as string[],
    };

    // Generate unique invitation code
    const invitationCode = `BIZ_${Date.now()}_${Math.random().toString(36).substring(2, 8).toUpperCase()}`;
    
    // Email content
    const replyToEmail = hostEmail;
    const subjectLine = `RevoVend Host Invitation: Remote Vendor Opportunity at ${eventTitle}`;
    const emailContent = `Hello ${businessName},\n\nA RevoVend Host would like to invite you to set up a remote vendor table at ${eventTitle} on ${eventDate}. We feel your business would be a great fit at our event. With RevoVend, distance is no issue!!\n\nEvent Details:\n• Event: ${eventTitle}\n• Date: ${eventDate}\n• Location: ${eventLocation}\n• Proposed Amount: ${proposedAmount}\n• Supervisory Fee: ${supervisoryFee}\n• Contractors Needed: ${contractorsNeeded || 'TBD'}\n\nHost Message:\n${message}\n\nTo accept this invitation, please download the RevoVend App and use this invitation code:\n\nINVITATION CODE: ${invitationCode}\n\nDownload the RevoVend App:\n• iOS: [App Store Link]\n• Android: [Google Play Link]\n\nFor questions, please reply to: ${replyToEmail}\n\nBest regards,\n${hostName}\nRevoVend Host`;
    const htmlContent = emailContent.replace(/\n/g, '<br/>');

    // Send email if provided
    if (businessEmail) {
      try {
        const apiKey = config.sendgrid.apiKey;
        const fromEmail = config.sendgrid.fromEmail;
        
        if (apiKey && apiKey.startsWith('SG.')) {
          sgMail.setApiKey(apiKey);
          console.log('📧 Sending reverse proposal email to:', businessEmail);
          
          const emailData = {
            to: businessEmail,
            from: fromEmail,
            subject: subjectLine,
            text: emailContent,
            html: htmlContent,
            replyTo: replyToEmail,
          };
          
          await sgMail.send(emailData);
          console.log('✅ Reverse proposal email sent successfully');
          results.emailSent = true;
        } else {
          console.log('📧 SENDING REVERSE PROPOSAL EMAIL (stub mode):');
          console.log('To:', businessEmail);
          console.log('Subject:', subjectLine);
          console.log('Content:', emailContent);
          results.emailSent = true;
          results.errors.push('SendGrid not configured - email sent in stub mode');
        }
      } catch (error: unknown) {
        console.error('❌ Reverse proposal email sending failed:', error);
        const errorMessage = error instanceof Error ? error.message : String(error);
        results.errors.push(`Failed to send email: ${errorMessage}`);
      }
    }

    // Send SMS if provided
    if (businessPhone) {
      try {
        console.log('📱 Sending reverse proposal SMS to:', businessPhone);
        
        const smsResult = await twilioService.sendReverseProposalNotification(businessPhone, {
          eventTitle,
          eventDate,
          hostEmail,
          invitationCode,
          appDownloadLink: 'https://revovend.com/app'
        });
        
        if (smsResult.success) {
          console.log('✅ Reverse proposal SMS sent successfully:', smsResult.messageId);
          results.smsSent = true;
        } else {
          console.error('❌ Reverse proposal SMS sending failed:', smsResult.error);
          results.errors.push(`SMS failed: ${smsResult.error}`);
          
          // Fallback to stub mode
          console.log('📱 FALLBACK REVERSE PROPOSAL SMS (stub mode):');
          console.log('To:', businessPhone);
          results.smsSent = true;
        }
        
      } catch (error) {
        console.error('❌ Reverse proposal SMS sending failed:', error);
        const errorMessage = error instanceof Error ? error.message : String(error);
        results.errors.push(`Failed to send SMS: ${errorMessage}`);
        
        // Fallback to stub mode
        console.log('📱 FALLBACK REVERSE PROPOSAL SMS (stub mode):');
        console.log('To:', businessPhone);
        results.smsSent = true;
      }
    }

    // Store the proposal in database as external proposal with reverse flag
    try {
      const externalProposal = {
        id: `reverse_proposal_${Date.now()}`,
        businessOwnerId: businessId,
        businessOwnerName: businessName,
        businessName,
        businessOwnerContactEmail: businessEmail,
        eventId,
        eventTitle,
        hostName,
        hostEmail,
        hostPhone: '', // Not provided in reverse proposals
        proposedAmount,
        supervisoryFee,
        contractorsNeeded: contractorsNeeded || 0,
        message,
        eventDate,
        eventLocation,
        status: 'sent' as const,
        createdAt: new Date().toISOString(),
        emailSent: results.emailSent,
        smsSent: results.smsSent,
        invitationCode,
        isExternal: true,
        isReverseProposal: true,
        hostId: ctx.user.id,
        hostContactEmail: hostEmail,
        managementFee: supervisoryFee,
      };
      
      await businessDirectoryRepo.storeExternalProposal(externalProposal);
      console.log('💾 Reverse proposal stored:', externalProposal.id);
      
      return {
        success: results.emailSent || results.smsSent,
        proposalId: externalProposal.id,
        invitationCode,
        emailSent: results.emailSent,
        smsSent: results.smsSent,
        errors: results.errors,
        message: results.errors.length > 0 
          ? `Reverse proposal sent with some issues: ${results.errors.join(', ')}`
          : `Reverse proposal sent successfully! Business invitation code: ${invitationCode}`
      };
    } catch (error) {
      console.error('Failed to store reverse proposal:', error);
      throw new Error('Failed to store reverse proposal record');
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

// Procedure to connect business using invitation code from reverse proposal
export const connectBusinessWithInvitationCodeProcedure = protectedProcedure
  .input(z.object({
    invitationCode: z.string().min(1),
    businessId: z.string().min(1),
  }))
  .mutation(async ({ input, ctx }: { input: any; ctx: any }) => {
    console.log('[ConnectBusiness] Connecting business with invitation code:', input.invitationCode);
    
    if (ctx.user.role !== "business_owner") {
      throw new Error("Only business owners can accept reverse proposals");
    }
    
    try {
      const connectedProposal = await businessDirectoryRepo.connectBusinessOwnerToReverseProposal(
        input.invitationCode,
        input.businessId
      );
      
      if (!connectedProposal) {
        throw new Error('Invalid invitation code or proposal not found');
      }
      
      console.log('[ConnectBusiness] Business connected successfully:', connectedProposal.id);
      return {
        success: true,
        proposal: connectedProposal,
        message: `Successfully connected to reverse proposal from ${connectedProposal.hostName}`,
      };
    } catch (error) {
      console.error('[ConnectBusiness] Error connecting business:', error);
      throw error;
    }
  });

// Procedure to find reverse proposal by invitation code (for preview)
export const findReverseProposalByCodeProcedure = protectedProcedure
  .input(z.object({
    invitationCode: z.string().min(1),
  }))
  .query(async ({ input }: { input: any }) => {
    console.log('[FindReverseProposal] Looking up invitation code:', input.invitationCode);
    
    try {
      const proposal = await businessDirectoryRepo.findReverseProposalByCode(input.invitationCode);
      
      if (!proposal) {
        return {
          found: false,
          message: 'Invitation code not found or expired',
        };
      }
      
      return {
        found: true,
        proposal: {
          hostName: proposal.hostName,
          eventTitle: proposal.eventTitle,
          eventDate: proposal.eventDate,
          eventLocation: proposal.eventLocation,
          proposedAmount: proposal.proposedAmount,
          supervisoryFee: proposal.managementFee || 0,
          contractorsNeeded: proposal.contractorsNeeded,
          message: proposal.message,
          status: proposal.status,
        },
        message: `Reverse proposal from ${proposal.hostName} for ${proposal.eventTitle}`,
      };
    } catch (error) {
      console.error('[FindReverseProposal] Error finding proposal:', error);
      return {
        found: false,
        message: 'Error looking up invitation code',
      };
    }
  });