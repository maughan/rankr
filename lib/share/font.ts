// Loads Geist from Google Fonts and caches the ArrayBuffer at module scope so
// we only pay the network cost once per server process (cold start).

const UA =
  "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36";

const cache = new Map<number, ArrayBuffer>();

async function loadGeistWeight(weight: 400 | 700): Promise<ArrayBuffer> {
  const hit = cache.get(weight);
  if (hit) return hit;

  const css = await fetch(
    `https://fonts.googleapis.com/css2?family=Geist:wght@${weight}&display=swap`,
    { headers: { "User-Agent": UA } }
  ).then((r) => r.text());

  // Google Fonts CSS lists subsets; take the last url() — that's the latin block.
  const matches = [
    ...css.matchAll(/url\((https:\/\/fonts\.gstatic\.com[^)]+)\)/g),
  ];
  if (!matches.length) throw new Error(`Geist ${weight}: no font URL in CSS`);

  const url = matches[matches.length - 1][1];
  const data = await fetch(url).then((r) => r.arrayBuffer());
  cache.set(weight, data);
  return data;
}

export type FontConfig = {
  name: string;
  data: ArrayBuffer;
  weight: 400 | 700;
  style: "normal";
}[];

export async function getFontConfig(): Promise<FontConfig> {
  const [regular, bold] = await Promise.all([
    loadGeistWeight(400),
    loadGeistWeight(700),
  ]);
  return [
    { name: "Geist", data: regular, weight: 400, style: "normal" },
    { name: "Geist", data: bold,    weight: 700, style: "normal" },
  ];
}
