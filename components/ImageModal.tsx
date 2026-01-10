"use client";

import { useEffect, useState } from "react";
import { X, ChevronLeft, ChevronRight, Download } from "lucide-react";
import Image from "next/image";
import { Button } from "./ui/button";
import { cn } from "@/lib/utils";

interface ImageData {
  url: string;
  alt: string;
}

interface ImageModalProps {
  images: ImageData[];
  initialIndex: number;
  isOpen: boolean;
  onClose: () => void;
}

export default function ImageModal({ images, initialIndex, isOpen, onClose }: ImageModalProps) {
  const [currentIndex, setCurrentIndex] = useState(initialIndex);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    setCurrentIndex(initialIndex);
  }, [initialIndex]);

  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = 'hidden';
      setIsLoading(true);
    } else {
      document.body.style.overflow = 'unset';
    }

    return () => {
      document.body.style.overflow = 'unset';
    };
  }, [isOpen]);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (!isOpen) return;

      switch (e.key) {
        case 'Escape':
          onClose();
          break;
        case 'ArrowLeft':
          e.preventDefault();
          goToPrevious();
          break;
        case 'ArrowRight':
          e.preventDefault();
          goToNext();
          break;
      }
    };

    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, currentIndex]);

  const goToPrevious = () => {
    if (images.length === 0) return;
    setCurrentIndex((prev) => (prev === 0 ? images.length - 1 : prev - 1));
    setIsLoading(true);
  };

  const goToNext = () => {
    if (images.length === 0) return;
    setCurrentIndex((prev) => (prev === images.length - 1 ? 0 : prev + 1));
    setIsLoading(true);
  };

  const handleDownload = () => {
    if (images.length === 0 || !images[currentIndex]) return;
    const link = document.createElement('a');
    link.href = images[currentIndex].url;
    link.download = images[currentIndex].alt || 'product-image';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  if (!isOpen || images.length === 0) return null;

  const currentImage = images[currentIndex];
  if (!currentImage) return null;

  const hasMultiple = images.length > 1;

  return (
    <div className="fixed inset-0 z-50 bg-black/90 backdrop-blur-sm">
      {/* Close button */}
      <Button
        variant="ghost"
        size="sm"
        onClick={onClose}
        className="absolute top-4 right-4 z-10 text-white hover:bg-white/20"
        aria-label="Close modal"
      >
        <X className="h-6 w-6" />
      </Button>

      {/* Download button */}
      <Button
        variant="ghost"
        size="sm"
        onClick={handleDownload}
        className="absolute top-4 right-16 z-10 text-white hover:bg-white/20"
        aria-label="Download image"
      >
        <Download className="h-5 w-5" />
      </Button>

      {/* Navigation arrows */}
      {hasMultiple && (
        <>
          <Button
            variant="ghost"
            size="sm"
            onClick={goToPrevious}
            className="absolute left-4 top-1/2 -translate-y-1/2 z-10 text-white hover:bg-white/20 h-12 w-12 rounded-full"
            aria-label="Previous image"
          >
            <ChevronLeft className="h-8 w-8" />
          </Button>
          <Button
            variant="ghost"
            size="sm"
            onClick={goToNext}
            className="absolute right-4 top-1/2 -translate-y-1/2 z-10 text-white hover:bg-white/20 h-12 w-12 rounded-full"
            aria-label="Next image"
          >
            <ChevronRight className="h-8 w-8" />
          </Button>
        </>
      )}

      {/* Main image */}
      <div className="flex items-center justify-center h-full p-4">
        <div className="relative max-w-full max-h-full">
          {isLoading && (
            <div className="absolute inset-0 flex items-center justify-center bg-black/50 rounded-lg">
              <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-white"></div>
            </div>
          )}
          <Image
            src={currentImage.url}
            alt={currentImage.alt}
            width={1200}
            height={800}
            className={cn(
              "max-w-full max-h-full object-contain transition-opacity duration-300",
              isLoading ? "opacity-0" : "opacity-100"
            )}
            onLoad={() => setIsLoading(false)}
            onError={() => setIsLoading(false)}
            priority
          />
        </div>
      </div>

      {/* Image counter */}
      {hasMultiple && (
        <div className="absolute bottom-4 left-1/2 -translate-x-1/2 bg-black/50 text-white px-4 py-2 rounded-full text-sm font-medium">
          {currentIndex + 1} / {images.length}
        </div>
      )}

      {/* Click outside to close */}
      <div
        className="absolute inset-0 -z-10"
        onClick={onClose}
        aria-label="Close modal"
      />
    </div>
  );
}