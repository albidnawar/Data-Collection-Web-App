"use client";

import { useState } from "react";

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

  const submitNew = () => {
    const trimmed = draft.trim();
    if (trimmed.length === 0) {
      setAdding(false);
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
              onChange={(e) => setDraft(e.target.value)}
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
            onClick={() => setAdding(true)}
            className="rounded-full border border-dashed border-gray-400 px-4 py-2 text-sm font-medium text-gray-500 active:bg-gray-100 dark:border-gray-600 dark:text-gray-400"
          >
            + Add new
          </button>
        )}
      </div>
    </div>
  );
}
