import { createClient } from '@supabase/supabase-js';
import { Polar } from '@polar-sh/sdk';

export async function POST(req: Request) {
  try {
    const { planId } = await req.json();
    
    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
      {
        global: {
          headers: {
            Authorization: req.headers.get('Authorization') || '',
          },
        },
      }
    );

    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: { "Content-Type": "application/json" }
      });
    }

    const polar = new Polar({
      accessToken: process.env.POLAR_ACCESS_TOKEN!,
    });

    // Create or get customer in Polar
    let customerId = '';
    try {
      const existingCustomer = await polar.customers.list({
        email: user.email!,
        limit: 1
      });
      
      if (existingCustomer.result.items.length > 0) {
        customerId = existingCustomer.result.items[0].id;
      } else {
        const newCustomer = await polar.customers.create({
          email: user.email!,
          name: user.user_metadata?.name || 'User',
          externalId: user.id
        });
        customerId = newCustomer.id;
        
        // Save Polar customer ID to our database
        await supabase
          .from('users')
          .update({ polar_customer_id: customerId })
          .eq('id', user.id);
      }
    } catch (error) {
      console.error('Polar customer creation error:', error);
      return new Response(JSON.stringify({ error: "Failed to create customer" }), {
        status: 500,
        headers: { "Content-Type": "application/json" }
      });
    }

    // Create checkout session based on plan
    let checkoutUrl = '';
    try {
      if (planId === 'unlimited') {
        // Create checkout for recurring subscription
        const checkout = await polar.checkouts.create({
          products: [process.env.POLAR_UNLIMITED_PRODUCT_ID!],
          customerId,
        });
        checkoutUrl = checkout.url;
      } else if (planId === 'pay_per_use') {
        // For pay-per-use, just update the user's tier in our database
        await supabase
          .from('users')
          .update({ subscription_tier: 'pay_per_use' })
          .eq('id', user.id);
        
        return new Response(JSON.stringify({ 
          success: true,
          message: 'Successfully upgraded to pay-per-use plan'
        }), {
          headers: { "Content-Type": "application/json" }
        });
      }
    } catch (error) {
      console.error('Polar checkout creation error:', error);
      return new Response(JSON.stringify({ error: "Failed to create checkout" }), {
        status: 500,
        headers: { "Content-Type": "application/json" }
      });
    }

    return new Response(JSON.stringify({ checkoutUrl }), {
      headers: { "Content-Type": "application/json" }
    });

  } catch (error) {
    console.error('Checkout API error:', error);
    return new Response(JSON.stringify({ error: "Internal server error" }), {
      status: 500,
      headers: { "Content-Type": "application/json" }
    });
  }
}