import { promises as fs } from "node:fs";
import path from "node:path";

export type WalletBalance = {
  userId: string;
  balance: number;
  available: number;
  held: number;
  updatedAt: string;
};

export type WalletTransactionType =
  | "deposit"
  | "withdrawal"
  | "hold"
  | "release"
  | "capture"
  | "payout"
  | "refund";

export type WalletTransaction = {
  id: string;
  userId: string;
  type: WalletTransactionType;
  amount: number;
  balanceAfter: number;
  relatedId?: string;
  note?: string;
  createdAt: string;
};

const DATA_DIR = path.join(process.cwd(), "backend", "data");
const BALANCES_FILE = path.join(DATA_DIR, "wallets.json");
const TX_FILE = path.join(DATA_DIR, "wallet-transactions.json");

async function ensureStorage(): Promise<void> {
  try {
    await fs.mkdir(DATA_DIR, { recursive: true });
  } catch {}
  try {
    await fs.access(BALANCES_FILE);
  } catch {
    await fs.writeFile(BALANCES_FILE, JSON.stringify([]), "utf8");
  }
  try {
    await fs.access(TX_FILE);
  } catch {
    await fs.writeFile(TX_FILE, JSON.stringify([]), "utf8");
  }
}

async function readAllBalances(): Promise<WalletBalance[]> {
  await ensureStorage();
  try {
    const raw = await fs.readFile(BALANCES_FILE, "utf8");
    const data = JSON.parse(raw);
    return Array.isArray(data) ? (data as WalletBalance[]) : [];
  } catch (e) {
    console.error("wallet-repo readAllBalances error", e);
    return [];
  }
}

async function readAllTx(): Promise<WalletTransaction[]> {
  await ensureStorage();
  try {
    const raw = await fs.readFile(TX_FILE, "utf8");
    const data = JSON.parse(raw);
    return Array.isArray(data) ? (data as WalletTransaction[]) : [];
  } catch (e) {
    console.error("wallet-repo readAllTx error", e);
    return [];
  }
}

async function writeAllBalances(balances: WalletBalance[]): Promise<void> {
  await ensureStorage();
  const tmp = BALANCES_FILE + ".tmp";
  await fs.writeFile(tmp, JSON.stringify(balances, null, 2), "utf8");
  await fs.rename(tmp, BALANCES_FILE);
}

async function writeAllTx(txs: WalletTransaction[]): Promise<void> {
  await ensureStorage();
  const tmp = TX_FILE + ".tmp";
  await fs.writeFile(tmp, JSON.stringify(txs, null, 2), "utf8");
  await fs.rename(tmp, TX_FILE);
}

function newId(prefix: string): string {
  return `${prefix}_${Date.now()}_${Math.random().toString(36).slice(2, 9)}`;
}

async function getBalance(userId: string): Promise<WalletBalance> {
  const all = await readAllBalances();
  let bal = all.find((b) => b.userId === userId);
  if (!bal) {
    bal = {
      userId,
      balance: 0,
      available: 0,
      held: 0,
      updatedAt: new Date().toISOString(),
    };
    await writeAllBalances([...all, bal]);
  }
  return bal;
}

async function listTransactions(userId: string, limit = 50): Promise<WalletTransaction[]> {
  const all = await readAllTx();
  return all.filter((t) => t.userId === userId).sort((a, b) => (a.createdAt < b.createdAt ? 1 : -1)).slice(0, limit);
}

async function appendTx(tx: Omit<WalletTransaction, "id" | "createdAt">): Promise<WalletTransaction> {
  const all = await readAllTx();
  const full: WalletTransaction = {
    ...tx,
    id: newId("tx"),
    createdAt: new Date().toISOString(),
  };
  await writeAllTx([full, ...all]);
  return full;
}

async function updateBalance(record: WalletBalance): Promise<void> {
  const all = await readAllBalances();
  const idx = all.findIndex((b) => b.userId === record.userId);
  const next = [...all];
  if (idx === -1) next.push(record);
  else next[idx] = record;
  await writeAllBalances(next);
}

async function deposit(userId: string, amount: number, note?: string): Promise<{ balance: WalletBalance; tx: WalletTransaction }> {
  if (amount <= 0) throw new Error("Amount must be positive");
  const bal = await getBalance(userId);
  const updated: WalletBalance = {
    ...bal,
    balance: bal.balance + amount,
    available: bal.available + amount,
    updatedAt: new Date().toISOString(),
  };
  await updateBalance(updated);
  const tx = await appendTx({ userId, type: "deposit", amount, balanceAfter: updated.balance, note });
  return { balance: updated, tx };
}

async function withdraw(userId: string, amount: number, note?: string): Promise<{ balance: WalletBalance; tx: WalletTransaction }> {
  if (amount <= 0) throw new Error("Amount must be positive");
  const bal = await getBalance(userId);
  if (bal.available < amount) throw new Error("Insufficient available funds");
  const updated: WalletBalance = {
    ...bal,
    balance: bal.balance - amount,
    available: bal.available - amount,
    updatedAt: new Date().toISOString(),
  };
  await updateBalance(updated);
  const tx = await appendTx({ userId, type: "withdrawal", amount: -amount, balanceAfter: updated.balance, note });
  return { balance: updated, tx };
}

async function createHold(userId: string, amount: number, relatedId?: string, note?: string): Promise<{ balance: WalletBalance; tx: WalletTransaction }> {
  if (amount <= 0) throw new Error("Amount must be positive");
  const bal = await getBalance(userId);
  if (bal.available < amount) throw new Error("Insufficient available funds to hold");
  const updated: WalletBalance = {
    ...bal,
    available: bal.available - amount,
    held: bal.held + amount,
    updatedAt: new Date().toISOString(),
  };
  await updateBalance(updated);
  const tx = await appendTx({ userId, type: "hold", amount: -amount, balanceAfter: updated.balance, relatedId, note });
  return { balance: updated, tx };
}

async function releaseHold(userId: string, amount: number, relatedId?: string, note?: string): Promise<{ balance: WalletBalance; tx: WalletTransaction }> {
  if (amount <= 0) throw new Error("Amount must be positive");
  const bal = await getBalance(userId);
  if (bal.held < amount) throw new Error("Insufficient held funds to release");
  const updated: WalletBalance = {
    ...bal,
    available: bal.available + amount,
    held: bal.held - amount,
    updatedAt: new Date().toISOString(),
  };
  await updateBalance(updated);
  const tx = await appendTx({ userId, type: "release", amount, balanceAfter: updated.balance, relatedId, note });
  return { balance: updated, tx };
}

async function captureHold(userId: string, amount: number, relatedId?: string, note?: string): Promise<{ balance: WalletBalance; tx: WalletTransaction }> {
  if (amount <= 0) throw new Error("Amount must be positive");
  const bal = await getBalance(userId);
  if (bal.held < amount) throw new Error("Insufficient held funds to capture");
  const updated: WalletBalance = {
    ...bal,
    balance: bal.balance - amount,
    held: bal.held - amount,
    updatedAt: new Date().toISOString(),
  };
  await updateBalance(updated);
  const tx = await appendTx({ userId, type: "capture", amount: -amount, balanceAfter: updated.balance, relatedId, note });
  return { balance: updated, tx };
}

async function payout(userId: string, amount: number, relatedId?: string, note?: string): Promise<{ balance: WalletBalance; tx: WalletTransaction }> {
  // direct debit from available without hold
  if (amount <= 0) throw new Error("Amount must be positive");
  const bal = await getBalance(userId);
  if (bal.available < amount) throw new Error("Insufficient available funds");
  const updated: WalletBalance = {
    ...bal,
    balance: bal.balance - amount,
    available: bal.available - amount,
    updatedAt: new Date().toISOString(),
  };
  await updateBalance(updated);
  const tx = await appendTx({ userId, type: "payout", amount: -amount, balanceAfter: updated.balance, relatedId, note });
  return { balance: updated, tx };
}

export const walletRepo = {
  getBalance,
  listTransactions,
  deposit,
  withdraw,
  createHold,
  releaseHold,
  captureHold,
  payout,
};
