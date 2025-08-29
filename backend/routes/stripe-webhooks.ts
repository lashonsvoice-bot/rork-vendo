import { Hono } from 'hono';
import { config } from '../config/env';
import { constructWebhookEvent, getVerificationSession, isVerificationSuccessful, getVerificationDetails } from '../lib/stripe';
import { subscriptionRepo } from '../db/subscription-repo';
import { profileRepo, type ContractorProfile } from '../db/profile-repo';
import { referralRepo } from '../db/referral-repo';

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
        const localSub = await subscriptionRepo.updateByStripeSubscriptionId(subscription.id, {
          status: subscription.status === 'active' ? 'active' :
                 subscription.status === 'trialing' ? 'trialing' :
                 subscription.status === 'past_due' ? 'past_due' : 'canceled',
          currentPeriodStart: new Date(subscription.current_period_start * 1000).toISOString(),
          currentPeriodEnd: new Date(subscription.current_period_end * 1000).toISOString(),
          trialEnd: subscription.trial_end ? new Date(subscription.trial_end * 1000).toISOString() : undefined,
        });
        
        // Process referral reward if this is a new active subscription
        if (event.type === 'customer.subscription.created' && 
            subscription.status === 'active' && 
            localSub) {
          try {
            // Get subscription amount from the first item
            const item = subscription.items?.data?.[0];
            const price = item?.price;
            if (price) {
              const amount = price.unit_amount ? price.unit_amount / 100 : 0;
              const tierMeta = price.metadata?.tier || 'starter';
              const tier = ['starter', 'professional', 'enterprise'].includes(tierMeta) ? 
                          tierMeta as 'starter' | 'professional' | 'enterprise' : 'starter';
              
              // Process referral reward
              const result = await referralRepo.processSubscriptionReward(
                localSub.userId,
                amount,
                tier
              );
              
              if (result) {
                console.log('[Stripe Webhook] Processed referral reward:', result.rewardAmount, 'for user:', localSub.userId);
              }
            }
          } catch (error) {
            console.error('[Stripe Webhook] Error processing referral reward:', error);
          }
        }
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

      case 'identity.verification_session.verified': {
        const session = event.data.object as any;
        console.log('Identity verification completed:', session.id);
        await handleVerificationCompleted(session);
        break;
      }

      case 'identity.verification_session.requires_input': {
        const session = event.data.object as any;
        console.log('Identity verification requires input:', session.id);
        // TODO: Notify user that additional input is required
        break;
      }

      case 'identity.verification_session.canceled': {
        const session = event.data.object as any;
        console.log('Identity verification canceled:', session.id);
        // TODO: Handle verification cancellation
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

async function handleVerificationCompleted(session: any) {
  try {
    console.log('[stripe-webhook] Processing verification completion for session:', session.id);
    
    const userId = session.metadata?.userId;
    if (!userId) {
      console.error('[stripe-webhook] No userId in session metadata');
      return;
    }
    
    // Get the full session with verified outputs
    const fullSession = await getVerificationSession(session.id);
    
    if (isVerificationSuccessful(fullSession)) {
      const profile = await profileRepo.findByUserId(userId);
      if (profile && profile.role === 'contractor') {
        const verificationDetails = getVerificationDetails(fullSession);
        
        if (verificationDetails) {
          const updatedProfile: ContractorProfile = {
            ...profile,
            isVerified: true,
            verificationDate: verificationDetails.verifiedAt,
            verificationSessionId: fullSession.id,
            verifiedName: `${verificationDetails.firstName} ${verificationDetails.lastName}`,
            verifiedAddress: verificationDetails.address,
            verifiedDateOfBirth: verificationDetails.dateOfBirth,
          } as ContractorProfile & {
            isVerified: boolean;
            verificationDate: string;
            verificationSessionId: string;
            verifiedName: string;
            verifiedAddress: any;
            verifiedDateOfBirth: any;
          };
          
          await profileRepo.upsert(updatedProfile);
          console.log('[stripe-webhook] Updated contractor profile with verification data');
          
          // TODO: Send notification to user about successful verification
          // TODO: Apply verification discount if applicable
        }
      }
    }
  } catch (error) {
    console.error('[stripe-webhook] Error handling verification completion:', error);
  }
}

export default webhooks;