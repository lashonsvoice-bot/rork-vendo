import { promises as fs } from "node:fs";
import path from "node:path";

export type HostCredit = {
  id: string;
  hostId: string;
  amount: number; // Number of reverse proposal credits
  source: "referral_reward" | "purchase" | "promotion" | "system_grant";
  description: string;
  expiresAt?: string; // Optional expiration date
  usedAmount: number; // Track how many have been used
  createdAt: string;
  updatedAt: string;
};

export type CreditTransaction = {
  id: string;
  hostId: string;
  creditId: string;
  type: "earned" | "used" | "expired";
  amount: number;
  eventId?: string; // If used for a specific event
  description: string;
  createdAt: string;
};

const DATA_DIR = path.join(process.cwd(), "backend", "data");
const CREDITS_FILE = path.join(DATA_DIR, "host-credits.json");
const TRANSACTIONS_FILE = path.join(DATA_DIR, "credit-transactions.json");

async function ensureStorage(): Promise<void> {
  try {
    await fs.mkdir(DATA_DIR, { recursive: true });
  } catch {}
  try {
    await fs.access(CREDITS_FILE);
  } catch {
    await fs.writeFile(CREDITS_FILE, JSON.stringify([]), "utf8");
  }
  try {
    await fs.access(TRANSACTIONS_FILE);
  } catch {
    await fs.writeFile(TRANSACTIONS_FILE, JSON.stringify([]), "utf8");
  }
}

async function readAllCredits(): Promise<HostCredit[]> {
  await ensureStorage();
  try {
    const raw = await fs.readFile(CREDITS_FILE, "utf8");
    const data = JSON.parse(raw) as unknown;
    if (Array.isArray(data)) return data as HostCredit[];
    return [];
  } catch (e) {
    console.error("host-credits-repo readAllCredits error", e);
    return [];
  }
}

async function readAllTransactions(): Promise<CreditTransaction[]> {
  await ensureStorage();
  try {
    const raw = await fs.readFile(TRANSACTIONS_FILE, "utf8");
    const data = JSON.parse(raw) as unknown;
    if (Array.isArray(data)) return data as CreditTransaction[];
    return [];
  } catch (e) {
    console.error("host-credits-repo readAllTransactions error", e);
    return [];
  }
}

async function writeAllCredits(credits: HostCredit[]): Promise<void> {
  await ensureStorage();
  const tmp = CREDITS_FILE + ".tmp";
  await fs.writeFile(tmp, JSON.stringify(credits, null, 2), "utf8");
  await fs.rename(tmp, CREDITS_FILE);
}

async function writeAllTransactions(transactions: CreditTransaction[]): Promise<void> {
  await ensureStorage();
  const tmp = TRANSACTIONS_FILE + ".tmp";
  await fs.writeFile(tmp, JSON.stringify(transactions, null, 2), "utf8");
  await fs.rename(tmp, TRANSACTIONS_FILE);
}

async function grantCredits(
  hostId: string,
  amount: number,
  source: HostCredit["source"],
  description: string,
  expiresAt?: string
): Promise<HostCredit> {
  const allCredits = await readAllCredits();
  const allTransactions = await readAllTransactions();
  const now = new Date().toISOString();
  
  const credit: HostCredit = {
    id: `credit_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
    hostId,
    amount,
    source,
    description,
    expiresAt,
    usedAmount: 0,
    createdAt: now,
    updatedAt: now
  };
  
  const transaction: CreditTransaction = {
    id: `tx_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
    hostId,
    creditId: credit.id,
    type: "earned",
    amount,
    description,
    createdAt: now
  };
  
  allCredits.push(credit);
  allTransactions.push(transaction);
  
  await writeAllCredits(allCredits);
  await writeAllTransactions(allTransactions);
  
  return credit;
}

async function useCredits(
  hostId: string,
  amount: number,
  eventId?: string,
  description?: string
): Promise<boolean> {
  const allCredits = await readAllCredits();
  const allTransactions = await readAllTransactions();
  const now = new Date().toISOString();
  
  // Get available credits for this host (not expired, not fully used)
  const availableCredits = allCredits
    .filter(c => 
      c.hostId === hostId &&
      c.usedAmount < c.amount &&
      (!c.expiresAt || c.expiresAt > now)
    )
    .sort((a, b) => {
      // Use credits that expire sooner first
      if (a.expiresAt && b.expiresAt) {
        return a.expiresAt.localeCompare(b.expiresAt);
      }
      if (a.expiresAt) return -1;
      if (b.expiresAt) return 1;
      return a.createdAt.localeCompare(b.createdAt);
    });
  
  const totalAvailable = availableCredits.reduce(
    (sum, c) => sum + (c.amount - c.usedAmount), 
    0
  );
  
  if (totalAvailable < amount) {
    return false; // Not enough credits
  }
  
  // Use credits from multiple sources if needed
  let remainingToUse = amount;
  const usedCredits: { credit: HostCredit; amountUsed: number }[] = [];
  
  for (const credit of availableCredits) {
    if (remainingToUse <= 0) break;
    
    const available = credit.amount - credit.usedAmount;
    const toUse = Math.min(available, remainingToUse);
    
    credit.usedAmount += toUse;
    credit.updatedAt = now;
    remainingToUse -= toUse;
    
    usedCredits.push({ credit, amountUsed: toUse });
  }
  
  // Create transaction records
  for (const { credit, amountUsed } of usedCredits) {
    const transaction: CreditTransaction = {
      id: `tx_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      hostId,
      creditId: credit.id,
      type: "used",
      amount: amountUsed,
      eventId,
      description: description || `Used ${amountUsed} credit(s) for reverse proposal`,
      createdAt: now
    };
    allTransactions.push(transaction);
  }
  
  await writeAllCredits(allCredits);
  await writeAllTransactions(allTransactions);
  
  return true;
}

async function getAvailableCredits(hostId: string): Promise<number> {
  const allCredits = await readAllCredits();
  const now = new Date().toISOString();
  
  return allCredits
    .filter(c => 
      c.hostId === hostId &&
      c.usedAmount < c.amount &&
      (!c.expiresAt || c.expiresAt > now)
    )
    .reduce((sum, c) => sum + (c.amount - c.usedAmount), 0);
}

async function getCreditHistory(hostId: string): Promise<CreditTransaction[]> {
  const allTransactions = await readAllTransactions();
  return allTransactions.filter(t => t.hostId === hostId);
}

async function expireOldCredits(): Promise<void> {
  const allCredits = await readAllCredits();
  const allTransactions = await readAllTransactions();
  const now = new Date().toISOString();
  
  for (const credit of allCredits) {
    if (credit.expiresAt && 
        credit.expiresAt <= now && 
        credit.usedAmount < credit.amount) {
      
      const remainingAmount = credit.amount - credit.usedAmount;
      
      const transaction: CreditTransaction = {
        id: `tx_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
        hostId: credit.hostId,
        creditId: credit.id,
        type: "expired",
        amount: remainingAmount,
        description: `${remainingAmount} credit(s) expired`,
        createdAt: now
      };
      
      allTransactions.push(transaction);
      credit.usedAmount = credit.amount; // Mark as fully used
      credit.updatedAt = now;
    }
  }
  
  await writeAllCredits(allCredits);
  await writeAllTransactions(allTransactions);
}

export const hostCreditsRepo = {
  readAllCredits,
  readAllTransactions,
  grantCredits,
  useCredits,
  getAvailableCredits,
  getCreditHistory,
  expireOldCredits
};