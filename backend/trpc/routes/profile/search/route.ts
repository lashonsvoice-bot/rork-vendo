import { protectedProcedure, publicProcedure } from "../../create-context";
import { profileRepo } from "../../../db/profile-repo";
import { type SessionRole } from "../../../db/user-repo";
import { z } from "zod";

const searchInput = z.object({
  role: z.enum(["business_owner", "contractor", "event_host"]),
  q: z.string().optional(),
  offset: z.number().default(0),
  limit: z.number().max(100).default(50),
});

export const searchProfilesProcedure = protectedProcedure
  .input(searchInput)
  .query(async ({ ctx, input }) => {
    if (!ctx.user) {
      throw new Error('User not authenticated');
    }
    
    console.log('[tRPC] Searching profiles:', input);
    
    const result = await profileRepo.listByRole(input.role as SessionRole, {
      q: input.q,
      offset: input.offset,
      limit: input.limit,
    });
    
    return result;
  });

export const searchPublicProfilesProcedure = publicProcedure
  .input(searchInput)
  .query(async ({ input }) => {
    console.log('[tRPC] Searching public profiles:', input);
    
    const result = await profileRepo.listPublicByRole(input.role as SessionRole, {
      q: input.q,
      offset: input.offset,
      limit: input.limit,
    });
    
    return result;
  });

export default searchProfilesProcedure;