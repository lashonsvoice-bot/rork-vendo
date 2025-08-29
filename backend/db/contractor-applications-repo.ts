import { promises as fs } from "node:fs";
import path from "node:path";

export type ContractorApplication = {
  id: string;
  contractorId: string;
  eventId: string;
  hostId: string;
  status: "pending" | "accepted" | "rejected" | "withdrawn";
  appliedAt: string;
  respondedAt?: string;
  message?: string;
  isEarlyAccess?: boolean; // Pro contractors get early access
};

export type ApplicationUsage = {
  id: string;
  contractorId: string;
  month: string; // YYYY-MM format
  applicationsCount: number;
  lastApplicationDate: string;
};

const DATA_DIR = path.join(process.cwd(), "backend", "data");
const APPLICATIONS_FILE = path.join(DATA_DIR, "contractor-applications.json");
const USAGE_FILE = path.join(DATA_DIR, "contractor-application-usage.json");

async function ensureStorage(): Promise<void> {
  try {
    await fs.mkdir(DATA_DIR, { recursive: true });
  } catch {}
  try {
    await fs.access(APPLICATIONS_FILE);
  } catch {
    await fs.writeFile(APPLICATIONS_FILE, JSON.stringify([]), "utf8");
  }
  try {
    await fs.access(USAGE_FILE);
  } catch {
    await fs.writeFile(USAGE_FILE, JSON.stringify([]), "utf8");
  }
}

async function readAllApplications(): Promise<ContractorApplication[]> {
  await ensureStorage();
  try {
    const raw = await fs.readFile(APPLICATIONS_FILE, "utf8");
    const data = JSON.parse(raw) as unknown;
    if (Array.isArray(data)) return data as ContractorApplication[];
    return [];
  } catch (e) {
    console.error("contractor-applications-repo readAllApplications error", e);
    return [];
  }
}

async function readAllUsage(): Promise<ApplicationUsage[]> {
  await ensureStorage();
  try {
    const raw = await fs.readFile(USAGE_FILE, "utf8");
    const data = JSON.parse(raw) as unknown;
    if (Array.isArray(data)) return data as ApplicationUsage[];
    return [];
  } catch (e) {
    console.error("contractor-applications-repo readAllUsage error", e);
    return [];
  }
}

async function writeAllApplications(applications: ContractorApplication[]): Promise<void> {
  await ensureStorage();
  const tmp = APPLICATIONS_FILE + ".tmp";
  await fs.writeFile(tmp, JSON.stringify(applications, null, 2), "utf8");
  await fs.rename(tmp, APPLICATIONS_FILE);
}

async function writeAllUsage(usage: ApplicationUsage[]): Promise<void> {
  await ensureStorage();
  const tmp = USAGE_FILE + ".tmp";
  await fs.writeFile(tmp, JSON.stringify(usage, null, 2), "utf8");
  await fs.rename(tmp, USAGE_FILE);
}

async function createApplication(application: ContractorApplication): Promise<ContractorApplication> {
  const all = await readAllApplications();
  
  // Check if already applied
  const existing = all.find(a => 
    a.contractorId === application.contractorId && 
    a.eventId === application.eventId
  );
  
  if (existing) {
    throw new Error("Already applied to this event");
  }
  
  const next = [...all, application];
  await writeAllApplications(next);
  
  // Update usage tracking
  await incrementUsage(application.contractorId);
  
  return application;
}

async function incrementUsage(contractorId: string): Promise<void> {
  const allUsage = await readAllUsage();
  const now = new Date();
  const month = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
  
  const existingIdx = allUsage.findIndex(u => 
    u.contractorId === contractorId && u.month === month
  );
  
  if (existingIdx >= 0) {
    allUsage[existingIdx].applicationsCount++;
    allUsage[existingIdx].lastApplicationDate = now.toISOString();
  } else {
    allUsage.push({
      id: `usage_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      contractorId,
      month,
      applicationsCount: 1,
      lastApplicationDate: now.toISOString()
    });
  }
  
  await writeAllUsage(allUsage);
}

async function getMonthlyUsage(contractorId: string): Promise<number> {
  const allUsage = await readAllUsage();
  const now = new Date();
  const month = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
  
  const usage = allUsage.find(u => 
    u.contractorId === contractorId && u.month === month
  );
  
  return usage?.applicationsCount || 0;
}

async function getApplicationsByContractor(contractorId: string): Promise<ContractorApplication[]> {
  const all = await readAllApplications();
  return all.filter(a => a.contractorId === contractorId);
}

async function getApplicationsByEvent(eventId: string): Promise<ContractorApplication[]> {
  const all = await readAllApplications();
  return all.filter(a => a.eventId === eventId);
}

async function updateApplicationStatus(
  applicationId: string, 
  status: ContractorApplication["status"]
): Promise<ContractorApplication | null> {
  const all = await readAllApplications();
  const idx = all.findIndex(a => a.id === applicationId);
  
  if (idx === -1) return null;
  
  all[idx].status = status;
  all[idx].respondedAt = new Date().toISOString();
  
  await writeAllApplications(all);
  return all[idx];
}

export const contractorApplicationsRepo = {
  readAllApplications,
  readAllUsage,
  createApplication,
  getMonthlyUsage,
  getApplicationsByContractor,
  getApplicationsByEvent,
  updateApplicationStatus,
  incrementUsage
};