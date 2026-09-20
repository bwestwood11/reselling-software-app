import { ImageResponse } from "next/og";
import { SITE_NAME, SITE_TAGLINE } from "@/lib/site";

export const SOCIAL_IMAGE_SIZE = { width: 1200, height: 630 };

// Shared by opengraph-image.tsx and twitter-image.tsx (Next needs each file to
// declare its own route config, so only the renderer is shared).
export function renderSocialImage(): ImageResponse {
  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          flexDirection: "column",
          justifyContent: "center",
          padding: 80,
          background: "linear-gradient(135deg, #f97316 0%, #f59e0b 100%)",
          color: "white",
        }}
      >
        <div
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            width: 96,
            height: 96,
            borderRadius: 24,
            background: "rgba(255,255,255,0.22)",
            fontSize: 60,
            fontWeight: 700,
          }}
        >
          O
        </div>
        <div style={{ marginTop: 40, fontSize: 96, fontWeight: 700, letterSpacing: -2 }}>
          {SITE_NAME}
        </div>
        <div style={{ marginTop: 12, fontSize: 40, opacity: 0.95 }}>{SITE_TAGLINE}</div>
        <div style={{ marginTop: 32, fontSize: 28, opacity: 0.85 }}>
          List once. Sell on every marketplace.
        </div>
      </div>
    ),
    SOCIAL_IMAGE_SIZE
  );
}
