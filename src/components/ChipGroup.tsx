"use client";

import { useMemo, useState } from "react";
import { findSimilarTags } from "@/lib/similarTags";

export interface ChipOption {
  id: string | null;
  name: string;
}

interface ChipGroupProps {
  label: string;
  options: ChipOption[];
  selected: string | null;
  onSelect: (name: string) => void;
  onAddNew: (name: string) => void;
}

export function ChipGroup({ label, options, selected, onSelect, onAddNew }: ChipGroupProps) {
  const [adding, setAdding] = useState(false);
  const [draft, setDraft] = useState("");
  const [usedExisting, setUsedExisting] = useState<string | null>(null);

  const { exact, suggestions } = useMemo(() => findSimilarTags(draft, options), [draft, options]);

  const selectExisting = (name: string) => {
    onSelect(name);
    setUsedExisting(name);
    setDraft("");
    setAdding(false);
  };

  const submitNew = () => {
    const trimmed = draft.trim();
    if (trimmed.length === 0) {
      setAdding(false);
      return;
    }
    if (exact) {
      selectExisting(exact.name);
      return;
    }
    onAddNew(trimmed);
    onSelect(trimmed);
    setDraft("");
    setAdding(false);
  };

  return (
    <div className="flex flex-col gap-2">
      <span className="text-sm font-medium text-gray-600 dark:text-gray-400">{label}</span>
      <div className="flex flex-wrap gap-2">
        {options.map((option) => (
          <button
            key={option.name}
            type="button"
            onClick={() => onSelect(option.name)}
            className={`rounded-full px-4 py-2 text-sm font-medium transition-colors ${
              selected === option.name
                ? "bg-blue-600 text-white"
                : "bg-gray-100 text-gray-800 active:bg-gray-200 dark:bg-gray-800 dark:text-gray-200"
            }`}
          >
            {option.name}
          </button>
        ))}

        {adding ? (
          <span className="flex items-center gap-1">
            <input
              autoFocus
              value={draft}
              onChange={(e) => {
                setDraft(e.target.value);
                setUsedExisting(null);
              }}
              onKeyDown={(e) => {
                if (e.key === "Enter") submitNew();
                if (e.key === "Escape") setAdding(false);
              }}
              onBlur={submitNew}
              placeholder="New value"
              className="w-32 rounded-full border border-gray-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none dark:border-gray-700 dark:bg-gray-900"
            />
          </span>
        ) : (
          <button
            type="button"
            onClick={() => {
              setAdding(true);
              setUsedExisting(null);
            }}
            className="rounded-full border border-dashed border-gray-400 px-4 py-2 text-sm font-medium text-gray-500 active:bg-gray-100 dark:border-gray-600 dark:text-gray-400"
          >
            + Add new
          </button>
        )}
      </div>

      {adding && exact && (
        <span className="text-xs text-gray-500 dark:text-gray-400">
          Matches existing &ldquo;{exact.name}&rdquo;. Press Enter to use it.
        </span>
      )}

      {adding && !exact && suggestions.length > 0 && (
        <div className="flex flex-wrap items-center gap-2">
          <span className="text-xs text-gray-500 dark:text-gray-400">Did you mean:</span>
          {suggestions.map((s) => (
            <button
              key={s.name}
              type="button"
              onMouseDown={(e) => e.preventDefault()}
              onClick={() => selectExisting(s.name)}
              className="rounded-full bg-amber-100 px-3 py-1 text-xs font-medium text-amber-800 dark:bg-amber-900 dark:text-amber-200"
            >
              {s.name}
            </button>
          ))}
        </div>
      )}

      {usedExisting && (
        <span className="text-xs text-gray-500 dark:text-gray-400">Using existing &ldquo;{usedExisting}&rdquo;.</span>
      )}
    </div>
  );
}
