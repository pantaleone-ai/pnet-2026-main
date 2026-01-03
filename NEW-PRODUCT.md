## 🛒 Easy Guide to Create New Products

Based on your shop's current structure, here's how to easily create new products:

### 📁 File Structure
Products are organized in MDX files within the `features/shop/content/` directory, grouped by category:

```
features/shop/content/
├── ai-apps/          # AI Applications & Agents
├── ai-services/      # AI Services
├── ai-workflows/     # AI Workflows
└── artwork/          # AI Artwork
```

### 📝 Step-by-Step Product Creation

#### 1. **Choose the Right Category**
Pick the appropriate category folder for your product:
- `ai-apps/` - For AI applications and agents
- `ai-services/` - For consulting and services
- `ai-workflows/` - For automation workflows
- `artwork/` - For AI-generated artwork

#### 2. **Create a New MDX File**
Create a new file in the appropriate category folder with a descriptive name (kebab-case):
```
features/shop/content/ai-apps/my-awesome-product.mdx
```

#### 3. **Use This Template**

```mdx
---
title: My Awesome Product
description: Brief description of what this product does and who it's for
category: AI Apps & Agents  # Must match your category name
price: 29.99               # Price in numbers
currency: USD              # Currency code (default: USD)
featured: true             # Set to true to feature on homepage
isDigital: true            # true for digital, false for physical
imageUrl: /images/my-product.jpg  # Path to product image
imageAlt: My Product Preview Image  # Alt text for image
sku: PROD-001             # Optional SKU code
purchaseUrl: https://gumroad.com/l/my-product  # External purchase link
websiteUrl: https://myproduct.com  # Optional website link
githubUrl: https://github.com/username/repo  # Optional GitHub link
videoEmbedUrl: https://youtube.com/embed/video-id  # Optional demo video
techStacks: ["Next.js", "TypeScript", "AI"]  # Technologies used
weight: 10                # Optional sorting weight
---

## Product Title

### Detailed Description

Add more detailed information about your product here. You can use Markdown formatting:

- **Features**: List key features
- **Benefits**: Explain customer benefits
- **Use Cases**: Describe ideal use cases
- **Requirements**: List any prerequisites

### Additional Sections (Optional)

#### How It Works
Explain how the product works in simple terms.

#### Technical Details
For developers: APIs, integrations, etc.

#### Support
Information about support options and documentation.
```

#### 4. **Required Fields**
These fields are mandatory:
- `title` - Product name
- `description` - Short description
- `category` - Must match your category (e.g., "AI Apps & Agents")
- `price` - Numerical price
- `isDigital` - Boolean (true/false)

#### 5. **Optional but Recommended Fields**
- `imageUrl` - Product image path
- `purchaseUrl` - External purchase link (Gumroad, etc.)
- `featured` - Set to `true` to showcase on homepage
- `techStacks` - Array of technologies used
- `sku` - Stock keeping unit
- `websiteUrl` - Product website
- `githubUrl` - GitHub repository
- `videoEmbedUrl` - Demo video embed

### 🎨 Product Images
1. Add images to `public/images/` directory
2. Use relative paths: `/images/filename.jpg`
3. Recommended size: 1000x500 pixels
4. Include descriptive `imageAlt` text

### 📊 Product Categories
Use these exact category names:
- **"AI Apps & Agents"** - For AI applications
- **"AI Services"** - For consulting/services
- **"AI Workflows"** - For automation workflows
- **"AI Artwork"** - For digital artwork

### 🔗 External Links
- `purchaseUrl` - Links to Gumroad or other platforms
- `websiteUrl` - Links to product website/demo
- `githubUrl` - Links to source code (if open source)

### 💡 Pro Tips
1. **Featured Products**: Set `featured: true` to showcase on homepage (max 3 displayed)
2. **Sorting**: Use `weight` to control display order (lower numbers appear first)
3. **SEO**: Write descriptive titles and descriptions for better search visibility
4. **Content**: Use Markdown sections to provide detailed product information
5. **Testing**: After creating, visit `/shop` to see your product appear

### ✅ Example Workflow
1. Create file: `features/shop/content/ai-apps/nextjs-ai-starter.mdx`
2. Add frontmatter with all product details
3. Add product image to `public/images/nextjs-ai-starter.jpg`
4. Write detailed product description in Markdown
5. Save file - product automatically appears in shop!

The product will automatically be available at:
`/shop/ai-apps/nextjs-ai-starter`

And will link from the main shop page with a "View Details" button!