import Stripe from "stripe";

let stripe: Stripe | null = null;

export function getStripeClient(): Stripe {
  if (!stripe) {
    const apiKey = process.env.STRIPE_SECRET_KEY;
    if (!apiKey) {
      throw new Error("STRIPE_SECRET_KEY is required");
    }
    stripe = new Stripe(apiKey);
  }
  return stripe;
}
