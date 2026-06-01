/**
 * One-time fix: regenerates short_ids for the onboarding starter lists.
 * The seed script used Math.random().toString(36) which produces 7-char IDs
 * from the wrong alphabet. The router requires 8-char nanoid IDs.
 *
 * Run: npx tsx scripts/fix-onboarding-short-ids.ts
 */

import "dotenv/config";
import { PrismaPg } from "@prisma/adapter-pg";
import { PrismaClient } from "../app/generated/prisma/client";
import { generateShortId, isValidShortId } from "../lib/listUrl";

const adapter = new PrismaPg({ connectionString: process.env.DATABASE_URL! });
const prisma = new PrismaClient({ adapter });

async function main() {
  const lists = await prisma.list.findMany({
    where: { createdBy: { username: "rankr_curator" } },
    select: { id: true, short_id: true, title: true },
  });

  for (const list of lists) {
    if (isValidShortId(list.short_id ?? "")) {
      console.log(`· ${list.title} — short_id OK (${list.short_id})`);
      continue;
    }

    // Generate a unique short_id not already in use.
    let newId: string;
    do {
      newId = generateShortId();
      const clash = await prisma.list.findUnique({ where: { short_id: newId } });
      if (!clash) break;
    } while (true);

    await prisma.list.update({
      where: { id: list.id },
      data: { short_id: newId },
    });

    console.log(`✔ ${list.title}: ${list.short_id} → ${newId}`);
  }

  console.log("\nDone.");
}

main()
  .catch((e) => { console.error(e); process.exit(1); })
  .finally(() => prisma.$disconnect());
