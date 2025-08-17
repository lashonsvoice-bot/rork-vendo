import { FetchCreateContextFnOptions } from "@trpc/server/adapters/fetch";
import { initTRPC, TRPCError } from "@trpc/server";
import superjson from "superjson";
import type { SessionUser } from "../routes/auth";

export type ContextUser = SessionUser | null;

export const createContext = async (opts: FetchCreateContextFnOptions) => {
  const cookieHeader = opts.req.headers.get("cookie") ?? "";
  const match = cookieHeader.split(/;\s*/).find((p) => p.startsWith("session="));
  let user: ContextUser = null;
  try {
    if (match) {
      const raw = decodeURIComponent(match.split("=")[1] ?? "");
      const json = Buffer.from(raw, "base64").toString("utf8");
      const parsed = JSON.parse(json) as SessionUser;
      if (parsed && parsed.id && parsed.email) {
        user = parsed;
      }
    }
  } catch (e) {
    console.error("Failed to parse session cookie", e);
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