import { promises as fs } from "node:fs";
import path from "node:path";

export type SubscriptionTier = "free" | "starter" | "professional" | "enterprise";
export type SubscriptionStatus = "active" | "canceled" | "past_due" | "trialing";
export type BillingCycle = "monthly" | "yearly";

export type Subscription = {
  id: string;
  userId: string;
  tier: SubscriptionTier;
  status: SubscriptionStatus;
  billingCycle: BillingCycle;
  currentPeriodStart: string;
  currentPeriodEnd: string;
  trialEnd?: string;
  eventsUsed: number;
  eventsLimit: number;
  pricePerMonth: number;
  totalPaid?: number;
  lastPaymentDate?: string;
  monthlyAmount?: number;
  // Stripe integration fields
  stripeCustomerId?: string;
  stripeSubscriptionId?: string;
  stripePriceId?: string;
  stripePaymentMethodId?: string;
  createdAt: string;
  updatedAt: string;
};

export type SubscriptionUsage = {
  id: string;
  subscriptionId: string;
  userId: string;
  eventId: string;
  eventDate: string;
  createdAt: string;
};

const DATA_DIR = path.join(process.cwd(), "backend", "data");
const SUBSCRIPTIONS_FILE = path.join(DATA_DIR, "subscriptions.json");
const USAGE_FILE = path.join(DATA_DIR, "subscription-usage.json");

async function ensureStorage(): Promise<void> {
  try {
    await fs.mkdir(DATA_DIR, { recursive: true });
  } catch {}
  try {
    await fs.access(SUBSCRIPTIONS_FILE);
  } catch {
    await fs.writeFile(SUBSCRIPTIONS_FILE, JSON.stringify([]), "utf8");
  }
  try {
    await fs.access(USAGE_FILE);
  } catch {
    await fs.writeFile(USAGE_FILE, JSON.stringify([]), "utf8");
  }
}

async function readAllSubscriptions(): Promise<Subscription[]> {
  await ensureStorage();
  try {
    const raw = await fs.readFile(SUBSCRIPTIONS_FILE, "utf8");
    const data = JSON.parse(raw) as unknown;
    if (Array.isArray(data)) return data as Subscription[];
    return [];
  } catch (e) {
    console.error("subscription-repo readAllSubscriptions error", e);
    return [];
  }
}

async function readAllUsage(): Promise<SubscriptionUsage[]> {
  await ensureStorage();
  try {
    const raw = await fs.readFile(USAGE_FILE, "utf8");
    const data = JSON.parse(raw) as unknown;
    if (Array.isArray(data)) return data as SubscriptionUsage[];
    return [];
  } catch (e) {
    console.error("subscription-repo readAllUsage error", e);
    return [];
  }
}

async function writeAllSubscriptions(subscriptions: Subscription[]): Promise<void> {
  await ensureStorage();
  const tmp = SUBSCRIPTIONS_FILE + ".tmp";
  await fs.writeFile(tmp, JSON.stringify(subscriptions, null, 2), "utf8");
  await fs.rename(tmp, SUBSCRIPTIONS_FILE);
}

async function writeAllUsage(usage: SubscriptionUsage[]): Promise<void> {
  await ensureStorage();
  const tmp = USAGE_FILE + ".tmp";
  await fs.writeFile(tmp, JSON.stringify(usage, null, 2), "utf8");
  await fs.rename(tmp, USAGE_FILE);
}

async function findByUserId(userId: string): Promise<Subscription | null> {
  const all = await readAllSubscriptions();
  return all.find((s) => s?.userId === userId) ?? null;
}

async function createSubscription(subscription: Subscription): Promise<Subscription> {
  const all = await readAllSubscriptions();
  const exists = all.some((s) => s?.userId === subscription.userId);
  if (exists) {
    throw new Error("User already has a subscription");
  }
  const next = [...all, subscription];
  await writeAllSubscriptions(next);
  return subscription;
}

async function updateSubscription(userId: string, updates: Partial<Subscription>): Promise<Subscription | null> {
  const all = await readAllSubscriptions();
  const idx = all.findIndex((s) => s?.userId === userId);
  if (idx === -1) return null;
  
  const updated = { ...all[idx], ...updates, updatedAt: new Date().toISOString() };
  const next = [...all];
  next[idx] = updated;
  await writeAllSubscriptions(next);
  return updated;
}

async function recordEventUsage(usage: SubscriptionUsage): Promise<SubscriptionUsage> {
  const allUsage = await readAllUsage();
  const allSubscriptions = await readAllSubscriptions();
  
  // Update subscription events used count
  const subscription = allSubscriptions.find(s => s.id === usage.subscriptionId);
  if (subscription) {
    await updateSubscription(subscription.userId, {
      eventsUsed: subscription.eventsUsed + 1
    });
  }
  
  const next = [...allUsage, usage];
  await writeAllUsage(next);
  return usage;
}

async function getUsageForPeriod(userId: string, startDate: string, endDate: string): Promise<SubscriptionUsage[]> {
  const allUsage = await readAllUsage();
  return allUsage.filter(u => 
    u.userId === userId && 
    u.eventDate >= startDate && 
    u.eventDate <= endDate
  );
}

async function getUsageForEvent(userId: string, eventId: string): Promise<SubscriptionUsage | null> {
  const allUsage = await readAllUsage();
  return allUsage.find(u => u.userId === userId && u.eventId === eventId) || null;
}

function getSubscriptionLimits(tier: SubscriptionTier): { eventsLimit: number; pricePerMonth: number } {
  switch (tier) {
    case "free":
      return { eventsLimit: 5, pricePerMonth: 0 };
    case "starter":
      return { eventsLimit: 10, pricePerMonth: 29 };
    case "professional":
      return { eventsLimit: 20, pricePerMonth: 59 };
    case "enterprise":
      return { eventsLimit: -1, pricePerMonth: 99 }; // -1 means unlimited
    default:
      return { eventsLimit: 5, pricePerMonth: 0 };
  }
}

function createFreeTrialSubscription(userId: string): Subscription {
  const now = new Date();
  const trialEnd = new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000); // 30 days
  const { eventsLimit, pricePerMonth } = getSubscriptionLimits("free");
  
  return {
    id: `sub_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
    userId,
    tier: "free",
    status: "trialing",
    billingCycle: "monthly",
    currentPeriodStart: now.toISOString(),
    currentPeriodEnd: trialEnd.toISOString(),
    trialEnd: trialEnd.toISOString(),
    eventsUsed: 0,
    eventsLimit,
    pricePerMonth,
    createdAt: now.toISOString(),
    updatedAt: now.toISOString(),
  };
}

async function findByStripeSubscriptionId(stripeSubscriptionId: string): Promise<Subscription | null> {
  const all = await readAllSubscriptions();
  return all.find((s) => s?.stripeSubscriptionId === stripeSubscriptionId) ?? null;
}

async function findByStripeCustomerId(stripeCustomerId: string): Promise<Subscription | null> {
  const all = await readAllSubscriptions();
  return all.find((s) => s?.stripeCustomerId === stripeCustomerId) ?? null;
}

async function updateByStripeSubscriptionId(stripeSubscriptionId: string, updates: Partial<Subscription>): Promise<Subscription | null> {
  const all = await readAllSubscriptions();
  const idx = all.findIndex((s) => s?.stripeSubscriptionId === stripeSubscriptionId);
  if (idx === -1) return null;
  
  const updated = { ...all[idx], ...updates, updatedAt: new Date().toISOString() };
  const next = [...all];
  next[idx] = updated;
  await writeAllSubscriptions(next);
  return updated;
}

async function readAll(): Promise<Subscription[]> {
  return readAllSubscriptions();
}

export const subscriptionRepo = {
  readAll,
  readAllSubscriptions,
  readAllUsage,
  writeAllSubscriptions,
  writeAllUsage,
  findByUserId,
  findByStripeSubscriptionId,
  findByStripeCustomerId,
  createSubscription,
  updateSubscription,
  updateByStripeSubscriptionId,
  recordEventUsage,
  getUsageForPeriod,
  getUsageForEvent,
  getSubscriptionLimits,
  createFreeTrialSubscription,
};