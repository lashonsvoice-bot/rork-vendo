import { protectedProcedure } from "@/backend/trpc/create-context";
import { z } from "zod";

// Mock message storage - in production, use a proper database
let messages: any[] = [];

export const getMessagesForUserProcedure = protectedProcedure
  .input(z.object({
    userId: z.string().optional(),
    limit: z.number().max(100).default(50),
    offset: z.number().default(0),
  }))
  .query(async ({ ctx, input }) => {
    if (!ctx.user) {
      throw new Error('User not authenticated');
    }
    
    const userId = input.userId || ctx.user.id;
    
    console.log('[tRPC] Getting messages for user:', userId);
    
    // Filter messages where user is sender or recipient
    const userMessages = messages.filter(message => 
      message.fromUserId === userId || message.toUserId === userId
    );
    
    // Sort by creation date (newest first)
    const sortedMessages = userMessages.sort((a, b) => 
      new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
    );
    
    // Apply pagination
    const paginatedMessages = sortedMessages.slice(input.offset, input.offset + input.limit);
    
    return {
      messages: paginatedMessages,
      total: userMessages.length,
      hasMore: input.offset + input.limit < userMessages.length,
    };
  });

export default getMessagesForUserProcedure;