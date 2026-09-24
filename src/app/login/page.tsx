"use client";

import { useActionState } from "react";
import { loginAction } from "./actions";

export default function LoginPage() {
  const [error, formAction, isPending] = useActionState(loginAction, undefined);

  return (
    <main className="flex min-h-dvh flex-col items-center justify-center bg-gray-50 px-4 dark:bg-gray-950">
      <div className="w-full max-w-sm">
        <h1 className="mb-8 text-center text-2xl font-semibold text-gray-900 dark:text-gray-100">
          Fieldlenz
        </h1>

        <form action={formAction} className="flex flex-col gap-4">
          <input
            name="username"
            type="text"
            autoComplete="username"
            placeholder="Username"
            required
            className="w-full rounded-xl border border-gray-300 bg-white px-4 py-4 text-lg text-gray-900 focus:border-blue-500 focus:outline-none dark:border-gray-700 dark:bg-gray-900 dark:text-gray-100"
          />
          <input
            name="password"
            type="password"
            autoComplete="current-password"
            placeholder="Password"
            required
            className="w-full rounded-xl border border-gray-300 bg-white px-4 py-4 text-lg text-gray-900 focus:border-blue-500 focus:outline-none dark:border-gray-700 dark:bg-gray-900 dark:text-gray-100"
          />

          {error && (
            <p className="text-center text-sm font-medium text-red-600" role="alert">
              {error}
            </p>
          )}

          <button
            type="submit"
            disabled={isPending}
            className="w-full rounded-xl bg-blue-600 px-4 py-4 text-lg font-semibold text-white active:bg-blue-700 disabled:opacity-60"
          >
            {isPending ? "Logging in…" : "Log in"}
          </button>
        </form>
      </div>
    </main>
  );
}
