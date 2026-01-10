import { getCategories, getProductsByCategory } from "@/features/shop/data/shopSource";

const allCategories = getCategories();

const content = `# Shop

${allCategories.map((category) => {
  const products = getProductsByCategory(category);

  return `## ${category}

${products.map((product) => {
  const techStack = product.techStacks?.length
    ? `\n\nTechnology Stack: ${product.techStacks.join(", ")}`
    : "";
  const price = product.price ? `\n\nPrice: $${product.price} ${product.currency || 'USD'}` : "";
  const description = product.description ? `\n\n${product.description.trim()}` : "";

  return `### ${product.title}

Category: ${category}${price}${techStack}${description}`;
}).join("\n\n")}
`;
}).join("\n\n")}
`;

export const dynamic = "force-static";

export async function GET() {
  return new Response(content, {
    headers: {
      "Content-Type": "text/markdown;charset=utf-8",
    },
  });
}
