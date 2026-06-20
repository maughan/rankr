import {
  IconBurger,
  IconDeviceGamepad2,
  IconMusic,
  IconMovie,
  IconDeviceTv,
  IconBallFootball,
  IconUsers,
  IconBuildingStore,
  IconRobot,
  IconStack2,
} from "@tabler/icons-react";
import type { CategorySlug } from "@/lib/categories";

type IconComponent = React.ComponentType<{ size?: number }>;

const ICON_MAP: Record<CategorySlug, IconComponent> = {
  food:   IconBurger,
  gaming: IconDeviceGamepad2,
  music:  IconMusic,
  movies: IconMovie,
  tv:     IconDeviceTv,
  sports: IconBallFootball,
  people: IconUsers,
  brands: IconBuildingStore,
  tech:   IconRobot,
  other:  IconStack2,
};

export function CategoryIcon({ slug, size = 16 }: { slug: string; size?: number }) {
  const Comp: IconComponent = ICON_MAP[slug as CategorySlug] ?? IconStack2;
  return <Comp size={size} />;
}
