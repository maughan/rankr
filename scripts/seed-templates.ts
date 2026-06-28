/**
 * Seeds curated TEMPLATE lists for the "Start from a template" gallery.
 *
 * Creates (or reuses) the rankr_curator account and inserts ~30 public,
 * is_template=true lists across passionate-audience categories, each with
 * 10–12 items. Item color + short_label are set via the app helpers so the
 * generated covers look good out of the box.
 *
 * Safe to re-run — skips a list if the curator already has a template with the
 * same title.
 *
 * Run:
 *   npx tsx scripts/seed-templates.ts
 */

import "dotenv/config";
import argon2 from "argon2";
import { PrismaPg } from "@prisma/adapter-pg";
import { PrismaClient } from "../app/generated/prisma/client";
import { generateShortId, slugify } from "../lib/listUrl";
import { nameToColor, deriveShortLabel } from "../lib/itemColor";

const adapter = new PrismaPg({ connectionString: process.env.DATABASE_URL! });
const prisma = new PrismaClient({ adapter });

// Tier IDs 1–8 are the global shared tier records (S/A/B/C/D/F + extras).
const TIER_CONNECTS = [1, 2, 3, 4, 5, 6, 7, 8].map((id) => ({ id }));

interface TemplateDef {
  title: string;
  description: string;
  category: string; // food | gaming | music | movies | tv
  items: string[];
}

const TEMPLATES: TemplateDef[] = [
  // ── Gaming ──────────────────────────────────────────────────────────────
  {
    title: "Best Pokémon Starters",
    description: "Grass, fire, or water — pick a side.",
    category: "gaming",
    items: ["Charmander", "Bulbasaur", "Squirtle", "Cyndaquil", "Totodile", "Chikorita", "Treecko", "Torchic", "Mudkip", "Rowlet", "Litten", "Sprigatito"],
  },
  {
    title: "Best Zelda Games",
    description: "Hyrule, ranked. Fight me.",
    category: "gaming",
    items: ["Ocarina of Time", "Breath of the Wild", "Majora's Mask", "Tears of the Kingdom", "The Wind Waker", "Twilight Princess", "A Link to the Past", "Skyward Sword", "Link's Awakening", "A Link Between Worlds"],
  },
  {
    title: "Hardest FromSoftware Bosses",
    description: "The ones that broke your controller.",
    category: "gaming",
    items: ["Malenia", "Isshin", "Sister Friede", "Orphan of Kos", "Nameless King", "Ornstein & Smough", "Genichiro", "Manus", "Slave Knight Gael", "Radagon", "Lady Maria", "Midir"],
  },
  {
    title: "Best Super Smash Bros Fighters",
    description: "Your main goes top tier, obviously.",
    category: "gaming",
    items: ["Kirby", "Fox", "Link", "Pikachu", "Mario", "Samus", "Captain Falcon", "Sonic", "Cloud", "Sephiroth", "Steve", "Joker"],
  },
  {
    title: "Best Mario Kart Tracks",
    description: "Rainbow Road haters need not apply.",
    category: "gaming",
    items: ["Rainbow Road", "Coconut Mall", "Bowser's Castle", "Mount Wario", "Waluigi Pinball", "Moo Moo Meadows", "Toad's Turnpike", "DK Mountain", "Maple Treeway", "Baby Park"],
  },
  {
    title: "Best Final Fantasy Games",
    description: "Nobody agrees on this. Good.",
    category: "gaming",
    items: ["FF VII", "FF X", "FF IX", "FF VI", "FF XIV", "FF XV", "FF VIII", "FF IV", "FF XII", "FF XVI", "FF Tactics"],
  },
  {
    title: "Best Roguelikes",
    description: "Just one more run.",
    category: "gaming",
    items: ["Hades", "The Binding of Isaac", "Slay the Spire", "Dead Cells", "Risk of Rain 2", "Enter the Gungeon", "Spelunky", "Balatro", "Vampire Survivors", "FTL"],
  },

  // ── Anime / TV ──────────────────────────────────────────────────────────
  {
    title: "Best Shonen Anime",
    description: "Power of friendship, ranked.",
    category: "tv",
    items: ["One Piece", "Naruto", "Bleach", "Dragon Ball Z", "Hunter x Hunter", "My Hero Academia", "Demon Slayer", "Jujutsu Kaisen", "Fullmetal Alchemist: Brotherhood", "Attack on Titan", "Death Note"],
  },
  {
    title: "Best Anime of All Time",
    description: "The canon. No seasonal bias.",
    category: "tv",
    items: ["Fullmetal Alchemist: Brotherhood", "Steins;Gate", "Cowboy Bebop", "Attack on Titan", "Hunter x Hunter", "Code Geass", "Death Note", "Vinland Saga", "Mob Psycho 100", "Gurren Lagann", "Monster"],
  },
  {
    title: "Best One Piece Arcs",
    description: "Marineford or Water 7? Discuss.",
    category: "tv",
    items: ["Marineford", "Enies Lobby", "Water 7", "Wano", "Dressrosa", "Alabasta", "Whole Cake Island", "Sabaody", "Skypiea", "Arlong Park", "Impel Down"],
  },
  {
    title: "Best Demon Slayer Characters",
    description: "Hashira tier list incoming.",
    category: "tv",
    items: ["Tanjiro", "Nezuko", "Zenitsu", "Inosuke", "Giyu", "Rengoku", "Shinobu", "Tengen", "Mitsuri", "Muichiro", "Sanemi", "Gyomei"],
  },
  {
    title: "Best Sitcoms",
    description: "Comfort-show energy, ranked.",
    category: "tv",
    items: ["The Office", "Friends", "Brooklyn Nine-Nine", "Parks and Recreation", "Seinfeld", "It's Always Sunny", "Community", "Arrested Development", "The IT Crowd", "30 Rock"],
  },

  // ── Music ───────────────────────────────────────────────────────────────
  {
    title: "Best Taylor Swift Albums",
    description: "Swifties, settle it.",
    category: "music",
    items: ["1989", "Red", "Folklore", "Reputation", "Lover", "Speak Now", "Evermore", "Fearless", "Midnights", "Taylor Swift"],
  },
  {
    title: "Best Kanye West Albums",
    description: "The discography, no skips allowed.",
    category: "music",
    items: ["My Beautiful Dark Twisted Fantasy", "Graduation", "The College Dropout", "Late Registration", "808s & Heartbreak", "Yeezus", "The Life of Pablo", "Ye", "Jesus Is King", "Donda"],
  },
  {
    title: "Greatest Hip-Hop Artists",
    description: "The GOAT debate, formalised.",
    category: "music",
    items: ["Kendrick Lamar", "Jay-Z", "Nas", "Eminem", "Tupac", "The Notorious B.I.G.", "Kanye West", "Andre 3000", "J. Cole", "Drake", "MF DOOM", "Lil Wayne"],
  },
  {
    title: "Best Rock Bands of All Time",
    description: "Dad-rock and beyond.",
    category: "music",
    items: ["The Beatles", "Led Zeppelin", "Pink Floyd", "Queen", "The Rolling Stones", "Nirvana", "Radiohead", "Fleetwood Mac", "The Who", "AC/DC", "Red Hot Chili Peppers"],
  },
  {
    title: "Best K-pop Groups",
    description: "Bias wars start here.",
    category: "music",
    items: ["BTS", "BLACKPINK", "TWICE", "Stray Kids", "SEVENTEEN", "NewJeans", "EXO", "Red Velvet", "aespa", "ITZY", "TXT", "Girls' Generation"],
  },
  {
    title: "Best Drake Albums",
    description: "Take Care vs everything else.",
    category: "music",
    items: ["Take Care", "Nothing Was the Same", "Scorpion", "Views", "If You're Reading This It's Too Late", "Certified Lover Boy", "Thank Me Later", "More Life", "Her Loss", "For All the Dogs"],
  },

  // ── Movies ──────────────────────────────────────────────────────────────
  {
    title: "Best Christopher Nolan Films",
    description: "Loud, confusing, and great.",
    category: "movies",
    items: ["Inception", "The Dark Knight", "Interstellar", "Oppenheimer", "Memento", "The Prestige", "Dunkirk", "Batman Begins", "Tenet", "The Dark Knight Rises"],
  },
  {
    title: "Best A24 Films",
    description: "For the letterboxd crowd.",
    category: "movies",
    items: ["Everything Everywhere All at Once", "Hereditary", "Midsommar", "Moonlight", "Uncut Gems", "Ex Machina", "The Lighthouse", "Lady Bird", "The Witch", "Past Lives", "Aftersun"],
  },
  {
    title: "Best Pixar Movies",
    description: "Which one made you cry first.",
    category: "movies",
    items: ["Toy Story", "Up", "WALL-E", "Inside Out", "Ratatouille", "Coco", "Finding Nemo", "The Incredibles", "Monsters, Inc.", "Soul", "Toy Story 3"],
  },
  {
    title: "Best Horror Movies",
    description: "Sleep is optional.",
    category: "movies",
    items: ["The Shining", "Hereditary", "The Thing", "Get Out", "Alien", "Halloween", "The Exorcist", "A Nightmare on Elm Street", "It Follows", "The Babadook", "Scream"],
  },
  {
    title: "Best Star Wars Movies",
    description: "Prequels are allowed. Barely.",
    category: "movies",
    items: ["The Empire Strikes Back", "A New Hope", "Return of the Jedi", "Revenge of the Sith", "Rogue One", "The Force Awakens", "The Phantom Menace", "Attack of the Clones", "The Last Jedi", "The Rise of Skywalker"],
  },
  {
    title: "Best Studio Ghibli Films",
    description: "Cozy, gorgeous, devastating.",
    category: "movies",
    items: ["Spirited Away", "Princess Mononoke", "My Neighbor Totoro", "Howl's Moving Castle", "Grave of the Fireflies", "Kiki's Delivery Service", "Castle in the Sky", "Ponyo", "The Wind Rises", "Nausicaä"],
  },

  // ── Food / snacks ─────────────────────────────────────────────────────────
  {
    title: "Best Crisps & Chips",
    description: "The snack-aisle hierarchy.",
    category: "food",
    items: ["Doritos", "Pringles", "Walkers / Lay's", "Kettle Chips", "Cheetos", "Hula Hoops", "Wotsits", "Sun Chips", "McCoy's", "Monster Munch", "Takis"],
  },
  {
    title: "Best Energy Drinks",
    description: "Liquid focus, ranked.",
    category: "food",
    items: ["Red Bull", "Monster", "Prime", "Celsius", "Rockstar", "Lucozade", "Reign", "Bang", "Relentless", "G Fuel"],
  },
  {
    title: "Best Breakfast Cereals",
    description: "Sugar content is a feature.",
    category: "food",
    items: ["Frosties / Frosted Flakes", "Crunchy Nut", "Lucky Charms", "Coco Pops", "Cheerios", "Weetabix", "Cinnamon Toast Crunch", "Special K", "Shreddies", "Corn Flakes", "Froot Loops"],
  },
  {
    title: "Best Ice Cream Flavours",
    description: "Vanilla defenders, brace.",
    category: "food",
    items: ["Cookie Dough", "Mint Choc Chip", "Salted Caramel", "Vanilla", "Chocolate", "Strawberry", "Cookies & Cream", "Pistachio", "Rocky Road", "Coffee", "Mango"],
  },
  {
    title: "Best Fast Food Burgers",
    description: "Where does the Big Mac really land?",
    category: "food",
    items: ["Big Mac", "Whopper", "Five Guys Cheeseburger", "In-N-Out Double-Double", "Quarter Pounder", "Wendy's Baconator", "Shake Shack ShackBurger", "Burger King Bacon King", "McChicken", "Dave's Double"],
  },
  {
    title: "Best Movie Theatre Snacks",
    description: "Sweet vs salty, eternal war.",
    category: "food",
    items: ["Popcorn", "Pick & Mix", "Nachos", "Maltesers", "Hot Dog", "Slushie", "M&M's", "Ben & Jerry's", "Pretzel Bites", "Skittles"],
  },
];

async function main() {
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

  let created = 0;
  let skipped = 0;

  for (const def of TEMPLATES) {
    const existing = await (prisma.list as any).findFirst({
      where: { createdById: curator.id, title: def.title, is_template: true },
      select: { id: true },
    });
    if (existing) {
      console.log(`· Skipping "${def.title}" — already seeded (list_id=${existing.id})`);
      skipped++;
      continue;
    }

    const list = await (prisma.list as any).create({
      data: {
        title: def.title,
        description: def.description,
        category: def.category,
        createdById: curator.id,
        short_id: generateShortId(),
        slug: slugify(def.title),
        visibility: "public",
        is_shareable: true,
        is_template: true,
        anonymous_rankings_enabled: true,
        has_been_published: true,
        published_at: new Date(),
        tiers: { connect: TIER_CONNECTS },
      },
      select: { id: true, short_id: true },
    });

    for (const name of def.items) {
      await prisma.item.create({
        data: {
          name,
          color: nameToColor(name),
          short_label: deriveShortLabel(name),
          createdById: curator.id,
          lists: { connect: { id: list.id } },
        },
      });
    }

    console.log(`✔ Seeded "${def.title}" → list ${list.id} (${list.short_id}) · ${def.items.length} items · ${def.category}`);
    created++;
  }

  console.log(`\nDone. ${created} created, ${skipped} skipped (${TEMPLATES.length} total).`);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
