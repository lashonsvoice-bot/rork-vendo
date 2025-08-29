import { db } from './sqlite-client';

export interface HostCredit {
  id: string;
  userId: string;
  balance: number;
  totalEarned: number;
  totalUsed: number;
  lastUpdated: string;
}

export interface CreditTransaction {
  id: string;
  userId: string;
  type: 'earned' | 'used' | 'expired' | 'refunded';
  amount: number;
  description: string;
  referenceId?: string; // referral id or proposal id
  referenceType?: 'referral' | 'internal_proposal' | 'external_proposal';
  createdAt: string;
}

export const hostCreditsRepo = {
  async getCredits(userId: string): Promise<HostCredit | null> {
    try {
      const credits = await db.get<HostCredit>(
        'SELECT * FROM host_credits WHERE userId = ?',
        [userId]
      );
      return credits || null;
    } catch (error) {
      console.error('Error getting host credits:', error);
      return null;
    }
  },

  async initializeCredits(userId: string): Promise<HostCredit> {
    const id = `credit_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    const credits: HostCredit = {
      id,
      userId,
      balance: 0,
      totalEarned: 0,
      totalUsed: 0,
      lastUpdated: new Date().toISOString()
    };

    await db.run(
      `INSERT INTO host_credits (id, userId, balance, totalEarned, totalUsed, lastUpdated)
       VALUES (?, ?, ?, ?, ?, ?)`,
      [credits.id, credits.userId, credits.balance, credits.totalEarned, credits.totalUsed, credits.lastUpdated]
    );

    return credits;
  },

  async addCredits(userId: string, amount: number, description: string, referenceId?: string, referenceType?: string): Promise<HostCredit> {
    let credits = await this.getCredits(userId);
    if (!credits) {
      credits = await this.initializeCredits(userId);
    }

    const newBalance = credits.balance + amount;
    const newTotalEarned = credits.totalEarned + amount;
    const now = new Date().toISOString();

    await db.run(
      `UPDATE host_credits 
       SET balance = ?, totalEarned = ?, lastUpdated = ?
       WHERE userId = ?`,
      [newBalance, newTotalEarned, now, userId]
    );

    // Record transaction
    const transactionId = `tx_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    await db.run(
      `INSERT INTO credit_transactions (id, userId, type, amount, description, referenceId, referenceType, createdAt)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
      [transactionId, userId, 'earned', amount, description, referenceId, referenceType, now]
    );

    return {
      ...credits,
      balance: newBalance,
      totalEarned: newTotalEarned,
      lastUpdated: now
    };
  },

  async useCredits(userId: string, amount: number, description: string, referenceId?: string): Promise<HostCredit> {
    const credits = await this.getCredits(userId);
    if (!credits) {
      throw new Error('No credits found for user');
    }

    if (credits.balance < amount) {
      throw new Error('Insufficient credits');
    }

    const newBalance = credits.balance - amount;
    const newTotalUsed = credits.totalUsed + amount;
    const now = new Date().toISOString();

    await db.run(
      `UPDATE host_credits 
       SET balance = ?, totalUsed = ?, lastUpdated = ?
       WHERE userId = ?`,
      [newBalance, newTotalUsed, now, userId]
    );

    // Record transaction
    const transactionId = `tx_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    await db.run(
      `INSERT INTO credit_transactions (id, userId, type, amount, description, referenceId, referenceType, createdAt)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
      [transactionId, userId, 'used', amount, description, referenceId, 'internal_proposal', now]
    );

    return {
      ...credits,
      balance: newBalance,
      totalUsed: newTotalUsed,
      lastUpdated: now
    };
  },

  async getTransactions(userId: string, limit = 50): Promise<CreditTransaction[]> {
    try {
      const transactions = await db.all<CreditTransaction>(
        `SELECT * FROM credit_transactions 
         WHERE userId = ? 
         ORDER BY createdAt DESC 
         LIMIT ?`,
        [userId, limit]
      );
      return transactions || [];
    } catch (error) {
      console.error('Error getting credit transactions:', error);
      return [];
    }
  },

  async initializeTables() {
    await db.run(`
      CREATE TABLE IF NOT EXISTS host_credits (
        id TEXT PRIMARY KEY,
        userId TEXT NOT NULL UNIQUE,
        balance INTEGER NOT NULL DEFAULT 0,
        totalEarned INTEGER NOT NULL DEFAULT 0,
        totalUsed INTEGER NOT NULL DEFAULT 0,
        lastUpdated TEXT NOT NULL
      )
    `);

    await db.run(`
      CREATE TABLE IF NOT EXISTS credit_transactions (
        id TEXT PRIMARY KEY,
        userId TEXT NOT NULL,
        type TEXT NOT NULL,
        amount INTEGER NOT NULL,
        description TEXT NOT NULL,
        referenceId TEXT,
        referenceType TEXT,
        createdAt TEXT NOT NULL
      )
    `);

    await db.run(`
      CREATE INDEX IF NOT EXISTS idx_credit_transactions_user 
      ON credit_transactions(userId)
    `);
  }
};

// Initialize tables
hostCreditsRepo.initializeTables().catch(console.error);