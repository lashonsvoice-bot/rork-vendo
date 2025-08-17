import { promises as fs } from "node:fs";
import path from "node:path";
import type { SessionRole } from "./user-repo";

export type ProfileBase = {
  id: string;
  userId: string;
  role: SessionRole;
  createdAt: string;
  updatedAt: string;
};

export type BusinessOwnerProfile = ProfileBase & {
  role: "business_owner";
  companyName: string;
  companyWebsite?: string | null;
  description?: string | null;
  location?: string | null;
  phone?: string | null;
  contactEmail?: string | null;
  needs?: string[] | null;
  companyLogoUrl?: string | null;
  portfolioUrls?: string[] | null;
  businessType?: "llc" | "sole_proprietor" | "corporation" | "partnership" | "other" | null;
  einNumber?: string | null;
  dunsNumber?: string | null;
  businessStartDate?: string | null;
  isVerified?: boolean;
  verificationDate?: string | null;
  state?: string | null;
};

export type ContractorProfile = ProfileBase & {
  role: "contractor";
  skills: string[];
  ratePerHour?: number | null;
  bio?: string | null;
  portfolioUrl?: string | null;
  location?: string | null;
  availability?: "full_time" | "part_time" | "contract" | null;
  resumeUrl?: string | null;
  trainingMaterialsUrls?: string[] | null;
};

export type EventHostProfile = ProfileBase & {
  role: "event_host";
  organizationName?: string | null;
  eventsHosted?: number | null;
  interests?: string[] | null;
  bio?: string | null;
  location?: string | null;
  flyerPhotosUrls?: string[] | null;
  businessType?: "llc" | "sole_proprietor" | "corporation" | "partnership" | "other" | null;
  einNumber?: string | null;
  dunsNumber?: string | null;
  businessStartDate?: string | null;
  isVerified?: boolean;
  verificationDate?: string | null;
  logoUrl?: string | null;
  state?: string | null;
};

export type AnyProfile = BusinessOwnerProfile | ContractorProfile | EventHostProfile;

const DATA_DIR = path.join(process.cwd(), "backend", "data");
const PROFILES_FILE = path.join(DATA_DIR, "profiles.json");

async function ensureStorage(): Promise<void> {
  try {
    await fs.mkdir(DATA_DIR, { recursive: true });
  } catch {}
  try {
    await fs.access(PROFILES_FILE);
  } catch {
    await fs.writeFile(PROFILES_FILE, JSON.stringify([]), "utf8");
  }
}

async function readAll(): Promise<AnyProfile[]> {
  await ensureStorage();
  try {
    const raw = await fs.readFile(PROFILES_FILE, "utf8");
    const data = JSON.parse(raw) as unknown;
    if (Array.isArray(data)) return data as AnyProfile[];
    return [];
  } catch (e) {
    console.error("profile-repo readAll error", e);
    return [];
  }
}

async function writeAll(profiles: AnyProfile[]): Promise<void> {
  await ensureStorage();
  const tmp = PROFILES_FILE + ".tmp";
  await fs.writeFile(tmp, JSON.stringify(profiles, null, 2), "utf8");
  await fs.rename(tmp, PROFILES_FILE);
}

async function findByUserId(userId: string): Promise<AnyProfile | null> {
  const all = await readAll();
  return all.find((p) => p?.userId === userId) ?? null;
}

async function findById(id: string): Promise<AnyProfile | null> {
  const all = await readAll();
  return all.find((p) => p?.id === id) ?? null;
}

async function findPublicById(id: string): Promise<any | null> {
  const profile = await findById(id);
  if (!profile) return null;
  
  // Return only limited public information
  const basePublic = {
    id: profile.id,
    role: profile.role,
    createdAt: profile.createdAt,
    state: profile.role === 'business_owner' ? (profile as BusinessOwnerProfile).state : 
           profile.role === 'event_host' ? (profile as EventHostProfile).state : null,
  };

  if (profile.role === 'business_owner') {
    const bp = profile as BusinessOwnerProfile;
    return {
      ...basePublic,
      companyName: bp.companyName,
      companyLogoUrl: bp.companyLogoUrl,
      description: bp.description,
      location: bp.location,
      companyWebsite: bp.companyWebsite,
      needs: bp.needs,
      isVerified: bp.isVerified,
      // Contact info hidden for guests
    };
  } else if (profile.role === 'event_host') {
    const ep = profile as EventHostProfile;
    return {
      ...basePublic,
      organizationName: ep.organizationName,
      logoUrl: ep.logoUrl,
      bio: ep.bio,
      location: ep.location,
      eventsHosted: ep.eventsHosted,
      interests: ep.interests,
      isVerified: ep.isVerified,
      // Contact info hidden for guests
    };
  } else if (profile.role === 'contractor') {
    const cp = profile as ContractorProfile;
    return {
      ...basePublic,
      bio: cp.bio,
      location: cp.location,
      skills: cp.skills,
      ratePerHour: cp.ratePerHour,
      availability: cp.availability,
      portfolioUrl: cp.portfolioUrl,
      // Contact info hidden for guests
    };
  }
  
  return basePublic;
}

async function upsert(profile: AnyProfile): Promise<AnyProfile> {
  const all = await readAll();
  const idx = all.findIndex((p) => p?.id === profile.id);
  let next: AnyProfile[];
  if (idx >= 0) {
    const merged = { ...all[idx], ...profile, updatedAt: new Date().toISOString() } as AnyProfile;
    next = [...all];
    next[idx] = merged;
  } else {
    next = [...all, profile];
  }
  await writeAll(next);
  return profile;
}

async function listByRole(role: SessionRole, query?: { q?: string | null; offset?: number; limit?: number }): Promise<{ items: AnyProfile[]; total: number }> {
  const all = await readAll();
  const { q, offset = 0, limit = 50 } = query ?? {};
  let filtered = all.filter((p) => p.role === role);
  if (q && q.trim().length > 0) {
    const t = q.toLowerCase();
    filtered = filtered.filter((p) => {
      if (p.role === "business_owner") {
        return (
          (p.companyName?.toLowerCase().includes(t) ?? false) ||
          (p.description?.toLowerCase().includes(t) ?? false) ||
          (p.needs?.some((n) => n.toLowerCase().includes(t)) ?? false)
        );
      }
      if (p.role === "contractor") {
        return (
          (p.bio?.toLowerCase().includes(t) ?? false) ||
          (p.skills?.some((s) => s.toLowerCase().includes(t)) ?? false)
        );
      }
      if (p.role === "event_host") {
        return (
          (p.organizationName?.toLowerCase().includes(t) ?? false) ||
          (p.bio?.toLowerCase().includes(t) ?? false) ||
          (p.interests?.some((i) => i.toLowerCase().includes(t)) ?? false)
        );
      }
      return false;
    });
  }
  const total = filtered.length;
  const items = filtered.slice(offset, offset + limit);
  return { items, total };
}

// Public directory with limited information for guest users
async function listPublicByRole(role: SessionRole, query?: { q?: string | null; offset?: number; limit?: number }): Promise<{ items: any[]; total: number }> {
  const { items, total } = await listByRole(role, query);
  
  // Return only limited public information
  const publicItems = items.map((profile) => {
    const basePublic = {
      id: profile.id,
      role: profile.role,
      createdAt: profile.createdAt,
      state: profile.role === 'business_owner' ? (profile as BusinessOwnerProfile).state : 
             profile.role === 'event_host' ? (profile as EventHostProfile).state : null,
    };

    if (profile.role === 'business_owner') {
      const bp = profile as BusinessOwnerProfile;
      return {
        ...basePublic,
        companyName: bp.companyName,
        companyLogoUrl: bp.companyLogoUrl,
      };
    } else if (profile.role === 'event_host') {
      const ep = profile as EventHostProfile;
      return {
        ...basePublic,
        organizationName: ep.organizationName,
        logoUrl: ep.logoUrl,
      };
    }
    
    return basePublic;
  });
  
  return { items: publicItems, total };
}

export const profileRepo = {
  readAll,
  writeAll,
  findByUserId,
  findById,
  findPublicById,
  upsert,
  listByRole,
  listPublicByRole,
};
