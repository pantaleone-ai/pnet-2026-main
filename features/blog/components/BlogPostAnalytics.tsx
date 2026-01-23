"use client";

import { useEffect, useState } from "react";
import { track } from "@/lib/analytics";

interface BlogPostAnalyticsProps {
  post: {
    slug: string;
    title: string;
    category?: string;
    author?: string;
    created: string;
    readingTimeMinutes?: number;
    seo?: string[];
  };
}

/**
 * Client component for tracking blog post analytics
 * Tracks post views and engagement metrics
 */
export default function BlogPostAnalytics({ post }: BlogPostAnalyticsProps) {
  const [startTime] = useState(Date.now());
  const [maxScrollDepth, setMaxScrollDepth] = useState(0);

  // Track blog post view on mount
  useEffect(() => {
    track.blogPostView({
      id: post.slug,
      title: post.title,
      category: post.category || 'General',
      author: post.author || 'Pantaleone',
      publishedAt: post.created,
      readTime: post.readingTimeMinutes,
      tags: post.seo || []
    });
  }, [post.slug, post.title, post.category, post.author, post.created, post.readingTimeMinutes, post.seo]);

  // Track scroll depth and engagement
  useEffect(() => {
    const handleScroll = () => {
      const scrollTop = window.scrollY;
      const documentHeight = document.documentElement.scrollHeight - window.innerHeight;
      const scrollPercent = Math.round((scrollTop / documentHeight) * 100);

      if (scrollPercent > maxScrollDepth) {
        setMaxScrollDepth(scrollPercent);
      }
    };

    const handleBeforeUnload = () => {
      const timeOnPage = Math.round((Date.now() - startTime) / 1000); // Convert to seconds
      const readComplete = maxScrollDepth >= 80; // Consider read complete if scrolled 80%+

      track.blogPostEngaged({
        postId: post.slug,
        scrollDepth: maxScrollDepth,
        timeOnPage,
        readComplete
      });
    };

    // Track engagement every 30 seconds
    const engagementInterval = setInterval(() => {
      const timeOnPage = Math.round((Date.now() - startTime) / 1000);
      const readComplete = maxScrollDepth >= 80;

      if (timeOnPage > 10) { // Only track if user has been on page for more than 10 seconds
        track.blogPostEngaged({
          postId: post.slug,
          scrollDepth: maxScrollDepth,
          timeOnPage,
          readComplete
        });
      }
    }, 30000);

    window.addEventListener('scroll', handleScroll, { passive: true });
    window.addEventListener('beforeunload', handleBeforeUnload);

    return () => {
      clearInterval(engagementInterval);
      window.removeEventListener('scroll', handleScroll);
      window.removeEventListener('beforeunload', handleBeforeUnload);

      // Final engagement tracking on unmount
      const timeOnPage = Math.round((Date.now() - startTime) / 1000);
      const readComplete = maxScrollDepth >= 80;

      track.blogPostEngaged({
        postId: post.slug,
        scrollDepth: maxScrollDepth,
        timeOnPage,
        readComplete
      });
    };
  }, [post.slug, startTime, maxScrollDepth]);

  // This component doesn't render anything
  return null;
}
