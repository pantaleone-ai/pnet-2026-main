"use client";

import { Card, CardDescription, CardTitle } from "@/components/ui/card";
import type { BlogPostType } from "@/features/blog/types/BlogPostType";
import type { ProjectType } from "@/features/projects/types/ProjectType";
import type { ShopProduct } from "@/features/shop/types/ShopProduct";
import CalendarIcon from "@/features/common/icons/calendar-icon";
import DateIcon from "@/features/common/icons/date-icon";
import ReadingTimeIcon from "@/features/common/icons/reading-time-icon";
import { formatDate, getProductCategorySlug } from "@/lib/helpers";
import { cn } from "@/lib/utils";
import { trackEvent } from "@/lib/events";
import LinkWrapper from "@/components/LinkWrapper";
import { ArrowRightIcon } from "lucide-react";
import Image from "next/image";
import { Button } from "../../../components/ui/button";
import { Separator } from "../../../components/ui/separator";

type CardItemProps =
  | {
      index: number;
      type: "project";
      item: ProjectType;
      sizes?: string;
      listName?: string;
    }
  | {
      index: number;
      type: "blog";
      item: Omit<BlogPostType, "body">;
      sizes?: string;
      listName?: string;
    }
  | {
      index: number;
      type: "product";
      item: ShopProduct;
      sizes?: string;
      listName?: string;
    };

export default function CardItem({ index, item, type, sizes, listName }: CardItemProps) {
  const isBlog = type === "blog";
  const isProduct = type === "product";
  const href = isBlog ? `/blog/${item.slug}` : undefined;

  return (
    <Card
      className={cn(
        "group h-full gap-0 rounded-lg border border-border/50 bg-card/50 backdrop-blur-sm transition-all duration-300 hover:shadow-xl hover:shadow-black/5 hover:border-primary/20 hover:bg-card/80",
        "hover:-translate-y-1",
      )}
      style={{ contentVisibility: index > 2 ? "auto" : "visible" }}
      role="article"
      aria-labelledby={`card-title-${index}`}
    >
      <CoverImage
        index={index}
        type={type}
        imageUrl={
          // Hard-coded fix: always use logo for blog cards (remote images broken)
          isBlog ? "/images/logo.png" : isProduct ? item.imageUrl : item.imageUrl
        }
        imageAlt={item.imageAlt || item.title}
        href={href}
        sizes={sizes}
      />

      <div className="flex w-full items-stretch justify-between">
        <div className="flex flex-1 flex-col">
          {isBlog ? (
            <BlogContent item={item} index={index} />
          ) : isProduct ? (
            <ProductContent item={item} index={index} listName={listName} />
          ) : (
            <ProjectContent item={item} index={index} />
          )}
        </div>
      </div>
    </Card>
  );
}

// Sub-components

const CoverImage = ({
  index,
  type,
  imageUrl,
  imageAlt,
  href,
  sizes,
}: {
  index: number;
  type: "project" | "blog" | "product";
  imageUrl: string;
  imageAlt: string;
  href?: string;
  sizes?: string;
}) => {
  const content = (
    <div className="relative w-full overflow-hidden rounded-t-lg bg-muted/20">
      <div className="relative aspect-[4/3] w-full overflow-hidden group-hover:scale-105 transition-transform duration-500 ease-out">
        <Image
          alt={imageAlt || "Card image"}
          src={imageUrl || "/images/logo.png"}
          fill
          className="object-cover object-top transition-transform duration-500 ease-out group-hover:scale-110"
          sizes={sizes || "(max-width: 1023px) 100vw, 33vw"}
          priority={index === 0 && type === "project"} // Prioritize first project image (likely LCP)
          loading={index === 0 && type === "project" ? "eager" : "lazy"} // Eager load first image
        />
        {/* Subtle overlay on hover */}
        <div className="absolute inset-0 bg-gradient-to-t from-black/10 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
      </div>
    </div>
  );

  if (href) {
    return (
      <LinkWrapper href={href} className="block cursor-pointer">
        {content}
      </LinkWrapper>
    );
  }

  return content;
};

const BlogContent = ({
  item,
  index,
}: {
  item: Omit<BlogPostType, "body">;
  index: number;
}) => {
  const href = `/blog/${item.slug}`;
  return (
    <div className="p-4 space-y-3">
      <div className="flex items-center gap-3 text-sm text-muted-foreground">
        <div className="flex items-center gap-1">
          <DateIcon size={16} className="text-muted-foreground" />
          <span className="font-mono">
            {item.created ? formatDate(item.created as string) : "No date"}
          </span>
        </div>
        {item.readingTimeMinutes !== undefined && (
          <>
            <Separator orientation="vertical" className="h-4" />
            <div className="flex items-center gap-1">
              <ReadingTimeIcon size={16} className="text-muted-foreground" />
              <span className="font-mono">{item.readingTimeMinutes} min</span>
            </div>
          </>
        )}
      </div>

      <LinkWrapper href={href} className="group/title block">
        <CardTitle
          id={`card-title-${index}`}
          className="line-clamp-2 text-lg font-bold leading-tight text-foreground group-hover/title:text-primary transition-colors"
        >
          {item.title}
        </CardTitle>
      </LinkWrapper>

      <CardDescription className="line-clamp-3 text-sm text-muted-foreground">
        {item.description}
      </CardDescription>

      <div className="flex items-center justify-between pt-2">
        <div className="flex items-center space-x-2">
          {item.author && (
            <>
              <div className="relative size-6 shrink-0 overflow-hidden rounded-full">
                <Image
                  src={item.authorAvatar || ""}
                  alt={item.author}
                  fill
                  className="object-cover"
                  sizes="24px"
                />
              </div>
              <span className="text-sm font-medium text-muted-foreground">
                {item.author}
              </span>
            </>
          )}
        </div>
        <Button
          variant="ghost"
          size="sm"
          asChild
          className="h-8 px-2 text-sm hover:bg-transparent hover:text-primary transition-colors"
          onClick={() => {
            trackEvent({
              name: "blog_post_read_more_clicked",
              properties: {
                post_title: item.title,
                post_slug: item.slug,
              },
            });
          }}
        >
          <LinkWrapper href={href} className="group/btn flex items-center gap-1">
            Read more
            <span className="sr-only"> about {item.title}</span>
            <ArrowRightIcon className="size-3 transition-transform duration-300 group-hover/btn:translate-x-1" />
          </LinkWrapper>
        </Button>
      </div>
    </div>
  );
};

const ProjectContent = ({
  item,
  index,
}: {
  item: ProjectType;
  index: number;
}) => {
  return (
    <div className="p-4 space-y-3">
      <div>
        <CardTitle
          id={`card-title-${index}`}
          className="text-lg font-bold leading-tight text-foreground mb-2"
        >
          {item.title}
        </CardTitle>
        {item.fromDate && (
          <div className="flex items-center gap-1 text-sm text-muted-foreground mb-3">
            <CalendarIcon className="size-4 text-muted-foreground" />
            <span className="font-mono">{item.fromDate}</span>
          </div>
        )}
      </div>

      <CardDescription className="line-clamp-3 text-sm text-muted-foreground">
        {item.description}
      </CardDescription>

      <div className="flex w-full flex-col gap-2 pt-2">
        {item.websiteUrl && item.websiteUrl !== "#" && (
          <Button
            asChild
            className="w-full"
            variant="outline"
            onClick={() => {
              trackEvent({
                name: "project_live_demo_clicked",
                properties: {
                  project_title: item.title,
                  project_url: item.websiteUrl ?? "",
                },
              });
            }}
          >
            <LinkWrapper
              target="_blank"
              rel="noopener noreferrer"
              href={item.websiteUrl}
            >
              Live Demo
              <span className="sr-only"> of {item.title}</span>
            </LinkWrapper>
          </Button>
        )}
      </div>
    </div>
  );
};

const ProductContent = ({
  item,
  index,
  listName,
}: {
  item: ShopProduct;
  index: number;
  listName?: string;
}) => {
  const categorySlug = getProductCategorySlug(item.category);
  const productHref = `/shop/${categorySlug}/${item.slug}`;

  const handleSelect = () => {
    trackEvent({
      name: "select_item",
      properties: {
        item_id: String(item.id),
        item_name: item.title,
        item_category: item.category,
        price: item.price,
        currency: item.currency || "USD",
        item_list_name: listName || `${categorySlug}-products`,
        index,
      },
    });
  };

  return (
    <div className="p-4 space-y-3">
      <div>
        <CardTitle
          id={`card-title-${index}`}
          className="text-lg font-bold leading-tight text-foreground mb-2"
        >
          {item.title}
        </CardTitle>
        <div className="flex items-center justify-between text-sm">
          <span className="text-muted-foreground font-mono">
            {item.category}
          </span>
          <span className="font-bold text-foreground">
            ${item.price} {item.currency}
          </span>
        </div>
      </div>

      <CardDescription className="line-clamp-3 text-sm text-muted-foreground">
        {item.description}
      </CardDescription>

      <div className="flex w-full flex-col gap-2 pt-2">
        {(item.stripePaymentLink || item.purchaseUrl) && (
          <Button asChild className="w-full">
            <LinkWrapper
              target="_blank"
              rel="noopener noreferrer"
              href={item.stripePaymentLink || item.purchaseUrl || "#"}
              onClick={handleSelect}
            >
              Buy Now - ${item.price}
              <span className="sr-only"> purchase {item.title}</span>
            </LinkWrapper>
          </Button>
        )}
        <Button variant="outline" asChild className="w-full">
          <LinkWrapper href={productHref} onClick={handleSelect}>
            View Details
            <span className="sr-only"> about {item.title}</span>
          </LinkWrapper>
        </Button>
      </div>
    </div>
  );
};
