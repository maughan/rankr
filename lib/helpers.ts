import { Tier, TierList } from "@/app/types";
import { jwtDecode } from "jwt-decode";

export const ImageKitLoader = ({
  src,
  width,
}: {
  src: string;
  width: number;
}) => {
  return `${src}?tr=w-${width}`;
};

export const createNewList = ({
  title,
  description,
  img,
  hidden,
  category_icon,
  category_color,
}: Pick<
  TierList,
  | "title"
  | "description"
  | "img"
  | "hidden"
  | "category_icon"
  | "category_color"
>): Pick<
  TierList,
  | "title"
  | "description"
  | "tags"
  | "hidden"
  | "img"
  | "category_icon"
  | "category_color"
> => ({
  title,
  description,
  img,
  hidden,
  category_icon,
  category_color,
  tags: [],
});

export const createNewTier = ({
  title,
  color,
  value,
}: Pick<Tier, "title" | "color" | "value">): Tier => ({
  id: 0,
  title,
  color,
  value,
  items: [],
});

export const handleDropReorder = (
  end: number,
  items: number[],
  list: Tier[]
) => {
  const endTier = list.find((tier) => tier.id === end);

  items.forEach((item) => {
    const currentTier = list.find((tier) => tier.items.includes(item));

    if (currentTier?.id === endTier?.id) return;

    if (currentTier) {
      currentTier.items = currentTier.items.filter((id) => id !== item);
    }

    if (endTier) {
      endTier.items.push(item);
    }
  });

  return list;
};

export const processRankingData = (
  userRankings: Tier[],
  user: { id: number; username: string },
  listId: number
): { itemId: number; userId: number; value: number; listId: number }[] => {
  const userRankingData: {
    itemId: number;
    userId: number;
    value: number;
    listId: number;
  }[] = [];
  userRankings.forEach((tier) =>
    tier.items.forEach((item) =>
      userRankingData.push({
        itemId: item,
        userId: user.id,
        value: tier.value,
        listId,
      })
    )
  );

  return userRankingData;
};

export const processResponseData = (lists: TierList[]): TierList[] => {
  return lists.map((list) => {
    const tiers = list.tiers.map((tier) => ({
      ...tier,
      items: [] as number[],
    }));
    list.items.forEach((item) => {
      if (!item.rankings.length) return;
      const filteredRankings = item.rankings.filter(
        (ranking) => ranking.value !== 0
      );
      const aggVal = Math.round(
        filteredRankings.map((rank) => rank.value).reduce((a, b) => a + b, 0) /
          filteredRankings.length
      );
      tiers.find((tier) => tier.value === aggVal)?.items.push(item.id);
    });
    return { ...list, tiers };
  });
};

export const filterListResponseData = (
  list: TierList,
  user: number
): Tier[] => {
  const filtered = list.tiers.map((tier) => ({
    ...tier,
    items: [] as number[],
  }));

  list.items.forEach((item) => {
    if (!item.rankings.length) return;

    const ranking = item.rankings.find((ranking) => ranking.userId === user);

    if (!ranking) return;

    const correspondingTier = filtered.find(
      (tier) => tier.value === ranking.value
    );

    correspondingTier?.items.push(ranking.itemId);
  });

  return filtered;
};

export const fetchUserRankings = (list: TierList, user: number) => {
  if (!list) return [];
  return list.items
    .map((item) => item?.rankings?.find((ranking) => ranking.userId === user))
    .filter((a) => !!a);
};

export const getUserFromToken = () => {
  const token = document.cookie
    .split("; ")
    .find((row) => row.startsWith("auth_token="))
    ?.split("=")[1];

  let username = "";
  let id = 0;
  let email = "";

  if (token) {
    const decoded = jwtDecode<{ sub: number; username: string; email: string }>(
      token
    );
    username = decoded.username;
    id = decoded.sub;
    email = decoded.email ?? "";
  }

  return {
    username,
    id,
    email,
  };
};
