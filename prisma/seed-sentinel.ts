/**
 * Creates the [deleted] sentinel user if it doesn't already exist.
 * Run once: npx tsx prisma/seed-sentinel.ts
 *
 * The sentinel is the transfer target for public lists and rankings
 * that belong to hard-deleted accounts. Its ID is stored in
 * DELETED_SENTINEL_USER_ID env var so runtime code never queries for it.
 */
import "dotenv/config";
import { PrismaPg } from "@prisma/adapter-pg";
import { PrismaClient } from "../app/generated/prisma/client";

const adapter = new PrismaPg({ connectionString: process.env.DATABASE_URL! });
const prisma = new PrismaClient({ adapter });

async function main() {
  const existing = await (prisma.user as any).findUnique({
    where: { username: "[deleted]" },
  });

  if (existing) {
    console.log(`Sentinel already exists — id=${existing.id}`);
    console.log(`Set DELETED_SENTINEL_USER_ID=${existing.id} in your .env`);
    return;
  }

  const sentinel = await (prisma.user as any).create({
    data: {
      username: "[deleted]",
      password: "",
      email: null,
      display_name: "Deleted user",
      role: "user",
    },
  });

  console.log(`Sentinel created — id=${sentinel.id}`);
  console.log(`Add this to your .env:`);
  console.log(`DELETED_SENTINEL_USER_ID=${sentinel.id}`);
}

main()
  .catch((e) => { console.error(e); process.exit(1); })
  .finally(() => prisma.$disconnect());
