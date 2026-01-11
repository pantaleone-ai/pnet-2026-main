#!/usr/bin/env tsx

import fs from 'fs';
import path from 'path';
import matter from 'gray-matter';

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

    const metadata: Record<string, string> = {};
    if (frontmatter.sku) metadata.sku = frontmatter.sku;
    if (frontmatter.category) metadata.category = frontmatter.category;
    if (frontmatter.featured !== undefined) metadata.featured = frontmatter.featured.toString();
    if (frontmatter.isDigital !== undefined) metadata.isDigital = frontmatter.isDigital.toString();
    if (frontmatter.techStacks) metadata.techStacks = JSON.stringify(frontmatter.techStacks);

    console.log(`Would create Stripe product: ${frontmatter.title}`);
    console.log(`Name: ${frontmatter.title}`);
    console.log(`Description: ${frontmatter.description}`);
    console.log(`Images: ${images}`);
    console.log(`Metadata:`, metadata);

    // Placeholder - will be replaced with actual MCP call
    return {
      id: `prod_placeholder_${frontmatter.title.toLowerCase().replace(/\s+/g, '_')}`,
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

    console.log(`Would create Stripe price for ${frontmatter.title}: $${frontmatter.price} ${currency} (${unitAmount} cents)`);

    // Placeholder - will be replaced with actual MCP call
    return {
      id: `price_placeholder_${frontmatter.title.toLowerCase().replace(/\s+/g, '_')}`,
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
    console.log(`Would create payment link for ${frontmatter.title} using price ${priceId}`);

    // Placeholder - will be replaced with actual MCP call
    return {
      id: `link_placeholder_${priceId}`,
      url: `https://buy.stripe.com/placeholder-${frontmatter.title.toLowerCase().replace(/\s+/g, '-')}`
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

  // Create Stripe product
  const stripeProduct = await createStripeProduct(frontmatter);
  if (!stripeProduct) return;

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
  const shopContentDir = path.join(process.cwd(), '..', 'features/shop/content');

  console.log('Finding MDX files...');
  const mdxFiles = await findMDXFiles(shopContentDir);
  console.log(`Found ${mdxFiles.length} MDX files`);

  for (const file of mdxFiles) {
    await processProduct(file);
    // Small delay to avoid rate limiting
    await new Promise(resolve => setTimeout(resolve, 1000));
  }

  console.log('\nStripe product creation completed!');
}

main().catch(console.error);
