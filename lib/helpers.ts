import { ItemRanking, Tier, TierItem, TierList } from "@/app/types";

export const createNewList = (
  {
    title,
    description,
    tags,
  }: Pick<TierList, "title" | "description" | "tags">,
  user: string
): TierList => ({
  id: 0,
  title,
  description,
  createdAt: new Date().toISOString(),
  updatedAt: new Date().toISOString(),
  createdBy: user,
  tags,
  tiers: [
    createNewTier({ title: "S", color: "#ff7f7f", value: 7 }, user),
    createNewTier({ title: "A", color: "#ffbf7f", value: 6 }, user),
    createNewTier({ title: "B", color: "#ffdf7f", value: 5 }, user),
    createNewTier({ title: "C", color: "#ffff7f", value: 4 }, user),
    createNewTier({ title: "D", color: "#bfff7f", value: 3 }, user),
    createNewTier({ title: "E", color: "#7fff7f", value: 2 }, user),
    createNewTier({ title: "F", color: "#7fffff", value: 1 }, user),
  ],
  items: [],
});

export const createNewTier = (
  { title, color, value }: Pick<Tier, "title" | "color" | "value">,
  user: string
): Tier => ({
  id: 0,
  title,
  color,
  value,
  items: [],
});

export const createNewItem = (
  { title, description, img }: Pick<TierItem, "title" | "description" | "img">,
  user: string
) => ({
  title,
  description,
  img,
  createdAt: new Date().toISOString(),
  updatedAt: new Date().toISOString(),
  createdBy: user,
  rankings: [],
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
  list: TierList,
  user: string
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
  // // for each user ranking
  // await
  // // put ranking object in db
  // // update tier object in db
  // console.log("URS", userRankingData, list.items);
  // userRankingData.forEach((data) => {
  //   let matchingItem = list.items.find((item) => item.id === data.id);

  //   if (!matchingItem) return;

  //   if (!matchingItem.rankings) {
  //     matchingItem = { ...matchingItem, rankings: [] };
  //   }

  //   matchingItem.rankings.push(data);
  // });
  // console.log("LIST", list);
  // return list;
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

export const fetchUserRankings = (list: TierList, user: string) => {
  if (!list) return [];
  return list.items
    .map((item) => item?.rankings?.find((ranking) => ranking.user === user))
    .filter((a) => !!a);
};
