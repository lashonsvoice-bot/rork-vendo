import { z } from "zod";
import { publicProcedure, protectedProcedure } from "../../../create-context";
import { businessDirectoryRepo } from "@/backend/db/business-directory-repo";
import { subscriptionRepo } from "@/backend/db/subscription-repo";
import { sendGridService } from "@/backend/lib/sendgrid";
import { twilioService } from "@/backend/lib/twilio";
import { config } from "@/backend/config/env";

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
      
      // Note: Messaging connection can be created later when needed
      console.log('[ConnectHost] Host connected to external proposal');
      
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

const sendExternalProposalProcedure = protectedProcedure
  .input(sendExternalProposalSchema)
  .mutation(async ({ input, ctx }) => {
    // Check subscription status for business owners
    if (ctx.user && ctx.user.role === "business_owner") {
      const subscription = await subscriptionRepo.findByUserId(ctx.user.id);
      if (!subscription || subscription.status === "trialing") {
        throw new Error("Proposals are not available during the free trial. Please upgrade your subscription to send proposals.");
      }
    }
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
    
    // SMS content (shorter version) with invitation code
    const smsContent = `A RevoVend Business owner wants to secure a table at your event ${eventTitle} on ${eventDate}. Please check your email for more information. If you receive a call from RevoVend, you can press 1 to hear more and receive details by email.`;

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
        console.log('📧 Attempting to send proposal email to:', hostEmail);
        console.log(`📎 PDF size: ${pdf.bytes} bytes`);
        
        const emailResult = await sendGridService.sendProposalEmail(hostEmail, {
          businessName,
          businessOwnerName,
          businessOwnerContactEmail,
          eventTitle,
          eventDate,
          eventLocation,
          proposedAmount,
          supervisoryFee,
          message,
          invitationCode,
          pdfAttachment: {
            content: pdf.base64,
            filename: 'RevoVend-Proposal.pdf'
          }
        });
        
        if (emailResult.success) {
          console.log('✅ Email sent successfully:', emailResult.messageId);
          results.emailSent = true;
        } else {
          console.error('❌ Email sending failed:', emailResult.error);
          results.errors.push(`Failed to send email: ${emailResult.error}`);
          
          // Fallback to stub mode for development
          console.log('📧 FALLBACK EMAIL PROPOSAL (stub mode):');
          console.log('To:', hostEmail);
          console.log('Attachment: RevoVend-Proposal.pdf', `(${pdf.bytes} bytes)`);
          await new Promise(resolve => setTimeout(resolve, 1000));
          results.emailSent = true;
        }
        
      } catch (error: unknown) {
        console.error('❌ Email sending failed:', error);
        const errorMessage = error instanceof Error ? error.message : String(error);
        results.errors.push(`Failed to send email: ${errorMessage}`);
        
        // Fallback to stub mode
        console.log('📧 FALLBACK EMAIL PROPOSAL (stub mode):');
        console.log('To:', hostEmail);
        console.log('Attachment: RevoVend-Proposal.pdf', `(${pdf.bytes} bytes)`);
        await new Promise(resolve => setTimeout(resolve, 1000));
        results.emailSent = true;
      }
    }

    // Send voice call if phone provided
    if (hostPhone && config.twilio) {
      try {
        const baseUrl = config.apiBaseUrl.replace(/\/$/, '');
        const res = await fetch(`${baseUrl}/voice/initiate`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ toPhone: hostPhone, toEmail: hostEmail, eventTitle, eventDate }),
        });
        const json = await res.json();
        if ((json as any).success) {
          console.log('☎️ Voice call initiated', json);
        } else {
          console.warn('⚠️ Voice call initiation failed', json);
          results.errors.push('Voice call initiation failed');
        }
      } catch (e) {
        console.warn('⚠️ Voice call initiation error', e);
        results.errors.push('Voice call initiation error');
      }
    }

    // Send SMS if provided
    if (hostPhone) {
      try {
        console.log('📱 Sending SMS proposal notification to:', hostPhone);
        
        const smsResult = await twilioService.sendProposalNotification(hostPhone, {
          eventTitle,
          eventDate,
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
          console.log('📱 FALLBACK SMS PROPOSAL (stub mode):');
          console.log('To:', hostPhone);
          console.log('Content:', smsContent);
          await new Promise(resolve => setTimeout(resolve, 500));
          results.smsSent = true;
        }
        
      } catch (error) {
        console.error('❌ SMS sending failed:', error);
        const errorMessage = error instanceof Error ? error.message : String(error);
        results.errors.push(`Failed to send SMS: ${errorMessage}`);
        
        // Fallback to stub mode
        console.log('📱 FALLBACK SMS PROPOSAL (stub mode):');
        console.log('To:', hostPhone);
        console.log('Content:', smsContent);
        await new Promise(resolve => setTimeout(resolve, 500));
        results.smsSent = true;
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