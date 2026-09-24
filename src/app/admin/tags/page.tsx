import { prisma } from "@/lib/db";
import { toggleTagActiveAction, renameTagAction } from "./actions";
import { AddTagForm } from "@/components/admin/AddTagForm";
import { TagDeleteControl } from "@/components/admin/TagDeleteControl";
import { RerunSyncButton } from "@/components/admin/RerunSyncButton";
import type { TagType } from "@/lib/tagTypes";

interface TagRow {
  id: string;
  name: string;
  active: boolean;
}

function TagSection({ title, type, label, items }: { title: string; type: TagType; label: string; items: TagRow[] }) {
  return (
    <div className="rounded-xl border border-gray-200 bg-white p-4 dark:border-gray-800 dark:bg-gray-900">
      <h2 className="mb-3 text-sm font-semibold text-gray-900 dark:text-gray-100">{title}</h2>
      <ul className="flex flex-col gap-2">
        {items.length === 0 && <li className="text-sm text-gray-500">None yet.</li>}
        {items.map((item) => (
          <li key={item.id} className="flex items-center gap-3">
            <form action={renameTagAction.bind(null, type, item.id)} className="flex flex-1 gap-2">
              <input
                name="name"
                defaultValue={item.name}
                className="flex-1 rounded border border-gray-300 px-2 py-1 text-sm dark:border-gray-700 dark:bg-gray-800"
              />
              <button type="submit" className="rounded bg-gray-900 px-3 py-1 text-xs font-medium text-white dark:bg-gray-100 dark:text-gray-900">
                Save
              </button>
            </form>
            <form action={toggleTagActiveAction.bind(null, type, item.id, !item.active)}>
              <button type="submit" className={`text-xs font-medium ${item.active ? "text-green-600" : "text-gray-400"}`}>
                {item.active ? "Active" : "Inactive"}
              </button>
            </form>
            <TagDeleteControl
              type={type}
              id={item.id}
              otherOptions={items.filter((o) => o.id !== item.id).map((o) => ({ id: o.id, name: o.name }))}
            />
          </li>
        ))}
      </ul>
      <div className="mt-3 border-t border-gray-100 pt-3 dark:border-gray-800">
        <AddTagForm type={type} label={label} />
      </div>
    </div>
  );
}

export default async function AdminTagsPage() {
  const [brands, categories, posmTypes, shopTypes, pendingCount] = await Promise.all([
    prisma.brand.findMany({ orderBy: { name: "asc" } }),
    prisma.category.findMany({ orderBy: { name: "asc" } }),
    prisma.posmType.findMany({ orderBy: { name: "asc" } }),
    prisma.shopType.findMany({ orderBy: { name: "asc" } }),
    prisma.photoRecord.count({ where: { filenameSyncPending: true } }),
  ]);

  return (
    <div className="flex flex-col gap-4">
      <h1 className="text-lg font-semibold text-gray-900 dark:text-gray-100">Tags</h1>
      <RerunSyncButton pendingCount={pendingCount} />
      <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
        <TagSection title="Brands" type="brand" label="brand" items={brands} />
        <TagSection title="Categories" type="category" label="category" items={categories} />
        <TagSection title="POSM Types" type="posmType" label="POSM type" items={posmTypes} />
        <TagSection title="Shop Types" type="shopType" label="shop type" items={shopTypes} />
      </div>
    </div>
  );
}
