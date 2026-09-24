import { prisma } from "@/lib/db";
import { AddRepForm } from "@/components/admin/AddRepForm";
import { toggleRepActiveAction, toggleRepAdminAction } from "./actions";

export default async function AdminRepsPage() {
  const reps = await prisma.rep.findMany({ orderBy: { createdAt: "asc" } });

  return (
    <div className="flex flex-col gap-4">
      <h1 className="text-lg font-semibold text-gray-900 dark:text-gray-100">Reps</h1>

      <AddRepForm />

      <div className="overflow-x-auto rounded-xl border border-gray-200 bg-white dark:border-gray-800 dark:bg-gray-900">
        <table className="w-full text-left text-sm">
          <thead className="border-b border-gray-200 text-xs uppercase text-gray-500 dark:border-gray-800">
            <tr>
              <th className="px-3 py-2">Name</th>
              <th className="px-3 py-2">Username</th>
              <th className="px-3 py-2">Active</th>
              <th className="px-3 py-2">Admin</th>
            </tr>
          </thead>
          <tbody>
            {reps.map((rep) => (
              <tr key={rep.id} className="border-b border-gray-100 dark:border-gray-800">
                <td className="px-3 py-2">{rep.name}</td>
                <td className="px-3 py-2">{rep.username}</td>
                <td className="px-3 py-2">
                  <form action={toggleRepActiveAction.bind(null, rep.id, !rep.active)}>
                    <button type="submit" className={rep.active ? "text-green-600" : "text-gray-400"}>
                      {rep.active ? "Active" : "Inactive"}
                    </button>
                  </form>
                </td>
                <td className="px-3 py-2">
                  <form action={toggleRepAdminAction.bind(null, rep.id, !rep.isAdmin)}>
                    <button type="submit" className={rep.isAdmin ? "text-blue-600" : "text-gray-400"}>
                      {rep.isAdmin ? "Admin" : "Rep"}
                    </button>
                  </form>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
