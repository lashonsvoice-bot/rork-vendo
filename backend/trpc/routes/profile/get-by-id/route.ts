import { protectedProcedure, publicProcedure } from "@/backend/trpc/create-context";
import { profileRepo } from "@/backend/db/profile-repo";
import { z } from "zod";

export const getProfileByIdProcedure = protectedProcedure
  .input(z.object({
    profileId: z.string(),
  }))
  .query(async ({ ctx, input }) => {
    if (!ctx.user) {
      throw new Error('User not authenticated');
    }
    
    console.log('[tRPC] Getting profile by ID:', input.profileId);
    
    const profile = await profileRepo.findById(input.profileId);
    
    if (!profile) {
      throw new Error('Profile not found');
    }
    
    return profile;
  });

export const getPublicProfileByIdProcedure = publicProcedure
  .input(z.object({
    profileId: z.string(),
  }))
  .query(async ({ input }) => {
    console.log('[tRPC] Getting public profile by ID:', input.profileId);
    
    const profile = await profileRepo.findPublicById(input.profileId);
    
    if (!profile) {
      throw new Error('Profile not found');
    }
    
    return profile;
  });

export default getProfileByIdProcedure;