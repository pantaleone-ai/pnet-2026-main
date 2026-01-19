import Link from "next/link";
import Image from "next/image";

interface ProductCardProps {
  product: {
    id: number | string;
    title: string;
    description: string;
    price: number;
    currency?: string;
    imageUrl?: string;
    category: string;
    slug: string;
  };
  categorySlug: string;
}

export default function ProductCard({ product, categorySlug }: ProductCardProps) {
  return (
    <div className="group block">
      <article className="h-full space-y-4">
        <Link href={`/shop/${categorySlug}/${product.slug}`} className="block">
          <div className="relative aspect-video overflow-hidden rounded-2xl border border-transparent group-hover:border-primary/20 transition-all cursor-pointer">
            <Image
              src={product.imageUrl || '/summary_large_image.png'}
              alt={product.title}
              fill
              className="object-cover object-top group-hover:scale-105 transition-transform duration-700"
            />
          </div>
        </Link>
        <Link href={`/shop/${categorySlug}/${product.slug}`} className="block">
          <div className="space-y-2 text-left">
            <div className="flex justify-between items-center">
              <h3 className="font-bold text-xl tracking-tight group-hover:text-primary transition-colors">{product.title}</h3>
              <p className="font-black text-lg">${product.price}</p>
            </div>
            <p className="text-sm text-muted-foreground line-clamp-2 leading-relaxed">
              {product.description}
            </p>
          </div>
        </Link>
      </article>
    </div>
  );
}