import { z } from "zod";
import { publicProcedure } from "../../../create-context";
import { businessDirectoryRepo } from "@/backend/db/business-directory-repo";

const sendExternalProposalSchema = z.object({
  businessOwnerId: z.string(),
  businessOwnerName: z.string(),
  businessName: z.string(),
  businessOwnerContactEmail: z.string().email().optional(),
  eventId: z.string(),
  eventTitle: z.string(),
  hostName: z.string(),
  hostEmail: z.string().email().optional(),
  hostPhone: z.string().optional(),
  proposedAmount: z.number(),
  contractorsNeeded: z.number(),
  message: z.string(),
  eventDate: z.string(),
  eventLocation: z.string(),
});

// Procedure to connect host using invitation code
export const connectHostWithInvitationCodeProcedure = publicProcedure
  .input(z.object({
    invitationCode: z.string().min(1),
    hostId: z.string().min(1),
  }))
  .mutation(async ({ input }) => {
    console.log('[ConnectHost] Connecting host with invitation code:', input.invitationCode);
    
    try {
      const connectedProposal = await businessDirectoryRepo.connectHostToExternalProposal(
        input.invitationCode,
        input.hostId
      );
      
      if (!connectedProposal) {
        throw new Error('Invalid invitation code or proposal not found');
      }
      
      console.log('[ConnectHost] Host connected successfully:', connectedProposal.id);
      return {
        success: true,
        proposal: connectedProposal,
        message: `Successfully connected to proposal from ${connectedProposal.businessName}`,
      };
    } catch (error) {
      console.error('[ConnectHost] Error connecting host:', error);
      throw error;
    }
  });

// Procedure to find proposal by invitation code (for preview)
export const findProposalByCodeProcedure = publicProcedure
  .input(z.object({
    invitationCode: z.string().min(1),
  }))
  .query(async ({ input }) => {
    console.log('[FindProposal] Looking up invitation code:', input.invitationCode);
    
    try {
      const proposal = await businessDirectoryRepo.findExternalProposalByCode(input.invitationCode);
      
      if (!proposal) {
        return {
          found: false,
          message: 'Invitation code not found or expired',
        };
      }
      
      return {
        found: true,
        proposal: {
          businessName: proposal.businessName,
          businessOwnerName: proposal.businessOwnerName,
          eventTitle: proposal.eventTitle,
          eventDate: proposal.eventDate,
          eventLocation: proposal.eventLocation,
          proposedAmount: proposal.proposedAmount,
          contractorsNeeded: proposal.contractorsNeeded,
          message: proposal.message,
          status: proposal.status,
        },
        message: `Invitation from ${proposal.businessName} for ${proposal.eventTitle}`,
      };
    } catch (error) {
      console.error('[FindProposal] Error finding proposal:', error);
      return {
        found: false,
        message: 'Error looking up invitation code',
      };
    }
  });

const sendExternalProposalProcedure = publicProcedure
  .input(sendExternalProposalSchema)
  .mutation(async ({ input }) => {
    const {
      businessOwnerId,
      businessOwnerName,
      businessName,
      businessOwnerContactEmail,
      eventId,
      eventTitle,
      hostName,
      hostEmail,
      hostPhone,
      proposedAmount,
      contractorsNeeded,
      message,
      eventDate,
      eventLocation,
    } = input;

    const results = {
      emailSent: false,
      smsSent: false,
      errors: [] as string[],
    };

    // Generate unique invitation code for the host
    const invitationCode = `HOST_${Date.now()}_${Math.random().toString(36).substring(2, 8).toUpperCase()}`;
    
    // Email content with invitation code
    const replyToEmail = businessOwnerContactEmail || 'noreply@yourdomain.com';
    const emailContent = `
Hello ${hostName},

You have received a business proposal for your event "${eventTitle}"!

Event Details:
• Date: ${eventDate}
• Location: ${eventLocation}

Proposal Details:
• Business: ${businessName}
• Contact: ${businessOwnerName}
• Proposed Amount: ${proposedAmount}
• Contractors Needed: ${contractorsNeeded}

Message from ${businessOwnerName}:
${message}

To review this proposal and manage your events more efficiently, we invite you to download our event management app. With the app, you can:
• Review and respond to proposals instantly
• Manage multiple events in one place
• Coordinate with business owners and contractors
• Track event progress and payments
• Access training materials and resources

Download the app: [App Store Link] | [Google Play Link]

🔑 IMPORTANT: When you sign up, use this invitation code to connect to your proposal:
Invitation Code: ${invitationCode}

This code will automatically connect you to ${businessOwnerName} and load your proposal details.

If you prefer to respond via email, please reply to: ${replyToEmail}

Best regards,
${businessOwnerName}
${businessName}
    `;

    // SMS content (shorter version) with invitation code
    const smsContent = `Hi ${hostName}! ${businessName} sent you a proposal for "${eventTitle}" (${eventDate}). Amount: ${proposedAmount}, ${contractorsNeeded} contractors needed. Download our app and use code: ${invitationCode} to connect. [App Link]`;

    // Send email if provided
    if (hostEmail) {
      try {
        // In a real app, integrate with email service like SendGrid, AWS SES, etc.
        console.log('📧 SENDING EMAIL PROPOSAL:');
        console.log('To:', hostEmail);
        console.log('Subject:', `Business Proposal for ${eventTitle}`);
        console.log('Content:', emailContent);
        
        // Simulate email sending
        await new Promise(resolve => setTimeout(resolve, 1000));
        results.emailSent = true;
        
        // Here you would integrate with your email service:
        // await emailService.send({
        //   to: hostEmail,
        //   subject: `Business Proposal for ${eventTitle}`,
        //   html: emailContent,
        //   from: 'proposals@yourdomain.com',
        //   replyTo: replyToEmail
        // });
        
      } catch (error) {
        console.error('Email sending failed:', error);
        results.errors.push('Failed to send email notification');
      }
    }

    // Send SMS if provided
    if (hostPhone) {
      try {
        // In a real app, integrate with SMS service like Twilio, AWS SNS, etc.
        console.log('📱 SENDING SMS PROPOSAL:');
        console.log('To:', hostPhone);
        console.log('Content:', smsContent);
        
        // Simulate SMS sending
        await new Promise(resolve => setTimeout(resolve, 1000));
        results.smsSent = true;
        
        // Here you would integrate with your SMS service:
        // await smsService.send({
        //   to: hostPhone,
        //   body: smsContent,
        //   from: '+1234567890' // Your Twilio number
        // });
        
      } catch (error) {
        console.error('SMS sending failed:', error);
        results.errors.push('Failed to send SMS notification');
      }
    }

    // Store the proposal in database with invitation code
    const proposalRecord = {
      id: `proposal_${Date.now()}`,
      businessOwnerId,
      businessOwnerName,
      businessName,
      businessOwnerContactEmail,
      eventId,
      eventTitle,
      hostName,
      hostEmail,
      hostPhone,
      proposedAmount,
      contractorsNeeded,
      message,
      eventDate,
      eventLocation,
      status: 'sent',
      createdAt: new Date().toISOString(),
      emailSent: results.emailSent,
      smsSent: results.smsSent,
      invitationCode, // This will connect the host when they sign up
      isExternal: true, // Flag to identify external proposals
    };

    // Store in business directory as external proposal
    try {
      await businessDirectoryRepo.storeExternalProposal(proposalRecord);
      console.log('💾 EXTERNAL PROPOSAL STORED:', proposalRecord.id);
    } catch (error) {
      console.error('Failed to store external proposal:', error);
      results.errors.push('Failed to store proposal record');
    }

    console.log('💾 PROPOSAL RECORD CREATED:', proposalRecord);

    return {
      success: results.emailSent || results.smsSent,
      proposalId: proposalRecord.id,
      invitationCode,
      emailSent: results.emailSent,
      smsSent: results.smsSent,
      errors: results.errors,
      message: results.errors.length > 0 
        ? `Proposal sent with some issues: ${results.errors.join(', ')}`
        : `Proposal sent successfully! Host invitation code: ${invitationCode}`
    };
  });

export default sendExternalProposalProcedure;