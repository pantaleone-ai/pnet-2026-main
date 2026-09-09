# Stripe Product Sync Scripts

This directory contains scripts for synchronizing shop products with Stripe.

## Enhanced Stripe Product Sync (`create-stripe-products.ts`)

A comprehensive script that creates and syncs products from MDX files to Stripe, ensuring Stripe has all current product information including descriptions, prices, attributes, and images.

### Features

- **Real Stripe API Integration**: Uses MCP Stripe tools for actual API calls
- **Product Detection**: Automatically detects existing products to avoid duplicates
- **Image Support**: Handles main images and additional image arrays
- **Metadata Sync**: Syncs category, featured status, tech stacks, and other attributes
- **Payment Links**: Creates Stripe payment links for each product
- **Error Handling**: Comprehensive error handling with retry logic
- **Dry Run Mode**: Test changes without making actual API calls
- **Progress Tracking**: Detailed logging and success/error reporting

### Usage

```bash
# Run the sync script
npm run tsx scripts/create-stripe-products.ts

# Dry run mode (no actual API calls)
npm run tsx scripts/create-stripe-products.ts --dry-run

# Force mode (override existing products)
npm run tsx scripts/create-stripe-products.ts --force
```

### What It Does

1. **Scans MDX Files**: Finds all `.mdx` files in `features/shop/content/`
2. **Parses Frontmatter**: Extracts product data (title, description, price, images, etc.)
3. **Checks Existing Products**: Queries Stripe to see if products already exist
4. **Creates/Updates Products**: Creates new products or updates existing ones
5. **Creates Prices**: Sets up pricing for each product
6. **Creates Payment Links**: Generates Stripe payment links
7. **Updates MDX Files**: Adds Stripe IDs back to the frontmatter

### Product Data Mapping

The script maps MDX frontmatter to Stripe product data:

- `title` → Product name
- `description` → Product description
- `price` + `currency` → Price object
- `imageUrl` + `additionalImages` → Product images array
- `sku`, `category`, `featured`, `isDigital`, `techStacks` → Product metadata

### Environment Requirements

- Stripe API key configured in MCP environment
- MDX files in `features/shop/content/` with proper frontmatter
- Required fields: `title`, `description`, `price`

### Error Handling

- Individual product failures don't stop the entire sync
- Detailed error logging for troubleshooting
- Rate limiting protection with delays between API calls
- Exit code 1 if any products fail to sync

### Limitations

- Product updates are limited (Stripe API constraints via MCP)
- Price updates create new prices rather than updating existing ones
- No automatic inventory management yet
- No scheduled sync (as requested)

## Future Enhancements

- Webhook-based real-time sync
- Advanced product update capabilities
- Inventory synchronization
- Bulk operations for better performance
- Product deletion sync
