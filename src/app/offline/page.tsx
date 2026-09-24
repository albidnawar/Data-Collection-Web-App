export default function OfflinePage() {
  return (
    <main className="flex min-h-dvh flex-col items-center justify-center gap-3 bg-gray-50 px-6 text-center dark:bg-gray-950">
      <h1 className="text-xl font-semibold text-gray-900 dark:text-gray-100">You&apos;re offline</h1>
      <p className="max-w-xs text-sm text-gray-500 dark:text-gray-400">
        This page hasn&apos;t been loaded yet, so it needs a connection the first time. Once
        you&apos;ve opened Fieldlenz online, it keeps working offline.
      </p>
    </main>
  );
}
