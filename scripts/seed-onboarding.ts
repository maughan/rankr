/**
 * Seeds the onboarding starter lists.
 *
 * Creates a curator account (if absent), one public list per topic with
 * 8–10 items, and the corresponding OnboardingStarter rows.
 *
 * Safe to re-run — skips topics that already have an active starter entry.
 *
 * Run:
 *   npx tsx scripts/seed-onboarding.ts
 */

import "dotenv/config";
import argon2 from "argon2";
import { PrismaPg } from "@prisma/adapter-pg";
import { PrismaClient } from "../app/generated/prisma/client";
import { generateShortId, slugify as libSlugify } from "../lib/listUrl";

const adapter = new PrismaPg({ connectionString: process.env.DATABASE_URL! });
const prisma = new PrismaClient({ adapter });

// ── Helpers ───────────────────────────────────────────────────────────────────

// Use the same helpers as the app so short_ids and slugs are always compatible.
const slugify = libSlugify;

// Tier IDs 1–8 are the global shared tier records (S/A/B/C/D/F + extras).
const TIER_CONNECTS = [1, 2, 3, 4, 5, 6, 7, 8].map((id) => ({ id }));

// ── Starter list definitions ──────────────────────────────────────────────────

interface StarterDef {
  topic: string;
  title: string;
  description: string;
  category: string;
  items: string[];
}

const STARTERS: StarterDef[] = [
  {
    topic: "chocolate",
    title: "Best Chocolate Bars",
    description: "Kit Kat vs Snickers. It's personal.",
    category: "food",
    items: [
      "Kit Kat",
      "Snickers",
      "Twix",
      "Reese's Cups",
      "Mars",
      "Milky Way",
      "Bounty",
      "Crunchie",
      "Maltesers",
      "Toblerone",
    ],
  },
  {
    topic: "fast-food",
    title: "Best Fast Food Chains",
    description: "Golden arches or golden ticket?",
    category: "food",
    items: [
      "McDonald's",
      "Burger King",
      "KFC",
      "Subway",
      "Pizza Hut",
      "Domino's",
      "Taco Bell",
      "Wendy's",
      "Five Guys",
      "Nando's",
    ],
  },
  {
    topic: "pokemon",
    title: "Best Gen 1 Pokémon",
    description: "No arguments. Just vibes.",
    category: "gaming",
    items: [
      "Pikachu",
      "Charizard",
      "Mewtwo",
      "Gengar",
      "Snorlax",
      "Eevee",
      "Bulbasaur",
      "Squirtle",
      "Jigglypuff",
      "Blastoise",
    ],
  },
  {
    topic: "marvel",
    title: "Best MCU Movies",
    description: "Which hit different. Which didn't.",
    category: "film",
    items: [
      "Avengers: Endgame",
      "Iron Man",
      "Guardians of the Galaxy",
      "Thor: Ragnarok",
      "Spider-Man: No Way Home",
      "Captain America: Civil War",
      "Black Panther",
      "Avengers: Infinity War",
      "Doctor Strange",
      "Ant-Man",
    ],
  },
  {
    topic: "streaming",
    title: "Best Streaming Services",
    description: "Your actual watch time doesn't lie.",
    category: "tv",
    items: [
      "Netflix",
      "Disney+",
      "HBO Max",
      "Amazon Prime Video",
      "Apple TV+",
      "Hulu",
      "Peacock",
      "Paramount+",
    ],
  },
  {
    topic: "pizza",
    title: "Best Pizza Toppings",
    description: "Pineapple included. Brace yourself.",
    category: "food",
    items: [
      "Pepperoni",
      "Extra Cheese",
      "BBQ Chicken",
      "Hawaiian",
      "Margherita",
      "Nduja",
      "Anchovies",
      "Jalapeños",
      "Mushrooms",
      "Truffle Oil",
    ],
  },
  {
    topic: "disney",
    title: "Best Disney Animated Films",
    description: "The childhood canon, ranked.",
    category: "film",
    items: [
      "The Lion King",
      "Frozen",
      "Toy Story",
      "Moana",
      "Aladdin",
      "The Little Mermaid",
      "Beauty and the Beast",
      "Up",
      "Lilo & Stitch",
      "Tangled",
    ],
  },
  {
    topic: "gaming",
    title: "Best Gaming Consoles",
    description: "The console wars, settled by data.",
    category: "gaming",
    items: [
      "Nintendo Switch",
      "PlayStation 4",
      "SNES",
      "PlayStation 2",
      "Xbox 360",
      "Game Boy",
      "Nintendo 64",
      "Sega Mega Drive",
      "Xbox Series X",
      "PC Gaming",
    ],
  },
];

// ── Main ──────────────────────────────────────────────────────────────────────

async function main() {
  // 1. Create or find the curator account.
  const CURATOR_USERNAME = "rankr_curator";
  const CURATOR_PASSWORD = "CuratorPass1!";

  let curator = await prisma.user.findUnique({
    where: { username: CURATOR_USERNAME },
    select: { id: true },
  });

  if (!curator) {
    const hashed = await argon2.hash(CURATOR_PASSWORD);
    curator = await prisma.user.create({
      data: {
        username: CURATOR_USERNAME,
        password: hashed,
        email: `curator@${process.env.NEXT_PUBLIC_SITE_DOMAIN ?? "tierstack.dev"}`,
      },
      select: { id: true },
    });
    console.log(`✔ Created curator account (id=${curator.id})`);
  } else {
    console.log(`· Curator account already exists (id=${curator.id})`);
  }

  // 2. Seed each starter list.
  for (const def of STARTERS) {
    // Skip if an active starter already exists for this topic.
    const existing = await prisma.onboardingStarter.findFirst({
      where: { topic: def.topic, is_active: true },
    });
    if (existing) {
      console.log(`· Skipping "${def.topic}" — starter already seeded (list_id=${existing.listId})`);
      continue;
    }

    // Create the list.
    const list = await prisma.list.create({
      data: {
        title: def.title,
        description: def.description,
        category: def.category,
        createdById: curator.id,
        short_id: generateShortId(),
        slug: slugify(def.title),
        visibility: "public",
        is_shareable: true,
        anonymous_rankings_enabled: true,
        has_been_published: true,
        published_at: new Date(),
        tiers: { connect: TIER_CONNECTS },
      },
      select: { id: true, short_id: true },
    });

    // Create items and connect them to the list.
    for (const name of def.items) {
      await prisma.item.create({
        data: {
          name,
          createdById: curator.id,
          lists: { connect: { id: list.id } },
        },
      });
    }

    // Register as the starter for this topic.
    await prisma.onboardingStarter.create({
      data: {
        topic: def.topic,
        listId: list.id,
        display_order: 0,
        is_active: true,
      },
    });

    console.log(
      `✔ Seeded "${def.topic}" → list ${list.id} (${list.short_id}) with ${def.items.length} items`
    );
  }

  console.log("\nDone.");
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
