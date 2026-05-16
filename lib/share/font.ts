import { readFile } from "node:fs/promises";
import path from "node:path";
import type { ImageResponseOptions } from "next/server";

export type FontConfig = NonNullable<ImageResponseOptions["fonts"]>;

let cachedFonts: FontConfig | null = null;

async function loadLocalFont(fileName: string): Promise<ArrayBuffer> {
  const filePath = path.join(process.cwd(), "public/fonts", fileName);

  const buffer = await readFile(filePath);
  const data = new Uint8Array(buffer).buffer.slice(0);

  const signature = String.fromCharCode(...new Uint8Array(data.slice(0, 4)));

  if (signature === "wOF2") {
    throw new Error(
      `${fileName} is WOFF2. Use .ttf or .otf for ImageResponse.`
    );
  }

  return data;
}

export async function getFontConfig(): Promise<FontConfig> {
  if (cachedFonts) return cachedFonts;

  const [regular, bold] = await Promise.all([
    loadLocalFont("Geist-Regular.ttf"),
    loadLocalFont("Geist-Bold.ttf"),
  ]);

  cachedFonts = [
    { name: "Geist", data: regular, weight: 400, style: "normal" },
    { name: "Geist", data: bold, weight: 700, style: "normal" },
  ];

  return cachedFonts;
}
