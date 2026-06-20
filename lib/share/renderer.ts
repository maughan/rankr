import { ImageResponse } from "next/og";
import { getFontConfig } from "./font";
import { FORMATS, Format, TemplateName, TemplateModule } from "./types";
import { headToHead } from "./templates/head-to-head";
import { hotTakes } from "./templates/hot-takes";
import { tasteNemesis } from "./templates/taste-nemesis";
import { closestMatch } from "./templates/closest-match";
import { divisiveItem } from "./templates/divisive-item";
import { archetypeCard } from "./templates/archetype";

const TEMPLATES: Record<TemplateName, TemplateModule> = {
  "head-to-head": headToHead,
  "hot-takes": hotTakes,
  "taste-nemesis": tasteNemesis,
  "closest-match": closestMatch,
  "divisive-item": divisiveItem,
  "archetype": archetypeCard,
};

export async function renderCard(
  template: TemplateName,
  params: URLSearchParams,
  format: Format
): Promise<Response> {
  const { width, height } = FORMATS[format];

  const [element, fonts] = await Promise.all([
    TEMPLATES[template].handler(params, format),
    getFontConfig(),
  ]);

  return new ImageResponse(element, { width, height, fonts });
}
