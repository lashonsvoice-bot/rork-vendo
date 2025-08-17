import { protectedProcedure } from "@/backend/trpc/create-context";
import { profileRepo } from "@/backend/db/profile-repo";
import { z } from "zod";

export const profileProcedure = protectedProcedure
  .input(z.object({
    userId: z.string().optional(),
  }))
  .query(async ({ ctx, input }) => {
    if (!ctx.user) {
      throw new Error('User not authenticated');
    }
    
    const userId = input.userId || ctx.user.id;
    
    console.log('[tRPC] Getting profile for user:', userId);
    
    const profile = await profileRepo.findByUserId(userId);
    
    if (!profile) {
      throw new Error('Profile not found');
    }
    
    return {
      ...profile,
      user: {
        id: ctx.user.id,
        name: ctx.user.name,
        email: ctx.user.email,
        role: ctx.user.role,
      },
    };
  });

export default profileProcedure;