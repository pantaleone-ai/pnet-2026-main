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
 * Sync a single product with Stripe MCP via API
 */
async function syncProduct(filePath: string, force: boolean = false) {
  console.log(`\n🔄 Processing: ${filePath}`);

  const frontmatter = await parseMDXFile(filePath);
  if (!frontmatter) {
    console.log(`❌ Skipping ${filePath} - could not parse frontmatter`);
    return;
  }

  if (!frontmatter.price) {
    console.log(`⚠️  Skipping ${frontmatter.title} - no price set`);
    return;
  }

  try {
    // Make API request to sync product
    const response = await fetch('http://localhost:3000/api/stripe/sync-product', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        filePath: path.relative(process.cwd(), filePath),
        force
      })
    });

    const data = await response.json();

    if (!response.ok) {
      if (response.status === 409 && !force) {
        console.log(`⚠️  ${data.error}`);
        console.log(`   Use --force to recreate existing products`);
        return;
      }
      throw new Error(data.error || `HTTP ${response.status}`);
    }

    if (data.success) {
      console.log(`✅ Successfully synced "${frontmatter.title}" with Stripe MCP`);
      console.log(`   Product ID: ${data.product.stripeProductId}`);
      console.log(`   Price ID: ${data.product.stripePriceId}`);
      console.log(`   Payment Link: ${data.product.stripePaymentLink}`);
    } else {
      throw new Error('Sync failed');
    }

  } catch (error) {
    console.error(`❌ Failed to sync "${frontmatter.title}":`, error);
    throw error;
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
 * Main execution function
 */
async function main() {
  const args = process.argv.slice(2);
  const targetFile = args.find(arg => !arg.startsWith('--'));
  const isDryRun = args.includes('--dry-run');
  const isForce = args.includes('--force');

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

  console.log(`🎯 Processing ${filesToProcess.length} file(s)...`);

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
          console.log(`   📝 Description: ${frontmatter.description.substring(0, 60)}...`);
        }
        successCount++;
      } else {
        await syncProduct(file, isForce);
        successCount++;
      }
    } catch (error) {
      console.error(`❌ Failed to process ${path.relative(process.cwd(), file)}:`, error);
      errorCount++;
    }

    // Small delay to avoid rate limiting
    await new Promise(resolve => setTimeout(resolve, 1000));
  }

  console.log(`\n${isDryRun ? '🔍 Dry run' : '🎉 Stripe MCP sync'} completed!`);
  console.log(`   ✅ Successful: ${successCount}`);
  console.log(`   ❌ Errors: ${errorCount}`);
  console.log(`   📊 Total: ${filesToProcess.length}`);

  if (errorCount > 0) {
    console.log('\n💡 Tip: Check your Stripe MCP server configuration and API permissions');
    process.exit(1);
  }
}

// Handle command line usage
if (process.argv.slice(2).includes('--help') || process.argv.slice(2).includes('-h')) {
  console.log(`
🎯 Stripe MCP Product Sync

Sync MDX product files with Stripe using MCP tools.

USAGE:
  npx tsx scripts/sync-stripe-mcp.ts [file-path] [options]

ARGUMENTS:
  file-path    Optional path to specific MDX file to sync

OPTIONS:
  --dry-run    Preview changes without making API calls
  --force      Recreate existing Stripe products
  --help, -h   Show this help message

EXAMPLES:
  # Sync all products
  npx tsx scripts/sync-stripe-mcp.ts

  # Sync specific product
  npx tsx scripts/sync-stripe-mcp.ts features/shop/content/ai-apps/vision-deck-custom-ppt-platform-mdx.mdx

  # Dry run all products
  npx tsx scripts/sync-stripe-mcp.ts --dry-run

  # Force recreate a specific product
  npx tsx scripts/sync-stripe-mcp.ts features/shop/content/ai-apps/vision-deck-custom-ppt-platform-mdx.mdx --force
`);
  process.exit(0);
}

main().catch(console.error);
