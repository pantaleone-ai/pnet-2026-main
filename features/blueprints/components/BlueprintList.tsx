"use client";

import BackgroundDots from "@/features/common/components/BackgroundDots";
import BlueprintCard from "@/features/blueprints/components/BlueprintCard";
import type { BlueprintType } from "@/features/blueprints/types/BlueprintType";

interface BlueprintListProps {
  blueprints: Omit<BlueprintType, "body">[];
}

export default function BlueprintList({ blueprints }: BlueprintListProps) {
  return (
    <div className="relative mx-auto max-w-7xl px-6 py-8 md:py-10 lg:px-8">
      <BackgroundDots gridId="blueprints" className="text-gray-200/80" />
      <div className="xl mx-auto grid max-w-5xl grid-cols-1 gap-x-8 gap-y-8 lg:mx-0 lg:max-w-none lg:grid-cols-3">
        {blueprints.map((blueprint, index) => (
          <BlueprintCard
            key={blueprint.slug}
            blueprint={blueprint}
            index={index}
          />
        ))}
      </div>
    </div>
  );
}
