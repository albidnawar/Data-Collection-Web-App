import "dotenv/config";
import bcrypt from "bcryptjs";
import { prisma } from "../src/lib/db";

const DEFAULT_SHOP_TYPES = [
  "Supermarket",
  "Convenience Store",
  "Pharmacy",
  "Hypermarket",
  "Grocery Store",
  "Department Store",
  "Kiosk",
  "Wholesale / Cash & Carry",
  "Other",
];

const DEFAULT_PRODUCT_CATEGORIES = [
  "Beverage",
  "Commodities",
  "CSD",
  "Dairy",
  "Drinking Water",
  "Drinks",
  "Dry Cake",
  "ED & Juice Can",
  "Energy Drink",
  "Energy Drinks",
  "Hotfill",
  "Kitchen Additives",
  "KOFI HOUSE",
  "Lacchi",
  "Mango Bar",
  "Nata",
  "Others Item",
  "Packaged Food",
  "Powder",
  "Powder Drinks",
  "Tea",
  "Tetra Pack",
  "Trading",
  "WV",
  "WV & RW",
];

async function main() {
  for (const name of DEFAULT_SHOP_TYPES) {
    await prisma.shopType.upsert({
      where: { name },
      update: {},
      create: { name },
    });
  }
  console.log(`Seeded ${DEFAULT_SHOP_TYPES.length} shop types.`);

  for (const name of DEFAULT_PRODUCT_CATEGORIES) {
    await prisma.productCategory.upsert({
      where: { name },
      update: {},
      create: { name },
    });
  }
  console.log(`Seeded ${DEFAULT_PRODUCT_CATEGORIES.length} product categories.`);

  const adminUsername = process.env.SEED_ADMIN_USERNAME ?? "admin";
  const adminPassword = process.env.SEED_ADMIN_PASSWORD ?? "changeme123";

  const existingAdmin = await prisma.rep.findUnique({
    where: { username: adminUsername },
  });

  if (!existingAdmin) {
    const passwordHash = await bcrypt.hash(adminPassword, 10);
    await prisma.rep.create({
      data: {
        name: "Admin",
        username: adminUsername,
        passwordHash,
        isAdmin: true,
      },
    });
    console.log(`Created admin rep "${adminUsername}".`);
    if (!process.env.SEED_ADMIN_PASSWORD) {
      console.warn(
        `No SEED_ADMIN_PASSWORD set — using default password "${adminPassword}". Change it after first login, or set SEED_ADMIN_USERNAME/SEED_ADMIN_PASSWORD before seeding a real environment.`,
      );
    }
  } else {
    console.log(`Admin rep "${adminUsername}" already exists, skipping.`);
  }
}

main()
  .catch((error) => {
    console.error(error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
