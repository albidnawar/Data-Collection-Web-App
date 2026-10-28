"use client";

import { useTransition } from "react";
import { updateRepRoleAction } from "@/app/admin/reps/actions";
import type { RepRole } from "@/generated/prisma/client";

export function RoleSelect({ repId, role }: { repId: string; role: RepRole }) {
  const [pending, startTransition] = useTransition();

  return (
    <select
      value={role}
      disabled={pending}
      onChange={(e) => {
        const nextRole = e.target.value;
        startTransition(async () => {
          await updateRepRoleAction(repId, nextRole);
        });
      }}
      className="rounded border border-gray-300 px-2 py-1 text-xs dark:border-gray-700 dark:bg-gray-800"
    >
      <option value="rep">Rep</option>
      <option value="admin">Admin</option>
      <option value="pran">Pran</option>
    </select>
  );
}
