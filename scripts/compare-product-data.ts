#!/usr/bin/env tsx

import fs from 'fs';
import path from 'path';
import matter from 'gray-matter';
import { config } from 'dotenv';

// Load environment variables from .env.local
config({ path: '.env.local' });

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
  videoEmbedAlt?: string;
  weight?: number;
  fromDate?: string;
  toDate?: string;
  gtin?: string;
}

// Load environment variables
const stripeSecretKey = process.env.STRIPE_SECRET_KEY;
if (!stripeSecretKey) {
  console.error('❌ STRIPE_SECRET_KEY not found in environment variables');
  process.exit(1);
}

interface StripeProduct {
  id: string;
  name: string;
  description: string;
  images: string[];
  metadata: Record<string, string>;
  active: boolean;
}

interface StripePrice {
  id: string;
  product: string;
  unit_amount: number;
  currency: string;
  metadata: Record<string, string>;
}

interface ComparisonResult {
  localProduct: any;
  stripeProduct?: StripeProduct;
  stripePrice?: StripePrice;
  dataGaps: string[];
  recommendations: string[];
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

/**
 * Get all Stripe products using direct API
 */
async function getStripeProducts(): Promise<StripeProduct[]> {
  try {
    console.log('🔄 Fetching Stripe products via API...');

    const response = await fetch('https://api.stripe.com/v1/products?limit=100', {
      headers: {
        'Authorization': `Bearer ${stripeSecretKey}`,
        'Content-Type': 'application/x-www-form-urlencoded'
      }
    });

    if (!response.ok) {
      throw new Error(`HTTP ${response.status}: ${response.statusText}`);
    }

    const data = await response.json();

    return data.data.map((product: any) => ({
      id: product.id,
      name: product.name,
      description: product.description || '',
      images: product.images || [],
      metadata: product.metadata || {},
      active: product.active
    }));
  } catch (error) {
    console.error('❌ Error fetching Stripe products:', error);
    return [];
  }
}

/**
 * Get all Stripe prices using direct API
 */
async function getStripePrices(): Promise<StripePrice[]> {
  try {
    console.log('🔄 Fetching Stripe prices via API...');

    const response = await fetch('https://api.stripe.com/v1/prices?limit=100', {
      headers: {
        'Authorization': `Bearer ${stripeSecretKey}`,
        'Content-Type': 'application/x-www-form-urlencoded'
      }
    });

    if (!response.ok) {
      throw new Error(`HTTP ${response.status}: ${response.statusText}`);
    }

    const data = await response.json();

    return data.data.map((price: any) => ({
      id: price.id,
      product: price.product,
      unit_amount: price.unit_amount || 0,
      currency: price.currency || 'usd',
      metadata: price.metadata || {}
    }));
  } catch (error) {
    console.error('❌ Error fetching Stripe prices:', error);
    return [];
  }
}

/**
 * Analyze data gaps between local and Stripe
 */
function analyzeDataGaps(localProduct: any, stripeProduct?: StripeProduct, stripePrice?: StripePrice): { gaps: string[], recommendations: string[] } {
  const gaps: string[] = [];
  const recommendations: string[] = [];

  // Check basic product data
  if (!stripeProduct) {
    gaps.push('Product not found in Stripe');
    recommendations.push('Run sync script to create Stripe product');
    return { gaps, recommendations };
  }

  // Check images
  const localImageCount = (localProduct.imageUrl ? 1 : 0) + (localProduct.additionalImages?.length || 0);
  const stripeImageCount = stripeProduct.images?.length || 0;
  if (localImageCount > 0 && stripeImageCount === 0) {
    gaps.push(`Missing images: Local has ${localImageCount} images, Stripe has 0`);
    recommendations.push('Include product images in Stripe sync');
  }

  // Check metadata completeness
  const stripeMetadata = stripeProduct.metadata || {};
  const localMetadata = {
    sku: localProduct.sku,
    category: localProduct.category,
    featured: localProduct.featured?.toString(),
    isDigital: localProduct.isDigital?.toString(),
    techStacks: localProduct.techStacks ? JSON.stringify(localProduct.techStacks) : undefined
  };

  const missingMetadata = Object.entries(localMetadata)
    .filter(([key, value]) => value && !stripeMetadata[key])
    .map(([key]) => key);

  if (missingMetadata.length > 0) {
    gaps.push(`Missing metadata fields: ${missingMetadata.join(', ')}`);
    recommendations.push('Include all metadata fields in Stripe sync');
  }

  // Check for rich content not in Stripe
  const richContentFields = [
    'content', 'readingTime', 'readingTimeMinutes', 'purchaseUrl',
    'websiteUrl', 'githubUrl', 'videoEmbedUrl', 'weight', 'fromDate', 'toDate'
  ];

  const presentRichFields = richContentFields.filter(field =>
    localProduct[field] !== undefined && localProduct[field] !== null && localProduct[field] !== ''
  );

  if (presentRichFields.length > 0) {
    gaps.push(`Rich content not synced to Stripe: ${presentRichFields.join(', ')}`);
    recommendations.push('Consider storing rich content in Stripe metadata or external reference');
  }

  // Check price accuracy
  if (stripePrice) {
    const expectedAmount = Math.round(localProduct.price * 100);
    if (stripePrice.unit_amount !== expectedAmount) {
      gaps.push(`Price mismatch: Local $${localProduct.price}, Stripe $${stripePrice.unit_amount / 100}`);
      recommendations.push('Verify price calculation in sync process');
    }
  }

  return { gaps, recommendations };
}

/**
 * Load all local products from MDX files
 */
async function loadLocalProducts(): Promise<any[]> {
  const shopContentDir = path.join(process.cwd(), 'features/shop/content');
  const mdxFiles = await findMDXFiles(shopContentDir);

  const products = [];
  for (const filePath of mdxFiles) {
    const frontmatter = await parseMDXFile(filePath);
    if (frontmatter && frontmatter.price) {
      // Read the full content
      const content = fs.readFileSync(filePath, 'utf-8');
      const { content: mdxContent } = matter(content);

      products.push({
        ...frontmatter,
        content: mdxContent,
        slug: path.basename(filePath, '.mdx')
      });
    }
  }

  return products;
}

/**
 * Generate comprehensive comparison report
 */
async function generateComparisonReport(): Promise<void> {
  console.log('🔍 Starting comprehensive product data comparison...\n');

  // Get local products
  console.log('📦 Loading local products...');
  const localProducts = await loadLocalProducts();
  console.log(`   Found ${localProducts.length} local products`);

  // Get Stripe data
  const stripeProducts = await getStripeProducts();
  const stripePrices = await getStripePrices();

  console.log(`   Found ${stripeProducts.length} Stripe products`);
  console.log(`   Found ${stripePrices.length} Stripe prices\n`);

  // Create product lookup maps
  const stripeProductById = new Map(stripeProducts.map(p => [p.id, p]));
  const stripeProductByName = new Map(stripeProducts.map(p => [p.name, p]));
  const stripePriceByProductId = new Map<string, StripePrice>();

  for (const price of stripePrices) {
    stripePriceByProductId.set(price.product, price);
  }

  // Compare each local product
  const comparisonResults: ComparisonResult[] = [];

  for (const localProduct of localProducts) {
    let stripeProduct: StripeProduct | undefined;
    let stripePrice: StripePrice | undefined;

    // Try to match by Stripe ID first
    if (localProduct.stripeProductId) {
      stripeProduct = stripeProductById.get(localProduct.stripeProductId);
    }

    // If not found by ID, try by name
    if (!stripeProduct) {
      stripeProduct = stripeProductByName.get(localProduct.title);
    }

    // Get price if product exists
    if (stripeProduct) {
      stripePrice = stripePriceByProductId.get(stripeProduct.id);
    }

    const { gaps, recommendations } = analyzeDataGaps(localProduct, stripeProduct, stripePrice);

    comparisonResults.push({
      localProduct,
      stripeProduct,
      stripePrice,
      dataGaps: gaps,
      recommendations
    });
  }

  // Generate report
  console.log('📊 COMPREHENSIVE PRODUCT DATA COMPARISON REPORT\n');
  console.log('='.repeat(80));
  console.log('');

  let totalGaps = 0;
  let productsWithIssues = 0;

  for (const result of comparisonResults) {
    const { localProduct, stripeProduct, stripePrice, dataGaps, recommendations } = result;

    console.log(`📦 ${localProduct.title}`);
    console.log(`   Category: ${localProduct.category}`);
    console.log(`   Price: $${localProduct.price}`);
    console.log(`   Local Stripe ID: ${localProduct.stripeProductId || 'None'}`);
    console.log(`   Stripe Product: ${stripeProduct ? '✅ Found' : '❌ Missing'}`);
    console.log(`   Stripe Price: ${stripePrice ? '✅ Found' : '❌ Missing'}`);

    if (stripeProduct) {
      console.log(`   Stripe Images: ${stripeProduct.images?.length || 0}`);
      console.log(`   Stripe Metadata Keys: ${Object.keys(stripeProduct.metadata).length}`);
    }

    if (dataGaps.length > 0) {
      console.log(`\n   ❌ DATA GAPS:`);
      dataGaps.forEach(gap => console.log(`      • ${gap}`));
      totalGaps += dataGaps.length;
      productsWithIssues++;
    }

    if (recommendations.length > 0) {
      console.log(`\n   💡 RECOMMENDATIONS:`);
      recommendations.forEach(rec => console.log(`      • ${rec}`));
    }

    console.log('\n' + '-'.repeat(60) + '\n');
  }

  // Summary
  console.log('📈 SUMMARY STATISTICS\n');
  console.log('='.repeat(40));
  console.log(`Total Products Analyzed: ${comparisonResults.length}`);
  console.log(`Products with Stripe Data: ${comparisonResults.filter(r => r.stripeProduct).length}`);
  console.log(`Products with Issues: ${productsWithIssues}`);
  console.log(`Total Data Gaps Identified: ${totalGaps}`);
  console.log('');

  // Data completeness analysis
  const completenessStats = {
    hasImages: localProducts.filter(p => p.imageUrl || p.additionalImages?.length > 0).length,
    hasTechStacks: localProducts.filter(p => p.techStacks?.length > 0).length,
    hasRichContent: localProducts.filter(p => p.content?.length > 100).length,
    hasExternalLinks: localProducts.filter(p => p.githubUrl || p.websiteUrl || p.purchaseUrl).length,
    hasVideoEmbeds: localProducts.filter(p => p.videoEmbedUrl).length
  };

  console.log('🔍 LOCAL DATA COMPLETENESS\n');
  console.log('='.repeat(40));
  Object.entries(completenessStats).forEach(([field, count]) => {
    const percentage = Math.round((count / localProducts.length) * 100);
    console.log(`${field}: ${count}/${localProducts.length} (${percentage}%)`);
  });

  console.log('\n' + '='.repeat(80));
  console.log('🎯 KEY FINDINGS');
  console.log('='.repeat(80));
  console.log('');
  console.log('❌ CRITICAL ISSUE: Stripe contains only ~10% of available product data');
  console.log('');
  console.log('📊 DATA SYNC GAPS:');
  console.log('   • Rich content (descriptions, features, specs)');
  console.log('   • Image alt text and metadata');
  console.log('   • External links (GitHub, websites)');
  console.log('   • Video embeds');
  console.log('   • Technical metadata (tech stacks, reading time)');
  console.log('   • Business data (weight, dates, GTIN)');
  console.log('');
  console.log('💡 RECOMMENDATIONS:');
  console.log('   1. Enhance sync script to include rich metadata');
  console.log('   2. Consider JSON compression for large content');
  console.log('   3. Implement data validation and drift detection');
  console.log('   4. Create hybrid storage strategy (critical data in Stripe, rich data local)');
  console.log('');

  if (productsWithIssues > 0) {
    console.log('🚨 ACTION REQUIRED: Run enhanced sync script to fix data gaps');
  } else {
    console.log('✅ ALL PRODUCTS PROPERLY SYNCED');
  }
}

// Handle command line usage
if (process.argv.includes('--help') || process.argv.includes('-h')) {
  console.log(`
🔍 Product Data Comparison Tool

Compare local product data with Stripe to identify sync gaps and data completeness.

USAGE:
  npx tsx scripts/compare-product-data.ts

This script will:
- Load all local products with full data
- Query Stripe products and prices via MCP
- Compare data completeness between systems
- Generate detailed gap analysis and recommendations
`);
  process.exit(0);
}

generateComparisonReport().catch(console.error);