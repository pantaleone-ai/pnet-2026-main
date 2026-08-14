import type { NextRequest} from 'next/server';
import { NextResponse } from 'next/server';
import Stripe from 'stripe';
import matter from 'gray-matter';
import fs from 'fs';
import path from 'path';

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
function parseMDXFile(filePath: string): ProductFrontmatter | null {
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

    console.log(`✅ Updated ${filePath} with Stripe IDs`);
    return true;
  } catch (error) {
    console.error(`❌ Error updating ${filePath}:`, error);
    return false;
  }
}

export async function POST(request: NextRequest) {
  try {
    const { filePath, force = false } = await request.json();

    if (!filePath) {
      return NextResponse.json(
        { error: 'filePath is required' },
        { status: 400 }
      );
    }

    // Resolve the file path relative to project root
    const resolvedPath = path.resolve(process.cwd(), filePath);

    // Check if file exists
    if (!fs.existsSync(resolvedPath)) {
      return NextResponse.json(
        { error: `File not found: ${filePath}` },
        { status: 404 }
      );
    }

    console.log(`🔄 Processing: ${resolvedPath}`);

    const frontmatter = parseMDXFile(resolvedPath);
    if (!frontmatter) {
      return NextResponse.json(
        { error: 'Could not parse frontmatter' },
        { status: 400 }
      );
    }

    if (!frontmatter.price) {
      return NextResponse.json(
        { error: 'Product has no price set' },
        { status: 400 }
      );
    }

    // Initialize Stripe client
    const stripeSecretKey = process.env.STRIPE_SECRET_KEY;
    if (!stripeSecretKey) {
      return NextResponse.json(
        { error: 'Stripe secret key not configured' },
        { status: 500 }
      );
    }

    const stripe = new Stripe(stripeSecretKey);

    // Check if product already exists in Stripe (unless force is true)
    if (!force) {
      try {
        const products = await stripe.products.list({ limit: 100 });
        const existingProduct = products.data.find(product => product.name === frontmatter.title);
        if (existingProduct) {
          return NextResponse.json({
            error: `Product "${frontmatter.title}" already exists in Stripe (${existingProduct.id})`,
            existingProductId: existingProduct.id
          }, { status: 409 });
        }
      } catch (error) {
        console.warn('Error checking for existing product:', error);
      }
    }

    console.log(`Syncing product "${frontmatter.title}" with Stripe...`);

    // Prepare product data
    const images: string[] = [];
    if (frontmatter.imageUrl) {
      images.push(frontmatter.imageUrl);
    }
    if (frontmatter.additionalImages) {
      if (typeof frontmatter.additionalImages === 'string') {
        try {
          const parsedImages = JSON.parse(frontmatter.additionalImages);
          if (Array.isArray(parsedImages)) {
            for (const img of parsedImages) {
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
      } else if (Array.isArray(frontmatter.additionalImages)) {
        for (const img of frontmatter.additionalImages) {
          if (typeof img === 'string') {
            images.push(img);
          } else if (img && typeof img === 'object' && img.url) {
            images.push(img.url);
          }
        }
      }
    }

    // Prepare metadata
    const metadata: Record<string, string> = {};
    if (frontmatter.sku) metadata.sku = frontmatter.sku;
    if (frontmatter.category) metadata.category = frontmatter.category;
    if (frontmatter.featured !== undefined) metadata.featured = frontmatter.featured.toString();
    if (frontmatter.isDigital !== undefined) metadata.isDigital = frontmatter.isDigital.toString();
    if (frontmatter.techStacks) metadata.techStacks = JSON.stringify(frontmatter.techStacks);

    // Create Stripe product
    console.log('Creating Stripe product...');
    const productData: Stripe.ProductCreateParams = {
      name: frontmatter.title,
      description: frontmatter.description,
      metadata
    };

    if (images.length > 0) {
      productData.images = images;
    }

    const stripeProduct = await stripe.products.create(productData);
    console.log(`Created Stripe product: ${stripeProduct.id}`);

    // Create Stripe price
    console.log('Creating Stripe price...');
    const unitAmount = Math.round(frontmatter.price * 100); // Convert to cents
    const currency = frontmatter.currency?.toLowerCase() || 'usd';

    const stripePrice = await stripe.prices.create({
      product: stripeProduct.id,
      unit_amount: unitAmount,
      currency: currency as string
    });
    console.log(`Created Stripe price: ${stripePrice.id}`);

    // Create payment link
    console.log('Creating Stripe payment link...');
    const paymentLink = await stripe.paymentLinks.create({
      line_items: [{
        price: stripePrice.id,
        quantity: 1
      }]
    });
    console.log(`Created Stripe payment link: ${paymentLink.url}`);

    const stripeData = {
      stripeProductId: stripeProduct.id,
      stripePriceId: stripePrice.id,
      stripePaymentLink: paymentLink.url
    };

    // Update MDX file
    const updated = updateMDXFile(resolvedPath, stripeData);

    if (!updated) {
      return NextResponse.json(
        { error: 'Failed to update MDX file' },
        { status: 500 }
      );
    }

    console.log(`✅ Successfully synced "${frontmatter.title}" with Stripe MCP`);

    return NextResponse.json({
      success: true,
      product: {
        title: frontmatter.title,
        stripeProductId: stripeData.stripeProductId,
        stripePriceId: stripeData.stripePriceId,
        stripePaymentLink: stripeData.stripePaymentLink
      }
    });

  } catch (error) {
    console.error('❌ Sync error:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    );
  }
}
