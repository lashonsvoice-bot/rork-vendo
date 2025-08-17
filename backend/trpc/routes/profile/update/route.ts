import { protectedProcedure } from "@/backend/trpc/create-context";
import { profileRepo, type AnyProfile } from "@/backend/db/profile-repo";
import { z } from "zod";
import { randomUUID } from "node:crypto";

const BaseProfileSchema = z.object({
  id: z.string().uuid().optional(),
  createdAt: z.string().optional(),
  updatedAt: z.string().optional(),
});

const BusinessOwnerSchema = BaseProfileSchema.extend({
  role: z.literal("business_owner"),
  companyName: z.string().min(1),
  companyWebsite: z.string().url().optional().nullable(),
  description: z.string().optional().nullable(),
  location: z.string().optional().nullable(),
  phone: z.string().optional().nullable(),
  contactEmail: z.string().email().optional().nullable(),
  needs: z.array(z.string()).optional().nullable(),
  companyLogoUrl: z.string().optional().nullable(),
  portfolioUrls: z.array(z.string()).optional().nullable(),
  businessType: z.enum(["llc", "sole_proprietor", "corporation", "partnership", "other"]).optional().nullable(),
  einNumber: z.string().optional().nullable(),
  dunsNumber: z.string().optional().nullable(),
  businessStartDate: z.string().optional().nullable(),
  isVerified: z.boolean().optional(),
  verificationDate: z.string().optional().nullable(),
});

const ContractorSchema = BaseProfileSchema.extend({
  role: z.literal("contractor"),
  skills: z.array(z.string()).default([]),
  ratePerHour: z.number().optional().nullable(),
  bio: z.string().optional().nullable(),
  portfolioUrl: z.string().url().optional().nullable(),
  location: z.string().optional().nullable(),
  availability: z.enum(["full_time", "part_time", "contract"]).optional().nullable(),
  resumeUrl: z.string().optional().nullable(),
  trainingMaterialsUrls: z.array(z.string()).optional().nullable(),
});

const EventHostSchema = BaseProfileSchema.extend({
  role: z.literal("event_host"),
  organizationName: z.string().optional().nullable(),
  eventsHosted: z.number().optional().nullable(),
  interests: z.array(z.string()).optional().nullable(),
  bio: z.string().optional().nullable(),
  location: z.string().optional().nullable(),
  flyerPhotosUrls: z.array(z.string()).optional().nullable(),
  businessType: z.enum(["llc", "sole_proprietor", "corporation", "partnership", "other"]).optional().nullable(),
  einNumber: z.string().optional().nullable(),
  dunsNumber: z.string().optional().nullable(),
  businessStartDate: z.string().optional().nullable(),
  isVerified: z.boolean().optional(),
  verificationDate: z.string().optional().nullable(),
});

const AnyProfileInput = z.discriminatedUnion("role", [BusinessOwnerSchema, ContractorSchema, EventHostSchema]);

export const updateProfileProcedure = protectedProcedure
  .input(AnyProfileInput)
  .mutation(async ({ ctx, input }) => {
    if (!ctx.user) {
      throw new Error('User not authenticated');
    }
    
    if (input.role !== ctx.user.role) {
      throw new Error('Role mismatch');
    }
    
    console.log('[tRPC] Updating profile for user:', ctx.user.id);
    
    const existing = await profileRepo.findByUserId(ctx.user.id);
    const now = new Date().toISOString();
    
    let profile: AnyProfile;
    if (existing) {
      profile = { ...existing, ...input, userId: ctx.user.id, updatedAt: now } as AnyProfile;
      
      // Auto-verify if complete business verification info is provided
      if ((input.role === 'business_owner' || input.role === 'event_host') && 
          'businessType' in input && 'einNumber' in input && 'dunsNumber' in input && 'businessStartDate' in input &&
          input.businessType && input.einNumber && input.dunsNumber && input.businessStartDate && 
          'isVerified' in existing && !existing.isVerified) {
        (profile as any).isVerified = true;
        (profile as any).verificationDate = now;
      }
    } else {
      const newProfile = {
        ...(input as any),
        id: randomUUID(),
        userId: ctx.user.id,
        createdAt: now,
        updatedAt: now,
      } as AnyProfile;
      
      // Auto-verify if complete business verification info is provided
      if ((input.role === 'business_owner' || input.role === 'event_host') && 
          'businessType' in input && 'einNumber' in input && 'dunsNumber' in input && 'businessStartDate' in input &&
          input.businessType && input.einNumber && input.dunsNumber && input.businessStartDate) {
        (newProfile as any).isVerified = true;
        (newProfile as any).verificationDate = now;
      }
      
      profile = newProfile;
    }
    
    await profileRepo.upsert(profile);
    
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

export default updateProfileProcedure;