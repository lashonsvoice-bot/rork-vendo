import Stripe from 'stripe';
import { config } from '@/backend/config/env';

if (!config.stripe?.secretKey) {
  throw new Error('Stripe secret key is required. Please set STRIPE_SECRET_KEY in your environment variables.');
}

export const stripe = new Stripe(config.stripe.secretKey, {
  typescript: true,
});

// Stripe Product and Price IDs - Update these with your actual Stripe product/price IDs
// Get these from your Stripe Dashboard → Products → [Product] → Pricing
export const STRIPE_PRODUCTS = {
  starter: {
    monthly: 'price_1234567890abcdef', // Replace with actual price ID from Stripe
    yearly: 'price_1234567890abcdef',   // Replace with actual price ID from Stripe
  },
  professional: {
    monthly: 'price_1234567890abcdef', // Replace with actual price ID from Stripe
    yearly: 'price_1234567890abcdef',   // Replace with actual price ID from Stripe
  },
  enterprise: {
    monthly: 'price_1234567890abcdef', // Replace with actual price ID from Stripe
    yearly: 'price_1234567890abcdef',   // Replace with actual price ID from Stripe
  },
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