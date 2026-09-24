"use client";

import { useActionState } from "react";
import { addRepAction } from "@/app/admin/reps/actions";

export function AddRepForm() {
  const [error, formAction, isPending] = useActionState(addRepAction, undefined);

  return (
    <form
      action={formAction}
      className="flex flex-wrap items-end gap-3 rounded-xl border border-gray-200 bg-white p-4 dark:border-gray-800 dark:bg-gray-900"
    >
      <label className="flex flex-col gap-1 text-xs text-gray-500">
        Name
        <input name="name" required className="rounded border border-gray-300 px-2 py-1.5 text-sm dark:border-gray-700 dark:bg-gray-800" />
      </label>
      <label className="flex flex-col gap-1 text-xs text-gray-500">
        Username
        <input name="username" required className="rounded border border-gray-300 px-2 py-1.5 text-sm dark:border-gray-700 dark:bg-gray-800" />
      </label>
      <label className="flex flex-col gap-1 text-xs text-gray-500">
        Password
        <input name="password" type="password" required minLength={6} className="rounded border border-gray-300 px-2 py-1.5 text-sm dark:border-gray-700 dark:bg-gray-800" />
      </label>
      <button
        type="submit"
        disabled={isPending}
        className="rounded-lg bg-blue-600 px-4 py-1.5 text-sm font-medium text-white disabled:opacity-60"
      >
        {isPending ? "Adding…" : "Add rep"}
      </button>
      {error && <p className="w-full text-sm text-red-600">{error}</p>}
    </form>
  );
}
