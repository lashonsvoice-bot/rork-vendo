import { protectedProcedure } from "@/backend/trpc/create-context";
import { z } from "zod";
import { messageRepo } from "@/backend/db/message-repo";

export const markMessageAsReadProcedure = protectedProcedure
  .input(z.object({
    messageId: z.string(),
  }))
  .mutation(async ({ ctx, input }) => {
    if (!ctx.user) {
      throw new Error('User not authenticated');
    }

    console.log('[tRPC] Marking message as read:', input.messageId);

    const updated = messageRepo.markRead(input.messageId, ctx.user.id);
    if (!updated) {
      throw new Error('Message not found or not authorized');
    }

    return updated;
  });

export default markMessageAsReadProcedure;