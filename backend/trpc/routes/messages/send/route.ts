import { protectedProcedure } from "@/backend/trpc/create-context";
import { z } from "zod";

// Mock message storage - in production, use a proper database
let messages: any[] = [];

export const sendMessageProcedure = protectedProcedure
  .input(z.object({
    recipientId: z.string(),
    subject: z.string(),
    content: z.string(),
    type: z.enum(['general', 'proposal', 'coordination', 'hiring']).default('general'),
    eventId: z.string().optional(),
  }))
  .mutation(async ({ ctx, input }) => {
    if (!ctx.user) {
      throw new Error('User not authenticated');
    }
    
    console.log('[tRPC] Sending message:', input);
    
    const message = {
      id: Date.now().toString(),
      fromUserId: ctx.user.id,
      fromUserName: ctx.user.name,
      fromUserRole: ctx.user.role,
      toUserId: input.recipientId,
      subject: input.subject,
      content: input.content,
      type: input.type,
      eventId: input.eventId,
      status: 'sent',
      createdAt: new Date().toISOString(),
      read: false,
    };
    
    messages.push(message);
    
    return message;
  });

export default sendMessageProcedure;