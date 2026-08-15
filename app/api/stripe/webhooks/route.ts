import { NextRequest, NextResponse } from 'next/server';
import Stripe from 'stripe';
import { track, serverTrack } from '@/lib/analytics';
import { headers } from 'next/headers';
import { sendEmail } from '@/lib/resendClient';

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

      case 'charge.refunded':
        await handleChargeRefunded(event.data.object as Stripe.Charge);
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
 * This is the primary event for tracking purchases and automated fulfillment
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

    // Track purchase in all analytics platforms (client-side)
    console.log('Tracking purchase:', purchaseData);
    track.purchase(purchaseData);

    // Server-side tracking via GA4 Measurement Protocol and Meta CAPI
    const clientId = session.customer as string || 'anonymous';
    await Promise.all([
      serverTrack.purchase(purchaseData, clientId),
      serverTrack.purchaseMeta(purchaseData, session.id),
    ]);

    // Automated fulfillment: Send purchase confirmation email
    await sendPurchaseConfirmationEmail(session, lineItems.data);

    // Additional server-side logging for revenue tracking
    console.log(`💰 Purchase completed: $${purchaseData.value} ${purchaseData.currency} - ${purchaseData.products.length} items`);

  } catch (error) {
    console.error('Error processing checkout session:', error);
  }
}

/**
 * Send purchase confirmation email with digital product access
 */
async function sendPurchaseConfirmationEmail(
  session: Stripe.Checkout.Session,
  lineItems: Stripe.LineItem[]
) {
  try {
    const customerEmail = session.customer_details?.email || session.customer_email;
    if (!customerEmail) {
      console.warn('No customer email found for session:', session.id);
      return;
    }

    const productName = lineItems[0]?.price?.product
      ? (lineItems[0].price.product as Stripe.Product).name
      : 'Your Purchase';

    const purchaseUrl = session.metadata?.purchase_url || 'https://pantaleone.net/shop';
    const appUrl = session.metadata?.app_url || 'https://pantaleone.net';

    const html = `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="utf-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
      </head>
      <body style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; padding: 20px;">
        <h1 style="color: #1a1a1a; border-bottom: 2px solid #e5e5e5; padding-bottom: 10px;">Thank you for your purchase!</h1>

        <p>Hi there,</p>

        <p>Your purchase of <strong>${productName}</strong> has been confirmed. Here are your order details:</p>

        <div style="background: #f9f9f9; border-radius: 8px; padding: 15px; margin: 20px 0;">
          <p style="margin: 5px 0;"><strong>Order ID:</strong> ${session.id}</p>
          <p style="margin: 5px 0;"><strong>Amount:</strong> $${(session.amount_total || 0) / 100} ${session.currency?.toUpperCase()}</p>
        </div>

        <h2 style="color: #1a1a1a;">Get Started</h2>

        <p>You can access your purchase using the link below:</p>

        <a href="${purchaseUrl}"
           style="display: inline-block; background: #000; color: #fff; padding: 12px 24px; text-decoration: none; border-radius: 6px; font-weight: bold; margin: 10px 0;">
          Access Your Purchase
        </a>

        <p style="margin-top: 20px;">If you have any questions or need assistance, please don't hesitate to reach out.</p>

        <hr style="border: none; border-top: 1px solid #e5e5e5; margin: 30px 0;">

        <p style="color: #666; font-size: 14px;">
          Best regards,<br>
          Matt Pantaleone<br>
          Pantaleone Digital Services<br>
          <a href="${appUrl}" style="color: #666;">${appUrl}</a>
        </p>
      </body>
      </html>
    `;

    await sendEmail({
      to: customerEmail,
      from: 'Pantaleone Digital Services <noreply@pantaleone.net>',
      subject: `Purchase Confirmation - ${productName}`,
      html,
    });

    console.log(`📧 Purchase confirmation email sent to ${customerEmail} for session ${session.id}`);
  } catch (error) {
    console.error('Error sending purchase confirmation email:', error);
    // Don't throw - email failure should not block the webhook
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

    // Server-side tracking
    await Promise.all([
      serverTrack.purchase(purchaseData, paymentIntent.customer as string || 'anonymous'),
      serverTrack.purchaseMeta(purchaseData, paymentIntent.id),
    ]);

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

/**
 * Handle charge refunded (refund tracking)
 */
async function handleChargeRefunded(charge: Stripe.Charge) {
  try {
    console.log('Processing charge.refunded:', charge.id);

    if (!charge.amount_refunded) {
      return;
    }

    const refundData = {
      transactionId: charge.id,
      value: charge.amount_refunded / 100,
      currency: charge.currency?.toUpperCase() || 'USD',
      products: [{
        id: charge.metadata?.product_id || 'unknown',
        name: charge.metadata?.product_name || 'Digital Product',
        quantity: 1,
      }]
    };

    const clientId = charge.customer as string || 'anonymous';
    await Promise.all([
      serverTrack.refund(refundData, clientId),
      serverTrack.refundMeta(refundData, `refund_${charge.id}`),
    ]);

    console.log(`💸 Refund processed: $${refundData.value} ${refundData.currency} - ${charge.id}`);

  } catch (error) {
    console.error('Error processing refund:', error);
  }
}
