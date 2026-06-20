// OG image template for profile pages — wide 1200×675.
// Standalone (not registered in the share card renderer).
import type { ReactElement } from "react";
import { Brand } from "@/lib/share/brand";
import { COLORS } from "@/lib/share/tokens";
import { nameToColor } from "@/lib/itemColor";

export interface OgProfileInput {
  username: string;
  displayName: string | null;
  bio: string | null;
  publicListCount: number;
}

const W = 1200;
const H = 675;
const PAD = 60;
const AVATAR_SIZE = 150;

function trunc(s: string, max: number): string {
  return s.length > max ? s.slice(0, max - 1) + "…" : s;
}

export function ogProfileCard(data: OgProfileInput): ReactElement {
  const name = data.displayName ?? data.username;
  const initial = name[0]?.toUpperCase() ?? "?";
  const avatarColor = nameToColor(data.username);
  const bio = data.bio ? trunc(data.bio, 110) : null;
  const listLabel = `${data.publicListCount} public list${data.publicListCount !== 1 ? "s" : ""}`;

  return (
    <div
      style={{
        display: "flex",
        flexDirection: "column",
        width: W,
        height: H,
        backgroundColor: COLORS.page,
        padding: PAD,
        fontFamily: "Geist",
      }}
    >
      {/* Top bar — brand right-aligned */}
      <div style={{ display: "flex", justifyContent: "flex-end" }}>
        <Brand scale={1.3} />
      </div>

      {/* Main content — avatar + info, vertically centered */}
      <div
        style={{
          display: "flex",
          flex: 1,
          alignItems: "center",
          gap: 52,
        }}
      >
        {/* Avatar */}
        <div
          style={{
            width: AVATAR_SIZE,
            height: AVATAR_SIZE,
            borderRadius: AVATAR_SIZE / 2,
            backgroundColor: avatarColor,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            flexShrink: 0,
          }}
        >
          <span
            style={{
              fontSize: AVATAR_SIZE * 0.42,
              fontWeight: 700,
              color: "#ffffff",
              lineHeight: 1,
            }}
          >
            {initial}
          </span>
        </div>

        {/* Info */}
        <div
          style={{
            display: "flex",
            flexDirection: "column",
            gap: 14,
          }}
        >
          <span
            style={{
              fontSize: 54,
              fontWeight: 700,
              color: COLORS.primary,
              lineHeight: 1.1,
            }}
          >
            {trunc(name, 30)}
          </span>

          {data.displayName && (
            <span
              style={{
                fontSize: 26,
                color: COLORS.muted,
                lineHeight: 1,
              }}
            >
              @{data.username}
            </span>
          )}

          {bio && (
            <span
              style={{
                fontSize: 22,
                color: COLORS.secondary,
                lineHeight: 1.35,
                maxWidth: 700,
              }}
            >
              {bio}
            </span>
          )}

          <span
            style={{
              fontSize: 20,
              color: COLORS.muted,
              marginTop: bio ? 4 : 0,
            }}
          >
            {listLabel}
          </span>
        </div>
      </div>
    </div>
  );
}
