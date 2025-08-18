# Backend Data Directory

This directory contains JSON files used for data storage in development mode.

Files:
- `users.json` - User accounts and authentication data
- `profiles.json` - User profile information
- `wallets.json` - User wallet balances
- `wallet-transactions.json` - Wallet transaction history
- `events.json` - Event data (if needed for persistence)
- `subscriptions.json` - Subscription data
- `subscription-usage.json` - Event usage tracking

Note: In production, these would be replaced with a proper database.

---

# Revovend Stripe Subscription Setup Guide

This guide will help you set up Stripe for Revovend's subscription model with the correct products, prices, and webhooks.

## 🚀 Quick Setup Steps

### 1. Create Stripe Account & Get API Keys

1. Go to [Stripe Dashboard](https://dashboard.stripe.com)
2. Navigate to **Developers** → **API Keys**
3. Copy your **Publishable Key** and **Secret Key**
4. Add them to your `.env` file:

```bash
STRIPE_SECRET_KEY=sk_test_your_actual_secret_key_here
STRIPE_PUBLISHABLE_KEY=pk_test_your_actual_publishable_key_here
```

### 2. Create Subscription Products in Stripe

Go to **Products** → **Add Product** and create these three products:

#### Starter Plan
- **Product Name**: "Revovend Starter Plan"
- **Description**: "Perfect for small event organizers. 10 events per month with advanced management tools."
- **Pricing**:
  - Monthly: $29.00 USD
  - Yearly: $276.00 USD ($23/month - 20% discount)

#### Professional Plan
- **Product Name**: "Revovend Professional Plan"
- **Description**: "Ideal for growing businesses. 20 events per month with full feature access."
- **Pricing**:
  - Monthly: $59.00 USD
  - Yearly: $564.00 USD ($47/month - 20% discount)

#### Enterprise Plan
- **Product Name**: "Revovend Enterprise Plan"
- **Description**: "For large organizations. Unlimited events with premium support and features."
- **Pricing**:
  - Monthly: $99.00 USD
  - Yearly: $948.00 USD ($79/month - 20% discount)

### 3. Copy Price IDs to Environment

After creating each product, copy the **Price IDs** (they start with `price_`) and add them to your `.env`:

```bash
# Starter Plan Price IDs
STRIPE_STARTER_MONTHLY_PRICE_ID=price_1234567890abcdef
STRIPE_STARTER_YEARLY_PRICE_ID=price_0987654321fedcba

# Professional Plan Price IDs
STRIPE_PROFESSIONAL_MONTHLY_PRICE_ID=price_abcdef1234567890
STRIPE_PROFESSIONAL_YEARLY_PRICE_ID=price_fedcba0987654321

# Enterprise Plan Price IDs
STRIPE_ENTERPRISE_MONTHLY_PRICE_ID=price_1111222233334444
STRIPE_ENTERPRISE_YEARLY_PRICE_ID=price_4444333322221111
```

### 4. Set Up Webhooks

1. Go to **Developers** → **Webhooks**
2. Click **Add endpoint**
3. Set **Endpoint URL** to: `https://yourdomain.com/api/webhooks/stripe`
4. Select these events:
   - `customer.subscription.created`
   - `customer.subscription.updated`
   - `customer.subscription.deleted`
   - `invoice.payment_succeeded`
   - `invoice.payment_failed`
   - `customer.subscription.trial_will_end`
5. Copy the **Signing secret** (starts with `whsec_`) to your `.env`:

```bash
STRIPE_WEBHOOK_SECRET=whsec_your_webhook_signing_secret_here
```

## 🧪 Testing Your Setup

### Test with Stripe Test Cards

Use these test card numbers:
- **Successful payment**: `4242424242424242`
- **Declined payment**: `4000000000000002`
- **Requires authentication**: `4000002500003155`

### Test Subscription Flow

1. Create a business owner account in your app
2. Navigate to subscription/upgrade page
3. Select a plan and billing cycle
4. Use test card to complete payment
5. Verify subscription is created in both your app and Stripe Dashboard

## 🔧 Configuration Details

### Subscription Features by Plan

| Feature | Starter | Professional | Enterprise |
|---------|---------|--------------|------------|
| Events/Month | 10 | 20 | Unlimited |
| Event Management | ✅ | ✅ | ✅ |
| Analytics | Basic | Advanced | Advanced + Reporting |
| Support | Email | Phone + Email | 24/7 Priority |
| Custom Branding | ✅ | ✅ | White-label |
| API Access | ❌ | ✅ | ✅ |
| Team Collaboration | ❌ | ✅ | ✅ |
| Custom Integrations | ❌ | ❌ | ✅ |
| Account Manager | ❌ | ❌ | ✅ |

### Trial Period
- **Free Trial**: 14 days for all new subscriptions
- **Events During Trial**: 5 events allowed
- **Trial Conversion**: Automatic billing after trial ends

### Billing & Discounts
- **Monthly Billing**: Standard pricing
- **Yearly Billing**: 20% discount (billed annually)
- **Verification Discount**: 5% additional discount for verified businesses
- **Proration**: Automatic when upgrading/downgrading

## 🚨 Important Notes

### Security
- Never expose your **Secret Key** in client-side code
- Always validate webhook signatures
- Use HTTPS for webhook endpoints in production

### Production Checklist
- [ ] Switch to live Stripe keys (remove `_test_` from keys)
- [ ] Update webhook endpoint to production URL
- [ ] Test all subscription flows in production
- [ ] Set up monitoring for failed payments
- [ ] Configure email notifications for subscription events

### Webhook Events Handled

Our webhook handler processes these events:
- **subscription.created/updated**: Updates local subscription status
- **subscription.deleted**: Marks subscription as canceled
- **invoice.payment_succeeded**: Records successful payment
- **invoice.payment_failed**: Marks subscription as past due
- **subscription.trial_will_end**: Sends trial ending notification

## 🆘 Troubleshooting

### Common Issues

1. **"Invalid price ID" error**
   - Verify price IDs in `.env` match those in Stripe Dashboard
   - Ensure you're using the correct test/live keys

2. **Webhook signature verification failed**
   - Check webhook secret in `.env`
   - Ensure webhook URL is accessible
   - Verify HTTPS in production

3. **Subscription not updating in app**
   - Check webhook endpoint is receiving events
   - Verify database connection
   - Check server logs for errors

### Support

For additional help:
- [Stripe Documentation](https://stripe.com/docs)
- [Stripe Support](https://support.stripe.com)
- Check server logs for detailed error messages

---

**Last Updated**: January 2025
**Stripe API Version**: 2023-10-16