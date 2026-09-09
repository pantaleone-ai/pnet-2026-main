/**
 * Utility functions for working with MCP tools
 */

import type { ShopProduct } from "@/features/shop/types/ShopProduct";

export async function use_mcp_tool(args: {
  server_name: string;
  tool_name: string;
  arguments: Record<string, any>;
}) {
  // This is a placeholder - in a real implementation, this would call the MCP tool
  // For now, we'll use the global use_mcp_tool function that's available in the environment
  // @ts-ignore - Global function provided by MCP environment
  return await global.use_mcp_tool(args);
}

/**
 * Stripe MCP utility functions
 */

export interface StripeProductData {
  id: string;
  name: string;
  description: string;
  images?: string[];
  metadata?: Record<string, string>;
}

export interface StripePriceData {
  id: string;
  product: string;
  unit_amount: number;
  currency: string;
}

export interface StripePaymentLinkData {
  id: string;
  url: string;
}

/**
 * Create a Stripe product using MCP
 */
export async function createStripeProduct(productData: {
  name: string;
  description: string;
  images?: string[];
  metadata?: Record<string, string>;
}): Promise<StripeProductData> {
  try {
    const result = await use_mcp_tool({
      server_name: "github.com/stripe/agent-toolkit",
      tool_name: "create_product",
      arguments: {
        name: productData.name,
        description: productData.description,
        images: productData.images || [],
        metadata: productData.metadata || {}
      }
    });

    return {
      id: result.product.id,
      name: result.product.name,
      description: result.product.description,
      images: result.product.images,
      metadata: result.product.metadata
    };
  } catch (error) {
    console.error("Error creating Stripe product:", error);
    throw new Error(`Failed to create Stripe product: ${error}`);
  }
}

/**
 * Create a Stripe price using MCP
 */
export async function createStripePrice(priceData: {
  product: string;
  unit_amount: number;
  currency: string;
}): Promise<StripePriceData> {
  try {
    const result = await use_mcp_tool({
      server_name: "github.com/stripe/agent-toolkit",
      tool_name: "create_price",
      arguments: {
        product: priceData.product,
        unit_amount: priceData.unit_amount,
        currency: priceData.currency
      }
    });

    return {
      id: result.price.id,
      product: result.price.product,
      unit_amount: result.price.unit_amount,
      currency: result.price.currency
    };
  } catch (error) {
    console.error("Error creating Stripe price:", error);
    throw new Error(`Failed to create Stripe price: ${error}`);
  }
}

/**
 * Create a Stripe payment link using MCP
 */
export async function createStripePaymentLink(linkData: {
  price: string;
  quantity?: number;
}): Promise<StripePaymentLinkData> {
  try {
    const result = await use_mcp_tool({
      server_name: "github.com/stripe/agent-toolkit",
      tool_name: "create_payment_link",
      arguments: {
        price: linkData.price,
        quantity: linkData.quantity || 1
      }
    });

    return {
      id: result.payment_link.id,
      url: result.payment_link.url
    };
  } catch (error) {
    console.error("Error creating Stripe payment link:", error);
    throw new Error(`Failed to create Stripe payment link: ${error}`);
  }
}

/**
 * Sync a product with Stripe using MCP tools
 */
export async function syncProductWithStripe(product: ShopProduct): Promise<{
  stripeProductId: string;
  stripePriceId: string;
  stripePaymentLink: string;
}> {
  console.log(`Syncing product "${product.title}" with Stripe MCP...`);

  // Prepare product data
  const images: string[] = [];
  if (product.imageUrl) {
    images.push(product.imageUrl);
  }
  if (product.additionalImages) {
    for (const img of product.additionalImages) {
      if (img.url) {
        images.push(img.url);
      }
    }
  }

  // Prepare metadata
  const metadata: Record<string, string> = {};
  if (product.sku) metadata.sku = product.sku;
  if (product.category) metadata.category = product.category;
  if (product.featured !== undefined) metadata.featured = product.featured.toString();
  if (product.isDigital !== undefined) metadata.isDigital = product.isDigital.toString();
  if (product.techStacks) metadata.techStacks = JSON.stringify(product.techStacks);

  // Create Stripe product
  console.log("Creating Stripe product...");
  const stripeProduct = await createStripeProduct({
    name: product.title,
    description: product.description,
    images,
    metadata
  });
  console.log(`Created Stripe product: ${stripeProduct.id}`);

  // Create Stripe price
  console.log("Creating Stripe price...");
  const unitAmount = Math.round(product.price * 100); // Convert to cents
  const stripePrice = await createStripePrice({
    product: stripeProduct.id,
    unit_amount: unitAmount,
    currency: product.currency.toLowerCase()
  });
  console.log(`Created Stripe price: ${stripePrice.id}`);

  // Create payment link
  console.log("Creating Stripe payment link...");
  const paymentLink = await createStripePaymentLink({
    price: stripePrice.id,
    quantity: 1
  });
  console.log(`Created Stripe payment link: ${paymentLink.url}`);

  return {
    stripeProductId: stripeProduct.id,
    stripePriceId: stripePrice.id,
    stripePaymentLink: paymentLink.url
  };
}

/**
 * Check if a product already exists in Stripe
 */
export async function checkExistingStripeProduct(productName: string): Promise<string | null> {
  try {
    const result = await use_mcp_tool({
      server_name: "github.com/stripe/agent-toolkit",
      tool_name: "list_products",
      arguments: {
        limit: 100
      }
    });

    const existingProduct = result.products.data.find((product: any) =>
      product.name === productName
    );

    return existingProduct ? existingProduct.id : null;
  } catch (error) {
    console.warn(`Error checking for existing product "${productName}":`, error);
    return null;
  }
}
