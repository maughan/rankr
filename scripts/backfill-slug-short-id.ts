/**
 * Backfill short_id and slug for all List rows that don't have them yet.
 * Safe to run multiple times — skips rows that already have a short_id.
 *
 * Run: npx tsx scripts/backfill-slug-short-id.ts
 */

import "dotenv/config";
import { PrismaPg } from "@prisma/adapter-pg";
import { PrismaClient } from "../app/generated/prisma/client";
import { generateShortId, slugify } from "../lib/listUrl";

const adapter = new PrismaPg({ connectionString: process.env.DATABASE_URL! });
const prisma = new PrismaClient({ adapter });

async function main() {
  // Post-migration: short_id is NOT NULL on all rows. This script is now a no-op
  // but kept for reference. Fetch all and skip any that already have a short_id.
  const all = await prisma.list.findMany({ select: { id: true, title: true, short_id: true } });
  const lists = all.filter((l) => !l.short_id);

  console.log(`Backfilling ${lists.length} lists…`);

  let done = 0;
  let retries = 0;

  for (const list of lists) {
    const slug = slugify(list.title);
    let short_id: string | null = null;

    // Retry loop guards against the astronomically unlikely collision
    for (let attempt = 0; attempt < 10; attempt++) {
      const candidate = generateShortId();
      const existing = await prisma.list.findUnique({ where: { short_id: candidate } });
      if (!existing) {
        short_id = candidate;
        break;
      }
      retries++;
    }

    if (!short_id) {
      console.error(`  ✗ Could not generate unique short_id for list ${list.id} after 10 attempts`);
      continue;
    }

    await prisma.list.update({
      where: { id: list.id },
      data: { short_id, slug },
    });

    done++;
    console.log(`  [${done}/${lists.length}] #${list.id} → ${slug}-${short_id}`);
  }

  if (retries > 0) console.log(`  (${retries} collision retries)`);
  console.log("Done.");
}

main()
  .catch((e) => { console.error(e); process.exit(1); })
  .finally(() => prisma.$disconnect());
