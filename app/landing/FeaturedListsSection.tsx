import Link from "next/link";
import { prisma } from "@/lib/prisma";
import { COPY } from "./content";

type FeaturedList = {
  id: number;
  title: string;
  description: string;
  share_token: string | null;
};

async function fetchFeaturedLists(): Promise<FeaturedList[]> {
  try {
    return await prisma.list.findMany({
      where: { is_featured: true, is_shareable: true },
      select: {
        id: true,
        title: true,
        description: true,
        share_token: true,
      },
      take: 6,
    });
  } catch {
    return [];
  }
}

function ListCard({ list }: { list: FeaturedList }) {
  const href = list.share_token ? `/r/${list.share_token}` : "#";

  return (
    <Link
      href={href}
      className="flex flex-col gap-2 rounded-[14px] p-5 transition-colors group"
      style={{
        backgroundColor: "#0F1828",
        border: "1px solid #1E2C44",
      }}
    >
      <p className="text-[14px] font-[600] text-rk-primary group-hover:text-rk-accent transition-colors line-clamp-1">
        {list.title}
      </p>
      <p className="text-[12px] text-rk-secondary line-clamp-2 leading-relaxed">
        {list.description}
      </p>
    </Link>
  );
}

export default async function FeaturedListsSection() {
  const lists = await fetchFeaturedLists();

  if (!lists.length) return null;

  return (
    <section className="px-6 py-10 sm:px-10 max-w-6xl mx-auto w-full">
      <h2 className="text-[13px] font-[600] text-rk-muted uppercase tracking-[0.1em] mb-6">
        {COPY.featuredHeading}
      </h2>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {lists.map((list) => (
          <ListCard key={list.id} list={list} />
        ))}
      </div>
    </section>
  );
}
