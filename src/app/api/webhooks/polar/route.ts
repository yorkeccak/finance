/**
 * Simplified Webhook Handler using Customer State pattern
 * Following POLAR_BILLING_SYSTEM_REDESIGN_V2.md specification
 * Reduced from 272 lines to ~50 lines
 */

import { headers } from 'next/headers';
import { createClient } from '@supabase/supabase-js';
import { validateEvent, WebhookVerificationError } from '@polar-sh/sdk/webhooks';

export async function POST(req: Request) {
  try {
    const body = await req.text();
    const headersList = await headers();

    // Convert Next.js headers to plain object that Polar SDK expects
    const headersObj: Record<string, string> = {};
    headersList.forEach((value, key) => {
      headersObj[key.toLowerCase()] = value;
    });

    // Skip signature verification in development if configured
    const skipVerification = process.env.NEXT_PUBLIC_APP_MODE === 'development' 
      && process.env.POLAR_SKIP_WEBHOOK_VERIFICATION === 'true';

    let event;
    
    if (!skipVerification) {
      if (!process.env.POLAR_WEBHOOK_SECRET) {
        console.error('[Webhook] Missing webhook secret');
        return new Response('Webhook secret not configured', { status: 500 });
      }

      try {
        // Validate webhook signature using Polar SDK (Standard Webhooks)
        event = validateEvent(body, headersObj, process.env.POLAR_WEBHOOK_SECRET);
      } catch (error) {
        if (error instanceof WebhookVerificationError) {
          console.error('[Webhook] Invalid signature:', error.message);
          console.error('[Webhook] Available headers:', Object.keys(headersObj));
          return new Response('Invalid signature', { status: 403 });
        }
        console.error('[Webhook] Validation error:', error);
        return new Response('Webhook validation failed', { status: 400 });
      }
    } else {
      event = JSON.parse(body);
      console.log('[Webhook] Signature verification skipped (development mode)');
    }

    console.log(`[Webhook] Received event: ${event.type}`);

    console.log('🚨🚨🚨 WEBHOOK PROCESSING STARTING 🚨🚨🚨');
    console.log('[Webhook] Full event object:', JSON.stringify(event, null, 2));

    // Initialize Supabase service client
    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!
    );

    // Handle customer state changes (primary webhook pattern)
    if (event.type === 'customer.state_changed' && event.data.externalId) {
      const { externalId, subscriptions, id: customerId } = event.data;
      
      // Find active subscription
      const activeSubscription = subscriptions?.find((s: any) => s.status === 'active');
      
      let tier = 'free';
      let status = 'inactive';
      let subscriptionId = null;
      
      if (activeSubscription) {
        // Determine tier from product ID
        tier = activeSubscription.productId === process.env.POLAR_UNLIMITED_PRODUCT_ID 
          ? 'unlimited' 
          : 'pay_per_use';
        status = 'active';
        subscriptionId = activeSubscription.id;
      }
      
      // Update subscription fields including Polar IDs
      const { error } = await supabase
        .from('users')
        .update({ 
          subscription_tier: tier,
          subscription_status: status,
          polar_customer_id: customerId,
          subscription_id: subscriptionId
        })
        .eq('id', externalId);

      if (error) {
        console.error('[Webhook] Failed to update user:', error);
        return new Response('Database update failed', { status: 500 });
      }

      console.log(`[Webhook] ✅ Successfully updated user ${externalId} - tier: ${tier}, status: ${status}, polar_customer_id: ${customerId}, subscription_id: ${subscriptionId}`);
    }

    // Handle legacy events during migration
    if (event.type === 'subscription.created' || event.type === 'subscription.updated') {
      const subscription = event.data;
      
      console.log(`[Webhook] Processing ${event.type}:`);
      console.log(`[Webhook] - Full subscription data:`, JSON.stringify(subscription, null, 2));
      
      // Try multiple ways to access external ID
      const externalId = subscription.customer?.external_id || 
                        subscription.customer?.externalId || 
                        subscription.externalCustomerId ||
                        subscription.metadata?.userId;
      
      // Try multiple ways to access product ID  
      const productId = subscription.product_id || 
                       subscription.productId ||
                       subscription.product?.id;
      
      console.log(`[Webhook] - External ID: ${externalId}`);
      console.log(`[Webhook] - Subscription status: ${subscription.status}`);
      console.log(`[Webhook] - Product ID: ${productId}`);
      
      if (externalId) {
        console.log(`[Webhook] Processing ${event.type} for user: ${externalId}`);
        console.log(`[Webhook] Subscription details:`, {
          status: subscription.status,
          cancelAtPeriodEnd: subscription.cancelAtPeriodEnd,
          canceledAt: subscription.canceledAt
        });
        
        // Check if subscription is cancelled (either inactive or scheduled for cancellation)
        const isCancelled = subscription.status !== 'active' || subscription.cancelAtPeriodEnd === true;
        
        if (isCancelled) {
          console.log(`[Webhook] Subscription cancelled, setting user to free tier`);
          
          const { error } = await supabase
            .from('users')
            .update({ 
              subscription_tier: 'free',
              subscription_status: 'inactive',
              subscription_id: null
            })
            .eq('id', externalId);

          if (error) {
            console.error('[Webhook] Failed to update user to free tier:', error);
            return new Response('Database update failed', { status: 500 });
          }

          console.log(`[Webhook] ✅ Successfully updated user ${externalId} to free tier`);
        } else {
          // Active subscription - determine tier from product ID
          const tier = productId === process.env.POLAR_UNLIMITED_PRODUCT_ID 
            ? 'unlimited' 
            : 'pay_per_use';
          
          console.log(`[Webhook] Product ID: ${productId}, Unlimited Product ID: ${process.env.POLAR_UNLIMITED_PRODUCT_ID}, Tier: ${tier}`);
          
          // Extract Polar customer ID and subscription ID
          const polarCustomerId = subscription.customer?.id || subscription.customerId;
          const subscriptionId = subscription.id;
          
          const { error } = await supabase
            .from('users')
            .update({ 
              subscription_tier: tier,
              subscription_status: 'active',
              polar_customer_id: polarCustomerId,
              subscription_id: subscriptionId
            })
            .eq('id', externalId);

          if (error) {
            console.error('[Webhook] Failed to update user:', error);
            return new Response('Database update failed', { status: 500 });
          }

          console.log(`[Webhook] ✅ Successfully updated user ${externalId} - tier: ${tier}, status: active, polar_customer_id: ${polarCustomerId}, subscription_id: ${subscriptionId}`);
        }
      }
    }
    
    if (event.type === 'subscription.canceled') {
      const subscription = event.data;
      
      // Try multiple ways to access external ID
      const externalId = subscription.customer?.external_id || 
                        subscription.customer?.externalId || 
                        subscription.metadata?.userId;
      
      if (externalId) {
        console.log(`[Webhook] Processing cancellation for user: ${externalId}`);
        console.log(`[Webhook] Cancellation details:`, {
          status: subscription.status,
          cancel_at_period_end: subscription.cancel_at_period_end,
          canceled_at: subscription.canceled_at,
          ends_at: subscription.ends_at
        });
        
        const { error } = await supabase
          .from('users')
          .update({ 
            subscription_tier: 'free',
            subscription_status: 'inactive',
            subscription_id: null
          })
          .eq('id', externalId);

        if (error) {
          console.error('[Webhook] Failed to update user:', error);
          return new Response('Database update failed', { status: 500 });
        }

        console.log(`[Webhook] ✅ Successfully updated user ${externalId} - tier: free, status: inactive, subscription_id: null`);
      }
    }

    return new Response('OK', { status: 200 });
    
  } catch (error) {
    console.error('[Webhook] Error processing webhook:', error);
    return new Response('Internal Server Error', { status: 500 });
  }
}