/**
 * Pricing Constants
 * Centralized pricing configuration for the RevoVend platform
 */

export const PRICING = {
  // External invite costs
  EXTERNAL_INVITE_COST: 5.00, // Updated from $3 to $5
  
  // Commission rates
  HOST_BOOKING_FEE_RATE: 0.15, // 15% commission on Local Vendor bookings
  TABLE_SALE_FEE_RATE: 0.05, // 5% fee on all event table sales
  
  // Credit costs (for internal proposals)
  CREDIT_COSTS: {
    INTERNAL_REVERSE_PROPOSAL: 1,
  },
  
  // Credit rewards
  CREDIT_REWARDS: {
    REFERRAL_CONVERSION: 5,
    REFERRAL_PRO_UPGRADE: 3,
  },
  
  // Subscription tiers (if applicable)
  SUBSCRIPTION: {
    BASIC: {
      MONTHLY: 9.99,
      YEARLY: 99.99,
    },
    PRO: {
      MONTHLY: 19.99,
      YEARLY: 199.99,
    },
    ENTERPRISE: {
      MONTHLY: 49.99,
      YEARLY: 499.99,
    },
  },
  
  // Processing fees
  PROCESSING_FEE_RATE: 0.029, // 2.9% + $0.30 per transaction (typical Stripe rate)
  PROCESSING_FEE_FIXED: 0.30,
  
  // Minimum amounts
  MINIMUM_PAYOUT: 10.00,
  MINIMUM_CHARGE: 1.00,
} as const;

// Helper functions for pricing calculations
export const calculateHostBookingFee = (amount: number): number => {
  return amount * PRICING.HOST_BOOKING_FEE_RATE;
};

export const calculateTableSaleFee = (amount: number): number => {
  return amount * PRICING.TABLE_SALE_FEE_RATE;
};

export const calculateProcessingFee = (amount: number): number => {
  return (amount * PRICING.PROCESSING_FEE_RATE) + PRICING.PROCESSING_FEE_FIXED;
};

export const formatCurrency = (amount: number): string => {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
  }).format(amount);
};

// Export individual constants for easy importing
export const EXTERNAL_INVITE_COST = PRICING.EXTERNAL_INVITE_COST;
export const HOST_BOOKING_FEE_RATE = PRICING.HOST_BOOKING_FEE_RATE;
export const TABLE_SALE_FEE_RATE = PRICING.TABLE_SALE_FEE_RATE;