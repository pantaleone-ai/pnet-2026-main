import { NextRequest, NextResponse } from 'next/server';
import Stripe from 'stripe';
import { track } from '@/lib/analytics';
import { headers } from 'next/headers';

const endpointSecret = process.env.STRIPE_WEBHOOK_SECRET;

// Lazy initialization of Stripe client to avoid build-time errors
let stripe: Stripe | null = null;

function getStripeClient(): Stripe {
  if (!stripe) {
    const apiKey = process.env.STRIPE_SECRET_KEY;
    if (!apiKey) {
      throw new Error('STRIPE_SECRET_KEY is required');
    }
    stripe = new Stripe(apiKey);
  }
  return stripe;
}

/**
 * Handle Stripe webhooks for e-commerce tracking
 * Processes checkout.session.completed events to track purchases server-side
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.text();
    const headersList = await headers();
    const sig = headersList.get('stripe-signature');

    if (!sig || !endpointSecret) {
      console.error('Missing Stripe signature or webhook secret');
      return NextResponse.json({ error: 'Webhook configuration error' }, { status: 400 });
    }

    let event: Stripe.Event;

    try {
      event = getStripeClient().webhooks.constructEvent(body, sig, endpointSecret);
    } catch (err: any) {
      console.error('Webhook signature verification failed:', err.message);
      return NextResponse.json({ error: 'Webhook signature verification failed' }, { status: 400 });
    }

    // Handle the event
    switch (event.type) {
      case 'checkout.session.completed':
        await handleCheckoutSessionCompleted(event.data.object as Stripe.Checkout.Session);
        break;

      case 'payment_intent.succeeded':
        await handlePaymentIntentSucceeded(event.data.object as Stripe.PaymentIntent);
        break;

      case 'charge.succeeded':
        await handleChargeSucceeded(event.data.object as Stripe.Charge);
        break;

      default:
        console.log(`Unhandled event type: ${event.type}`);
    }

    return NextResponse.json({ received: true });
  } catch (error) {
    console.error('Webhook error:', error);
    return NextResponse.json({ error: 'Webhook handler failed' }, { status: 500 });
  }
}

/**
 * Handle successful checkout session completion
 * This is the primary event for tracking purchases
 */
async function handleCheckoutSessionCompleted(session: Stripe.Checkout.Session) {
  try {
    console.log('Processing checkout.session.completed:', session.id);

    // Skip if this is a test mode event and we're in production
    if (session.livemode === false && process.env.NODE_ENV === 'production') {
      console.log('Skipping test mode event in production');
      return;
    }

    // Get line items from the session
    const lineItems = await getStripeClient().checkout.sessions.listLineItems(session.id, {
      expand: ['data.price.product']
    });

    if (!lineItems.data.length) {
      console.warn('No line items found for session:', session.id);
      return;
    }

    // Extract purchase data
    const purchaseData = {
      transactionId: session.id,
      value: (session.amount_total || 0) / 100, // Convert from cents
      currency: session.currency?.toUpperCase() || 'USD',
      tax: session.total_details?.amount_tax ? session.total_details.amount_tax / 100 : undefined,
      shipping: session.shipping_cost?.amount_total ? session.shipping_cost.amount_total / 100 : undefined,
      products: lineItems.data.map(item => {
        const product = item.price?.product as Stripe.Product;
        return {
          id: product?.id || item.price?.id || 'unknown',
          name: product?.name || 'Unknown Product',
          category: product?.metadata?.category || 'digital',
          price: (item.amount_total || 0) / 100,
          quantity: item.quantity || 1,
          brand: 'Pantaleone Digital Services'
        };
      })
    };

    // Track purchase in all analytics platforms
    console.log('Tracking purchase:', purchaseData);
    track.purchase(purchaseData);

    // Additional server-side logging for revenue tracking
    console.log(`💰 Purchase completed: $${purchaseData.value} ${purchaseData.currency} - ${purchaseData.products.length} items`);

  } catch (error) {
    console.error('Error processing checkout session:', error);
  }
}

/**
 * Handle payment intent succeeded (backup tracking)
 */
async function handlePaymentIntentSucceeded(paymentIntent: Stripe.PaymentIntent) {
  try {
    console.log('Processing payment_intent.succeeded:', paymentIntent.id);

    // Only process if we haven't already tracked this via checkout session
    // Payment intents can be processed multiple times, so we use idempotency
    if (paymentIntent.metadata?.tracked === 'true') {
      return;
    }

    // Mark as tracked to prevent duplicate processing
    await getStripeClient().paymentIntents.update(paymentIntent.id, {
      metadata: { ...paymentIntent.metadata, tracked: 'true' }
    });

    // Extract basic purchase data from payment intent
    const purchaseData = {
      transactionId: paymentIntent.id,
      value: (paymentIntent.amount || 0) / 100,
      currency: paymentIntent.currency?.toUpperCase() || 'USD',
      products: [{
        id: paymentIntent.metadata?.product_id || 'unknown',
        name: paymentIntent.metadata?.product_name || 'Digital Product',
        category: paymentIntent.metadata?.category || 'digital',
        price: (paymentIntent.amount || 0) / 100,
        quantity: 1,
        brand: 'Pantaleone Digital Services'
      }]
    };

    track.purchase(purchaseData);
    console.log(`💰 Payment intent tracked: $${purchaseData.value} ${purchaseData.currency}`);

  } catch (error) {
    console.error('Error processing payment intent:', error);
  }
}

/**
 * Handle charge succeeded (additional tracking layer)
 */
async function handleChargeSucceeded(charge: Stripe.Charge) {
  try {
    console.log('Processing charge.succeeded:', charge.id);

    // This provides an additional layer of tracking for revenue verification
    const chargeData = {
      transactionId: charge.id,
      value: (charge.amount || 0) / 100,
      currency: charge.currency?.toUpperCase() || 'USD',
      products: [{
        id: charge.metadata?.product_id || 'unknown',
        name: charge.metadata?.product_name || 'Digital Product',
        category: charge.metadata?.category || 'digital',
        price: (charge.amount || 0) / 100,
        quantity: 1,
        brand: 'Pantaleone Digital Services'
      }]
    };

    // Log for revenue reconciliation
    console.log(`💳 Charge succeeded: $${chargeData.value} ${chargeData.currency} - ${charge.id}`);

  } catch (error) {
    console.error('Error processing charge:', error);
  }
}
