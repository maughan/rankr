// Server-only. Never import from client components.
//
// Content moderation for uploaded images via Google Cloud Vision SafeSearch.
// Requires GOOGLE_VISION_API_KEY env var in production.
//
// Fail-open design: if the moderation service is unavailable the upload is
// allowed through and the error is logged. A temporary Vision API outage must
// never block users from uploading images.

export interface ModerationResult {
  safe: boolean;
  reason?: string;
}

// Likelihood levels in the Vision API response, ordered least→most likely.
const LIKELIHOOD_ORDER = [
  "UNKNOWN",
  "VERY_UNLIKELY",
  "UNLIKELY",
  "POSSIBLE",
  "LIKELY",
  "VERY_LIKELY",
] as const;

type Likelihood = (typeof LIKELIHOOD_ORDER)[number];

function atLeast(value: Likelihood, threshold: Likelihood): boolean {
  return LIKELIHOOD_ORDER.indexOf(value) >= LIKELIHOOD_ORDER.indexOf(threshold);
}

interface SafeSearchAnnotation {
  adult?: Likelihood;
  violence?: Likelihood;
  racy?: Likelihood;
  medical?: Likelihood;
  spoof?: Likelihood;
}

/**
 * Runs Google Vision SafeSearch on the supplied image buffer.
 *
 * Thresholds (any one triggers rejection):
 *   adult    >= LIKELY
 *   violence >= LIKELY
 *   racy     >= VERY_LIKELY
 *
 * Returns { safe: true } when:
 *   - GOOGLE_VISION_API_KEY is not configured (development / staging fallback)
 *   - The Vision API responds with an unexpected error (fail-open)
 */
export async function moderateImage(
  buffer: Buffer
): Promise<ModerationResult> {
  const apiKey = process.env.GOOGLE_VISION_API_KEY;
  if (!apiKey) {
    // Not configured — skip moderation (dev / environments without the key)
    return { safe: true };
  }

  const base64 = buffer.toString("base64");

  let data: { responses?: { safeSearchAnnotation?: SafeSearchAnnotation }[] };
  try {
    const res = await fetch(
      `https://vision.googleapis.com/v1/images:annotate?key=${apiKey}`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          requests: [
            {
              image: { content: base64 },
              features: [{ type: "SAFE_SEARCH_DETECTION" }],
            },
          ],
        }),
        // Hard timeout — never block an upload for more than 5 s
        signal: AbortSignal.timeout(5_000),
      }
    );

    if (!res.ok) {
      console.error("imageModeration: Vision API HTTP error", res.status);
      return { safe: true }; // fail-open
    }

    data = await res.json();
  } catch (err) {
    console.error("imageModeration: Vision API request failed", err);
    return { safe: true }; // fail-open on network error / timeout
  }

  const annotation = data?.responses?.[0]?.safeSearchAnnotation;
  if (!annotation) return { safe: true };

  if (atLeast(annotation.adult ?? "UNKNOWN", "LIKELY")) {
    return { safe: false, reason: "Image contains adult content." };
  }
  if (atLeast(annotation.violence ?? "UNKNOWN", "LIKELY")) {
    return { safe: false, reason: "Image contains violent content." };
  }
  if (atLeast(annotation.racy ?? "UNKNOWN", "VERY_LIKELY")) {
    return { safe: false, reason: "Image contains explicit content." };
  }

  return { safe: true };
}
