import { prisma } from "@/lib/db";
import { toggleTagActiveAction, renameTagAction } from "./actions";
import type { TagType } from "@/lib/tagTypes";

interface TagRow {
  id: string;
  name: string;
  active: boolean;
}

function TagSection({ title, type, items }: { title: string; type: TagType; items: TagRow[] }) {
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
          </li>
        ))}
      </ul>
    </div>
  );
}

export default async function AdminTagsPage() {
  const [brands, categories, posmTypes, shopTypes] = await Promise.all([
    prisma.brand.findMany({ orderBy: { name: "asc" } }),
    prisma.category.findMany({ orderBy: { name: "asc" } }),
    prisma.posmType.findMany({ orderBy: { name: "asc" } }),
    prisma.shopType.findMany({ orderBy: { name: "asc" } }),
  ]);

  return (
    <div className="flex flex-col gap-4">
      <h1 className="text-lg font-semibold text-gray-900 dark:text-gray-100">Tags</h1>
      <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
        <TagSection title="Brands" type="brand" items={brands} />
        <TagSection title="Categories" type="category" items={categories} />
        <TagSection title="POSM Types" type="posmType" items={posmTypes} />
        <TagSection title="Shop Types" type="shopType" items={shopTypes} />
      </div>
    </div>
  );
}
