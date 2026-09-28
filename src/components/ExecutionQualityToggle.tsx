"use client";

interface ExecutionQualityToggleProps {
  isGoodExecution: boolean | null;
  onChange: (isGoodExecution: boolean) => void;
}

export function ExecutionQualityToggle({ isGoodExecution, onChange }: ExecutionQualityToggleProps) {
  return (
    <div className="flex flex-col gap-2">
      <span className="text-sm font-medium text-gray-600 dark:text-gray-400">Good or bad execution?</span>
      <div className="grid grid-cols-2 gap-2">
        <button
          type="button"
          onClick={() => onChange(true)}
          className={`rounded-xl py-3 text-base font-semibold transition-colors ${
            isGoodExecution === true
              ? "bg-green-600 text-white"
              : "bg-gray-100 text-gray-800 dark:bg-gray-800 dark:text-gray-200"
          }`}
        >
          Good Execution
        </button>
        <button
          type="button"
          onClick={() => onChange(false)}
          className={`rounded-xl py-3 text-base font-semibold transition-colors ${
            isGoodExecution === false
              ? "bg-red-600 text-white"
              : "bg-gray-100 text-gray-800 dark:bg-gray-800 dark:text-gray-200"
          }`}
        >
          Bad Execution
        </button>
      </div>
    </div>
  );
}
