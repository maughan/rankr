import { ItemRanking, Tier, TierItem, TierList } from "@/app/types";
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
}: Pick<TierList, "title" | "description">): Pick<
  TierList,
  "title" | "description" | "tags"
> => ({
  title,
  description,
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

export const createNewItem = ({
  title,
  description,
  img,
}: Pick<TierItem, "title" | "description" | "img">) => ({
  title,
  description,
  img,
});

export const handleDropReorder = (end: number, item: number, list: Tier[]) => {
  const endTier = list.find((tier) => tier.id === end);

  const currentTier = list.find((tier) => tier.items.includes(item));

  if (currentTier) {
    currentTier.items = currentTier.items.filter((id) => id !== item);
  }

  if (endTier) {
    endTier.items.push(item);
  }

  return list;
};

export const processRankingData = (
  userRankings: Tier[],
  user: { id: number; username: string }
): Pick<ItemRanking, "itemId" | "user" | "value">[] => {
  const userRankingData: Pick<ItemRanking, "itemId" | "user" | "value">[] = [];
  userRankings.map((tier) =>
    tier.items.forEach((item) =>
      userRankingData.push({
        itemId: item,
        user,
        value: tier.value,
      })
    )
  );

  return userRankingData;
};

export const processResponseData = (lists: TierList[]): TierList[] => {
  return lists.map((list) => {
    list.items.map((item) => {
      if (!item.rankings.length) return;
      const aggVal = Math.round(
        item.rankings.map((rank) => rank.value).reduce((a, b) => a + b) /
          item.rankings.length
      );

      const correspondingTier = list.tiers.find(
        (tier) => tier.value === aggVal
      );

      correspondingTier?.items.push(item.id);
    });
    return list;
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

  list.items.map((item) => {
    if (!item.rankings.length) return;

    const ranking = item.rankings.find((ranking) => ranking.user.id === user);

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
