import { promises as fs } from "node:fs";
import path from "node:path";

export type AdminAnalytics = {
  totalUsers: number;
  activeUsers: number;
  suspendedUsers: number;
  totalEvents: number;
  activeEvents: number;
  cancelledEvents: number;
  totalRevenue: number;
  monthlyRevenue: number;
  subscriptions: {
    active: number;
    cancelled: number;
    total: number;
  };
  usersByRole: {
    business_owner: number;
    contractor: number;
    event_host: number;
  };
  cancellationStats: {
    hostCancellations: number;
    businessCancellations: number;
    contractorNoShows: number;
  };
  flaggedUsers: {
    id: string;
    email: string;
    name: string;
    role: string;
    reason: string;
    count: number;
    lastIncident: string;
  }[];
};

export type AppealRecord = {
  id: string;
  userId: string;
  userEmail: string;
  userName: string;
  userRole: string;
  reason: string;
  description: string;
  attachments?: string[];
  status: "pending" | "approved" | "rejected";
  createdAt: string;
  reviewedAt?: string;
  reviewedBy?: string;
  adminNotes?: string;
};

export type ActivityLog = {
  id: string;
  userId: string;
  userEmail: string;
  action: string;
  details: string;
  timestamp: string;
  ipAddress?: string;
};

const DATA_DIR = path.join(process.cwd(), "backend", "data");
const APPEALS_FILE = path.join(DATA_DIR, "appeals.json");
const ACTIVITY_FILE = path.join(DATA_DIR, "activity.json");

async function ensureStorage(): Promise<void> {
  try {
    await fs.mkdir(DATA_DIR, { recursive: true });
  } catch {}
  
  try {
    await fs.access(APPEALS_FILE);
  } catch {
    await fs.writeFile(APPEALS_FILE, JSON.stringify([]), "utf8");
  }
  
  try {
    await fs.access(ACTIVITY_FILE);
  } catch {
    await fs.writeFile(ACTIVITY_FILE, JSON.stringify([]), "utf8");
  }
}

async function readAppeals(): Promise<AppealRecord[]> {
  await ensureStorage();
  try {
    const raw = await fs.readFile(APPEALS_FILE, "utf8");
    const data = JSON.parse(raw) as unknown;
    if (Array.isArray(data)) {
      return data as AppealRecord[];
    }
    return [];
  } catch (e) {
    console.error("admin-repo readAppeals error", e);
    return [];
  }
}

async function writeAppeals(appeals: AppealRecord[]): Promise<void> {
  await ensureStorage();
  const tmp = APPEALS_FILE + ".tmp";
  await fs.writeFile(tmp, JSON.stringify(appeals, null, 2), "utf8");
  await fs.rename(tmp, APPEALS_FILE);
}

async function readActivity(): Promise<ActivityLog[]> {
  await ensureStorage();
  try {
    const raw = await fs.readFile(ACTIVITY_FILE, "utf8");
    const data = JSON.parse(raw) as unknown;
    if (Array.isArray(data)) {
      return data as ActivityLog[];
    }
    return [];
  } catch (e) {
    console.error("admin-repo readActivity error", e);
    return [];
  }
}

async function writeActivity(activity: ActivityLog[]): Promise<void> {
  await ensureStorage();
  const tmp = ACTIVITY_FILE + ".tmp";
  await fs.writeFile(tmp, JSON.stringify(activity, null, 2), "utf8");
  await fs.rename(tmp, ACTIVITY_FILE);
}

async function addAppeal(appeal: AppealRecord): Promise<AppealRecord> {
  const appeals = await readAppeals();
  const updated = [...appeals, appeal];
  await writeAppeals(updated);
  return appeal;
}

async function updateAppeal(appeal: AppealRecord): Promise<AppealRecord> {
  const appeals = await readAppeals();
  const index = appeals.findIndex(a => a.id === appeal.id);
  if (index === -1) {
    throw new Error("Appeal not found");
  }
  const updated = [...appeals];
  updated[index] = appeal;
  await writeAppeals(updated);
  return appeal;
}

async function logActivity(activity: ActivityLog): Promise<void> {
  const logs = await readActivity();
  const updated = [...logs, activity];
  
  // Keep only last 10000 entries to prevent file from growing too large
  if (updated.length > 10000) {
    updated.splice(0, updated.length - 10000);
  }
  
  await writeActivity(updated);
}

export const adminRepo = {
  readAppeals,
  writeAppeals,
  readActivity,
  writeActivity,
  addAppeal,
  updateAppeal,
  logActivity,
};