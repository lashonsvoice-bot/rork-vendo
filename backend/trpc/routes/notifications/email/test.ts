import { z } from 'zod';
import { protectedProcedure } from '@/backend/trpc/create-context';
import { sendGridService } from '@/backend/lib/sendgrid';

export const sendTestEmailProcedure = protectedProcedure
  .input(
    z.object({
      to: z.string().email(),
      subject: z.string().min(1),
      body: z.string().min(1),
      html: z.string().optional(),
      replyTo: z.string().email().optional(),
    })
  )
  .mutation(async ({ input }) => {
    console.log('[EmailTest] Sending test email (no attachment) to', input.to);

    const resp = await sendGridService.sendEmail({
      to: input.to,
      subject: input.subject,
      text: input.body,
      html: input.html ?? input.body.replace(/\n/g, '<br/>'),
      replyTo: input.replyTo,
    });

    if (!resp.success) {
      console.warn('[EmailTest] SendGrid not ready or error occurred, using stub fallback:', resp.error);
      console.log('--- EMAIL STUB START ---');
      console.log('To:', input.to);
      console.log('Subject:', input.subject);
      console.log('Body:', input.body);
      console.log('--- EMAIL STUB END ---');
      await new Promise((r) => setTimeout(r, 500));
      return { success: true, messageId: 'stub-' + Date.now().toString(), fallback: true };
    }

    console.log('[EmailTest] Success, messageId:', resp.messageId);
    return { success: true, messageId: resp.messageId, fallback: false };
  });

export default sendTestEmailProcedure;
