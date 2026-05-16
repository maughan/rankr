// Head-to-head share card template.
// Phase 3 replaces the stub body with real data fetching + layout.

import { Brand, ShareFoot } from "@/lib/share/brand";
import { COLORS } from "@/lib/share/tokens";
import { Format, FORMATS, TemplateModule } from "@/lib/share/types";

function Stub({ format }: { format: Format }) {
  const { width, height } = FORMATS[format];
  const isStory = format === "story";
  return (
    <div
      style={{
        display: "flex",
        flexDirection: "column",
        width,
        height,
        backgroundColor: COLORS.page,
        padding: isStory ? 80 : 60,
        justifyContent: "space-between",
      }}
    >
      <Brand scale={isStory ? 2 : 1.4} />

      <div
        style={{
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          justifyContent: "center",
          flex: 1,
          gap: 16,
        }}
      >
        <span
          style={{
            fontSize: isStory ? 28 : 20,
            fontWeight: 700,
            color: COLORS.muted,
            letterSpacing: "0.12em",
          }}
        >
          HEAD-TO-HEAD
        </span>
        <span
          style={{
            fontSize: isStory ? 20 : 15,
            color: COLORS.tertiary,
          }}
        >
          {format} · {width}×{height}
        </span>
      </div>

      <ShareFoot url="tierstack.io" scale={isStory ? 1.4 : 1} />
    </div>
  );
}

export const headToHead: TemplateModule = {
  async handler(_params: URLSearchParams, format: Format) {
    return <Stub format={format} />;
  },
};
