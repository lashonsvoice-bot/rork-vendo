import { z } from "zod";
import { publicProcedure } from "../../../create-context";

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

    // Email content
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

If you prefer to respond via email, please reply to: ${replyToEmail}

Best regards,
${businessOwnerName}
${businessName}
    `;

    // SMS content (shorter version)
    const smsContent = `Hi ${hostName}! ${businessName} sent you a proposal for "${eventTitle}" (${eventDate}). Amount: $${proposedAmount}, ${contractorsNeeded} contractors needed. Download our app to review: [App Link] or reply to this text.`;

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

    // Store the proposal in database (in a real app)
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
    };

    console.log('💾 PROPOSAL RECORD CREATED:', proposalRecord);

    return {
      success: results.emailSent || results.smsSent,
      proposalId: proposalRecord.id,
      emailSent: results.emailSent,
      smsSent: results.smsSent,
      errors: results.errors,
      message: results.errors.length > 0 
        ? `Proposal sent with some issues: ${results.errors.join(', ')}`
        : 'Proposal sent successfully!'
    };
  });

export default sendExternalProposalProcedure;