"use client";

interface PosmToggleProps {
  value: boolean;
  onChange: (value: boolean) => void;
}

export function PosmToggle({ value, onChange }: PosmToggleProps) {
  return (
    <div className="flex flex-col gap-2">
      <span className="text-sm font-medium text-gray-600 dark:text-gray-400">POSM?</span>
      <div className="grid grid-cols-2 gap-2">
        <button
          type="button"
          onClick={() => onChange(true)}
          className={`rounded-xl py-3 text-base font-semibold transition-colors ${
            value
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
            !value
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
