export type NotificationType =
  | "ranked_your_list" | "new_follower" | "new_taste_twin" | "list_milestone" | "hot_take";

export interface NotificationView {
  id: number;
  type: NotificationType;
  count: number;
  actorName: string | null;
  actorUsername: string | null;
  listTitle: string | null;
  listHref: string | null;
  meta: Record<string, unknown>;
}

function actorLabel(v: NotificationView): string {
  const name = v.actorName ?? "Someone";
  if (v.count > 1) {
    const others = v.count - 1;
    return `${name} and ${others} other${others === 1 ? "" : "s"}`;
  }
  return name;
}

export function notificationCopy(v: NotificationView): { text: string; href: string } {
  const profileHref = v.actorUsername ? `/u/${v.actorUsername}` : "/feed";
  const listHref = v.listHref ?? "/feed";
  const title = v.listTitle ?? "a list";
  switch (v.type) {
    case "ranked_your_list":
      return { text: `${actorLabel(v)} ranked ${title}`, href: listHref };
    case "hot_take":
      return { text: `A divisive take landed on ${title}`, href: listHref };
    case "list_milestone":
      return { text: `${title} hit ${Number(v.meta.milestone ?? 0)} rankers`, href: listHref };
    case "new_follower":
      return { text: `${v.actorName ?? "Someone"} followed you`, href: profileHref };
    case "new_taste_twin":
      return {
        text: `You have a new taste twin: @${v.actorUsername ?? "someone"} (${Number(v.meta.twinPct ?? 0)}%)`,
        href: profileHref,
      };
    default:
      return { text: "", href: "/feed" };
  }
}
