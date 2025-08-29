import { protectedProcedure, publicProcedure, type Context } from "../../../create-context";
import { profileRepo } from "../../../../db/profile-repo";
import { z } from "zod";

export const getProfileByIdProcedure = protectedProcedure
  .input(z.object({
    profileId: z.string(),
  }))
  .query(async ({ ctx, input }: { ctx: Context; input: { profileId: string } }) => {
    if (!ctx.user) {
      throw new Error('User not authenticated');
    }
    
    console.log('[tRPC] Getting profile by ID:', input.profileId, 'Viewer role:', ctx.user.role);
    
    // Use the verification-aware method for hosts and business owners viewing contractors
    const profile = await profileRepo.findByIdWithVerification(input.profileId, ctx.user.role);
    
    if (!profile) {
      throw new Error('Profile not found');
    }
    
    return profile;
  });

export const getPublicProfileByIdProcedure = publicProcedure
  .input(z.object({
    profileId: z.string(),
  }))
  .query(async ({ input }: { input: { profileId: string } }) => {
    console.log('[tRPC] Getting public profile by ID:', input.profileId);
    
    const profile = await profileRepo.findPublicById(input.profileId);
    
    if (!profile) {
      throw new Error('Profile not found');
    }
    
    return profile;
  });

export default getProfileByIdProcedure;