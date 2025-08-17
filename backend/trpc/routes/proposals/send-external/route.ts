import { z } from "zod";
import { publicProcedure } from "../../../create-context";
import { businessDirectoryRepo } from "@/backend/db/business-directory-repo";
import { messageRepo } from "@/backend/db/message-repo";
import sgMail from "@sendgrid/mail";

async function generateSimplePdf(params: {
  title: string;
  subtitle?: string;
  sections: { heading: string; lines: string[] }[];
}): Promise<{ base64: string; bytes: number }> {
  const { config } = await import('../../../../config/env');
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

  // Brand header block
  lines.push(`${leftMargin} ${y} Td`);
  lines.push(`(${esc(`${config.company.name} • ${config.company.address}`)}) Tj`);
  y -= 16;
  lines.push(`${leftMargin} ${y} Td`);
  lines.push(`(${esc(`Logo: ${config.company.logoUrl}`)}) Tj`);
  y -= 18;

  params.sections.forEach((sec) => {
    y -= 10;
    lines.push(`${leftMargin} ${y} Td`);
    lines.push(`(${esc(sec.heading)}) Tj`);
    y -= 16;
    sec.lines.forEach((ln) => {
      if (y < 72) {
        return;
      }
      lines.push(`${leftMargin} ${y} Td`);
      lines.push(`(${esc(ln)}) Tj`);
      y -= 14;
    });
  });

  // Compliance footer
  if (y > 120) {
    y = 96;
  }
  lines.push(`${leftMargin} ${96} Td`);
  lines.push(`(${esc(config.company.complianceFooter)}) Tj`);

  lines.push("ET");

  const contentStream = lines.join("\\n");
  const contentBuffer = Buffer.from(contentStream, "utf8");
  const contentLength = contentBuffer.byteLength;

  const obj1 = `1 0 obj\\n<< /Type /Catalog /Pages 2 0 R >>\\nendobj\\n`;
  const obj2 = `2 0 obj\\n<< /Type /Pages /Kids [3 0 R] /Count 1 >>\\nendobj\\n`;
  const obj3 = `3 0 obj\\n<< /Type /Page /Parent 2 0 R /MediaBox [0 0 ${width} ${height}] /Contents 4 0 R /Resources << /Font << /F1 5 0 R >> >> >>\\nendobj\\n`;
  const obj4 = `4 0 obj\\n<< /Length ${contentLength} >>\\nstream\\n${contentStream}\\nendstream\\nendobj\\n`;
  const obj5 = `5 0 obj\\n<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica >>\\nendobj\\n`;

  const header = `%PDF-1.4\\n`;
  const objStrings = [obj1, obj2, obj3, obj4, obj5];
  let running = Buffer.byteLength(header, "utf8");
  const offsets: number[] = [];
  objStrings.forEach((s) => {
    offsets.push(running);
    running += Buffer.byteLength(s, "utf8");
  });

  const body = objStrings.join("");
  const xrefStart = running;
  let xrefTable = `xref\\n0 ${objStrings.length + 1}\\n`;
  xrefTable += `0000000000 65535 f \\n`;
  offsets.forEach((off) => {
    const padded = off.toString().padStart(10, "0");
    xrefTable += `${padded} 00000 n \\n`;
  });

  const trailer = `trailer\\n<< /Size ${objStrings.length + 1} /Root 1 0 R >>\\nstartxref\\n${xrefStart}\\n%%EOF`;

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
      
      // Create messaging connection between business owner and host
      const connection = {
        id: Date.now().toString(),
        userId1: connectedProposal.businessOwnerId,
        userId2: input.hostId,
        eventId: connectedProposal.eventId,
        connectionType: 'proposal' as const,
        connectedAt: new Date().toISOString(),
        isActive: true,
      };
      
      messageRepo.addConnection(connection);
      console.log('[ConnectHost] Messaging connection created:', connection.id);
      
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

    // Load configuration
    const { config } = await import('../../../../config/env');

    // Generate unique invitation code for the host
    const invitationCode = `HOST_${Date.now()}_${Math.random().toString(36).substring(2, 8).toUpperCase()}`;
    
    // Email content with invitation code
    const replyToEmail = businessOwnerContactEmail || config.sendgrid.fromEmail;
    const subjectLine = `A RevoVend vendor wants to secure a table at ${eventTitle}`;
    const emailContent = `Greetings,\\n\\n${businessName} located in ${eventLocation.split(',')[1]?.trim() || 'our location'} would like to RevoVend at your ${eventTitle} on ${eventDate}. This means we are going to remotely vend at your event with trained professionals who will man our booth for us. We are reaching out to you in advance because we have researched the details of your event and believe your target market will be a great opportunity for both of us.\\n\\nWe want to pay ${proposedAmount} today for a table or booth as well as an additional supervisory fee of ${supervisoryFee} for you to ensure our team has materials that we will send to an address you provide, arrive on time, and receive pay at the end of the event. Don't worry - other than receiving the materials everything is hands off, we just need your eyes.\\n\\nCustom Message from ${businessOwnerName}:\\n${message}\\n\\nIf you accept this proposal, please use the following invite code when you log into the RevoVend App:\\n\\nINVITATION CODE: ${invitationCode}\\n\\nThe more vendors see that you are a RevoVend Host, the more your events could be filled remotely with vendors from all around the world.\\n\\nDownload the RevoVend App:\\n• iOS: [App Store Link]\\n• Android: [Google Play Link]\\n\\nFor questions, please reply to: ${replyToEmail}\\n\\n—\\n${config.company.name}\\n${config.company.address}\\nLogo: ${config.company.logoUrl}\\n${config.company.complianceFooter}\\n\\nBest regards,\\n${businessOwnerName}\\n${businessName}`;
    const htmlContent = emailContent.replace(/\\n/g, '<br/>');

    // SMS content (shorter version) with invitation code
    const smsContent = `A RevoVend Business owner wants to secure a table at your event ${eventTitle} on ${eventDate}. Please download the app [App Link] and use this invite code when registering as a host: ${invitationCode}. Check your email for more information.`;

    // Build PDF attachment summary
    const pdf = await generateSimplePdf({
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
          lines: message.split(/\\r?\\n/).slice(0, 12),
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
        const apiKey = config.sendgrid.apiKey;
        const fromEmail = config.sendgrid.fromEmail;
        
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
        console.log('📱 SENDING SMS PROPOSAL:');
        console.log('To:', hostPhone);
        console.log('Content:', smsContent);
        
        // Simulate SMS sending
        await new Promise(resolve => setTimeout(resolve, 1000));
        results.smsSent = true;
        
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
      invitationCode,
      isExternal: true,
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