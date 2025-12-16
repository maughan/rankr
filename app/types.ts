export interface TierList {
  id: number;
  metadata: TierListMetadata;
  tiers: Array<Tier>;
  items: Array<TierItem>;
}

export interface TierListMetadata {
  title: string;
  description: string;
  createdAt: string;
  updatedAt: string;
  createdBy: string;
  tags: Array<string>;
}

export interface Tier {
  id: number;
  metadata: TierMetaData;
  items: Array<number>;
}

export interface TierMetaData {
  title: string;
  color: string;
  value: number; // tiers should be weighted by numerical value 0-?? to allow for aggregate rankings
}

export interface TierItem {
  id: number;
  metadata: TierItemMetaData;
  rankings: Array<ItemRanking>;
}

export interface TierItemMetaData {
  title: string;
  description: string;
  img: string;
  createdAt: string;
  updatedAt: string;
  createdBy: string;
}

export interface ItemRanking {
  id: number;
  user: string; // may replace with User partial later
  value: number;
  createdAt: string;
  updatedAt: string;
}
