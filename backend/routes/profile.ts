import { Hono } from "hono";
import { z } from "zod";
import { randomUUID } from "node:crypto";
import { profileRepo, type AnyProfile } from "../db/profile-repo";
import type { SessionRole } from "../db/user-repo";

const profile = new Hono();

const roleEnum = z.enum(["business_owner", "contractor", "event_host"] as const);

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
  needs: z.array(z.string()).optional().nullable(),
});

const ContractorSchema = BaseProfileSchema.extend({
  role: z.literal("contractor"),
  skills: z.array(z.string()).default([]),
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

const AnyProfileInput = z.discriminatedUnion("role", [BusinessOwnerSchema, ContractorSchema, EventHostSchema]);

function readSessionUser(c: any): { id: string; role: SessionRole } | null {
  const cookieHeader = c.req.header("cookie") ?? "";
  const match = cookieHeader.split(/;\s*/).find((p: string) => p.startsWith("session="));
  if (!match) return null;
  try {
    const raw = decodeURIComponent(match.split("=")[1] ?? "");
    const json = Buffer.from(raw, "base64").toString("utf8");
    const user = JSON.parse(json) as { id: string; role: SessionRole };
    if (user && user.id) return user;
  } catch {}
  return null;
}

profile.get("/me", async (c) => {
  const session = readSessionUser(c);
  if (!session) return c.json({ error: "Unauthorized" }, 401);
  const prof = await profileRepo.findByUserId(session.id);
  return c.json({ profile: prof });
});

profile.put("/me", async (c) => {
  try {
    const session = readSessionUser(c);
    if (!session) return c.json({ error: "Unauthorized" }, 401);
    const body = await c.req.json();
    const parsed = AnyProfileInput.parse(body);

    if (parsed.role !== session.role) {
      return c.json({ error: "Role mismatch" }, 400);
    }

    const existing = await profileRepo.findByUserId(session.id);
    const now = new Date().toISOString();

    let next: AnyProfile;
    if (existing) {
      next = { ...existing, ...parsed, userId: session.id, updatedAt: now } as AnyProfile;
    } else {
      next = {
        ...(parsed as any),
        id: randomUUID(),
        userId: session.id,
        createdAt: now,
        updatedAt: now,
      } as AnyProfile;
    }

    await profileRepo.upsert(next);
    return c.json({ profile: next });
  } catch (err: any) {
    console.error("PUT /profile/me error", err);
    return c.json({ error: err?.message ?? "Failed to save profile" }, 400);
  }
});

profile.get("/:id", async (c) => {
  const id = c.req.param("id");
  const prof = await profileRepo.findById(id);
  if (!prof) return c.json({ error: "Not found" }, 404);
  return c.json({ profile: prof });
});

profile.get("/role/:role", async (c) => {
  const role = c.req.param("role");
  const parsed = roleEnum.safeParse(role);
  if (!parsed.success) return c.json({ error: "Invalid role" }, 400);
  const q = c.req.query("q") ?? null;
  const offset = Number(c.req.query("offset") ?? 0) || 0;
  const limit = Math.min(100, Number(c.req.query("limit") ?? 50) || 50);
  const list = await profileRepo.listByRole(parsed.data, { q, offset, limit });
  return c.json(list);
});

export default profile;