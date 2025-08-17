import { z } from 'zod';

const referralCodeSchema = z.object({
  id: z.string(),
  code: z.string(),
  referrerId: z.string(),
  referrerType: z.enum(['business_owner', 'contractor', 'host']),
  createdAt: z.string(),
  isActive: z.boolean(),
  usageCount: z.number(),
  maxUses: z.number().optional(),
});

const referralUsageSchema = z.object({
  id: z.string(),
  referralCodeId: z.string(),
  refereeId: z.string(),
  refereeType: z.enum(['business_owner', 'contractor', 'host']),
  signupDate: z.string(),
  subscriptionDate: z.string().optional(),
  rewardAmount: z.number(),
  rewardPaid: z.boolean(),
  rewardPaidDate: z.string().optional(),
});

export type ReferralCode = z.infer<typeof referralCodeSchema>;
export type ReferralUsage = z.infer<typeof referralUsageSchema>;

let referralCodes: ReferralCode[] = [];
let referralUsages: ReferralUsage[] = [];

// Generate unique referral code
function generateReferralCode(userId: string): string {
  const prefix = userId.slice(0, 3).toUpperCase();
  const random = Math.random().toString(36).substring(2, 8).toUpperCase();
  return `${prefix}${random}`;
}

// Create referral code for user
async function createReferralCode(
  referrerId: string,
  referrerType: 'business_owner' | 'contractor' | 'host',
  maxUses?: number
): Promise<ReferralCode> {
  // Check if user already has an active code
  const existingCode = referralCodes.find(
    code => code.referrerId === referrerId && code.isActive
  );
  
  if (existingCode) {
    return existingCode;
  }

  let code: string;
  let isUnique = false;
  
  // Ensure code is unique
  while (!isUnique) {
    code = generateReferralCode(referrerId);
    isUnique = !referralCodes.some(rc => rc.code === code);
  }

  const referralCode: ReferralCode = {
    id: `ref_${Date.now()}_${Math.random().toString(36).substring(2)}`,
    code: code!,
    referrerId,
    referrerType,
    createdAt: new Date().toISOString(),
    isActive: true,
    usageCount: 0,
    maxUses,
  };

  referralCodes.push(referralCode);
  console.log('[Referral] Created referral code:', referralCode.code, 'for user:', referrerId);
  
  return referralCode;
}

// Get referral code by code string
async function getReferralCodeByCode(code: string): Promise<ReferralCode | null> {
  return referralCodes.find(rc => rc.code === code && rc.isActive) || null;
}

// Get referral codes for user
async function getUserReferralCodes(userId: string): Promise<ReferralCode[]> {
  return referralCodes.filter(rc => rc.referrerId === userId);
}

// Record referral usage
async function recordReferralUsage(
  referralCodeId: string,
  refereeId: string,
  refereeType: 'business_owner' | 'contractor' | 'host'
): Promise<ReferralUsage> {
  const referralCode = referralCodes.find(rc => rc.id === referralCodeId);
  if (!referralCode) {
    throw new Error('Referral code not found');
  }

  // Check if referee already used a referral code
  const existingUsage = referralUsages.find(ru => ru.refereeId === refereeId);
  if (existingUsage) {
    throw new Error('User has already used a referral code');
  }

  // Check usage limits
  if (referralCode.maxUses && referralCode.usageCount >= referralCode.maxUses) {
    throw new Error('Referral code has reached maximum usage limit');
  }

  const usage: ReferralUsage = {
    id: `usage_${Date.now()}_${Math.random().toString(36).substring(2)}`,
    referralCodeId,
    refereeId,
    refereeType,
    signupDate: new Date().toISOString(),
    rewardAmount: 0, // Will be updated when subscription is confirmed
    rewardPaid: false,
  };

  referralUsages.push(usage);
  
  // Update usage count
  referralCode.usageCount += 1;
  
  console.log('[Referral] Recorded referral usage for code:', referralCode.code);
  
  return usage;
}

// Process subscription and reward
async function processSubscriptionReward(
  refereeId: string,
  subscriptionAmount: number
): Promise<{ usage: ReferralUsage; rewardAmount: number } | null> {
  const usage = referralUsages.find(
    ru => ru.refereeId === refereeId && !ru.subscriptionDate
  );
  
  if (!usage) {
    return null; // No referral usage found
  }

  // Calculate reward based on subscription amount
  const rewardAmount = Math.min(subscriptionAmount * 0.1, 50); // 10% of subscription, max $50
  
  usage.subscriptionDate = new Date().toISOString();
  usage.rewardAmount = rewardAmount;
  
  console.log('[Referral] Processed subscription reward:', rewardAmount, 'for referral:', usage.id);
  
  return { usage, rewardAmount };
}

// Pay referral reward
async function payReferralReward(usageId: string): Promise<ReferralUsage> {
  const usage = referralUsages.find(ru => ru.id === usageId);
  if (!usage) {
    throw new Error('Referral usage not found');
  }
  
  if (usage.rewardPaid) {
    throw new Error('Reward already paid');
  }
  
  usage.rewardPaid = true;
  usage.rewardPaidDate = new Date().toISOString();
  
  console.log('[Referral] Paid referral reward:', usage.rewardAmount, 'for usage:', usageId);
  
  return usage;
}

// Get referral statistics for user
async function getReferralStats(userId: string): Promise<{
  totalReferrals: number;
  successfulReferrals: number;
  totalEarnings: number;
  pendingEarnings: number;
  paidEarnings: number;
}> {
  const userCodes = await getUserReferralCodes(userId);
  const codeIds = userCodes.map(code => code.id);
  
  const userUsages = referralUsages.filter(usage => 
    codeIds.includes(usage.referralCodeId)
  );
  
  const successfulReferrals = userUsages.filter(usage => usage.subscriptionDate).length;
  const totalEarnings = userUsages.reduce((sum, usage) => sum + usage.rewardAmount, 0);
  const paidEarnings = userUsages
    .filter(usage => usage.rewardPaid)
    .reduce((sum, usage) => sum + usage.rewardAmount, 0);
  const pendingEarnings = totalEarnings - paidEarnings;
  
  return {
    totalReferrals: userUsages.length,
    successfulReferrals,
    totalEarnings,
    pendingEarnings,
    paidEarnings,
  };
}

// Get referral history for user
async function getReferralHistory(userId: string): Promise<{
  codes: ReferralCode[];
  usages: (ReferralUsage & { referralCode: ReferralCode })[];
}> {
  const codes = await getUserReferralCodes(userId);
  const codeIds = codes.map(code => code.id);
  
  const usages = referralUsages
    .filter(usage => codeIds.includes(usage.referralCodeId))
    .map(usage => ({
      ...usage,
      referralCode: codes.find(code => code.id === usage.referralCodeId)!,
    }))
    .sort((a, b) => new Date(b.signupDate).getTime() - new Date(a.signupDate).getTime());
  
  return { codes, usages };
}

export const referralRepo = {
  createReferralCode,
  getReferralCodeByCode,
  getUserReferralCodes,
  recordReferralUsage,
  processSubscriptionReward,
  payReferralReward,
  getReferralStats,
  getReferralHistory,
};