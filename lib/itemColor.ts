function hslToHex(h: number, s: number, l: number): string {
  s /= 100;
  l /= 100;
  const a = s * Math.min(l, 1 - l);
  const f = (n: number): string => {
    const k = (n + h / 30) % 12;
    const color = l - a * Math.max(Math.min(k - 3, 9 - k, 1), -1);
    return Math.round(255 * color)
      .toString(16)
      .padStart(2, "0");
  };
  return `#${f(0)}${f(8)}${f(4)}`;
}

// DJB2-variant hash — deterministic, same name always produces same color.
export function nameToColor(name: string): string {
  let hash = 5381;
  for (let i = 0; i < name.length; i++) {
    hash = ((hash << 5) + hash) ^ name.charCodeAt(i);
    hash = hash >>> 0;
  }
  const hue = hash % 360;
  const saturation = 50 + ((hash >> 8) & 0xff) % 21; // 50–70 %
  const lightness = 35 + ((hash >> 16) & 0xff) % 16; // 35–50 %
  return hslToHex(hue, saturation, lightness);
}

// Multi-word → initials (max 3). Single word → first char + consonants (max 3 total).
export function deriveShortLabel(name: string): string {
  const words = name.trim().split(/\s+/);
  if (words.length > 1) {
    return words
      .slice(0, 3)
      .map((w) => (w[0] ?? "").toUpperCase())
      .join("");
  }
  const vowels = new Set("aeiouAEIOU");
  const chars = name.split("").filter((c, i) => i === 0 || !vowels.has(c));
  return chars.slice(0, 3).join("").toUpperCase();
}
