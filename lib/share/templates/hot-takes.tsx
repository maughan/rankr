// Hot-takes share card template.
// Phase 4 replaces the stub body with real data fetching + layout.

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
      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
        }}
      >
        <Brand scale={isStory ? 2 : 1.4} />
        <div
          style={{
            display: "flex",
            alignItems: "center",
            backgroundColor: "#7F1D1D",
            borderRadius: 6,
            padding: "6px 12px",
          }}
        >
          <span
            style={{
              fontSize: isStory ? 18 : 13,
              fontWeight: 700,
              color: "#FCA5A5",
              letterSpacing: "0.08em",
            }}
          >
            HOT TAKES
          </span>
        </div>
      </div>

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

export const hotTakes: TemplateModule = {
  async handler(_params: URLSearchParams, format: Format) {
    return <Stub format={format} />;
  },
};
