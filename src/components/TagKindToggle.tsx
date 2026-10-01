"use client";

import type { PhotoKind } from "@/lib/tagTypes";

interface TagKindToggleProps {
  kind: PhotoKind;
  onChange: (kind: PhotoKind) => void;
}

const OPTIONS: { value: PhotoKind; label: string }[] = [
  { value: "posm", label: "POSM" },
  { value: "category", label: "Category Shelf Display" },
  { value: "sku", label: "SKU" },
];

export function TagKindToggle({ kind, onChange }: TagKindToggleProps) {
  return (
    <div className="flex flex-col gap-2">
      <span className="text-sm font-medium text-gray-600 dark:text-gray-400">
        POSM, Category Shelf Display, or SKU?
      </span>
      <div className="flex flex-col gap-2">
        {OPTIONS.map((option) => (
          <button
            key={option.value}
            type="button"
            onClick={() => onChange(option.value)}
            className={`rounded-xl py-3 text-base font-semibold transition-colors ${
              kind === option.value
                ? "bg-blue-600 text-white"
                : "bg-gray-100 text-gray-800 dark:bg-gray-800 dark:text-gray-200"
            }`}
          >
            {option.label}
          </button>
        ))}
      </div>
    </div>
  );
}
