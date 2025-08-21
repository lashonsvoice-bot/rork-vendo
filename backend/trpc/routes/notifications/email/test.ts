import { z } from 'zod';
import { protectedProcedure } from '@/backend/trpc/create-context';
import { sendGridService } from '@/backend/lib/sendgrid';

const AttachmentUrlSchema = z.object({
  url: z.string().url(),
  filename: z.string().min(1),
  mimeType: z.string().min(1),
});

const AttachmentContentSchema = z.object({
  contentBase64: z.string().min(1),
  filename: z.string().min(1),
  mimeType: z.string().min(1),
});

export const sendTestEmailProcedure = protectedProcedure
  .input(
    z.object({
      to: z.string().email(),
      subject: z.string().min(1),
      body: z.string().min(1),
      html: z.string().optional(),
      replyTo: z.string().email().optional(),
      attachments: z.array(z.union([AttachmentUrlSchema, AttachmentContentSchema])).optional(),
    })
  )
  .mutation(async ({ input }) => {
    console.log('[EmailTest] Sending test email to', input.to);

    let sgAttachments: { content: string; filename: string; type: string; disposition: string }[] | undefined;

    if (input.attachments && input.attachments.length > 0) {
      console.log(`[EmailTest] Preparing ${input.attachments.length} attachment(s)`);
      const prepared: { content: string; filename: string; type: string; disposition: string }[] = [];

      for (const att of input.attachments) {
        if ('contentBase64' in att) {
          prepared.push({ content: att.contentBase64, filename: att.filename, type: att.mimeType, disposition: 'attachment' });
        } else if ('url' in att) {
          try {
            const res = await fetch(att.url);
            if (!res.ok) throw new Error(`Failed to fetch attachment: ${att.url}`);
            const arrayBuf = await res.arrayBuffer();
            const base64 = Buffer.from(arrayBuf).toString('base64');
            prepared.push({ content: base64, filename: att.filename, type: att.mimeType, disposition: 'attachment' });
          } catch (e) {
            console.warn('[EmailTest] Skipping attachment due to fetch error:', (e as Error).message);
          }
        }
      }

      sgAttachments = prepared.length > 0 ? prepared : undefined;
    }

    const resp = await sendGridService.sendEmail({
      to: input.to,
      subject: input.subject,
      text: input.body,
      html: input.html ?? input.body.replace(/\n/g, '<br/>'),
      replyTo: input.replyTo,
      attachments: sgAttachments,
    });

    if (!resp.success) {
      console.warn('[EmailTest] SendGrid not ready or error occurred, using stub fallback:', resp.error);
      console.log('--- EMAIL STUB START ---');
      console.log('To:', input.to);
      console.log('Subject:', input.subject);
      console.log('Body:', input.body);
      if (sgAttachments) {
        console.log('Attachments:', sgAttachments.map((a) => a.filename));
      }
      console.log('--- EMAIL STUB END ---');
      await new Promise((r) => setTimeout(r, 500));
      return { success: true, messageId: 'stub-' + Date.now().toString(), fallback: true };
    }

    console.log('[EmailTest] Success, messageId:', resp.messageId);
    return { success: true, messageId: resp.messageId, fallback: false };
  });

export default sendTestEmailProcedure;
