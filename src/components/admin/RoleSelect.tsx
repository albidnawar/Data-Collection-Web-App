"use client";

import { useTransition } from "react";
import { toggleRepAdminAction } from "@/app/admin/reps/actions";

export function RoleSelect({ repId, isAdmin }: { repId: string; isAdmin: boolean }) {
  const [pending, startTransition] = useTransition();

  return (
    <select
      value={isAdmin ? "admin" : "rep"}
      disabled={pending}
      onChange={(e) => {
        const nextIsAdmin = e.target.value === "admin";
        startTransition(async () => {
          await toggleRepAdminAction(repId, nextIsAdmin);
        });
      }}
      className="rounded border border-gray-300 px-2 py-1 text-xs dark:border-gray-700 dark:bg-gray-800"
    >
      <option value="rep">Rep</option>
      <option value="admin">Admin</option>
    </select>
  );
}
