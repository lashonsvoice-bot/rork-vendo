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
    
    // Email content with invitation code (using your template)
    const replyToEmail = businessOwnerContactEmail || 'noreply@revovend.com';
    const emailContent = `
Subject: A RevoVend vendor wants to secure a table at ${eventTitle}

Greetings,

${businessName} located in ${eventLocation.split(',')[1]?.trim() || 'our location'} would like to RevoVend at your ${eventTitle} on ${eventDate}. This means we are going to remotely vend at your event with trained professionals who will man our booth for us. We are reaching out to you in advance because we have researched the details of your event and believe your target market will be a great opportunity for both of us.

We want to pay ${proposedAmount} today for a table or booth as well as an additional fee for you to ensure our contractors have materials that we will send to an address you provide, arrive on time, and receive pay at the end of the event. Don't worry - other than receiving the materials everything is hands off, we just need your eyes.

Custom Message from ${businessOwnerName}:
${message}

If you accept this proposal, please use the following invite code when you log into the RevoVend App:

🔑 INVITATION CODE: ${invitationCode}

The more vendors see that you are a RevoVend Host, the more your events could be filled remotely with vendors from all around the world.

Download the RevoVend App:
• iOS: [App Store Link]
• Android: [Google Play Link]

For questions, please reply to: ${replyToEmail}

Best regards,
${businessOwnerName}
${businessName}
    `;

    // SMS content (shorter version) with invitation code
    const smsContent = `A RevoVend Business owner wants to secure a table at your event ${eventTitle} on ${eventDate}. Please download the app [App Link] and use this invite code when registering as a host: ${invitationCode}. Check your email for more information.`;

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

// Reverse proposal schema for hosts inviting business owners
const sendReverseExternalProposalSchema = z.object({
  hostId: z.string(),
  hostName: z.string(),
  eventId: z.string(),
  eventTitle: z.string(),
  eventDate: z.string(),
  eventLocation: z.string(),
  businessOwnerName: z.string(),
  businessName: z.string(),
  businessOwnerEmail: z.string().email().optional(),
  businessOwnerPhone: z.string().optional(),
  hostContactEmail: z.string().email().optional(),
  tableSpaceOffered: z.string(),
  managementFee: z.number(),
  expectedAttendees: z.string(),
  message: z.string(),
});

// Procedure for hosts to send reverse proposals to business owners
export const sendReverseExternalProposalProcedure = publicProcedure
  .input(sendReverseExternalProposalSchema)
  .mutation(async ({ input }) => {
    const {
      hostId,
      hostName,
      eventId,
      eventTitle,
      eventDate,
      eventLocation,
      businessOwnerName,
      businessName,
      businessOwnerEmail,
      businessOwnerPhone,
      hostContactEmail,
      tableSpaceOffered,
      managementFee,
      expectedAttendees,
      message,
    } = input;

    const results = {
      emailSent: false,
      smsSent: false,
      errors: [] as string[],
    };

    // Generate unique invitation code for the business owner
    const invitationCode = `VENDOR_${Date.now()}_${Math.random().toString(36).substring(2, 8).toUpperCase()}`;
    
    // Email content with invitation code (reverse proposal template)
    const replyToEmail = hostContactEmail || 'noreply@revovend.com';
    const emailContent = `
Subject: RevoVend Host Invitation - Remote Vending Opportunity at ${eventTitle}

Greetings ${businessOwnerName},

I hope this message finds you well! I'm ${hostName}, and I'm hosting ${eventTitle} on ${eventDate} in ${eventLocation}. After researching your business, ${businessName}, I believe your products/services would be a perfect fit for our event attendees.

I'd like to invite you to participate as a remote vendor at our event. Here's what we're offering:

🏢 **Event Details:**
• Event: ${eventTitle}
• Date: ${eventDate}
• Location: ${eventLocation}
• Expected Attendees: ${expectedAttendees}

💼 **What We're Offering:**
• Table/Booth Space: ${tableSpaceOffered}
• Management Fee: ${managementFee} (for overseeing your contractors and ensuring smooth operations)
• Professional oversight of your remote vending setup
• Direct communication throughout the event

📋 **How Remote Vending Works:**
1. You hire and assign professional contractors through RevoVend
2. You ship your materials to our provided address
3. We ensure your contractors arrive on time and are properly set up
4. Your contractors handle sales and customer interactions
5. We oversee the process and provide updates
6. Payment is released to contractors at the end of the event

**Custom Message from ${hostName}:**
${message}

If you're interested in this remote vending opportunity, please download the RevoVend App and use the following invitation code when registering as a business owner:

🔑 INVITATION CODE: ${invitationCode}

This code will automatically connect you to our event proposal and allow us to coordinate the details.

Download the RevoVend App:
• iOS: [App Store Link]
• Android: [Google Play Link]

I'm excited about the possibility of having ${businessName} as part of our event. Remote vending allows you to expand your market reach without the travel costs and time commitment of traditional vending.

For questions, please reply to: ${replyToEmail}

Best regards,
${hostName}
Event Host - ${eventTitle}
    `;

    // SMS content (shorter version) with invitation code
    const smsContent = `${hostName} invites ${businessName} to remote vend at ${eventTitle} on ${eventDate}. Great opportunity! Download RevoVend app [App Link] and use invite code: ${invitationCode} when registering as business owner. Check email for details.`;

    // Send email if provided
    if (businessOwnerEmail) {
      try {
        console.log('📧 SENDING REVERSE PROPOSAL EMAIL:');
        console.log('To:', businessOwnerEmail);
        console.log('Subject:', `Remote Vending Invitation for ${eventTitle}`);
        console.log('Content:', emailContent);
        
        // Simulate email sending
        await new Promise(resolve => setTimeout(resolve, 1000));
        results.emailSent = true;
        
      } catch (error) {
        console.error('Email sending failed:', error);
        results.errors.push('Failed to send email notification');
      }
    }

    // Send SMS if provided
    if (businessOwnerPhone) {
      try {
        console.log('📱 SENDING REVERSE PROPOSAL SMS:');
        console.log('To:', businessOwnerPhone);
        console.log('Content:', smsContent);
        
        // Simulate SMS sending
        await new Promise(resolve => setTimeout(resolve, 1000));
        results.smsSent = true;
        
      } catch (error) {
        console.error('SMS sending failed:', error);
        results.errors.push('Failed to send SMS notification');
      }
    }

    // Store the reverse proposal in database with invitation code
    const reverseProposalRecord = {
      id: `reverse_proposal_${Date.now()}`,
      hostId,
      hostName,
      hostContactEmail,
      eventId,
      eventTitle,
      eventDate,
      eventLocation,
      businessOwnerName,
      businessName,
      businessOwnerEmail,
      businessOwnerPhone,
      tableSpaceOffered,
      managementFee,
      expectedAttendees,
      message,
      status: 'sent',
      createdAt: new Date().toISOString(),
      emailSent: results.emailSent,
      smsSent: results.smsSent,
      invitationCode, // This will connect the business owner when they sign up
      isReverseProposal: true, // Flag to identify reverse proposals
    };

    // Store in business directory as reverse external proposal
    try {
      await businessDirectoryRepo.storeExternalProposal(reverseProposalRecord);
      console.log('💾 REVERSE EXTERNAL PROPOSAL STORED:', reverseProposalRecord.id);
    } catch (error) {
      console.error('Failed to store reverse external proposal:', error);
      results.errors.push('Failed to store proposal record');
    }

    console.log('💾 REVERSE PROPOSAL RECORD CREATED:', reverseProposalRecord);

    return {
      success: results.emailSent || results.smsSent,
      proposalId: reverseProposalRecord.id,
      invitationCode,
      emailSent: results.emailSent,
      smsSent: results.smsSent,
      errors: results.errors,
      message: results.errors.length > 0 
        ? `Reverse proposal sent with some issues: ${results.errors.join(', ')}`
        : `Reverse proposal sent successfully! Business owner invitation code: ${invitationCode}`
    };
  });

// Procedure to connect business owner using invitation code
export const connectBusinessOwnerWithInvitationCodeProcedure = publicProcedure
  .input(z.object({
    invitationCode: z.string().min(1),
    businessOwnerId: z.string().min(1),
  }))
  .mutation(async ({ input }) => {
    console.log('[ConnectBusinessOwner] Connecting business owner with invitation code:', input.invitationCode);
    
    try {
      const connectedProposal = await businessDirectoryRepo.connectBusinessOwnerToReverseProposal(
        input.invitationCode,
        input.businessOwnerId
      );
      
      if (!connectedProposal) {
        throw new Error('Invalid invitation code or proposal not found');
      }
      
      console.log('[ConnectBusinessOwner] Business owner connected successfully:', connectedProposal.id);
      return {
        success: true,
        proposal: connectedProposal,
        message: `Successfully connected to invitation from ${connectedProposal.hostName} for ${connectedProposal.eventTitle}`,
      };
    } catch (error) {
      console.error('[ConnectBusinessOwner] Error connecting business owner:', error);
      throw error;
    }
  });

// Procedure to find reverse proposal by invitation code (for preview)
export const findReverseProposalByCodeProcedure = publicProcedure
  .input(z.object({
    invitationCode: z.string().min(1),
  }))
  .query(async ({ input }) => {
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
          tableSpaceOffered: proposal.tableSpaceOffered,
          managementFee: proposal.managementFee,
          expectedAttendees: proposal.expectedAttendees,
          message: proposal.message,
          status: proposal.status,
        },
        message: `Remote vending invitation from ${proposal.hostName} for ${proposal.eventTitle}`,
      };
    } catch (error) {
      console.error('[FindReverseProposal] Error finding reverse proposal:', error);
      return {
        found: false,
        message: 'Error looking up invitation code',
      };
    }
  });

export default sendExternalProposalProcedure;