#!/usr/bin/env tsx

import fs from 'fs';
import path from 'path';
import matter from 'gray-matter';
import { config } from 'dotenv';

// Load environment variables
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

/**
 * Compress content for Stripe metadata (500 char limit per field)
 */
function compressForStripe(text: string, maxLength: number = 450): string {
  if (text.length <= maxLength) return text;

  // Truncate and add indicator
  return text.substring(0, maxLength - 3) + '...';
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
 * Get existing Stripe product
 */
async function getStripeProduct(productId: string): Promise<any | null> {
  try {
    const response = await fetch(`https://api.stripe.com/v1/products/${productId}`, {
      headers: {
        'Authorization': `Bearer ${stripeSecretKey}`,
        'Content-Type': 'application/x-www-form-urlencoded'
      }
    });

    if (response.ok) {
      return await response.json();
    }
    return null;
  } catch (error) {
    console.error('Error fetching Stripe product:', error);
    return null;
  }
}

/**
 * Update Stripe product with enhanced data
 */
async function updateStripeProduct(productId: string, productData: any): Promise<boolean> {
  try {
    const updateData = new URLSearchParams();

    // Prepare metadata
    const metadata: Record<string, string> = {};

    // Basic metadata
    if (productData.sku) metadata.sku = productData.sku;
    if (productData.category) metadata.category = productData.category;
    if (productData.featured !== undefined) metadata.featured = productData.featured.toString();
    if (productData.isDigital !== undefined) metadata.isDigital = productData.isDigital.toString();

    // Tech stacks as JSON (compressed if needed)
    if (productData.techStacks) {
      const techStacksJson = JSON.stringify(productData.techStacks);
      metadata.techStacks = compressForStripe(techStacksJson);
    }

    // External links
    if (productData.purchaseUrl) metadata.purchaseUrl = compressForStripe(productData.purchaseUrl);
    if (productData.websiteUrl) metadata.websiteUrl = compressForStripe(productData.websiteUrl);
    if (productData.githubUrl) metadata.githubUrl = compressForStripe(productData.githubUrl);

    // Rich content (compressed)
    if (productData.content) {
      metadata.content = compressForStripe(productData.content);
    }

    // Video embeds
    if (productData.videoEmbedUrl) metadata.videoEmbedUrl = compressForStripe(productData.videoEmbedUrl);
    if (productData.videoEmbedAlt) metadata.videoEmbedAlt = compressForStripe(productData.videoEmbedAlt);

    // Business data
    if (productData.weight) metadata.weight = productData.weight.toString();
    if (productData.fromDate) metadata.fromDate = productData.fromDate;
    if (productData.toDate) metadata.toDate = productData.toDate;
    if (productData.gtin) metadata.gtin = productData.gtin;

    // Add metadata to update data
    Object.entries(metadata).forEach(([key, value]) => {
      updateData.append(`metadata[${key}]`, value);
    });

    // Prepare images array
    const images: string[] = [];
    if (productData.imageUrl) {
      images.push(productData.imageUrl);
    }
    if (productData.additionalImages) {
      if (typeof productData.additionalImages === 'string') {
        try {
          const parsed = JSON.parse(productData.additionalImages);
          if (Array.isArray(parsed)) {
            for (const img of parsed) {
              if (typeof img === 'string') {
                images.push(img);
              } else if (img && typeof img === 'object' && img.url) {
                images.push(img.url);
              }
            }
          }
        } catch (error) {
          console.warn('Failed to parse additionalImages JSON:', error);
        }
      } else if (Array.isArray(productData.additionalImages)) {
        for (const img of productData.additionalImages) {
          if (typeof img === 'string') {
            images.push(img);
          } else if (img && typeof img === 'object' && img.url) {
            images.push(img.url);
          }
        }
      }
    }

    // Add images to update data
    images.forEach((imageUrl, index) => {
      updateData.append(`images[${index}]`, imageUrl);
    });

    const response = await fetch(`https://api.stripe.com/v1/products/${productId}`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${stripeSecretKey}`,
        'Content-Type': 'application/x-www-form-urlencoded'
      },
      body: updateData.toString()
    });

    if (!response.ok) {
      const error = await response.text();
      throw new Error(`HTTP ${response.status}: ${error}`);
    }

    const updatedProduct = await response.json();
    console.log(`✅ Updated Stripe product with ${Object.keys(metadata).length} metadata fields and ${images.length} images`);
    return true;

  } catch (error) {
    console.error('❌ Error updating Stripe product:', error);
    return false;
  }
}

/**
 * Create new Stripe product with full data
 */
async function createStripeProduct(productData: any): Promise<any | null> {
  try {
    const createData = new URLSearchParams();
    createData.append('name', productData.title);
    createData.append('description', productData.description);

    // Prepare images
    const images: string[] = [];
    if (productData.imageUrl) {
      images.push(productData.imageUrl);
    }
    if (productData.additionalImages) {
      if (typeof productData.additionalImages === 'string') {
        try {
          const parsed = JSON.parse(productData.additionalImages);
          if (Array.isArray(parsed)) {
            for (const img of parsed) {
              if (typeof img === 'string') {
                images.push(img);
              } else if (img && typeof img === 'object' && img.url) {
                images.push(img.url);
              }
            }
          }
        } catch (error) {
          console.warn('Failed to parse additionalImages JSON:', error);
        }
      } else if (Array.isArray(productData.additionalImages)) {
        for (const img of productData.additionalImages) {
          if (typeof img === 'string') {
            images.push(img);
          } else if (img && typeof img === 'object' && img.url) {
            images.push(img.url);
          }
        }
      }
    }

    // Add images
    images.forEach((imageUrl, index) => {
      createData.append(`images[${index}]`, imageUrl);
    });

    // Prepare metadata
    const metadata: Record<string, string> = {};

    // Basic metadata
    if (productData.sku) metadata.sku = productData.sku;
    if (productData.category) metadata.category = productData.category;
    if (productData.featured !== undefined) metadata.featured = productData.featured.toString();
    if (productData.isDigital !== undefined) metadata.isDigital = productData.isDigital.toString();

    // Tech stacks as JSON (compressed if needed)
    if (productData.techStacks) {
      const techStacksJson = JSON.stringify(productData.techStacks);
      metadata.techStacks = compressForStripe(techStacksJson);
    }

    // External links
    if (productData.purchaseUrl) metadata.purchaseUrl = compressForStripe(productData.purchaseUrl);
    if (productData.websiteUrl) metadata.websiteUrl = compressForStripe(productData.websiteUrl);
    if (productData.githubUrl) metadata.githubUrl = compressForStripe(productData.githubUrl);

    // Rich content (compressed)
    if (productData.content) {
      metadata.content = compressForStripe(productData.content);
    }

    // Video embeds
    if (productData.videoEmbedUrl) metadata.videoEmbedUrl = compressForStripe(productData.videoEmbedUrl);
    if (productData.videoEmbedAlt) metadata.videoEmbedAlt = compressForStripe(productData.videoEmbedAlt);

    // Business data
    if (productData.weight) metadata.weight = productData.weight.toString();
    if (productData.fromDate) metadata.fromDate = productData.fromDate;
    if (productData.toDate) metadata.toDate = productData.toDate;
    if (productData.gtin) metadata.gtin = productData.gtin;

    // Add metadata
    Object.entries(metadata).forEach(([key, value]) => {
      createData.append(`metadata[${key}]`, value);
    });

    const response = await fetch('https://api.stripe.com/v1/products', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${stripeSecretKey}`,
        'Content-Type': 'application/x-www-form-urlencoded'
      },
      body: createData.toString()
    });

    if (!response.ok) {
      const error = await response.text();
      throw new Error(`HTTP ${response.status}: ${error}`);
    }

    const newProduct = await response.json();
    console.log(`✅ Created new Stripe product: ${newProduct.id}`);
    return newProduct;

  } catch (error) {
    console.error('❌ Error creating Stripe product:', error);
    return null;
  }
}

/**
 * Create Stripe price for product
 */
async function createStripePrice(productId: string, priceData: any): Promise<any | null> {
  try {
    const priceParams = new URLSearchParams();
    priceParams.append('product', productId);
    priceParams.append('unit_amount', Math.round(priceData.price * 100).toString());
    priceParams.append('currency', (priceData.currency || 'usd').toLowerCase());

    const response = await fetch('https://api.stripe.com/v1/prices', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${stripeSecretKey}`,
        'Content-Type': 'application/x-www-form-urlencoded'
      },
      body: priceParams.toString()
    });

    if (!response.ok) {
      const error = await response.text();
      throw new Error(`HTTP ${response.status}: ${error}`);
    }

    const newPrice = await response.json();
    console.log(`✅ Created Stripe price: ${newPrice.id}`);
    return newPrice;

  } catch (error) {
    console.error('❌ Error creating Stripe price:', error);
    return null;
  }
}

/**
 * Create payment link for price
 */
async function createPaymentLink(priceId: string): Promise<any | null> {
  try {
    const linkParams = new URLSearchParams();
    linkParams.append('line_items[0][price]', priceId);
    linkParams.append('line_items[0][quantity]', '1');

    const response = await fetch('https://api.stripe.com/v1/payment_links', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${stripeSecretKey}`,
        'Content-Type': 'application/x-www-form-urlencoded'
      },
      body: linkParams.toString()
    });

    if (!response.ok) {
      const error = await response.text();
      throw new Error(`HTTP ${response.status}: ${error}`);
    }

    const paymentLink = await response.json();
    console.log(`✅ Created payment link: ${paymentLink.url}`);
    return paymentLink;

  } catch (error) {
    console.error('❌ Error creating payment link:', error);
    return null;
  }
}

/**
 * Update MDX file with Stripe IDs
 */
function updateMDXFile(filePath: string, stripeData: {
  stripeProductId: string;
  stripePriceId: string;
  stripePaymentLink: string;
}) {
  try {
    const content = fs.readFileSync(filePath, 'utf-8');
    const parsed = matter(content);

    // Add Stripe IDs to frontmatter
    parsed.data.stripeProductId = stripeData.stripeProductId;
    parsed.data.stripePriceId = stripeData.stripePriceId;
    parsed.data.stripePaymentLink = stripeData.stripePaymentLink;

    // Write back to file
    const updatedContent = matter.stringify(parsed.content, parsed.data);
    fs.writeFileSync(filePath, updatedContent, 'utf-8');

    console.log(`✅ Updated ${path.relative(process.cwd(), filePath)} with Stripe IDs`);
    return true;
  } catch (error) {
    console.error(`❌ Error updating ${filePath}:`, error);
    return false;
  }
}

/**
 * Process a single product file
 */
async function processProductFile(filePath: string, force: boolean = false): Promise<void> {
  console.log(`\n🔄 Processing: ${path.relative(process.cwd(), filePath)}`);

  const frontmatter = await parseMDXFile(filePath);
  if (!frontmatter) {
    console.log(`❌ Skipping - could not parse frontmatter`);
    return;
  }

  if (!frontmatter.price) {
    console.log(`⚠️  Skipping - no price set`);
    return;
  }

  // Read full content
  const content = fs.readFileSync(filePath, 'utf-8');
  const { content: mdxContent } = matter(content);

  const productData = {
    ...frontmatter,
    content: mdxContent,
    slug: path.basename(filePath, '.mdx')
  };

  let stripeProduct = null;
  let needsCreate = false;

  // Check if product exists in Stripe
  if (frontmatter.stripeProductId && !force) {
    console.log(`🔍 Checking existing Stripe product: ${frontmatter.stripeProductId}`);
    stripeProduct = await getStripeProduct(frontmatter.stripeProductId);

    if (stripeProduct) {
      console.log(`✅ Found existing product - updating with enhanced data`);
    } else {
      console.log(`⚠️  Product not found - will create new one`);
      needsCreate = true;
    }
  } else {
    console.log(`📦 Creating new Stripe product`);
    needsCreate = true;
  }

  // Create or update product
  if (needsCreate) {
    stripeProduct = await createStripeProduct(productData);
    if (!stripeProduct) {
      throw new Error('Failed to create Stripe product');
    }
  } else if (stripeProduct) {
    const updated = await updateStripeProduct(stripeProduct.id, productData);
    if (!updated) {
      throw new Error('Failed to update Stripe product');
    }
  }

  // Create price if needed
  let stripePrice = null;
  if (!frontmatter.stripePriceId || force) {
    console.log(`💰 Creating Stripe price`);
    stripePrice = await createStripePrice(stripeProduct.id, productData);
    if (!stripePrice) {
      throw new Error('Failed to create Stripe price');
    }
  } else {
    console.log(`✅ Using existing price: ${frontmatter.stripePriceId}`);
    stripePrice = { id: frontmatter.stripePriceId };
  }

  // Create payment link if needed
  let paymentLink = null;
  if (!frontmatter.stripePaymentLink || force) {
    console.log(`🔗 Creating payment link`);
    paymentLink = await createPaymentLink(stripePrice.id);
    if (!paymentLink) {
      throw new Error('Failed to create payment link');
    }
  } else {
    console.log(`✅ Using existing payment link: ${frontmatter.stripePaymentLink}`);
    paymentLink = { url: frontmatter.stripePaymentLink };
  }

  // Update MDX file with Stripe IDs
  const stripeData = {
    stripeProductId: stripeProduct.id,
    stripePriceId: stripePrice.id,
    stripePaymentLink: paymentLink.url
  };

  const updated = updateMDXFile(filePath, stripeData);
  if (!updated) {
    throw new Error('Failed to update MDX file');
  }

  console.log(`🎉 Successfully enhanced "${frontmatter.title}" with complete Stripe data!`);
}

/**
 * Main execution function
 */
async function main() {
  const args = process.argv.slice(2);
  const targetFile = args.find(arg => !arg.startsWith('--'));
  const isForce = args.includes('--force');
  const isDryRun = args.includes('--dry-run');

  if (isDryRun) {
    console.log('🔍 DRY RUN MODE - No actual Stripe API calls will be made');
  }

  if (isForce) {
    console.log('⚠️  FORCE MODE - Will recreate existing products');
  }

  const shopContentDir = path.join(process.cwd(), 'features/shop/content');

  console.log('🔍 Finding MDX files...');
  const mdxFiles = await findMDXFiles(shopContentDir);
  console.log(`📁 Found ${mdxFiles.length} MDX files`);

  // Filter to specific file if provided
  let filesToProcess = mdxFiles;
  if (targetFile) {
    const targetPath = path.resolve(targetFile);
    filesToProcess = mdxFiles.filter(file => file === targetPath);

    if (filesToProcess.length === 0) {
      console.error(`❌ Target file not found: ${targetFile}`);
      console.log('Available files:');
      mdxFiles.forEach(file => console.log(`  ${path.relative(process.cwd(), file)}`));
      process.exit(1);
    }
  }

  console.log(`🎯 Processing ${filesToProcess.length} file(s)...\n`);

  let successCount = 0;
  let errorCount = 0;

  for (const file of filesToProcess) {
    try {
      if (isDryRun) {
        console.log(`\n🔍 [DRY RUN] Would process: ${path.relative(process.cwd(), file)}`);
        const frontmatter = await parseMDXFile(file);
        if (frontmatter) {
          console.log(`   📦 Product: ${frontmatter.title}`);
          console.log(`   💰 Price: $${frontmatter.price}`);
          console.log(`   🖼️  Images: ${frontmatter.imageUrl ? 1 : 0} + ${frontmatter.additionalImages?.length || 0}`);
          console.log(`   📊 Metadata: sku, category, featured, isDigital, techStacks`);
          console.log(`   🔗 Links: purchase, website, github`);
          console.log(`   📄 Content: ${frontmatter.description?.length || 0} chars`);
        }
      } else {
        await processProductFile(file, isForce);
        successCount++;
      }
    } catch (error) {
      console.error(`❌ Failed to process ${path.relative(process.cwd(), file)}:`, error);
      errorCount++;
    }

    // Small delay to avoid rate limiting
    if (!isDryRun) {
      await new Promise(resolve => setTimeout(resolve, 1000));
    }
  }

  console.log(`\n${isDryRun ? '🔍 Dry run' : '🚀 Enhanced Stripe sync'} completed!`);
  console.log(`   ✅ Successful: ${successCount}`);
  console.log(`   ❌ Errors: ${errorCount}`);
  console.log(`   📊 Total: ${filesToProcess.length}`);

  if (errorCount > 0) {
    console.log('\n💡 Tip: Check your Stripe API permissions and network connection');
    process.exit(1);
  }

  if (!isDryRun && successCount > 0) {
    console.log('\n🎊 SUCCESS! Your Stripe products now contain:');
    console.log('   • Complete product images');
    console.log('   • Full metadata (SKU, category, tech stacks)');
    console.log('   • External links (GitHub, websites)');
    console.log('   • Rich content descriptions');
    console.log('   • Business data (weight, dates)');
    console.log('\n🔄 Run the comparison script again to verify: npx tsx scripts/compare-product-data.ts');
  }
}

// Handle command line usage
if (process.argv.slice(2).includes('--help') || process.argv.slice(2).includes('-h')) {
  console.log(`
🎯 Enhanced Stripe Product Sync

Sync complete product data (images, metadata, content) with Stripe for full product management.

USAGE:
  npx tsx scripts/enhanced-stripe-sync.ts [file-path] [options]

ARGUMENTS:
  file-path    Optional path to specific MDX file to sync

OPTIONS:
  --dry-run    Preview changes without making API calls
  --force      Recreate existing Stripe products and prices
  --help, -h   Show this help message

EXAMPLES:
  # Enhanced sync all products
  npx tsx scripts/enhanced-stripe-sync.ts

  # Sync specific product with full data
  npx tsx scripts/enhanced-stripe-sync.ts features/shop/content/ai-apps/nextjs-ai-starter-app.mdx

  # Dry run to see what would be synced
  npx tsx scripts/enhanced-stripe-sync.ts --dry-run

  # Force recreate everything
  npx tsx scripts/enhanced-stripe-sync.ts --force

WHAT GETS SYNCED:
  ✅ All product images (main + additional)
  ✅ Complete metadata (SKU, category, featured, isDigital)
  ✅ Tech stacks as JSON
  ✅ External links (GitHub, website, purchase URLs)
  ✅ Rich content (compressed for Stripe limits)
  ✅ Business data (weight, dates, GTIN)
  ✅ Video embeds and metadata
`);
  process.exit(0);
}

main().catch(console.error);