export function normalizeTagName(name: string): string {
  return name.trim().toLowerCase().replace(/\s+/g, " ");
}

export function levenshtein(a: string, b: string): number {
  if (a === b) return 0;
  if (a.length === 0) return b.length;
  if (b.length === 0) return a.length;

  let prevRow = Array.from({ length: b.length + 1 }, (_, i) => i);

  for (let i = 1; i <= a.length; i++) {
    const currentRow = [i];
    for (let j = 1; j <= b.length; j++) {
      const cost = a[i - 1] === b[j - 1] ? 0 : 1;
      currentRow.push(Math.min(currentRow[j - 1] + 1, prevRow[j] + 1, prevRow[j - 1] + cost));
    }
    prevRow = currentRow;
  }

  return prevRow[b.length];
}

interface NamedOption {
  name: string;
}

interface SimilarTagsResult<T extends NamedOption> {
  exact: T | null;
  suggestions: T[];
}

const MAX_SUGGESTIONS = 3;

export function findSimilarTags<T extends NamedOption>(draft: string, options: T[]): SimilarTagsResult<T> {
  const normalizedDraft = normalizeTagName(draft);
  if (normalizedDraft.length === 0) return { exact: null, suggestions: [] };

  const exact = options.find((o) => normalizeTagName(o.name) === normalizedDraft) ?? null;
  if (exact) return { exact, suggestions: [] };

  const suggestions = options
    .map((o) => {
      const normalizedOption = normalizeTagName(o.name);
      const distance = levenshtein(normalizedDraft, normalizedOption);
      const threshold = Math.max(2, Math.ceil(normalizedOption.length * 0.3));
      return { option: o, distance, threshold };
    })
    .filter(({ distance, threshold }) => distance > 0 && distance <= threshold)
    .sort((a, b) => a.distance - b.distance)
    .slice(0, MAX_SUGGESTIONS)
    .map(({ option }) => option);

  return { exact: null, suggestions };
}
