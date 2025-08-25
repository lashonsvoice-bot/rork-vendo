import Stripe from 'stripe';
import { config } from '../config/env';

if (!config.stripe?.secretKey) {
  throw new Error('Stripe secret key is required. Please set STRIPE_SECRET_KEY in your environment variables.');
}

export const stripe = new Stripe(config.stripe.secretKey, {
  typescript: true,
});

// Stripe Product and Price IDs for Revovend Subscription Plans
// These will be updated with actual Stripe price IDs after creating products in Stripe Dashboard
export const STRIPE_PRODUCTS = {
  starter: {
    monthly: process.env.STRIPE_STARTER_MONTHLY_PRICE_ID || 'price_starter_monthly_placeholder',
    yearly: process.env.STRIPE_STARTER_YEARLY_PRICE_ID || 'price_starter_yearly_placeholder',
  },
  professional: {
    monthly: process.env.STRIPE_PROFESSIONAL_MONTHLY_PRICE_ID || 'price_professional_monthly_placeholder',
    yearly: process.env.STRIPE_PROFESSIONAL_YEARLY_PRICE_ID || 'price_professional_yearly_placeholder',
  },
  enterprise: {
    monthly: process.env.STRIPE_ENTERPRISE_MONTHLY_PRICE_ID || 'price_enterprise_monthly_placeholder',
    yearly: process.env.STRIPE_ENTERPRISE_YEARLY_PRICE_ID || 'price_enterprise_yearly_placeholder',
  },
} as const;

// Revovend Subscription Plan Details
export const REVOVEND_PLANS = {
  starter: {
    name: 'Starter Plan',
    eventsLimit: 10,
    monthlyPrice: 29, // $29/month
    yearlyPrice: 23,  // $23/month when billed yearly (20% discount)
    features: [
      '10 events per month',
      'Advanced event management',
      'Priority email support',
      'Basic analytics',
      'Custom branding'
    ]
  },
  professional: {
    name: 'Professional Plan',
    eventsLimit: 20,
    monthlyPrice: 59, // $59/month
    yearlyPrice: 47,  // $47/month when billed yearly (20% discount)
    features: [
      '20 events per month',
      'Full event management suite',
      'Phone & email support',
      'Advanced analytics',
      'Custom branding',
      'API access',
      'Team collaboration'
    ]
  },
  enterprise: {
    name: 'Enterprise Plan',
    eventsLimit: -1, // Unlimited
    monthlyPrice: 99, // $99/month
    yearlyPrice: 79,  // $79/month when billed yearly (20% discount)
    features: [
      'Unlimited events',
      'Enterprise event management',
      '24/7 priority support',
      'Advanced analytics & reporting',
      'White-label solution',
      'API access',
      'Team collaboration',
      'Custom integrations',
      'Dedicated account manager'
    ]
  }
} as const;

export type SubscriptionTier = keyof typeof STRIPE_PRODUCTS;
export type BillingCycle = 'monthly' | 'yearly';

// Helper function to get price ID
export function getStripePriceId(tier: SubscriptionTier, cycle: BillingCycle): string {
  return STRIPE_PRODUCTS[tier][cycle];
}

// Helper function to create a customer
export async function createStripeCustomer({
  email,
  name,
  userId,
}: {
  email: string;
  name?: string;
  userId: string;
}): Promise<Stripe.Customer> {
  return await stripe.customers.create({
    email,
    name,
    metadata: {
      userId,
    },
  });
}

// Helper function to create a subscription
export async function createStripeSubscription({
  customerId,
  priceId,
  trialPeriodDays,
}: {
  customerId: string;
  priceId: string;
  trialPeriodDays?: number;
}): Promise<Stripe.Subscription> {
  const subscriptionData: Stripe.SubscriptionCreateParams = {
    customer: customerId,
    items: [{ price: priceId }],
    payment_behavior: 'default_incomplete',
    payment_settings: { save_default_payment_method: 'on_subscription' },
    expand: ['latest_invoice.payment_intent'],
  };

  if (trialPeriodDays) {
    subscriptionData.trial_period_days = trialPeriodDays;
  }

  return await stripe.subscriptions.create(subscriptionData);
}

// Helper function to update a subscription
export async function updateStripeSubscription({
  subscriptionId,
  priceId,
}: {
  subscriptionId: string;
  priceId: string;
}): Promise<Stripe.Subscription> {
  const subscription = await stripe.subscriptions.retrieve(subscriptionId);
  
  return await stripe.subscriptions.update(subscriptionId, {
    items: [{
      id: subscription.items.data[0].id,
      price: priceId,
    }],
    proration_behavior: 'create_prorations',
  });
}

// Helper function to cancel a subscription
export async function cancelStripeSubscription(subscriptionId: string): Promise<Stripe.Subscription> {
  return await stripe.subscriptions.cancel(subscriptionId);
}

// Helper function to create a payment intent for one-time payments
export async function createPaymentIntent({
  amount,
  currency = 'usd',
  customerId,
  description,
}: {
  amount: number;
  currency?: string;
  customerId?: string;
  description?: string;
}): Promise<Stripe.PaymentIntent> {
  return await stripe.paymentIntents.create({
    amount: Math.round(amount * 100), // Convert to cents
    currency,
    customer: customerId,
    description,
    automatic_payment_methods: {
      enabled: true,
    },
  });
}

// Helper function to construct webhook event
export function constructWebhookEvent(
  payload: string | Buffer,
  signature: string,
  webhookSecret: string
): Stripe.Event {
  return stripe.webhooks.constructEvent(payload, signature, webhookSecret);
}

// Helper function to get subscription status from Stripe
export async function getStripeSubscription(subscriptionId: string): Promise<Stripe.Subscription> {
  return await stripe.subscriptions.retrieve(subscriptionId, {
    expand: ['latest_invoice', 'customer'],
  });
}

// Helper function to get customer by ID
export async function getStripeCustomer(customerId: string): Promise<Stripe.Customer> {
  return await stripe.customers.retrieve(customerId) as Stripe.Customer;
}

// Helper function to list customer's payment methods
export async function getCustomerPaymentMethods(customerId: string): Promise<Stripe.PaymentMethod[]> {
  const paymentMethods = await stripe.paymentMethods.list({
    customer: customerId,
    type: 'card',
  });
  return paymentMethods.data;
}

// Helper function to create a setup intent for saving payment methods
export async function createSetupIntent(customerId: string): Promise<Stripe.SetupIntent> {
  return await stripe.setupIntents.create({
    customer: customerId,
    payment_method_types: ['card'],
    usage: 'off_session',
  });
}

// Create a Billing Portal session for a customer
export async function createBillingPortalSession(customerId: string, returnUrl: string): Promise<Stripe.BillingPortal.Session> {
  return await stripe.billingPortal.sessions.create({
    customer: customerId,
    return_url: returnUrl,
  });
}

// Stripe Identity Verification Functions

// Create a verification session for ID verification
export async function createVerificationSession({
  returnUrl,
  metadata,
}: {
  returnUrl: string;
  metadata?: Record<string, string>;
}): Promise<Stripe.Identity.VerificationSession> {
  return await stripe.identity.verificationSessions.create({
    type: 'document',
    metadata: metadata || {},
    options: {
      document: {
        allowed_types: ['driving_license', 'passport', 'id_card'],
        require_id_number: true,
        require_live_capture: true,
        require_matching_selfie: true,
      },
    },
    return_url: returnUrl,
  });
}

// Retrieve a verification session
export async function getVerificationSession(sessionId: string): Promise<Stripe.Identity.VerificationSession> {
  return await stripe.identity.verificationSessions.retrieve(sessionId, {
    expand: ['verified_outputs'],
  });
}

// Cancel a verification session
export async function cancelVerificationSession(sessionId: string): Promise<Stripe.Identity.VerificationSession> {
  return await stripe.identity.verificationSessions.cancel(sessionId);
}

// Helper function to check if verification is complete and successful
export function isVerificationSuccessful(session: Stripe.Identity.VerificationSession): boolean {
  return session.status === 'verified';
}

// Helper function to get verification details
export function getVerificationDetails(session: Stripe.Identity.VerificationSession) {
  if (!session.verified_outputs) {
    return null;
  }

  return {
    firstName: session.verified_outputs.first_name,
    lastName: session.verified_outputs.last_name,
    dateOfBirth: session.verified_outputs.dob,
    address: session.verified_outputs.address,
    idNumber: session.verified_outputs.id_number,
    verifiedAt: new Date().toISOString(),
  };
}

// Helper function to create Revovend subscription products in Stripe
// Run this once to set up your products in Stripe Dashboard
export async function createRevovendProducts(): Promise<{
  starter: { monthly: string; yearly: string };
  professional: { monthly: string; yearly: string };
  enterprise: { monthly: string; yearly: string };
}> {
  console.log('Creating Revovend subscription products in Stripe...');
  
  // Create Starter Plan
  const starterProduct = await stripe.products.create({
    name: 'Revovend Starter Plan',
    description: 'Perfect for small event organizers. 10 events per month with advanced management tools.',
    metadata: {
      tier: 'starter',
      eventsLimit: '10',
    },
  });
  
  const starterMonthly = await stripe.prices.create({
    product: starterProduct.id,
    unit_amount: 2900, // $29.00
    currency: 'usd',
    recurring: { interval: 'month' },
    metadata: { tier: 'starter', cycle: 'monthly' },
  });
  
  const starterYearly = await stripe.prices.create({
    product: starterProduct.id,
    unit_amount: 27600, // $276.00 ($23/month * 12)
    currency: 'usd',
    recurring: { interval: 'year' },
    metadata: { tier: 'starter', cycle: 'yearly' },
  });
  
  // Create Professional Plan
  const professionalProduct = await stripe.products.create({
    name: 'Revovend Professional Plan',
    description: 'Ideal for growing businesses. 20 events per month with full feature access.',
    metadata: {
      tier: 'professional',
      eventsLimit: '20',
    },
  });
  
  const professionalMonthly = await stripe.prices.create({
    product: professionalProduct.id,
    unit_amount: 5900, // $59.00
    currency: 'usd',
    recurring: { interval: 'month' },
    metadata: { tier: 'professional', cycle: 'monthly' },
  });
  
  const professionalYearly = await stripe.prices.create({
    product: professionalProduct.id,
    unit_amount: 56400, // $564.00 ($47/month * 12)
    currency: 'usd',
    recurring: { interval: 'year' },
    metadata: { tier: 'professional', cycle: 'yearly' },
  });
  
  // Create Enterprise Plan
  const enterpriseProduct = await stripe.products.create({
    name: 'Revovend Enterprise Plan',
    description: 'For large organizations. Unlimited events with premium support and features.',
    metadata: {
      tier: 'enterprise',
      eventsLimit: '-1',
    },
  });
  
  const enterpriseMonthly = await stripe.prices.create({
    product: enterpriseProduct.id,
    unit_amount: 9900, // $99.00
    currency: 'usd',
    recurring: { interval: 'month' },
    metadata: { tier: 'enterprise', cycle: 'monthly' },
  });
  
  const enterpriseYearly = await stripe.prices.create({
    product: enterpriseProduct.id,
    unit_amount: 94800, // $948.00 ($79/month * 12)
    currency: 'usd',
    recurring: { interval: 'year' },
    metadata: { tier: 'enterprise', cycle: 'yearly' },
  });
  
  const priceIds = {
    starter: {
      monthly: starterMonthly.id,
      yearly: starterYearly.id,
    },
    professional: {
      monthly: professionalMonthly.id,
      yearly: professionalYearly.id,
    },
    enterprise: {
      monthly: enterpriseMonthly.id,
      yearly: enterpriseYearly.id,
    },
  };
  
  console.log('✅ Revovend products created successfully!');
  console.log('Add these price IDs to your .env file:');
  console.log(`STRIPE_STARTER_MONTHLY_PRICE_ID=${priceIds.starter.monthly}`);
  console.log(`STRIPE_STARTER_YEARLY_PRICE_ID=${priceIds.starter.yearly}`);
  console.log(`STRIPE_PROFESSIONAL_MONTHLY_PRICE_ID=${priceIds.professional.monthly}`);
  console.log(`STRIPE_PROFESSIONAL_YEARLY_PRICE_ID=${priceIds.professional.yearly}`);
  console.log(`STRIPE_ENTERPRISE_MONTHLY_PRICE_ID=${priceIds.enterprise.monthly}`);
  console.log(`STRIPE_ENTERPRISE_YEARLY_PRICE_ID=${priceIds.enterprise.yearly}`);
  
  return priceIds;
}