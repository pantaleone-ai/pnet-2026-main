"use client";

import { useEffect } from "react";
import { track } from "@/lib/analytics";

interface ProductListViewTrackerProps {
  products: Array<{
    id: number | string;
    title: string;
    description: string;
    price: number;
    currency?: string;
    imageUrl?: string;
    category: string;
    slug: string;
    timeToValue?: number;
  }>;
  listName: string;
}

export default function ProductListViewTracker({
  products,
  listName,
}: ProductListViewTrackerProps) {
  useEffect(() => {
    if (products.length === 0) return;

    const productsToTrack = products.map((product, index) => ({
      id: String(product.id),
      name: product.title,
      category: product.category,
      price: product.price,
      currency: product.currency || "USD",
      brand: "Pantaleone Digital Services",
      index: index + 1,
    }));

    track.productImpression(productsToTrack, listName);
  }, [products, listName]);

  return null;
}
