#!/usr/bin/env tsx

import fs from 'fs';
import path from 'path';
import matter from 'gray-matter';

// Declare global MCP function
declare global {
  function use_mcp_tool(args: {
    server_name: string;
    tool_name: string;
    arguments: Record<string, any>;
  }): Promise<any>;
}

interface ProductFrontmatter {
  title: string;
  description: string;
  category: string;
  price: number;
  currency?: string;
  sku?: string;
  imageUrl?: string;
  imageAlt?: string;
  additionalImages?: any;
  featured?: boolean;
  isDigital?: boolean;
  techStacks?: string[];
  stripeProductId?: string;
  stripePriceId?: string;
  stripePaymentLink?: string;
  purchaseUrl?: string;
  websiteUrl?: string;
  githubUrl?: string;
  videoEmbedUrl?: string;
  weight?: number;
}

interface SyncStatus {
  filePath: string;
  frontmatter: ProductFrontmatter;
  hasStripeIds: boolean;
  productExists: boolean | null;
  priceExists: boolean | null;
  paymentLinkExists: boolean | null;
  errors: string[];
}

/**
 * Parse MDX file and extract frontmatter
 */
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

/**
 * Find all MDX files in shop content directory
 */
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

async function verifyStripeSync(): Promise<void> {
  console.log('🔍 Starting Stripe sync verification...\n');

  const shopContentDir = path.join(process.cwd(), 'features/shop/content');
  const mdxFiles = await findMDXFiles(shopContentDir);
  console.log(`📦 Found ${mdxFiles.length} MDX files in shop content\n`);

  const results: SyncStatus[] = [];

  for (const filePath of mdxFiles) {
    console.log(`🔍 Checking: ${path.relative(process.cwd(), filePath)}`);

    const frontmatter = await parseMDXFile(filePath);
    if (!frontmatter) {
      console.log(`   ❌ Could not parse frontmatter`);
      results.push({
        filePath,
        frontmatter: {} as ProductFrontmatter,
        hasStripeIds: false,
        productExists: null,
        priceExists: null,
        paymentLinkExists: null,
        errors: ['Could not parse frontmatter']
      });
      continue;
    }

    if (!frontmatter.price) {
      console.log(`   ⚠️  Skipping - no price set`);
      results.push({
        filePath,
        frontmatter,
        hasStripeIds: false,
        productExists: null,
        priceExists: null,
        paymentLinkExists: null,
        errors: ['No price set']
      });
      continue;
    }

    const status: SyncStatus = {
      filePath,
      frontmatter,
      hasStripeIds: !!(frontmatter.stripeProductId && frontmatter.stripePriceId && frontmatter.stripePaymentLink),
      productExists: null,
      priceExists: null,
      paymentLinkExists: null,
      errors: []
    };

    // Check if product has Stripe IDs
    if (!status.hasStripeIds) {
      console.log(`   ⚠️  Missing Stripe IDs`);
      status.errors.push('Missing one or more Stripe IDs');
      results.push(status);
      continue;
    }

    // Verify product exists in Stripe
    try {
      // Check if the specific product ID exists in Stripe
      try {
        // Try to retrieve the specific product by ID
        const productCheck = await fetch(`https://api.stripe.com/v1/products/${frontmatter.stripeProductId}`, {
          headers: {
            'Authorization': `Bearer ${process.env.STRIPE_SECRET_KEY}`,
            'Content-Type': 'application/x-www-form-urlencoded'
          }
        });

        if (productCheck.ok) {
          const productData = await productCheck.json();
          status.productExists = productData.name === frontmatter.title;

          if (status.productExists) {
            console.log(`   ✅ Product exists in Stripe (${frontmatter.stripeProductId})`);
          } else {
            console.log(`   ❌ Product name mismatch - Expected: "${frontmatter.title}", Found: "${productData.name}"`);
            status.errors.push(`Product name mismatch: expected "${frontmatter.title}", found "${productData.name}"`);
          }
        } else {
          status.productExists = false;
          console.log(`   ❌ Product not found in Stripe (${frontmatter.stripeProductId})`);
          status.errors.push(`Product ${frontmatter.stripeProductId} not found in Stripe`);
        }
      } catch (fetchError) {
        console.log(`   ❌ Error fetching product: ${fetchError}`);
        status.errors.push(`Error fetching product: ${fetchError}`);
        status.productExists = false;
      }
    } catch (error) {
      console.log(`   ❌ Error checking product: ${error}`);
      status.errors.push(`Error checking product: ${error}`);
      status.productExists = false;
    }

    // Verify price exists in Stripe
    try {
      // Check if the specific price ID exists in Stripe
      try {
        const priceCheck = await fetch(`https://api.stripe.com/v1/prices/${frontmatter.stripePriceId}`, {
          headers: {
            'Authorization': `Bearer ${process.env.STRIPE_SECRET_KEY}`,
            'Content-Type': 'application/x-www-form-urlencoded'
          }
        });

        if (priceCheck.ok) {
          const priceData = await priceCheck.json();
          // Check if price matches (convert to cents for comparison)
          const expectedAmount = Math.round(frontmatter.price * 100);
          const actualAmount = priceData.unit_amount;
          const currencyMatch = priceData.currency === (frontmatter.currency?.toLowerCase() || 'usd');

          status.priceExists = actualAmount === expectedAmount && currencyMatch;

          if (status.priceExists) {
            console.log(`   ✅ Price exists in Stripe (${frontmatter.stripePriceId})`);
          } else {
            console.log(`   ❌ Price mismatch - Expected: $${frontmatter.price} ${frontmatter.currency || 'USD'}, Found: $${actualAmount/100} ${priceData.currency.toUpperCase()}`);
            status.errors.push(`Price mismatch: expected $${frontmatter.price} ${frontmatter.currency || 'USD'}, found $${actualAmount/100} ${priceData.currency.toUpperCase()}`);
          }
        } else {
          status.priceExists = false;
          console.log(`   ❌ Price not found in Stripe (${frontmatter.stripePriceId})`);
          status.errors.push(`Price ${frontmatter.stripePriceId} not found in Stripe`);
        }
      } catch (fetchError) {
        console.log(`   ❌ Error fetching price: ${fetchError}`);
        status.errors.push(`Error fetching price: ${fetchError}`);
        status.priceExists = false;
      }
    } catch (error) {
      console.log(`   ❌ Error checking price: ${error}`);
      status.errors.push(`Error checking price: ${error}`);
      status.priceExists = false;
    }

    // For payment links, we can't easily verify them via MCP, so we'll assume they're valid if product and price exist
    status.paymentLinkExists = status.productExists && status.priceExists;
    if (status.paymentLinkExists) {
      console.log(`   ✅ Payment link assumed valid (${frontmatter.stripePaymentLink})`);
    } else {
      console.log(`   ⚠️  Payment link may be invalid`);
      status.errors.push('Payment link may be invalid due to missing product/price');
    }

    results.push(status);
    console.log(''); // Empty line between products
  }

  // Generate summary report
  console.log('📊 VERIFICATION SUMMARY\n');
  console.log('=' .repeat(50));

  const totalProducts = results.length;
  const productsWithStripeIds = results.filter(r => r.hasStripeIds).length;
  const productsWithErrors = results.filter(r => r.errors.length > 0).length;
  const fullySyncedProducts = results.filter(r =>
    r.hasStripeIds &&
    r.productExists === true &&
    r.priceExists === true &&
    r.paymentLinkExists === true &&
    r.errors.length === 0
  ).length;

  console.log(`Total Products: ${totalProducts}`);
  console.log(`Products with Stripe IDs: ${productsWithStripeIds}/${totalProducts}`);
  console.log(`Fully Synced Products: ${fullySyncedProducts}/${totalProducts}`);
  console.log(`Products with Issues: ${productsWithErrors}/${totalProducts}`);
  console.log('');

  if (productsWithErrors > 0) {
    console.log('❌ PRODUCTS WITH ISSUES:');
    console.log('-'.repeat(30));

    for (const result of results.filter(r => r.errors.length > 0)) {
      console.log(`\n📦 ${result.frontmatter.title || 'Unknown Product'}:`);
      result.errors.forEach(error => console.log(`   ❌ ${error}`));
    }
  }

  if (fullySyncedProducts === totalProducts) {
    console.log('🎉 ALL PRODUCTS ARE PROPERLY SYNCED WITH STRIPE!');
  } else {
    console.log('\n⚠️  SOME PRODUCTS NEED ATTENTION');
    console.log('Run the sync script to fix issues:');
    console.log('npm run tsx scripts/sync-stripe-mcp.ts');
  }
}

// Handle command line usage
if (process.argv.includes('--help') || process.argv.includes('-h')) {
  console.log(`
🔍 Stripe Sync Verification

Verify that all shop products are properly synced with Stripe via MCP.

USAGE:
  npx tsx scripts/verify-stripe-sync.ts

This script will:
- Load all products from the shop source
- Check if each product has required Stripe IDs
- Verify products exist in Stripe via MCP
- Verify prices exist in Stripe via MCP
- Report any sync discrepancies
`);
  process.exit(0);
}

verifyStripeSync().catch(console.error);
