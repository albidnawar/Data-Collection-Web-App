"use client";

interface ShelfVacancyToggleProps {
  shelfVacancy: boolean | null;
  onChange: (shelfVacancy: boolean) => void;
}

export function ShelfVacancyToggle({ shelfVacancy, onChange }: ShelfVacancyToggleProps) {
  return (
    <div className="flex flex-col gap-2">
      <span className="text-sm font-medium text-gray-600 dark:text-gray-400">Shelf vacancy? (optional)</span>
      <div className="grid grid-cols-2 gap-2">
        <button
          type="button"
          onClick={() => onChange(true)}
          className={`rounded-xl py-3 text-base font-semibold transition-colors ${
            shelfVacancy === true
              ? "bg-blue-600 text-white"
              : "bg-gray-100 text-gray-800 dark:bg-gray-800 dark:text-gray-200"
          }`}
        >
          Yes
        </button>
        <button
          type="button"
          onClick={() => onChange(false)}
          className={`rounded-xl py-3 text-base font-semibold transition-colors ${
            shelfVacancy === false
              ? "bg-blue-600 text-white"
              : "bg-gray-100 text-gray-800 dark:bg-gray-800 dark:text-gray-200"
          }`}
        >
          No
        </button>
      </div>
    </div>
  );
}
