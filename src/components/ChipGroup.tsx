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

// Above this many options, a wrapped grid turns into a lot of vertical
// scrolling and eye-hunting. Switch to a search box + a horizontally
// scrollable "quick" row instead, so the common case (reusing a recent
// value) is still a single tap, and the long tail is a few keystrokes away.
const SEARCH_THRESHOLD = 10;

function Chip({ name, isSelected, onClick, shrink }: { name: string; isSelected: boolean; onClick: () => void; shrink?: boolean }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`${shrink ? "shrink-0" : ""} rounded-full px-4 py-2 text-sm font-medium whitespace-nowrap transition-colors ${
        isSelected
          ? "bg-blue-600 text-white"
          : "bg-gray-100 text-gray-800 active:bg-gray-200 dark:bg-gray-800 dark:text-gray-200"
      }`}
    >
      {name}
    </button>
  );
}

export function ChipGroup({ label, options, selected, onSelect, onAddNew }: ChipGroupProps) {
  const [adding, setAdding] = useState(false);
  const [draft, setDraft] = useState("");
  const [usedExisting, setUsedExisting] = useState<string | null>(null);
  const [search, setSearch] = useState("");

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

  // --- Long-list mode: search box + horizontally scrollable quick row ---

  const normalizedSearch = search.trim().toLowerCase();
  const searchResults = useMemo(
    () => (normalizedSearch ? options.filter((o) => o.name.toLowerCase().includes(normalizedSearch)) : []),
    [options, normalizedSearch],
  );
  const { exact: searchExact, suggestions: searchSuggestions } = useMemo(
    () => findSimilarTags(search, options),
    [search, options],
  );

  // Most-recently-used order (as passed in via `options`), with the current
  // selection pinned to the front so it's always visible without scrolling.
  const quickOptions = useMemo(() => {
    if (!selected) return options;
    const idx = options.findIndex((o) => o.name === selected);
    if (idx <= 0) return options;
    const selectedOption = options[idx];
    return [selectedOption, ...options.slice(0, idx), ...options.slice(idx + 1)];
  }, [options, selected]);

  const selectFromSearch = (name: string) => {
    onSelect(name);
    setSearch("");
  };

  const submitSearchAsNew = () => {
    const trimmed = search.trim();
    if (trimmed.length === 0) return;
    if (searchExact) {
      selectFromSearch(searchExact.name);
      return;
    }
    onAddNew(trimmed);
    onSelect(trimmed);
    setSearch("");
  };

  if (options.length > SEARCH_THRESHOLD) {
    return (
      <div className="flex flex-col gap-2">
        <span className="text-sm font-medium text-gray-600 dark:text-gray-400">{label}</span>
        <input
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter") submitSearchAsNew();
            if (e.key === "Escape") setSearch("");
          }}
          placeholder={`Search or add ${label.toLowerCase()}…`}
          className="w-full rounded-xl border border-gray-300 bg-white px-4 py-2.5 text-sm text-gray-900 focus:border-blue-500 focus:outline-none dark:border-gray-700 dark:bg-gray-900 dark:text-gray-100"
        />

        {normalizedSearch ? (
          <div className="flex flex-col gap-2">
            <div className="flex flex-wrap gap-2">
              {searchResults.map((option) => (
                <Chip
                  key={option.name}
                  name={option.name}
                  isSelected={selected === option.name}
                  onClick={() => selectFromSearch(option.name)}
                />
              ))}
              {!searchExact && (
                <button
                  type="button"
                  onClick={submitSearchAsNew}
                  className="rounded-full border border-dashed border-gray-400 px-4 py-2 text-sm font-medium text-gray-500 active:bg-gray-100 dark:border-gray-600 dark:text-gray-400"
                >
                  + Add &ldquo;{search.trim()}&rdquo;
                </button>
              )}
            </div>
            {searchResults.length === 0 && searchSuggestions.length > 0 && (
              <div className="flex flex-wrap items-center gap-2">
                <span className="text-xs text-gray-500 dark:text-gray-400">Did you mean:</span>
                {searchSuggestions.map((s) => (
                  <button
                    key={s.name}
                    type="button"
                    onClick={() => selectFromSearch(s.name)}
                    className="rounded-full bg-amber-100 px-3 py-1 text-xs font-medium text-amber-800 dark:bg-amber-900 dark:text-amber-200"
                  >
                    {s.name}
                  </button>
                ))}
              </div>
            )}
          </div>
        ) : (
          <div className="-mx-1 flex gap-2 overflow-x-auto px-1 pb-1">
            {quickOptions.map((option) => (
              <Chip
                key={option.name}
                name={option.name}
                isSelected={selected === option.name}
                onClick={() => onSelect(option.name)}
                shrink
              />
            ))}
          </div>
        )}
      </div>
    );
  }

  // --- Short-list mode: unchanged wrapped grid ---

  return (
    <div className="flex flex-col gap-2">
      <span className="text-sm font-medium text-gray-600 dark:text-gray-400">{label}</span>
      <div className="flex flex-wrap gap-2">
        {options.map((option) => (
          <Chip key={option.name} name={option.name} isSelected={selected === option.name} onClick={() => onSelect(option.name)} />
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
