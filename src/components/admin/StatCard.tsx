export function StatCard({ label, value, tone }: { label: string; value: number | string; tone?: "default" | "warning" }) {
  return (
    <div className="rounded-xl border border-gray-200 bg-white p-4 dark:border-gray-800 dark:bg-gray-900">
      <p className="text-sm text-gray-500 dark:text-gray-400">{label}</p>
      <p
        className={`mt-1 text-2xl font-semibold ${
          tone === "warning" ? "text-amber-600" : "text-gray-900 dark:text-gray-100"
        }`}
      >
        {value}
      </p>
    </div>
  );
}
