import { Hono } from "hono";
import { setCookie, deleteCookie } from "hono/cookie";
import { z } from "zod";
import { randomUUID, createHash } from "node:crypto";
import { userRepo, type UserRecord, type SessionRole } from "../db/user-repo";
import { profileRepo, type AnyProfile } from "../db/profile-repo";

// In-memory store for password reset tokens (in production, use Redis or database)
const resetTokens = new Map<string, { userId: string; expires: number }>();

export type SessionUser = { id: string; email: string; name: string; role: SessionRole };

const auth = new Hono();

const BaseProfileSchema = z.object({
  id: z.string().uuid().optional(),
  createdAt: z.string().optional(),
  updatedAt: z.string().optional(),
});

const BusinessOwnerSchema = BaseProfileSchema.extend({
  role: z.literal("business_owner"),
  companyName: z.string().min(1).optional(),
  companyWebsite: z.string().url().optional().nullable(),
  description: z.string().optional().nullable(),
  location: z.string().optional().nullable(),
  phone: z.string().optional().nullable(),
  needs: z.array(z.string()).optional().nullable(),
});

const ContractorSchema = BaseProfileSchema.extend({
  role: z.literal("contractor"),
  skills: z.array(z.string()).optional(),
  ratePerHour: z.number().optional().nullable(),
  bio: z.string().optional().nullable(),
  portfolioUrl: z.string().url().optional().nullable(),
  location: z.string().optional().nullable(),
  availability: z.enum(["full_time", "part_time", "contract"]).optional().nullable(),
});

const EventHostSchema = BaseProfileSchema.extend({
  role: z.literal("event_host"),
  organizationName: z.string().optional().nullable(),
  eventsHosted: z.number().optional().nullable(),
  interests: z.array(z.string()).optional().nullable(),
  bio: z.string().optional().nullable(),
  location: z.string().optional().nullable(),
});

const AnyProfileSignupInput = z.discriminatedUnion("role", [BusinessOwnerSchema, ContractorSchema, EventHostSchema]);

const SignupSchema = z.object({
  email: z.string().email(),
  password: z.string().min(6),
  name: z.string().min(1),
  role: z.enum(["business_owner", "contractor", "event_host", "admin"]),
  profile: AnyProfileSignupInput.optional(),
});

const SigninSchema = z.object({
  email: z.string().email(),
  password: z.string().min(6),
});

const GuestSigninSchema = z.object({
  email: z.string().email(),
  agreeToNewsletter: z.boolean().optional(),
});

const ForgotPasswordSchema = z.object({
  email: z.string().email(),
});

const ResetPasswordSchema = z.object({
  token: z.string(),
  password: z.string().min(6),
});

function hashPassword(password: string): string {
  return createHash("sha256").update(password).digest("hex");
}

function toSessionUser(u: UserRecord): SessionUser {
  return { id: u.id, email: u.email, name: u.name, role: u.role };
}

function setSession(c: any, user: SessionUser) {
  const userJson = JSON.stringify(user);
  const value = typeof Buffer !== 'undefined' 
    ? Buffer.from(userJson, "utf8").toString("base64")
    : btoa(userJson); // Web fallback
  const isHttps = ((): boolean => {
    try {
      const u = new URL(c.req.url);
      return u.protocol === "https:";
    } catch {
      return false;
    }
  })();
  setCookie(c, "session", value, {
    httpOnly: false,
    secure: isHttps,
    sameSite: isHttps ? "None" : "Lax",
    path: "/",
    maxAge: 60 * 60 * 24 * 7,
  });
}

auth.post("/signup", async (c) => {
  try {
    const body = await c.req.json();
    const parsed = SignupSchema.parse(body);

    const existing = await userRepo.findByEmail(parsed.email);
    if (existing) {
      return c.json({ error: "Email already in use" }, 400);
    }

    const record: UserRecord = {
      id: randomUUID(),
      email: parsed.email.toLowerCase(),
      name: parsed.name,
      role: parsed.role,
      passwordHash: hashPassword(parsed.password),
      createdAt: new Date().toISOString(),
    };
    await userRepo.insert(record);

    const sessionUser = toSessionUser(record);
    setSession(c, sessionUser);
    
    // Only create profile for non-admin users
    if (record.role !== "admin") {
      const now = new Date().toISOString();
      let profile: AnyProfile;
      if (parsed.profile && parsed.profile.role === record.role) {
        const base = parsed.profile as any;
        profile = {
          ...base,
          id: randomUUID(),
          userId: record.id,
          role: record.role as any,
          createdAt: now,
          updatedAt: now,
          ...(record.role === "business_owner"
            ? { companyName: base?.companyName ?? record.name }
            : record.role === "contractor"
            ? { skills: base?.skills ?? [] }
            : {}),
        } as AnyProfile;
      } else {
        profile = (
          record.role === "business_owner"
            ? { id: randomUUID(), userId: record.id, role: "business_owner", companyName: record.name, createdAt: now, updatedAt: now }
            : record.role === "contractor"
            ? { id: randomUUID(), userId: record.id, role: "contractor", skills: [], createdAt: now, updatedAt: now }
            : { id: randomUUID(), userId: record.id, role: "event_host", organizationName: record.name, createdAt: now, updatedAt: now }
        ) as AnyProfile;
      }
      await profileRepo.upsert(profile);
      return c.json({ user: sessionUser, profile });
    } else {
      return c.json({ user: sessionUser });
    }
  } catch (err: any) {
    console.error("/auth/signup error", err);
    return c.json({ error: err?.message ?? "Signup failed" }, 400);
  }
});

auth.post("/signin", async (c) => {
  try {
    const body = await c.req.json();
    const parsed = SigninSchema.parse(body);

    const user = await userRepo.findByEmail(parsed.email);
    if (!user) {
      return c.json({ error: "Invalid credentials" }, 401);
    }
    const ok = user.passwordHash === hashPassword(parsed.password);
    if (!ok) {
      return c.json({ error: "Invalid credentials" }, 401);
    }
    
    // Check for hidden admin access
    let sessionUser = toSessionUser(user);
    const adminEmails = ['lashonsvoice@gmail.com', 'revovend1@gmail.com'];
    if (adminEmails.includes(user.email.toLowerCase()) && user.role === 'business_owner') {
      // Grant admin privileges to these specific business accounts
      sessionUser = { ...sessionUser, role: 'admin' };
    }
    
    setSession(c, sessionUser);
    return c.json({ user: sessionUser });
  } catch (err: any) {
    console.error("/auth/signin error", err);
    return c.json({ error: err?.message ?? "Signin failed" }, 400);
  }
});

auth.post("/signout", (c) => {
  deleteCookie(c, "session", { path: "/" });
  return c.json({ ok: true });
});

auth.get("/session", (c) => {
  const cookieHeader = c.req.header("cookie") ?? "";
  const match = cookieHeader.split(/;\s*/).find((p) => p.startsWith("session="));
  if (!match) return c.json({ user: null });
  try {
    const raw = decodeURIComponent(match.split("=")[1] ?? "");
    const json = typeof Buffer !== 'undefined' 
      ? Buffer.from(raw, "base64").toString("utf8")
      : atob(raw); // Web fallback
    const user = JSON.parse(json) as SessionUser;
    return c.json({ user });
  } catch {
    return c.json({ user: null });
  }
});

auth.get("/user", async (c) => {
  const cookieHeader = c.req.header("cookie") ?? "";
  const match = cookieHeader.split(/;\s*/).find((p) => p.startsWith("session="));
  if (!match) return c.json({ user: null }, 401);
  try {
    const raw = decodeURIComponent(match.split("=")[1] ?? "");
    const json = typeof Buffer !== 'undefined' 
      ? Buffer.from(raw, "base64").toString("utf8")
      : atob(raw); // Web fallback
    const sessionUser = JSON.parse(json) as SessionUser;
    const record = await userRepo.findById(sessionUser.id);
    if (!record) return c.json({ user: null }, 401);
    return c.json({ user: toSessionUser(record) });
  } catch {
    return c.json({ user: null }, 401);
  }
});

// Send password reset email
auth.post("/forgot-password", async (c) => {
  try {
    const body = await c.req.json();
    const parsed = ForgotPasswordSchema.parse(body);

    const user = await userRepo.findByEmail(parsed.email);
    if (!user) {
      // Don't reveal if email exists or not for security
      return c.json({ message: "If an account with that email exists, we've sent a password reset link." });
    }

    // Generate reset token
    const token = randomUUID();
    const expires = Date.now() + 60 * 60 * 1000; // 1 hour
    resetTokens.set(token, { userId: user.id, expires });

    // In a real app, you would send an email here
    // For now, we'll just log the reset link
    console.log(`Password reset link for ${user.email}: /auth/reset-password?token=${token}`);
    
    // Simulate email sending delay
    await new Promise(resolve => setTimeout(resolve, 1000));

    return c.json({ message: "If an account with that email exists, we've sent a password reset link." });
  } catch (err: any) {
    console.error("/auth/forgot-password error", err);
    return c.json({ error: err?.message ?? "Failed to process request" }, 400);
  }
});

// Reset password with token
auth.post("/reset-password", async (c) => {
  try {
    const body = await c.req.json();
    const parsed = ResetPasswordSchema.parse(body);

    const tokenData = resetTokens.get(parsed.token);
    if (!tokenData || tokenData.expires < Date.now()) {
      return c.json({ error: "Invalid or expired reset token" }, 400);
    }

    const user = await userRepo.findById(tokenData.userId);
    if (!user) {
      return c.json({ error: "User not found" }, 404);
    }

    // Update password
    const updatedUser = {
      ...user,
      passwordHash: hashPassword(parsed.password),
    };
    await userRepo.update(updatedUser);

    // Remove used token
    resetTokens.delete(parsed.token);

    return c.json({ message: "Password reset successfully" });
  } catch (err: any) {
    console.error("/auth/reset-password error", err);
    return c.json({ error: err?.message ?? "Failed to reset password" }, 400);
  }
});

// Verify reset token
auth.post("/guest-signin", async (c) => {
  try {
    const body = await c.req.json();
    const parsed = GuestSigninSchema.parse(body);

    // Check if user already exists
    let user = await userRepo.findByEmail(parsed.email);
    
    if (!user) {
      // Create a guest user record
      const record: UserRecord = {
        id: randomUUID(),
        email: parsed.email.toLowerCase(),
        name: "Guest User",
        role: "guest",
        passwordHash: "", // No password for guest users
        createdAt: new Date().toISOString(),
      };
      await userRepo.insert(record);
      user = record;
    }
    
    // Log newsletter agreement if provided
    if (parsed.agreeToNewsletter) {
      console.log(`Newsletter signup: ${user.email} at ${new Date().toISOString()}`);
    }
    
    const sessionUser = toSessionUser(user);
    setSession(c, sessionUser);
    return c.json({ user: sessionUser });
  } catch (err: any) {
    console.error("/auth/guest-signin error", err);
    return c.json({ error: err?.message ?? "Guest signin failed" }, 400);
  }
});

auth.get("/verify-reset-token/:token", async (c) => {
  try {
    const token = c.req.param("token");
    const tokenData = resetTokens.get(token);
    
    if (!tokenData || tokenData.expires < Date.now()) {
      return c.json({ valid: false });
    }

    const user = await userRepo.findById(tokenData.userId);
    if (!user) {
      return c.json({ valid: false });
    }

    return c.json({ valid: true, email: user.email });
  } catch (err: any) {
    console.error("/auth/verify-reset-token error", err);
    return c.json({ valid: false });
  }
});

// Clean up expired tokens periodically
setInterval(() => {
  const now = Date.now();
  for (const [token, data] of resetTokens.entries()) {
    if (data.expires < now) {
      resetTokens.delete(token);
    }
  }
}, 5 * 60 * 1000); // Clean up every 5 minutes

export default auth;