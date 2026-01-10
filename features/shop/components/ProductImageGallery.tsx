"use client";

import { useState } from "react";
import Image from "next/image";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import ImageModal from "@/components/ImageModal";

interface ProductImageGalleryProps {
  primaryImage: {
    url: string;
    alt?: string;
  };
  additionalImages?: {
    url: string;
    alt?: string;
  }[];
}

export function ProductImageGallery({ primaryImage, additionalImages }: ProductImageGalleryProps) {
  // Combine primary image with additional images
  const allImages = [primaryImage, ...(additionalImages || [])];
  const [currentIndex, setCurrentIndex] = useState(0);
  const [isModalOpen, setIsModalOpen] = useState(false);

  // Debug logging
  console.log('ProductImageGallery rendered');
  console.log('Primary image:', primaryImage);
  console.log('Additional images:', additionalImages);
  console.log('All images count:', allImages.length);

  // Handle empty state
  if (!primaryImage?.url || allImages.length === 0) {
    return (
      <div className="relative aspect-video overflow-hidden rounded-2xl border bg-muted shadow-sm">
        <div className="absolute inset-0 flex items-center justify-center bg-gray-100 dark:bg-gray-800">
          <span className="text-muted-foreground">No images available</span>
        </div>
      </div>
    );
  }

  const currentImage = allImages[currentIndex] || primaryImage;

  const goToPrevious = () => {
    setCurrentIndex((prevIndex) =>
      prevIndex === 0 ? allImages.length - 1 : prevIndex - 1
    );
  };

  const goToNext = () => {
    setCurrentIndex((prevIndex) =>
      prevIndex === allImages.length - 1 ? 0 : prevIndex + 1
    );
  };

  const goToImage = (index: number) => {
    setCurrentIndex(index);
  };

  const openModal = () => {
    setIsModalOpen(true);
  };

  const closeModal = () => {
    setIsModalOpen(false);
  };

  return (
    <div className="space-y-4">
      {/* Main Image Display */}
      <div className="relative aspect-video overflow-hidden rounded-2xl border bg-muted shadow-sm group">
        {currentImage.url && (
          <button
            onClick={openModal}
            className="w-full h-full cursor-pointer focus:outline-none focus:ring-2 focus:ring-primary focus:ring-offset-2 rounded-2xl"
            aria-label={`View ${currentImage.alt || "product image"} in full size`}
          >
            <Image
              alt={currentImage.alt || "Product image"}
              src={currentImage.url}
              fill
              className="object-cover object-top transition-transform duration-500 group-hover:scale-[1.01]"
              priority={currentIndex === 0}
            />
          </button>
        )}

        {/* Navigation Arrows */}
        {allImages.length > 1 && (
          <>
            <Button
              variant="ghost"
              size="icon"
              className="absolute left-4 top-1/2 -translate-y-1/2 h-10 w-10 rounded-full bg-black/30 hover:bg-black/50 text-white backdrop-blur-sm z-10"
              onClick={goToPrevious}
              aria-label="Previous image"
            >
              <ChevronLeft className="h-5 w-5" />
            </Button>

            <Button
              variant="ghost"
              size="icon"
              className="absolute right-4 top-1/2 -translate-y-1/2 h-10 w-10 rounded-full bg-black/30 hover:bg-black/50 text-white backdrop-blur-sm z-10"
              onClick={goToNext}
              aria-label="Next image"
            >
              <ChevronRight className="h-5 w-5" />
            </Button>
          </>
        )}

        {/* Image Counter */}
        {allImages.length > 1 && (
          <div className="absolute bottom-4 right-4 bg-black/50 text-white px-3 py-1 rounded-full text-sm font-medium backdrop-blur-sm">
            {currentIndex + 1} / {allImages.length}
          </div>
        )}
      </div>

      {/* Thumbnail Navigation */}
      {allImages.length > 1 && (
        <div className="grid grid-cols-4 md:grid-cols-6 gap-2">
          {allImages.map((image, index) => (
            <button
              key={index}
              className={`relative aspect-square overflow-hidden rounded-lg border-2 transition-all ${
                index === currentIndex
                  ? "border-primary ring-2 ring-primary/20"
                  : "border-transparent hover:border-primary/30"
              }`}
              onClick={() => goToImage(index)}
              aria-label={`View image ${index + 1}`}
            >
              {image.url && (
                <Image
                  alt={image.alt || `Product thumbnail ${index + 1}`}
                  src={image.url}
                  fill
                  className="object-cover object-top"
                  sizes="(max-width: 768px) 20vw, 15vw"
                />
              )}
              {index === currentIndex && (
                <div className="absolute inset-0 bg-black/20 flex items-center justify-center">
                  <div className="w-3 h-3 rounded-full bg-white border-2 border-black" />
                </div>
              )}
            </button>
          ))}
        </div>
      )}

      {/* Image Modal */}
      <ImageModal
        images={allImages.map(img => ({ url: img.url, alt: img.alt || "Product image" }))}
        initialIndex={currentIndex}
        isOpen={isModalOpen}
        onClose={closeModal}
      />
    </div>
  );
}
