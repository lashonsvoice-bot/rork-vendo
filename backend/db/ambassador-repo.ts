/**
 * Ambassador Repository
 * Handles all ambassador program database operations
 */

import { getSQLiteClient, createEntity, BaseEntity } from './backend-sqlite-client';
import * as bcrypt from 'bcryptjs';

export interface Ambassador extends BaseEntity {
  email: string;
  password: string;
  name: string;
  phone?: string;
  referralCode: string;
  totalEarnings: number;
  pendingEarnings: number;
  paidEarnings: number;
  status: 'active' | 'suspended' | 'inactive';
}

export interface AmbassadorReferral extends BaseEntity {
  ambassadorId: string;
  referredEmail: string;
  referredRole: 'business_owner' | 'host' | 'contractor';
  referralLink?: string;
  status: 'pending' | 'converted' | 'expired';
  conversionDate?: string;
  subscriptionId?: string;
  commissionRate: number;
  commissionEarned: number;
}

export interface AmbassadorPayout extends BaseEntity {
  ambassadorId: string;
  amount: number;
  status: 'pending' | 'processing' | 'completed' | 'failed';
  paymentMethod?: string;
  paymentDetails?: string;
  processedAt?: string;
}

class AmbassadorRepository {
  private client = getSQLiteClient();

  // Initialize tables
  async initialize(): Promise<void> {
    await this.client.execute(`
      CREATE TABLE IF NOT EXISTS ambassadors (
        id TEXT PRIMARY KEY,
        email TEXT UNIQUE NOT NULL,
        password TEXT NOT NULL,
        name TEXT NOT NULL,
        phone TEXT,
        referralCode TEXT UNIQUE NOT NULL,
        totalEarnings REAL DEFAULT 0,
        pendingEarnings REAL DEFAULT 0,
        paidEarnings REAL DEFAULT 0,
        status TEXT DEFAULT 'active',
        created_at TEXT DEFAULT CURRENT_TIMESTAMP,
        updated_at TEXT DEFAULT CURRENT_TIMESTAMP
      )
    `);

    await this.client.execute(`
      CREATE TABLE IF NOT EXISTS ambassador_referrals (
        id TEXT PRIMARY KEY,
        ambassadorId TEXT NOT NULL,
        referredEmail TEXT NOT NULL,
        referredRole TEXT NOT NULL,
        referralLink TEXT,
        status TEXT DEFAULT 'pending',
        conversionDate TEXT,
        subscriptionId TEXT,
        commissionRate REAL DEFAULT 0.20,
        commissionEarned REAL DEFAULT 0,
        created_at TEXT DEFAULT CURRENT_TIMESTAMP,
        updated_at TEXT DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (ambassadorId) REFERENCES ambassadors(id)
      )
    `);

    await this.client.execute(`
      CREATE TABLE IF NOT EXISTS ambassador_payouts (
        id TEXT PRIMARY KEY,
        ambassadorId TEXT NOT NULL,
        amount REAL NOT NULL,
        status TEXT DEFAULT 'pending',
        paymentMethod TEXT,
        paymentDetails TEXT,
        processedAt TEXT,
        created_at TEXT DEFAULT CURRENT_TIMESTAMP,
        updated_at TEXT DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (ambassadorId) REFERENCES ambassadors(id)
      )
    `);

    // Create indexes
    await this.client.execute('CREATE INDEX IF NOT EXISTS idx_ambassadors_email ON ambassadors (email);');
    await this.client.execute('CREATE INDEX IF NOT EXISTS idx_ambassadors_referralCode ON ambassadors (referralCode);');
    await this.client.execute('CREATE INDEX IF NOT EXISTS idx_referrals_ambassador ON ambassador_referrals (ambassadorId);');
    await this.client.execute('CREATE INDEX IF NOT EXISTS idx_referrals_status ON ambassador_referrals (status);');
  }

  // Ambassador CRUD operations
  async createAmbassador(data: {
    email: string;
    password: string;
    name: string;
    phone?: string;
  }): Promise<Ambassador> {
    const hashedPassword = await bcrypt.hash(data.password, 10);
    const referralCode = this.generateReferralCode();
    
    const ambassador = createEntity<Ambassador>({
      email: data.email,
      password: hashedPassword,
      name: data.name,
      phone: data.phone,
      referralCode,
      totalEarnings: 0,
      pendingEarnings: 0,
      paidEarnings: 0,
      status: 'active'
    });

    await this.client.insert('ambassadors', ambassador);
    return ambassador;
  }

  async findAmbassadorByEmail(email: string): Promise<Ambassador | null> {
    const result = await this.client.query<Ambassador>(
      'SELECT * FROM ambassadors WHERE email = ?',
      [email]
    );
    return result.rows[0] || null;
  }

  async findAmbassadorById(id: string): Promise<Ambassador | null> {
    return this.client.findById<Ambassador>('ambassadors', id);
  }

  async findAmbassadorByReferralCode(code: string): Promise<Ambassador | null> {
    const result = await this.client.query<Ambassador>(
      'SELECT * FROM ambassadors WHERE referralCode = ?',
      [code]
    );
    return result.rows[0] || null;
  }

  async validateAmbassadorPassword(email: string, password: string): Promise<Ambassador | null> {
    console.log('[AmbassadorRepo] Validating password for:', email);
    
    const ambassador = await this.findAmbassadorByEmail(email);
    if (!ambassador) {
      console.log('[AmbassadorRepo] Ambassador not found:', email);
      return null;
    }
    
    console.log('[AmbassadorRepo] Ambassador found, checking password...');
    const isValid = await bcrypt.compare(password, ambassador.password);
    console.log('[AmbassadorRepo] Password validation result:', isValid ? 'Valid' : 'Invalid');
    
    return isValid ? ambassador : null;
  }

  async updateAmbassadorEarnings(
    ambassadorId: string,
    earnings: { pending?: number; paid?: number }
  ): Promise<void> {
    const ambassador = await this.findAmbassadorById(ambassadorId);
    if (!ambassador) throw new Error('Ambassador not found');

    const updates: any = {};
    
    if (earnings.pending !== undefined) {
      updates.pendingEarnings = ambassador.pendingEarnings + earnings.pending;
      updates.totalEarnings = ambassador.totalEarnings + earnings.pending;
    }
    
    if (earnings.paid !== undefined) {
      updates.paidEarnings = ambassador.paidEarnings + earnings.paid;
      updates.pendingEarnings = Math.max(0, ambassador.pendingEarnings - earnings.paid);
    }

    await this.client.update(
      'ambassadors',
      updates,
      'id = ?',
      [ambassadorId]
    );
  }

  // Referral operations
  async createReferral(data: {
    ambassadorId: string;
    referredEmail: string;
    referredRole: 'business_owner' | 'host' | 'contractor';
    referralLink?: string;
  }): Promise<AmbassadorReferral> {
    const referral = createEntity<AmbassadorReferral>({
      ambassadorId: data.ambassadorId,
      referredEmail: data.referredEmail,
      referredRole: data.referredRole,
      referralLink: data.referralLink,
      status: 'pending',
      commissionRate: 0.20, // 20% for ambassador program
      commissionEarned: 0
    });

    await this.client.insert('ambassador_referrals', referral);
    return referral;
  }

  async findReferralsByAmbassador(ambassadorId: string): Promise<AmbassadorReferral[]> {
    return this.client.findAll<AmbassadorReferral>(
      'ambassador_referrals',
      'ambassadorId = ?',
      [ambassadorId]
    );
  }

  async findReferralByEmail(email: string): Promise<AmbassadorReferral | null> {
    const result = await this.client.query<AmbassadorReferral>(
      'SELECT * FROM ambassador_referrals WHERE referredEmail = ? AND status = ?',
      [email, 'pending']
    );
    return result.rows[0] || null;
  }

  async convertReferral(
    referralId: string,
    subscriptionId: string,
    commissionAmount: number
  ): Promise<void> {
    const referral = await this.client.findById<AmbassadorReferral>('ambassador_referrals', referralId);
    if (!referral) throw new Error('Referral not found');

    await this.client.update(
      'ambassador_referrals',
      {
        status: 'converted',
        conversionDate: new Date().toISOString(),
        subscriptionId,
        commissionEarned: commissionAmount
      },
      'id = ?',
      [referralId]
    );

    // Update ambassador earnings
    await this.updateAmbassadorEarnings(referral.ambassadorId, {
      pending: commissionAmount
    });
  }

  // Payout operations
  async createPayout(data: {
    ambassadorId: string;
    amount: number;
    paymentMethod?: string;
    paymentDetails?: string;
  }): Promise<AmbassadorPayout> {
    const payout = createEntity<AmbassadorPayout>({
      ambassadorId: data.ambassadorId,
      amount: data.amount,
      paymentMethod: data.paymentMethod,
      paymentDetails: data.paymentDetails,
      status: 'pending'
    });

    await this.client.insert('ambassador_payouts', payout);
    return payout;
  }

  async processPayout(payoutId: string): Promise<void> {
    const payout = await this.client.findById<AmbassadorPayout>('ambassador_payouts', payoutId);
    if (!payout) throw new Error('Payout not found');

    await this.client.update(
      'ambassador_payouts',
      {
        status: 'completed',
        processedAt: new Date().toISOString()
      },
      'id = ?',
      [payoutId]
    );

    // Update ambassador earnings
    await this.updateAmbassadorEarnings(payout.ambassadorId, {
      paid: payout.amount
    });
  }

  async getAmbassadorStats(ambassadorId: string): Promise<{
    totalReferrals: number;
    pendingReferrals: number;
    convertedReferrals: number;
    totalEarnings: number;
    pendingEarnings: number;
    paidEarnings: number;
  }> {
    const ambassador = await this.findAmbassadorById(ambassadorId);
    if (!ambassador) throw new Error('Ambassador not found');

    const referrals = await this.findReferralsByAmbassador(ambassadorId);
    
    return {
      totalReferrals: referrals.length,
      pendingReferrals: referrals.filter(r => r.status === 'pending').length,
      convertedReferrals: referrals.filter(r => r.status === 'converted').length,
      totalEarnings: ambassador.totalEarnings,
      pendingEarnings: ambassador.pendingEarnings,
      paidEarnings: ambassador.paidEarnings
    };
  }

  // Helper methods
  private generateReferralCode(): string {
    const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
    let code = 'AMB-';
    for (let i = 0; i < 8; i++) {
      code += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    return code;
  }

  async generateReferralLink(ambassadorId: string, targetRole: string): Promise<string> {
    const ambassador = await this.findAmbassadorById(ambassadorId);
    if (!ambassador) throw new Error('Ambassador not found');
    
    const baseUrl = process.env.FRONTEND_URL || 'https://app.revovend.com';
    return `${baseUrl}/signup?ref=${ambassador.referralCode}&role=${targetRole}`;
  }
}

// Singleton instance
let ambassadorRepo: AmbassadorRepository | null = null;

export function getAmbassadorRepository(): AmbassadorRepository {
  if (!ambassadorRepo) {
    ambassadorRepo = new AmbassadorRepository();
  }
  return ambassadorRepo;
}