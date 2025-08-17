import { protectedProcedure } from "@/backend/trpc/create-context";
import { z } from "zod";
import { messageRepo, MessageSchema, type Message } from "@/backend/db/message-repo";

export const sendMessageProcedure = protectedProcedure
  .input(z.object({
    recipientId: z.string(),
    subject: z.string(),
    content: z.string(),
    type: z.enum(['general', 'proposal', 'coordination', 'hiring']).default('general'),
    eventId: z.string().optional(),
    attachments: z.array(z.string()).optional(),
  }))
  .mutation(async ({ ctx, input }) => {
    if (!ctx.user) {
      throw new Error('User not authenticated');
    }

    console.log('[tRPC] Sending message:', input);

    const message: Message = MessageSchema.parse({
      id: Date.now().toString(),
      fromUserId: ctx.user.id,
      fromUserName: ctx.user.name,
      fromUserRole: ctx.user.role,
      toUserId: input.recipientId,
      subject: input.subject,
      content: input.content,
      type: input.type,
      eventId: input.eventId,
      attachments: input.attachments ?? [],
      status: 'sent',
      createdAt: new Date().toISOString(),
      read: false,
    });

    return messageRepo.add(message);
  });

export default sendMessageProcedure;