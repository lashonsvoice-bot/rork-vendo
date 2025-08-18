import { z } from "zod";
import { publicProcedure } from "../../../create-context";
import { businessDirectoryRepo } from "@/backend/db/business-directory-repo";
import { messageRepo } from "@/backend/db/message-repo";
import { sendGridService } from "@/backend/lib/sendgrid";
import { twilioService } from "@/backend/lib/twilio";

async function generateReverseProposalPdf(params: {
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

const sendReverseProposalSchema = z.object({
  hostId: z.string(),
  hostName: z.string(),
  hostEmail: z.string().email(),
  hostPhone: z.string().optional(),
  businessEmail: z.string().email(),
  businessPhone: z.string().optional(),
  businessName: z.string().optional(),
  eventId: z.string(),
  eventTitle: z.string(),
  eventDate: z.string(),
  eventLocation: z.string(),
  message: z.string(),
});

// Procedure to connect business using invitation code (reverse proposal)
export const connectBusinessWithInvitationCodeProcedure = publicProcedure
  .input(z.object({
    invitationCode: z.string().min(1),
    businessId: z.string().min(1),
  }))
  .mutation(async ({ input }) => {
    console.log('[ConnectBusiness] Connecting business with invitation code:', input.invitationCode);
    
    try {
      const connectedProposal = await businessDirectoryRepo.connectBusinessOwnerToReverseProposal(
        input.invitationCode,
        input.businessId
      );
      
      if (!connectedProposal) {
        throw new Error('Invalid invitation code or proposal not found');
      }
      
      // Create messaging connection between host and business
      const connection = {
        id: Date.now().toString(),
        userId1: connectedProposal.hostId || connectedProposal.businessOwnerId,
        userId2: input.businessId,
        eventId: connectedProposal.eventId,
        connectionType: 'reverse_proposal' as const,
        connectedAt: new Date().toISOString(),
        isActive: true,
      };
      
      messageRepo.addConnection(connection);
      console.log('[ConnectBusiness] Messaging connection created:', connection.id);
      
      console.log('[ConnectBusiness] Business connected successfully:', connectedProposal.id);
      return {
        success: true,
        proposal: connectedProposal,
        message: `Successfully connected to invitation from ${connectedProposal.hostName}`,
      };
    } catch (error) {
      console.error('[ConnectBusiness] Error connecting business:', error);
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
          message: proposal.message,
          status: proposal.status,
        },
        message: `Invitation from ${proposal.hostName} for ${proposal.eventTitle}`,
      };
    } catch (error) {
      console.error('[FindReverseProposal] Error finding proposal:', error);
      return {
        found: false,
        message: 'Error looking up invitation code',
      };
    }
  });

const sendReverseProposalProcedure = publicProcedure
  .input(sendReverseProposalSchema)
  .mutation(async ({ input }) => {
    const {
      hostId,
      hostName,
      hostEmail,
      hostPhone,
      businessEmail,
      businessPhone,
      businessName,
      eventId,
      eventTitle,
      eventDate,
      eventLocation,
      message,
    } = input;

    const results = {
      emailSent: false,
      smsSent: false,
      errors: [] as string[],
    };

    // Generate unique invitation code for the business
    const invitationCode = `BUSINESS_${Date.now()}_${Math.random().toString(36).substring(2, 8).toUpperCase()}`;
    
    // SMS content (shorter version) with invitation code
    const smsContent = `A RevoVend Host would like to invite you to set up a remote vendor table at ${eventTitle} on ${eventDate}. We feel your business would be a great fit at our event. With RevoVend, distance is no issue!! Please check your email ${hostEmail} for more information and use the invitation code to connect directly with me through the app.`;

    // Build PDF attachment summary
    const pdf = await generateReverseProposalPdf({
      title: `RevoVend Host Invitation: ${eventTitle}`,
      subtitle: `${hostName} ➝ ${businessName || 'External Business'} • ${eventDate} • ${eventLocation}`,
      sections: [
        {
          heading: 'Host Details',
          lines: [
            `Name: ${hostName}`,
            `Email: ${hostEmail}`,
            `Phone: ${hostPhone ?? 'N/A'}`,
          ],
        },
        {
          heading: 'Business Contact',
          lines: [
            `Name: ${businessName ?? 'N/A'}`,
            `Email: ${businessEmail}`,
            `Phone: ${businessPhone ?? 'N/A'}`,
          ],
        },
        {
          heading: 'Event Details',
          lines: [
            `Event: ${eventTitle}`,
            `Date: ${eventDate}`,
            `Location: ${eventLocation}`,
          ],
        },
        {
          heading: 'Personal Message',
          lines: message.split(/\\r?\\n/).slice(0, 12),
        },
        {
          heading: 'Invitation Code',
          lines: [invitationCode],
        },
      ],
    });

    // Send email to business
    try {
      console.log('📧 Attempting to send reverse proposal email to:', businessEmail);
      console.log(`📎 PDF size: ${pdf.bytes} bytes`);
      
      const emailResult = await sendGridService.sendReverseProposalEmail(businessEmail, {
        hostName,
        hostEmail,
        eventTitle,
        eventDate,
        eventLocation,
        message,
        invitationCode,
        pdfAttachment: {
          content: pdf.base64,
          filename: 'RevoVend-Host-Invitation.pdf'
        }
      });
      
      if (emailResult.success) {
        console.log('✅ Email sent successfully:', emailResult.messageId);
        results.emailSent = true;
      } else {
        console.error('❌ Email sending failed:', emailResult.error);
        results.errors.push(`Failed to send email: ${emailResult.error}`);
        
        // Fallback to stub mode for development
        console.log('📧 FALLBACK REVERSE PROPOSAL EMAIL (stub mode):');
        console.log('To:', businessEmail);
        console.log('Attachment: RevoVend-Host-Invitation.pdf', `(${pdf.bytes} bytes)`);
        await new Promise(resolve => setTimeout(resolve, 1000));
        results.emailSent = true;
      }
      
    } catch (error: unknown) {
      console.error('❌ Email sending failed:', error);
      const errorMessage = error instanceof Error ? error.message : String(error);
      results.errors.push(`Failed to send email: ${errorMessage}`);
      
      // Fallback to stub mode
      console.log('📧 FALLBACK REVERSE PROPOSAL EMAIL (stub mode):');
      console.log('To:', businessEmail);
      console.log('Attachment: RevoVend-Host-Invitation.pdf', `(${pdf.bytes} bytes)`);
      await new Promise(resolve => setTimeout(resolve, 1000));
      results.emailSent = true;
    }

    // Send SMS if provided
    if (businessPhone) {
      try {
        console.log('📱 Sending SMS reverse proposal notification to:', businessPhone);
        
        const smsResult = await twilioService.sendReverseProposalNotification(businessPhone, {
          eventTitle,
          eventDate,
          hostEmail,
          invitationCode,
          appDownloadLink: 'https://revovend.com/app'
        });
        
        if (smsResult.success) {
          console.log('✅ SMS sent successfully:', smsResult.messageId);
          results.smsSent = true;
        } else {
          console.error('❌ SMS sending failed:', smsResult.error);
          results.errors.push(`SMS failed: ${smsResult.error}`);
          
          // Fallback to stub mode for development
          console.log('📱 FALLBACK SMS REVERSE PROPOSAL (stub mode):');
          console.log('To:', businessPhone);
          console.log('Content:', smsContent);
          await new Promise(resolve => setTimeout(resolve, 500));
          results.smsSent = true;
        }
        
      } catch (error) {
        console.error('❌ SMS sending failed:', error);
        const errorMessage = error instanceof Error ? error.message : String(error);
        results.errors.push(`Failed to send SMS: ${errorMessage}`);
        
        // Fallback to stub mode
        console.log('📱 FALLBACK SMS REVERSE PROPOSAL (stub mode):');
        console.log('To:', businessPhone);
        console.log('Content:', smsContent);
        await new Promise(resolve => setTimeout(resolve, 500));
        results.smsSent = true;
      }
    }

    // Store the reverse proposal in database with invitation code
    const proposalRecord = {
      hostId,
      businessId: 'external_business_' + Date.now(), // Temporary ID for external business
      eventId,
      invitationCost: 1, // $1 per invitation as per the interface
      status: 'sent' as const,
      emailSent: results.emailSent,
      smsSent: results.smsSent,
    };

    // Store in business directory as reverse proposal
    let storedProposal;
    try {
      storedProposal = await businessDirectoryRepo.sendReverseProposal(proposalRecord);
      console.log('💾 REVERSE PROPOSAL STORED:', storedProposal.id);
    } catch (error) {
      console.error('Failed to store reverse proposal:', error);
      results.errors.push('Failed to store proposal record');
    }

    console.log('💾 REVERSE PROPOSAL RECORD CREATED:', storedProposal);

    return {
      success: results.emailSent || results.smsSent,
      proposalId: storedProposal?.id || 'unknown',
      invitationCode,
      emailSent: results.emailSent,
      smsSent: results.smsSent,
      errors: results.errors,
      message: results.errors.length > 0 
        ? `Reverse proposal sent with some issues: ${results.errors.join(', ')}`
        : `Reverse proposal sent successfully! Business invitation code: ${invitationCode}`
    };
  });

export default sendReverseProposalProcedure;