"use client";

import { SKILLS } from "@/features/home/data/skills";
import { cn } from "@/lib/utils";
import { useEffect, useRef } from "react";
import { IoCheckmarkCircle as CheckmarkIcon } from "react-icons/io5";
import { useAnimationFrame } from "framer-motion";
import { useTheme } from "next-themes";
import { META_THEME_COLORS } from "@/config/theme";

function HeroContent() {
  return (
    <div className="mx-auto grid w-full max-w-2xl grid-cols-1 divide-y divide-dashed divide-border-edge">
      {/* <p className="text-foreground px-4 text-2xl font-semibold tracking-tight sm:text-left sm:text-3xl hidden sm:block pb-2">
        HELLO
      </p> */}
      <h1 className="text-foreground px-4 text-[32px] font-semibold tracking-tight sm:text-[40px] sm:text-left py-2">
        {/* <span className="sm:hidden">Hey!</span> */}
        Let&apos;s Create the Future
      </h1>

      <p className="text-foreground/80 px-4 text-lg/8 text-left py-4 pb-40">
        We help forward-thinking leaders architect the future through AI, automation, agentic workflows, and proprietary digital platforms.
      </p>

      <ul
        className="text-foreground space-y-2 divide-y divide-dashed divide-border-edge"
        aria-label="Skills and qualifications"
      >
        {SKILLS.map((item, index) => (
          <li
            key={item.name || index}
            className="relative py-2 pl-11 last:mb-20"
          >
            <CheckmarkIcon
              aria-hidden="true"
              className={cn(
                "absolute left-4 size-5 text-muted-foreground/80",
                "top-1/2 -translate-y-1/2",
              )}
            />
            <div className="flex flex-row gap-x-1">
              {item.name && (
                <span className="font-semibold text-foreground text-left">
                  {item.name}:
                </span>
              )}
              <span className="text-foreground/80 text-left">{item.description}</span>
            </div>
          </li>
        ))}
      </ul>
    </div>
  );
}

export default function Hero() {
  return (
    <div className="relative mx-auto max-w-5xl lg:p-8 overflow-hidden rounded-2xl">
      {/* --- Background Particles & Noise --- */}
      <div className="absolute inset-0 z-0">
        <ParticleCanvas />
        <div className="pointer-events-none absolute inset-0 opacity-20 mix-blend-overlay">
          <svg xmlns="http://www.w3.org/2000/svg" className="w-full h-full">
            <filter id="noise">
              <feTurbulence
                type="fractalNoise"
                baseFrequency="0.8"
                numOctaves="4"
                stitchTiles="stitch"
              />
            </filter>
            <rect width="100%" height="100%" filter="url(#noise)" />
          </svg>
        </div>
      </div>

      {/* --- Main Content --- */}
      <div className="relative z-10 flex flex-col border-border-edge border lg:border-dashed">
        {/* Content Section */}
        <div className="flex items-center">
          <HeroContent />
        </div>
      </div>
    </div>
  );
}

// --- The Particle Engine ---

function ParticleCanvas() {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const { resolvedTheme } = useTheme();

  // Track inputs
  const mouse = useRef({ x: 0, y: 0 });
  const cameraOffset = useRef({ x: 0, y: 0 });

  const particles = useRef<Particle[]>([]);

  // Configuration
  const Z_SPEED = 1.0;
  const DEPTH = 2000;
  const FOV = 800;
  const STEER_SENSITIVITY = 0.05;

  const COLORS: { r: number; g: number; b: number }[] = [
    { r: 255, g: 255, b: 255 }, // White
    { r: 255, g: 255, b: 255 },
    { r: 255, g: 255, b: 255 },
    { r: 200, g: 230, b: 255 }, // Light Ice Blue
    { r: 100, g: 180, b: 255 }, // Deep Sky Blue
    { r: 255, g: 220, b: 180 }, // Soft Amber
    { r: 255, g: 160, b: 100 }, // Deep Orange
  ];

  // Handle theme changes
  useEffect(() => {
    if (!canvasRef.current) return;
    const canvas = canvasRef.current;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    // Redraw with new theme background
    const width = canvas.width;
    const height = canvas.height;

    if (resolvedTheme === "dark") {
      ctx.fillStyle = META_THEME_COLORS.dark;
    } else {
      ctx.fillStyle = META_THEME_COLORS.light;
    }
    ctx.fillRect(0, 0, width, height);
  }, [resolvedTheme]);

  // Initialize Particles
  useEffect(() => {
    if (!canvasRef.current || !containerRef.current) return;

    const resize = () => {
      // Use container dimensions instead of window to fit the specific hero section
      if (!containerRef.current || !canvasRef.current) return;
      const { width, height } = containerRef.current.getBoundingClientRect();

      canvasRef.current.width = width;
      canvasRef.current.height = height;

      mouse.current = { x: width / 2, y: height / 2 };

      const isMobile = width < 768;
      const count = isMobile ? 400 : 800;

      initParticles(width, height, count);
    };

    const initParticles = (width: number, height: number, count: number) => {
      particles.current = [];
      for (let i = 0; i < count; i++) {
        const colorIndex = Math.floor(Math.random() * COLORS.length);
        const colorProfile = COLORS[colorIndex];
        if (!colorProfile) continue; // Skip if undefined (shouldn't happen but satisfies TS)

        // Make particle size responsive based on screen size
        const baseSize = width < 768 ? Math.random() * 2 + 0.3 : Math.random() * 3 + 0.5;

        particles.current.push({
          x: (Math.random() - 0.5) * width * 4,
          y: (Math.random() - 0.5) * height * 4,
          z: Math.random() * DEPTH,
          sizeBase: baseSize,
          color: { r: colorProfile.r, g: colorProfile.g, b: colorProfile.b },
          alpha: Math.random(),
        });
      }
    };

    const handleMouseMove = (e: MouseEvent) => {
      if (!canvasRef.current) return;
      const rect = canvasRef.current.getBoundingClientRect();
      mouse.current = {
        x: e.clientX - rect.left,
        y: e.clientY - rect.top,
      };
    };

  const handleTouchMove = (e: TouchEvent) => {
    if (e.touches.length > 0 && canvasRef.current) {
      const rect = canvasRef.current.getBoundingClientRect();
      const touch = e.touches[0];
      if (touch) {
        mouse.current = {
          x: touch.clientX - rect.left,
          y: touch.clientY - rect.top,
        };
      }
    }
  };

    window.addEventListener("resize", resize);
    window.addEventListener("mousemove", handleMouseMove);
    window.addEventListener("touchmove", handleTouchMove, { passive: true });
    
    resize();

    return () => {
      window.removeEventListener("resize", resize);
      window.removeEventListener("mousemove", handleMouseMove);
      window.removeEventListener("touchmove", handleTouchMove);
    };
  }, []);

  useAnimationFrame(() => {
    if (!canvasRef.current) return;
    const canvas = canvasRef.current;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const width = canvas.width;
    const height = canvas.height;
    const centerX = width / 2;
    const centerY = height / 2;

    // Set canvas background based on theme
    if (resolvedTheme === "dark") {
      ctx.fillStyle = META_THEME_COLORS.dark;
    } else {
      ctx.fillStyle = META_THEME_COLORS.light;
    }
    ctx.fillRect(0, 0, width, height);

      const targetOffsetX = (mouse.current.x - centerX) * 0.5;
      const targetOffsetY = (mouse.current.y - centerY) * 0.5;

      cameraOffset.current.x += (targetOffsetX - cameraOffset.current.x) * STEER_SENSITIVITY;
      cameraOffset.current.y += (targetOffsetY - cameraOffset.current.y) * STEER_SENSITIVITY;

    particles.current.forEach((p) => {
      p.z -= Z_SPEED;

      if (p.z <= 0) {
        p.z = DEPTH;
        p.x = (Math.random() - 0.5) * width * 4;
        p.y = (Math.random() - 0.5) * height * 4;
        p.alpha = 0; 
      }

      const k = FOV / p.z;
      const x2d = (p.x - cameraOffset.current.x) * k + centerX;
      const y2d = (p.y - cameraOffset.current.y) * k + centerY;
      const size = Math.max(0, p.sizeBase * k * 0.5);

      const zNorm = p.z / DEPTH;
      let targetAlpha = 1;
      if (zNorm > 0.9) targetAlpha = (1 - zNorm) * 10;
      else if (zNorm < 0.2) targetAlpha = zNorm * 5;
      
      p.alpha += (targetAlpha - p.alpha) * 0.1;

      if (x2d >= 0 && x2d <= width && y2d >= 0 && y2d <= height) {
        ctx.beginPath();
        ctx.arc(x2d, y2d, size, 0, Math.PI * 2);
        const { r, g, b } = p.color;
        ctx.fillStyle = `rgba(${r}, ${g}, ${b}, ${p.alpha})`;
        ctx.fill();
      }
    });
  });

  return (
    <div ref={containerRef} className="absolute inset-0 z-0">
      <canvas ref={canvasRef} className="block w-full h-full" />
    </div>
  );
}

type Particle = {
  x: number;
  y: number;
  z: number;
  sizeBase: number;
  color: { r: number; g: number; b: number };
  alpha: number;
};
