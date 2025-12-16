import {
  ItemRanking,
  Tier,
  TierItem,
  TierItemMetaData,
  TierList,
  TierListMetadata,
  TierMetaData,
} from "@/app/types";

export const createMockLists = (): TierList[] => [
  {
    id: 0,
    metadata: {
      title: "memes",
      description: "list of memes",
      createdAt: "2025-12-16T02:23:46.798Z",
      updatedAt: "2025-12-16T02:23:46.798Z",
      createdBy: "Rhys",
      tags: ["funny", "memes"],
    },
    items: [
      {
        id: 0,
        metadata: {
          title: "PEPE",
          description: "pepe",
          img: "https://ichef.bbci.co.uk/ace/standard/976/cpsprodpb/16620/production/_91408619_55df76d5-2245-41c1-8031-07a4da3f313f.jpg",
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
          createdBy: "Rhys",
        },
        rankings: [
          {
            id: 0,
            updatedAt: new Date().toISOString(),
            createdAt: new Date().toISOString(),
            user: "Rhys",
            value: 7,
          },
          {
            id: 0,
            updatedAt: new Date().toISOString(),
            createdAt: new Date().toISOString(),
            user: "Liam",
            value: 6,
          },
        ],
      },
      {
        id: 1,
        metadata: {
          title: "bentpepe",
          description: "",
          img: "https://www.chathamhouse.org/sites/default/files/styles/uncropped_tiny/public/2023-03/1398824380934.png",
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
          createdBy: "Rhys",
        },
        rankings: [
          {
            id: 1,
            updatedAt: new Date().toISOString(),
            createdAt: new Date().toISOString(),
            user: "Rhys",
            value: 6,
          },
          {
            id: 1,
            updatedAt: new Date().toISOString(),
            createdAt: new Date().toISOString(),
            user: "Liam",
            value: 6,
          },
          {
            id: 1,
            updatedAt: new Date().toISOString(),
            createdAt: new Date().toISOString(),
            user: "Dan",
            value: 2,
          },
        ],
      },
    ],
    tiers: [
      {
        id: 0,
        metadata: {
          title: "S",
          color: "#ff7f7f",
          value: 7,
        },
        items: [],
      },
      {
        id: 1,
        metadata: {
          title: "A",
          color: "#ffbf7f",
          value: 6,
        },
        items: [],
      },
      {
        id: 2,
        metadata: {
          title: "B",
          color: "#ffdf7f",
          value: 5,
        },
        items: [],
      },
      {
        id: 3,
        metadata: {
          title: "C",
          color: "#ffff7f",
          value: 4,
        },
        items: [],
      },
      {
        id: 4,
        metadata: {
          title: "D",
          color: "#bfff7f",
          value: 3,
        },
        items: [],
      },
      {
        id: 5,
        metadata: {
          title: "E",
          color: "#7fff7f",
          value: 2,
        },
        items: [],
      },
      {
        id: 6,
        metadata: {
          title: "F",
          color: "#7fffff",
          value: 1,
        },
        items: [],
      },
    ],
  },
];

export const createNewList = (
  {
    title,
    description,
    tags,
  }: Pick<TierListMetadata, "title" | "description" | "tags">,
  user: string
): TierList => ({
  id: 0,
  metadata: {
    title,
    description,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    createdBy: user,
    tags,
  },
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
  { title, color, value }: Pick<TierMetaData, "title" | "color" | "value">,
  user: string
): Tier => ({
  id: 0,
  metadata: {
    title,
    color,
    value,
  },
  items: [],
});

export const createNewItem = (
  {
    title,
    description,
    img,
  }: Pick<TierItemMetaData, "title" | "description" | "img">,
  user: string
): TierItem => ({
  id: 0,
  metadata: {
    title,
    description,
    img,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    createdBy: user,
  },
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
): TierList => {
  const userRankingData: ItemRanking[] = [];
  userRankings.map((tier) =>
    tier.items.forEach((item) =>
      userRankingData.push({
        id: item,
        user,
        value: tier.metadata.value,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      })
    )
  );

  userRankingData.forEach((data) => {
    const matchingItem = list.items.find((item) => item.id === data.id);

    if (!matchingItem) return;

    matchingItem.rankings.push(data);
  });

  return list;
};

export const processResponseData = (lists: TierList[]): TierList[] => {
  return lists.map((list) => {
    list.items.map((item) => {
      const aggVal = Math.round(
        item.rankings.map((rank) => rank.value).reduce((a, b) => a + b) /
          item.rankings.length
      );

      const correspondingTier = list.tiers.find(
        (tier) => tier.metadata.value === aggVal
      );

      correspondingTier?.items.push(item.id);
    });
    return list;
  });
};

export const fetchUserRankings = (list: TierList, user: string) => {
  return list.items
    .map((item) => item.rankings.find((ranking) => ranking.user === user))
    .filter((a) => !!a);
};
