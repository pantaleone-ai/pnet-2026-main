#!/usr/bin/env tsx

import fs from 'fs';
import path from 'path';
import matter from 'gray-matter';
import { use_mcp_tool } from '../lib/mcp-utils';

interface ProductFrontmatter {
  title: string;
  description: string;
  category: string;
  price: number;
  currency?: string;
  sku?: string;
  imageUrl?: string;
  imageAlt?: string;
  additionalImages?: string;
  featured?: boolean;
  isDigital?: boolean;
  techStacks?: string[];
}

interface StripeProduct {
  id: string;
  name: string;
  description: string;
  images?: string[];
  metadata?: Record<string, string>;
}

interface StripePrice {
  id: string;
  product: string;
  unit_amount: number;
  currency: string;
}

interface StripePaymentLink {
  id: string;
  url: string;
}

async function parseMDXFile(filePath: string): Promise<ProductFrontmatter | null> {
  try {
    const content = fs.readFileSync(filePath, 'utf-8');
    const { data } = matter(content);
    return data as ProductFrontmatter;
  } catch (error) {
    console.error(`Error parsing ${filePath}:`, error);
    return null;
  }
}

async function createStripeProduct(frontmatter: ProductFrontmatter): Promise<StripeProduct | null> {
  try {
    const images = [];
    if (frontmatter.imageUrl) {
      images.push(frontmatter.imageUrl);
    }

    // Handle additional images if they exist
    if (frontmatter.additionalImages) {
      let additionalImages = frontmatter.additionalImages;
      if (typeof additionalImages === 'string') {
        try {
          additionalImages = JSON.parse(additionalImages);
        } catch (error) {
          console.warn(`Failed to parse additionalImages for ${frontmatter.title}:`, error);
          additionalImages = [];
        }
      }

      if (Array.isArray(additionalImages)) {
        for (const img of additionalImages) {
          if (typeof img === 'string') {
            images.push(img);
          } else if (img && typeof img === 'object' && img.url) {
            images.push(img.url);
          }
        }
      }
    }

    const metadata: Record<string, string> = {};
    if (frontmatter.sku) metadata.sku = frontmatter.sku;
    if (frontmatter.category) metadata.category = frontmatter.category;
    if (frontmatter.featured !== undefined) metadata.featured = frontmatter.featured.toString();
    if (frontmatter.isDigital !== undefined) metadata.isDigital = frontmatter.isDigital.toString();
    if (frontmatter.techStacks) metadata.techStacks = JSON.stringify(frontmatter.techStacks);

    console.log(`Creating Stripe product: ${frontmatter.title}`);
    console.log(`Name: ${frontmatter.title}`);
    console.log(`Description: ${frontmatter.description}`);
    console.log(`Images: ${images.length} images`);
    console.log(`Metadata:`, metadata);

    // Create product using MCP Stripe tool
    const createProductArgs: any = {
      name: frontmatter.title,
      description: frontmatter.description
    };

    if (images.length > 0) {
      createProductArgs.images = images;
    }

    const result = await use_mcp_tool({
      server_name: "github.com/stripe/agent-toolkit",
      tool_name: "create_product",
      arguments: createProductArgs
    });

    if (!result || !result.id) {
      console.error(`Failed to create Stripe product for ${frontmatter.title}`);
      return null;
    }

    console.log(`Successfully created Stripe product: ${result.id}`);
    return {
      id: result.id,
      name: frontmatter.title,
      description: frontmatter.description,
      images,
      metadata
    };
  } catch (error) {
    console.error(`Error creating Stripe product for ${frontmatter.title}:`, error);
    return null;
  }
}

async function createStripePrice(productId: string, frontmatter: ProductFrontmatter): Promise<StripePrice | null> {
  try {
    const unitAmount = Math.round(frontmatter.price * 100); // Convert to cents
    const currency = frontmatter.currency || 'usd';

    console.log(`Creating Stripe price for ${frontmatter.title}: $${frontmatter.price} ${currency} (${unitAmount} cents)`);

    // Create price using MCP Stripe tool
    const result = await use_mcp_tool({
      server_name: "github.com/stripe/agent-toolkit",
      tool_name: "create_price",
      arguments: {
        product: productId,
        unit_amount: unitAmount,
        currency: currency.toLowerCase()
      }
    });

    if (!result || !result.id) {
      console.error(`Failed to create Stripe price for ${frontmatter.title}`);
      return null;
    }

    console.log(`Successfully created Stripe price: ${result.id}`);
    return {
      id: result.id,
      product: productId,
      unit_amount: unitAmount,
      currency: currency.toLowerCase()
    };
  } catch (error) {
    console.error(`Error creating Stripe price for ${frontmatter.title}:`, error);
    return null;
  }
}

async function createPaymentLink(priceId: string, frontmatter: ProductFrontmatter): Promise<StripePaymentLink | null> {
  try {
    console.log(`Creating payment link for ${frontmatter.title} using price ${priceId}`);

    // Create payment link using MCP Stripe tool
    const result = await use_mcp_tool({
      server_name: "github.com/stripe/agent-toolkit",
      tool_name: "create_payment_link",
      arguments: {
        price: priceId,
        quantity: 1
      }
    });

    if (!result || !result.id || !result.url) {
      console.error(`Failed to create payment link for ${frontmatter.title}`);
      return null;
    }

    console.log(`Successfully created payment link: ${result.id} - ${result.url}`);
    return {
      id: result.id,
      url: result.url
    };
  } catch (error) {
    console.error(`Error creating payment link for ${frontmatter.title}:`, error);
    return null;
  }
}

async function updateMDXFile(filePath: string, stripeProductId: string, stripePriceId: string, paymentLinkUrl: string) {
  try {
    const content = fs.readFileSync(filePath, 'utf-8');
    const parsed = matter(content);

    // Add Stripe IDs to frontmatter
    parsed.data.stripeProductId = stripeProductId;
    parsed.data.stripePriceId = stripePriceId;
    parsed.data.stripePaymentLink = paymentLinkUrl;

    // Write back to file
    const updatedContent = matter.stringify(parsed.content, parsed.data);
    fs.writeFileSync(filePath, updatedContent, 'utf-8');

    console.log(`Updated ${filePath} with Stripe IDs`);
  } catch (error) {
    console.error(`Error updating ${filePath}:`, error);
  }
}

async function checkExistingStripeProduct(frontmatter: ProductFrontmatter): Promise<string | null> {
  try {
    // Try to find existing product by name
    const products = await use_mcp_tool({
      server_name: "github.com/stripe/agent-toolkit",
      tool_name: "list_products",
      arguments: {
        limit: 100
      }
    });

    if (products && Array.isArray(products.data)) {
      const existingProduct = products.data.find((product: any) =>
        product.name === frontmatter.title
      );

      if (existingProduct) {
        console.log(`Found existing Stripe product for ${frontmatter.title}: ${existingProduct.id}`);
        return existingProduct.id;
      }
    }

    return null;
  } catch (error) {
    console.warn(`Error checking for existing product ${frontmatter.title}:`, error);
    return null;
  }
}

async function updateStripeProduct(productId: string, frontmatter: ProductFrontmatter): Promise<StripeProduct | null> {
  try {
    const images: string[] = [];
    if (frontmatter.imageUrl) {
      images.push(frontmatter.imageUrl);
    }

    // Handle additional images if they exist
    if (frontmatter.additionalImages) {
      let additionalImages = frontmatter.additionalImages;
      if (typeof additionalImages === 'string') {
        try {
          additionalImages = JSON.parse(additionalImages);
        } catch (error) {
          console.warn(`Failed to parse additionalImages for ${frontmatter.title}:`, error);
          additionalImages = [];
        }
      }

      if (Array.isArray(additionalImages)) {
        for (const img of additionalImages) {
          if (typeof img === 'string') {
            images.push(img);
          } else if (img && typeof img === 'object' && img.url) {
            images.push(img.url);
          }
        }
      }
    }

    console.log(`Updating Stripe product: ${frontmatter.title}`);
    console.log(`New description: ${frontmatter.description}`);
    console.log(`Images: ${images.length} images`);

    // Note: The Stripe API doesn't have a direct update method for products via MCP tools
    // We'll need to recreate the product or use webhooks/triggers for updates
    // For now, we'll return the existing product info
    return {
      id: productId,
      name: frontmatter.title,
      description: frontmatter.description,
      images
    };
  } catch (error) {
    console.error(`Error updating Stripe product for ${frontmatter.title}:`, error);
    return null;
  }
}

async function processProduct(filePath: string) {
  console.log(`\nProcessing: ${filePath}`);

  const frontmatter = await parseMDXFile(filePath);
  if (!frontmatter) {
    console.log(`Skipping ${filePath} - could not parse frontmatter`);
    return;
  }

  // Skip if no price (user wants to use existing pricing)
  if (!frontmatter.price) {
    console.log(`Skipping ${frontmatter.title} - no price set`);
    return;
  }

  // Check if product already exists
  const existingProductId = await checkExistingStripeProduct(frontmatter);

  let stripeProduct: StripeProduct | null;

  if (existingProductId) {
    // Update existing product
    stripeProduct = await updateStripeProduct(existingProductId, frontmatter);
  } else {
    // Create new product
    stripeProduct = await createStripeProduct(frontmatter);
  }

  if (!stripeProduct) return;

  // For now, we'll create new prices and payment links even for existing products
  // In a production system, you'd want to check if prices need updating too

  // Create price
  const stripePrice = await createStripePrice(stripeProduct.id, frontmatter);
  if (!stripePrice) return;

  // Create payment link
  const paymentLink = await createPaymentLink(stripePrice.id, frontmatter);
  if (!paymentLink) return;

  // Update MDX file
  await updateMDXFile(filePath, stripeProduct.id, stripePrice.id, paymentLink.url);
}

async function findMDXFiles(dirPath: string): Promise<string[]> {
  const files: string[] = [];

  function scanDirectory(currentPath: string) {
    const items = fs.readdirSync(currentPath);

    for (const item of items) {
      const fullPath = path.join(currentPath, item);
      const stat = fs.statSync(fullPath);

      if (stat.isDirectory()) {
        scanDirectory(fullPath);
      } else if (item.endsWith('.mdx')) {
        files.push(fullPath);
      }
    }
  }

  scanDirectory(dirPath);
  return files;
}

async function main() {
  const args = process.argv.slice(2);
  const isDryRun = args.includes('--dry-run');
  const isForce = args.includes('--force');

  if (isDryRun) {
    console.log('🔍 DRY RUN MODE - No actual Stripe API calls will be made');
  }

  const shopContentDir = path.join(process.cwd(), '..', 'features/shop/content');

  console.log('Finding MDX files...');
  const mdxFiles = await findMDXFiles(shopContentDir);
  console.log(`Found ${mdxFiles.length} MDX files`);

  let successCount = 0;
  let errorCount = 0;

  for (const file of mdxFiles) {
    try {
      if (isDryRun) {
        console.log(`\n🔍 [DRY RUN] Would process: ${file}`);
        const frontmatter = await parseMDXFile(file);
        if (frontmatter) {
          console.log(`   Product: ${frontmatter.title}`);
          console.log(`   Price: $${frontmatter.price}`);
          console.log(`   Description: ${frontmatter.description.substring(0, 50)}...`);
        }
        successCount++;
      } else {
        await processProduct(file);
        successCount++;
      }
    } catch (error) {
      console.error(`❌ Failed to process ${file}:`, error);
      errorCount++;
    }

    // Small delay to avoid rate limiting
    await new Promise(resolve => setTimeout(resolve, 1000));
  }

  console.log(`\n${isDryRun ? '🔍 Dry run' : '✅ Stripe product sync'} completed!`);
  console.log(`   Successful: ${successCount}`);
  console.log(`   Errors: ${errorCount}`);
  console.log(`   Total: ${mdxFiles.length}`);

  if (errorCount > 0) {
    process.exit(1);
  }
}

main().catch(console.error);
