import { Hono } from 'hono';
import { config } from '@/backend/config/env';
import { constructWebhookEvent } from '@/backend/lib/stripe';
import { subscriptionRepo } from '@/backend/db/subscription-repo';

const webhooks = new Hono();

// Stripe webhook endpoint
webhooks.post('/stripe', async (c) => {
  if (!config.stripe?.webhookSecret) {
    console.error('Stripe webhook secret not configured');
    return c.json({ error: 'Webhook not configured' }, 400);
  }

  try {
    const body = await c.req.text();
    const signature = c.req.header('stripe-signature');

    if (!signature) {
      console.error('Missing Stripe signature');
      return c.json({ error: 'Missing signature' }, 400);
    }

    // Construct the webhook event
    const event = constructWebhookEvent(body, signature, config.stripe.webhookSecret);
    
    console.log('Received Stripe webhook:', event.type, event.id);

    // Handle the event
    switch (event.type) {
      case 'customer.subscription.created':
      case 'customer.subscription.updated': {
        const subscription = event.data.object as any;
        console.log('Subscription updated:', subscription.id, subscription.status);
        
        // Update local subscription record
        await subscriptionRepo.updateByStripeSubscriptionId(subscription.id, {
          status: subscription.status === 'active' ? 'active' :
                 subscription.status === 'trialing' ? 'trialing' :
                 subscription.status === 'past_due' ? 'past_due' : 'canceled',
          currentPeriodStart: new Date(subscription.current_period_start * 1000).toISOString(),
          currentPeriodEnd: new Date(subscription.current_period_end * 1000).toISOString(),
          trialEnd: subscription.trial_end ? new Date(subscription.trial_end * 1000).toISOString() : undefined,
        });
        break;
      }

      case 'customer.subscription.deleted': {
        const subscription = event.data.object as any;
        console.log('Subscription canceled:', subscription.id);
        
        // Mark subscription as canceled
        await subscriptionRepo.updateByStripeSubscriptionId(subscription.id, {
          status: 'canceled',
        });
        break;
      }

      case 'invoice.payment_succeeded': {
        const invoice = event.data.object as any;
        console.log('Payment succeeded for invoice:', invoice.id);
        
        if (invoice.subscription) {
          // Update payment information
          await subscriptionRepo.updateByStripeSubscriptionId(invoice.subscription, {
            lastPaymentDate: new Date().toISOString(),
            totalPaid: (invoice.amount_paid / 100), // Convert from cents
          });
        }
        break;
      }

      case 'invoice.payment_failed': {
        const invoice = event.data.object as any;
        console.log('Payment failed for invoice:', invoice.id);
        
        if (invoice.subscription) {
          // Mark subscription as past due
          await subscriptionRepo.updateByStripeSubscriptionId(invoice.subscription, {
            status: 'past_due',
          });
        }
        break;
      }

      case 'customer.subscription.trial_will_end': {
        const subscription = event.data.object as any;
        console.log('Trial ending soon for subscription:', subscription.id);
        
        // You can send notification emails here
        // For now, just log it
        break;
      }

      default:
        console.log('Unhandled Stripe webhook event type:', event.type);
    }

    return c.json({ received: true });
  } catch (error) {
    console.error('Stripe webhook error:', error);
    return c.json({ error: 'Webhook processing failed' }, 400);
  }
});

export default webhooks;