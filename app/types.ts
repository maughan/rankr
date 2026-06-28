import type { CategorySlug } from "@/lib/categories";

export type ListVisibility = "public" | "hidden" | "draft" | "private";

export interface TopTierItem {
  id: number;
  name: string | null;
  short_label: string | null;
  color: string | null;
  tier: string;
}

export interface ListPreview {
  id: number;
  short_id: string;
  slug: string;
  title: string;
  description: string;
  img: string | null;
  visibility: ListVisibility;
  createdAt: string;
  updatedAt: string;
  createdBy: { id: number; username: string };
  category: CategorySlug;
  item_count: number;
  ranker_count: number;
  ranking_count: number;
  last_activity_at: string;
  pinned: boolean;
  top_tier_items: TopTierItem[];
  user_has_ranked: boolean;
  is_template?: boolean;
}

export interface TierList {
  id: number;
  short_id: string;
  slug: string;
  title: string;
  description: string;
  img: string;
  visibility: ListVisibility;
  createdAt: string;
  updatedAt: string;
  createdBy: {
    id: number;
    username: string;
  };
  category: CategorySlug;
  is_shareable: boolean;
  is_template: boolean;
  share_token: string | null;
  anonymous_rankings_enabled: boolean;
  allow_contributions: boolean;
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
  img?: string;
  name?: string;
  color?: string;
  short_label?: string;
  short_label_user_set?: boolean;
  name_updated_at?: string | null;
  image_uploaded_at?: string | null;
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
