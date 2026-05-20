"use client";

import Link from "next/link";
import Image from "next/image";
import { Clock } from "lucide-react";
import { track } from "@/lib/analytics";

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
    timeToValue?: number;
  };
  categorySlug: string;
  listName?: string;
  index?: number;
}

export default function ProductCard({
  product,
  categorySlug,
  listName,
  index = 0,
}: ProductCardProps) {
  const handleSelect = () => {
    track.selectItem(
      {
        id: String(product.id),
        name: product.title,
        category: product.category,
        price: product.price,
        currency: product.currency || "USD",
        brand: "Pantaleone Digital Services",
        index,
      },
      listName || `${categorySlug}-products`,
    );
  };

  return (
    <div className="group block">
      <article className="h-full space-y-4">
        <Link
          href={`/shop/${categorySlug}/${product.slug}`}
          className="block"
          onClick={handleSelect}
        >
          <div className="relative aspect-video overflow-hidden rounded-2xl border border-transparent group-hover:border-primary/20 transition-all cursor-pointer">
            {product.timeToValue && (
              <div className="absolute top-3 right-3 z-10 flex items-center gap-1.5 px-2.5 py-1.5 bg-primary/90 backdrop-blur-sm rounded-full text-xs font-bold text-primary-foreground shadow-lg">
                <Clock className="h-3.5 w-3.5" />
                <span>-{product.timeToValue}h</span>
              </div>
            )}
            <Image
              src={product.imageUrl || "/summary_large_image.png"}
              alt={product.title}
              fill
              className="object-cover object-top group-hover:scale-105 transition-transform duration-700"
            />
          </div>
        </Link>
        <Link
          href={`/shop/${categorySlug}/${product.slug}`}
          className="block"
          onClick={handleSelect}
        >
          <div className="space-y-2 text-left">
            <div className="flex justify-between items-center">
              <h3 className="font-bold text-xl tracking-tight group-hover:text-primary transition-colors">
                {product.title}
              </h3>
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
