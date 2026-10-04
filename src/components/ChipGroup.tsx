"use client";

import { useMemo, useRef, useState } from "react";
import { findSimilarTags } from "@/lib/similarTags";

export interface ChipOption {
  id: string | null;
  name: string;
}

type DeleteResult = { ok: true } | { ok: false; message: string };

interface ChipGroupProps {
  label: string;
  options: ChipOption[];
  selected: string | null;
  onSelect: (name: string) => void;
  onAddNew: (name: string) => void;
  onDelete: (option: ChipOption) => Promise<DeleteResult>;
}

// Above this many options, a wrapped grid turns into a lot of vertical
// scrolling and eye-hunting. Switch to a search box + a horizontally
// scrollable "quick" row instead, so the common case (reusing a recent
// value) is still a single tap, and the long tail is a few keystrokes away.
const SEARCH_THRESHOLD = 10;

// How long a press has to be held before it counts as "long press" instead
// of a normal tap-to-select. Matches typical iOS/Android long-press timing.
const LONG_PRESS_MS = 500;

function Chip({
  option,
  isSelected,
  isPendingDelete,
  onClick,
  onLongPress,
  shrink,
}: {
  option: ChipOption;
  isSelected: boolean;
  isPendingDelete: boolean;
  onClick: () => void;
  onLongPress: () => void;
  shrink?: boolean;
}) {
  const timerRef = useRef<number | null>(null);
  const firedRef = useRef(false);

  const clearTimer = () => {
    if (timerRef.current !== null) {
      window.clearTimeout(timerRef.current);
      timerRef.current = null;
    }
  };

  const start = () => {
    firedRef.current = false;
    clearTimer();
    timerRef.current = window.setTimeout(() => {
      firedRef.current = true;
      onLongPress();
    }, LONG_PRESS_MS);
  };

  return (
    <button
      type="button"
      onClick={() => {
        // A long press already fired its own action — don't also treat the
        // release as a tap-to-select.
        if (firedRef.current) {
          firedRef.current = false;
          return;
        }
        onClick();
      }}
      onPointerDown={start}
      onPointerUp={clearTimer}
      onPointerLeave={clearTimer}
      onPointerMove={clearTimer}
      onContextMenu={(e) => e.preventDefault()}
      className={`${shrink ? "shrink-0" : ""} rounded-full px-4 py-2 text-sm font-medium whitespace-nowrap transition-colors select-none ${
        isPendingDelete
          ? "bg-red-50 text-red-700 ring-2 ring-red-500 dark:bg-red-950 dark:text-red-300"
          : isSelected
            ? "bg-blue-600 text-white"
            : "bg-gray-100 text-gray-800 active:bg-gray-200 dark:bg-gray-800 dark:text-gray-200"
      }`}
    >
      {option.name}
    </button>
  );
}

function DeleteConfirmBar({
  pending,
  deleting,
  error,
  onConfirm,
  onCancel,
}: {
  pending: ChipOption;
  deleting: boolean;
  error: string | null;
  onConfirm: () => void;
  onCancel: () => void;
}) {
  return (
    <div className="flex flex-col gap-1.5 rounded-xl bg-red-50 p-3 dark:bg-red-950">
      <div className="flex items-center gap-2">
        <span className="flex-1 text-sm text-red-800 dark:text-red-200">
          Delete &ldquo;{pending.name}&rdquo;?
        </span>
        <button
          type="button"
          disabled={deleting}
          onClick={onConfirm}
          className="rounded-lg bg-red-600 px-3 py-2 text-sm font-semibold text-white disabled:opacity-50"
        >
          {deleting ? "Deleting…" : "Delete"}
        </button>
        <button
          type="button"
          disabled={deleting}
          onClick={onCancel}
          className="rounded-lg bg-gray-200 px-3 py-2 text-sm font-medium text-gray-700 disabled:opacity-50 dark:bg-gray-700 dark:text-gray-200"
        >
          Cancel
        </button>
      </div>
      {error && <span className="text-xs text-red-700 dark:text-red-300">{error}</span>}
    </div>
  );
}

export function ChipGroup({ label, options, selected, onSelect, onAddNew, onDelete }: ChipGroupProps) {
  const [adding, setAdding] = useState(false);
  const [draft, setDraft] = useState("");
  const [usedExisting, setUsedExisting] = useState<string | null>(null);
  const [search, setSearch] = useState("");

  const [pendingDelete, setPendingDelete] = useState<ChipOption | null>(null);
  const [deleting, setDeleting] = useState(false);
  const [deleteError, setDeleteError] = useState<string | null>(null);

  const requestDelete = (option: ChipOption) => {
    setPendingDelete(option);
    setDeleteError(null);
  };

  const cancelDelete = () => {
    setPendingDelete(null);
    setDeleteError(null);
  };

  const confirmDelete = async () => {
    if (!pendingDelete) return;
    setDeleting(true);
    setDeleteError(null);
    const result = await onDelete(pendingDelete);
    setDeleting(false);
    if (result.ok) {
      setPendingDelete(null);
    } else {
      setDeleteError(result.message);
    }
  };

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
                  option={option}
                  isSelected={selected === option.name}
                  isPendingDelete={pendingDelete?.name === option.name}
                  onClick={() => selectFromSearch(option.name)}
                  onLongPress={() => requestDelete(option)}
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
                option={option}
                isSelected={selected === option.name}
                isPendingDelete={pendingDelete?.name === option.name}
                onClick={() => onSelect(option.name)}
                onLongPress={() => requestDelete(option)}
                shrink
              />
            ))}
          </div>
        )}

        {pendingDelete && (
          <DeleteConfirmBar
            pending={pendingDelete}
            deleting={deleting}
            error={deleteError}
            onConfirm={confirmDelete}
            onCancel={cancelDelete}
          />
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
          <Chip
            key={option.name}
            option={option}
            isSelected={selected === option.name}
            isPendingDelete={pendingDelete?.name === option.name}
            onClick={() => onSelect(option.name)}
            onLongPress={() => requestDelete(option)}
          />
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

      {pendingDelete && (
        <DeleteConfirmBar
          pending={pendingDelete}
          deleting={deleting}
          error={deleteError}
          onConfirm={confirmDelete}
          onCancel={cancelDelete}
        />
      )}
    </div>
  );
}
