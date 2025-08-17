import { protectedProcedure } from "@/backend/trpc/create-context";
import { z } from "zod";

// Mock message storage - in production, use a proper database
let messages: any[] = [];

export const markMessageAsReadProcedure = protectedProcedure
  .input(z.object({
    messageId: z.string(),
  }))
  .mutation(async ({ ctx, input }) => {
    if (!ctx.user) {
      throw new Error('User not authenticated');
    }
    
    console.log('[tRPC] Marking message as read:', input.messageId);
    
    const messageIndex = messages.findIndex(m => m.id === input.messageId);
    
    if (messageIndex === -1) {
      throw new Error('Message not found');
    }
    
    const message = messages[messageIndex];
    
    // Only allow recipient to mark as read
    if (message.toUserId !== ctx.user.id) {
      throw new Error('Not authorized to mark this message as read');
    }
    
    messages[messageIndex] = {
      ...message,
      read: true,
      readAt: new Date().toISOString(),
    };
    
    return messages[messageIndex];
  });

export default markMessageAsReadProcedure;