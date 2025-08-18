import { FetchCreateContextFnOptions } from "@trpc/server/adapters/fetch";
import { initTRPC, TRPCError } from "@trpc/server";
import superjson from "superjson";
import type { SessionUser } from "../routes/auth";

export type ContextUser = SessionUser | null;

export const createContext = async (opts: FetchCreateContextFnOptions) => {
  let user: ContextUser = null;
  
  // First try to get session from x-session header (mobile app)
  const sessionHeader = opts.req.headers.get("x-session");
  if (sessionHeader) {
    try {
      const json = Buffer.from(sessionHeader, "base64").toString("utf8");
      const parsed = JSON.parse(json) as SessionUser;
      if (parsed && parsed.id && parsed.email) {
        user = parsed;
        console.log('[tRPC Context] User authenticated via header:', user.email);
      }
    } catch (e) {
      console.error("Failed to parse session header", e);
    }
  }
  
  // Fallback to cookie-based session (web)
  if (!user) {
    const cookieHeader = opts.req.headers.get("cookie") ?? "";
    const match = cookieHeader.split(/;\s*/).find((p) => p.startsWith("session="));
    try {
      if (match) {
        const raw = decodeURIComponent(match.split("=")[1] ?? "");
        const json = Buffer.from(raw, "base64").toString("utf8");
        const parsed = JSON.parse(json) as SessionUser;
        if (parsed && parsed.id && parsed.email) {
          user = parsed;
          console.log('[tRPC Context] User authenticated via cookie:', user.email);
        }
      }
    } catch (e) {
      console.error("Failed to parse session cookie", e);
    }
  }

  return {
    req: opts.req,
    user,
  };
};

export type Context = Awaited<ReturnType<typeof createContext>>;

const t = initTRPC.context<Context>().create({
  transformer: superjson,
});

export const createTRPCRouter = t.router;
export const publicProcedure = t.procedure;
export const protectedProcedure = t.procedure.use(({ ctx, next }) => {
  if (!ctx.user) {
    throw new TRPCError({ code: "UNAUTHORIZED" });
  }
  return next({ ctx });
});