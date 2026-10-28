"use client";

import type { PranRelation } from "@/lib/tagTypes";

interface PranRelationToggleProps {
  pranRelation: PranRelation | null;
  onChange: (pranRelation: PranRelation) => void;
}

export function PranRelationToggle({ pranRelation, onChange }: PranRelationToggleProps) {
  return (
    <div className="flex flex-col gap-2">
      <span className="text-sm font-medium text-gray-600 dark:text-gray-400">Pran or Pran competitor?</span>
      <div className="grid grid-cols-2 gap-2">
        <button
          type="button"
          onClick={() => onChange("pran")}
          className={`rounded-xl py-3 text-base font-semibold transition-colors ${
            pranRelation === "pran"
              ? "bg-blue-600 text-white"
              : "bg-gray-100 text-gray-800 dark:bg-gray-800 dark:text-gray-200"
          }`}
        >
          Pran
        </button>
        <button
          type="button"
          onClick={() => onChange("competitor")}
          className={`rounded-xl py-3 text-base font-semibold transition-colors ${
            pranRelation === "competitor"
              ? "bg-amber-600 text-white"
              : "bg-gray-100 text-gray-800 dark:bg-gray-800 dark:text-gray-200"
          }`}
        >
          Pran Competitor
        </button>
      </div>
    </div>
  );
}
