import { protectedProcedure } from "@/backend/trpc/create-context";
import { profileRepo } from "@/backend/db/profile-repo";
import { z } from "zod";

export const getVerificationDiscountProcedure = protectedProcedure
  .input(z.object({
    subscriptionType: z.enum(["monthly", "yearly"]),
    basePrice: z.number(),
  }))
  .query(async ({ ctx, input }) => {
    if (!ctx.user) {
      throw new Error('User not authenticated');
    }
    
    console.log('[tRPC] Getting verification discount for user:', ctx.user.id);
    
    const profile = await profileRepo.findByUserId(ctx.user.id);
    
    let discount = 0;
    let discountedPrice = input.basePrice;
    
    // Check if user is verified and eligible for discount
    if (profile && 
        (profile.role === 'business_owner' || profile.role === 'event_host') &&
        'isVerified' in profile && profile.isVerified &&
        input.subscriptionType === 'yearly') {
      discount = 0.05; // 5% discount
      discountedPrice = input.basePrice * (1 - discount);
    }
    
    return {
      isVerified: profile && 'isVerified' in profile ? profile.isVerified : false,
      discount,
      originalPrice: input.basePrice,
      discountedPrice,
      savings: input.basePrice - discountedPrice,
      eligibleForDiscount: discount > 0,
    };
  });

export default getVerificationDiscountProcedure;