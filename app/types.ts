export interface TierList {
  id: number;
  title: string;
  description: string;
  createdAt: string;
  updatedAt: string;
  createdBy: {
    id: number;
    username: string;
  };
  tags: Array<string>;
  tiers: Array<Tier>;
  items: Array<TierItem>;
}

export interface Tier {
  id: number;
  title: string;
  color: string;
  value: number; // tiers should be weighted by numerical value 0-?? to allow for aggregate rankings
  items: Array<number>;
}

export interface TierItem {
  id: number;
  title: string;
  description: string;
  img: string;
  createdAt: string;
  updatedAt: string;
  createdBy: string;
  rankings: Array<ItemRanking>;
}

export interface ItemRanking {
  itemId: number;
  userId: number; // may replace with User partial later
  user: {
    id: number;
    username: string;
  };
  value: number;
  createdAt: string;
  updatedAt: string;
}

export interface User {
  id: number;
  password: string;
  username: string;
  email: string;
  tokenVersion: number;
}
