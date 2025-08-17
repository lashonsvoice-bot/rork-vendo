import { protectedProcedure } from "@/backend/trpc/create-context";
import { z } from "zod";
import { messageRepo } from "@/backend/db/message-repo";

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

    const userMessages = messageRepo.getAllForUser(userId);

    const sortedMessages = userMessages.sort((a, b) =>
      new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
    );

    const paginatedMessages = sortedMessages.slice(input.offset, input.offset + input.limit);

    return {
      messages: paginatedMessages,
      total: userMessages.length,
      hasMore: input.offset + input.limit < userMessages.length,
    };
  });

export default getMessagesForUserProcedure;