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
    
    let profile = await profileRepo.findByUserId(userId);
    
    // Create a default profile if one doesn't exist
    if (!profile) {
      console.log('[tRPC] Profile not found, creating default profile for user:', userId);
      
      const now = new Date().toISOString();
      const baseProfile = {
        id: `profile_${userId}_${Date.now()}`,
        userId,
        role: ctx.user.role as any,
        createdAt: now,
        updatedAt: now,
      };
      
      // Create role-specific default profile
      if (ctx.user.role === 'business_owner') {
        profile = {
          ...baseProfile,
          role: 'business_owner' as const,
          companyName: ctx.user.name || 'My Company',
          companyWebsite: null,
          description: null,
          location: null,
          phone: null,
          contactEmail: ctx.user.email,
          needs: null,
          companyLogoUrl: null,
          portfolioUrls: null,
          businessType: null,
          einNumber: null,
          dunsNumber: null,
          businessStartDate: null,
          isVerified: false,
          verificationDate: null,
          state: null,
        };
      } else if (ctx.user.role === 'contractor') {
        profile = {
          ...baseProfile,
          role: 'contractor' as const,
          skills: [],
          ratePerHour: null,
          bio: null,
          portfolioUrl: null,
          location: null,
          availability: null,
          resumeUrl: null,
          trainingMaterialsUrls: null,
        };
      } else if (ctx.user.role === 'event_host') {
        profile = {
          ...baseProfile,
          role: 'event_host' as const,
          organizationName: ctx.user.name || 'My Organization',
          eventsHosted: 0,
          interests: null,
          bio: null,
          location: null,
          flyerPhotosUrls: null,
          businessType: null,
          einNumber: null,
          dunsNumber: null,
          businessStartDate: null,
          isVerified: false,
          verificationDate: null,
          logoUrl: null,
          state: null,
        };
      } else {
        // For other roles, create a basic profile
        profile = {
          ...baseProfile,
          role: 'contractor' as const,
          skills: [],
          ratePerHour: null,
          bio: null,
          portfolioUrl: null,
          location: null,
          availability: null,
          resumeUrl: null,
          trainingMaterialsUrls: null,
        };
      }
      
      // Save the new profile
      profile = await profileRepo.upsert(profile);
      console.log('[tRPC] Created default profile:', profile.id);
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