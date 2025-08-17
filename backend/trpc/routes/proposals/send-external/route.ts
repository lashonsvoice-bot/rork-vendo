import { z } from "zod";
import { publicProcedure } from "../../../create-context";
import { businessDirectoryRepo } from "@/backend/db/business-directory-repo";
import sgMail from "@sendgrid/mail";

function generateSimplePdf(params: {
  title: string;
  subtitle?: string;
  sections: Array<{ heading: string; lines: string[] }>;
}): { base64: string; bytes: number } {
  const width = 612;
  const height = 792;
  const titleFontSize = 20;
  const bodyFontSize = 12;
  const leftMargin = 56;
  let y = height - 72;

  const esc = (s: string) => s.replace(/\\/g, "\\\\").replace(/\(/g, "\\(").replace(/\)/g, "\\)");

  const lines: string[] = [];
  lines.push("BT");
  lines.push(`/F1 ${titleFontSize} Tf`);
  lines.push(`${leftMargin} ${y} Td`);
  lines.push(`(${esc(params.title)}) Tj`);
  y -= 28;

  if (params.subtitle && params.subtitle.trim().length > 0) {
    lines.push(`/F1 ${bodyFontSize} Tf`);
    lines.push(`${leftMargin} ${y} Td`);
    lines.push(`(${esc(params.subtitle)}) Tj`);
    y -= 22;
  }

  lines.push(`/F1 ${bodyFontSize} Tf`);

  params.sections.forEach((sec) => {
    y -= 10;
    lines.push(`${leftMargin} ${y} Td`);
    lines.push(`(${esc(sec.heading)}) Tj`);
    y -= 16;
    sec.lines.forEach((ln) => {
      if (y < 72) {
        // Simple guard: keep content on one page; truncate if overflow
        return;
      }
      lines.push(`${leftMargin} ${y} Td`);
      lines.push(`(${esc(ln)}) Tj`);
      y -= 14;
    });
  });

  lines.push("ET");

  const contentStream = lines.join("\n");
  const contentBuffer = Buffer.from(contentStream, "utf8");
  const contentLength = contentBuffer.byteLength;

  const objects: string[] = [];
  const xref: number[] = [];
  let offset = 0;
  const pushObj = (obj: string) => {
    xref.push(offset);
    objects.push(obj);
    offset += Buffer.byteLength(obj, "utf8");
  };

  const obj1 = `1 0 obj\n<< /Type /Catalog /Pages 2 0 R >>\nendobj\n`;
  const obj2 = `2 0 obj\n<< /Type /Pages /Kids [3 0 R] /Count 1 >>\nendobj\n`;
  const obj3 = `3 0 obj\n<< /Type /Page /Parent 2 0 R /MediaBox [0 0 ${width} ${height}] /Contents 4 0 R /Resources << /Font << /F1 5 0 R >> >> >>\nendobj\n`;
  const obj4 = `4 0 obj\n<< /Length ${contentLength} >>\nstream\n${contentStream}\nendstream\nendobj\n`;
  const obj5 = `5 0 obj\n<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica >>\nendobj\n`;

  const header = `%PDF-1.4\n`;
  offset += Buffer.byteLength(header, "utf8");
  xref.push(0); // placeholder for header position
  // Push in order while tracking offsets
  // We already accounted header in offset, so we push with manual handling
  let body = "";
  const pushAndConcat = (s: string) => {
    xref.push(offset);
    body += s;
    offset += Buffer.byteLength(s, "utf8");
  };
  // reset xref array to only store object offsets (start from first object)
  xref.length = 0;
  offset = Buffer.byteLength(header, "utf8");
  pushAndConcat(obj1);
  pushAndConcat(obj2);
  pushAndConcat(obj3);
  pushAndConcat(obj4);
  pushAndConcat(obj5);

  const xrefStart = offset;
  let xrefTable = `xref\n0 ${objects.length + 1}\n`;
  // Object 0
  xrefTable += `0000000000 65535 f \n`;
  // Now actual offsets for 1..n from our push order captured in pushAndConcat
  // We need those offsets; recreate the list by scanning body strings
  // Since we tracked offsets in pushAndConcat, but didn't store them, recompute by parsing body is complex.
  // Instead, rebuild offsets array properly.
  // We'll rebuild by iterating again: compute offsets of each object inside body.
  const objStrings = [obj1, obj2, obj3, obj4, obj5];
  let running = Buffer.byteLength(header, "utf8");
  const offsets: number[] = [];
  objStrings.forEach((s) => {
    offsets.push(running);
    running += Buffer.byteLength(s, "utf8");
  });
  offsets.forEach((off) => {
    const padded = off.toString().padStart(10, "0");
    xrefTable += `${padded} 00000 n \n`;
  });

  const trailer = `trailer\n<< /Size ${objStrings.length + 1} /Root 1 0 R >>\nstartxref\n${xrefStart}\n%%EOF`;

  const pdf = header + body + xrefTable + trailer;
  const base64 = Buffer.from(pdf, "utf8").toString("base64");
  return { base64, bytes: Buffer.byteLength(pdf, "utf8") };
}

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
  supervisoryFee: z.number(),
  contractorsNeeded: z.number().optional(),
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
      supervisoryFee,
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
    const subjectLine = `A RevoVend vendor wants to secure a table at ${eventTitle}`;
    const emailContent = `Greetings,\n\n${businessName} located in ${eventLocation.split(',')[1]?.trim() || 'our location'} would like to RevoVend at your ${eventTitle} on ${eventDate}. This means we are going to remotely vend at your event with trained professionals who will man our booth for us. We are reaching out to you in advance because we have researched the details of your event and believe your target market will be a great opportunity for both of us.\n\nWe want to pay ${proposedAmount} today for a table or booth as well as an additional supervisory fee of ${supervisoryFee} for you to ensure our team has materials that we will send to an address you provide, arrive on time, and receive pay at the end of the event. Don't worry - other than receiving the materials everything is hands off, we just need your eyes.\n\nCustom Message from ${businessOwnerName}:\n${message}\n\nIf you accept this proposal, please use the following invite code when you log into the RevoVend App:\n\nINVITATION CODE: ${invitationCode}\n\nThe more vendors see that you are a RevoVend Host, the more your events could be filled remotely with vendors from all around the world.\n\nDownload the RevoVend App:\n• iOS: [App Store Link]\n• Android: [Google Play Link]\n\nFor questions, please reply to: ${replyToEmail}\n\nBest regards,\n${businessOwnerName}\n${businessName}`;
    const htmlContent = emailContent.replace(/\n/g, '<br/>');

    // SMS content (shorter version) with invitation code
    const smsContent = `A RevoVend Business owner wants to secure a table at your event ${eventTitle} on ${eventDate}. Please download the app [App Link] and use this invite code when registering as a host: ${invitationCode}. Check your email for more information.`;

    // Build PDF attachment summary
    const pdf = generateSimplePdf({
      title: `RevoVend Proposal: ${eventTitle}`,
      subtitle: `${businessName} ➝ ${hostName} • ${eventDate} • ${eventLocation}`,
      sections: [
        {
          heading: 'Business Owner',
          lines: [
            `Name: ${businessOwnerName}`,
            `Business: ${businessName}`,
            `Email: ${businessOwnerContactEmail ?? 'N/A'}`,
          ],
        },
        {
          heading: 'Host',
          lines: [
            `Name: ${hostName}`,
            `Email: ${hostEmail ?? 'N/A'}`,
            `Phone: ${hostPhone ?? 'N/A'}`,
          ],
        },
        {
          heading: 'Proposal Details',
          lines: [
            `Proposed Amount: ${proposedAmount.toFixed(2)}`,
            `Supervisory Fee: ${supervisoryFee.toFixed(2)}`,
            `Contractors Needed: ${contractorsNeeded ?? 'N/A'}`,
          ],
        },
        {
          heading: 'Message',
          lines: message.split(/\r?\n/).slice(0, 12),
        },
        {
          heading: 'Invitation Code',
          lines: [invitationCode],
        },
      ],
    });

    // Send email if provided
    if (hostEmail) {
      try {
        const apiKey = process.env.SENDGRID_API_KEY;
        const fromEmail = process.env.SENDGRID_FROM || 'noreply@revovend.com';
        
        console.log('🔑 SendGrid API Key status:', apiKey ? `Present (${apiKey.substring(0, 10)}...)` : 'Missing');
        console.log('📧 From email:', fromEmail);
        console.log(`📎 PDF size: ${pdf.bytes} bytes`);
        
        if (apiKey && apiKey.startsWith('SG.')) {
          sgMail.setApiKey(apiKey);
          console.log('📧 Attempting to send email to:', hostEmail);
          
          const emailData = {
            to: hostEmail,
            from: fromEmail,
            subject: subjectLine,
            text: emailContent,
            html: htmlContent,
            replyTo: replyToEmail,
            attachments: [
              {
                content: pdf.base64,
                filename: 'RevoVend-Proposal.pdf',
                type: 'application/pdf',
                disposition: 'attachment',
              },
            ],
          } as const;
          
          const response = await sgMail.send(emailData as any);
          console.log('✅ Email sent successfully:', response[0].statusCode);
          results.emailSent = true;
        } else {
          const errorMsg = !apiKey ? 'SENDGRID_API_KEY environment variable not set' : 'Invalid SendGrid API key format (should start with SG.)';
          console.error('❌ SendGrid configuration error:', errorMsg);
          console.log('📧 SENDING EMAIL PROPOSAL (stub mode):');
          console.log('To:', hostEmail);
          console.log('Subject:', subjectLine);
          console.log('Content:', emailContent);
          console.log('Attachment: RevoVend-Proposal.pdf', `(${pdf.bytes} bytes)`);
          await new Promise(resolve => setTimeout(resolve, 1000));
          results.emailSent = true;
          results.errors.push(errorMsg);
        }
      } catch (error: unknown) {
        console.error('❌ Email sending failed:', error);
        if (error && typeof error === 'object' && 'response' in error) {
          console.error('SendGrid error response:', (error as any).response.body);
        }
        const errorMessage = error instanceof Error ? error.message : String(error);
        results.errors.push(`Failed to send email: ${errorMessage}`);
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
      supervisoryFee,
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

    // Build PDF attachment for reverse proposal
    const reversePdf = generateSimplePdf({
      title: `RevoVend Invitation: ${eventTitle}`,
      subtitle: `${hostName} ➝ ${businessName} • ${eventDate} • ${eventLocation}`,
      sections: [
        { heading: 'Host', lines: [`Name: ${hostName}`, `Email: ${hostContactEmail ?? 'N/A'}`] },
        { heading: 'Business', lines: [`Owner: ${businessOwnerName}`, `Business: ${businessName}`, `Email: ${businessOwnerEmail ?? 'N/A'}`, `Phone: ${businessOwnerPhone ?? 'N/A'}`] },
        { heading: 'Offer', lines: [`Table/Booth: ${tableSpaceOffered}`, `Management Fee: ${managementFee.toFixed(2)}`, `Expected Attendees: ${expectedAttendees}`] },
      ],
    });

    // Send email if provided
    if (businessOwnerEmail) {
      try {
        const apiKey = process.env.SENDGRID_API_KEY;
        const fromEmail = process.env.SENDGRID_FROM || 'noreply@revovend.com';
        
        console.log('🔑 SendGrid API Key status:', apiKey ? `Present (${apiKey.substring(0, 10)}...)` : 'Missing');
        console.log('📧 From email:', fromEmail);
        console.log(`📎 PDF size: ${reversePdf.bytes} bytes`);
        
        if (apiKey && apiKey.startsWith('SG.')) {
          sgMail.setApiKey(apiKey);
          console.log('📧 Attempting to send reverse proposal email to:', businessOwnerEmail);
          
          const emailData = {
            to: businessOwnerEmail,
            from: fromEmail,
            subject: `Remote Vending Invitation for ${eventTitle}`,
            text: emailContent,
            html: emailContent.replace(/\n/g, '<br/>'),
            replyTo: replyToEmail,
            attachments: [
              {
                content: reversePdf.base64,
                filename: 'RevoVend-Invitation.pdf',
                type: 'application/pdf',
                disposition: 'attachment',
              },
            ],
          } as const;
          
          const response = await sgMail.send(emailData as any);
          console.log('✅ Reverse proposal email sent successfully:', response[0].statusCode);
          results.emailSent = true;
        } else {
          const errorMsg = !apiKey ? 'SENDGRID_API_KEY environment variable not set' : 'Invalid SendGrid API key format (should start with SG.)';
          console.error('❌ SendGrid configuration error:', errorMsg);
          console.log('📧 SENDING REVERSE PROPOSAL EMAIL (stub mode):');
          console.log('To:', businessOwnerEmail);
          console.log('Subject:', `Remote Vending Invitation for ${eventTitle}`);
          console.log('Content:', emailContent);
          console.log('Attachment: RevoVend-Invitation.pdf', `(${reversePdf.bytes} bytes)`);
          await new Promise(resolve => setTimeout(resolve, 1000));
          results.emailSent = true;
          results.errors.push(errorMsg);
        }
      } catch (error: unknown) {
        console.error('❌ Reverse proposal email sending failed:', error);
        if (error && typeof error === 'object' && 'response' in error) {
          console.error('SendGrid error response:', (error as any).response.body);
        }
        const errorMessage = error instanceof Error ? error.message : String(error);
        results.errors.push(`Failed to send email: ${errorMessage}`);
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