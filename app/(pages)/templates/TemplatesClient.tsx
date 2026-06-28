"use client";

import Link from "next/link";
import { getCategoryMeta } from "@/lib/categories";
import { CategoryIcon } from "@/app/components/item/CategoryIcon";
import { listUrl } from "@/lib/listUrl";
import type { TemplateCard } from "@/app/api/templates/route";

type TemplateGroup = { category: string; templates: TemplateCard[] };

function ColorPreview({ preview }: { preview: TemplateCard["preview"] }) {
  const swatches = preview.slice(0, 5);
  if (swatches.length === 0) return null;
  return (
    <div className="flex items-center gap-1">
      {swatches.map((p, i) => (
        <span
          key={i}
          className="w-3.5 h-3.5 rounded-full flex-shrink-0"
          style={{ backgroundColor: p.color ?? "#64748B" }}
        />
      ))}
    </div>
  );
}

function TemplateCardItem({ template }: { template: TemplateCard }) {
  return (
    <Link
      href={listUrl(template)}
      className="flex flex-col gap-3 rounded-[12px] p-4 transition-colors hover:border-rk-muted"
      style={{ backgroundColor: "#0F1828", border: "1px solid #1E2C44" }}
    >
      <div className="flex flex-col gap-2">
        <p className="text-[14px] font-[600] text-rk-primary line-clamp-1">
          {template.title}
        </p>
        {template.description && (
          <p className="text-[12px] text-rk-secondary line-clamp-2 leading-relaxed">
            {template.description}
          </p>
        )}
      </div>

      <ColorPreview preview={template.preview} />

      <p className="text-[11px] text-rk-tertiary mt-auto pt-1">
        {template.item_count} item{template.item_count !== 1 ? "s" : ""}
      </p>

      <span className="flex items-center justify-center gap-2 mt-1 px-3 py-2 text-[13px] font-[500] text-rk-secondary border border-rk-stroke rounded-[8px] group-hover:text-rk-primary transition-colors">
        View list →
      </span>
    </Link>
  );
}

export default function TemplatesClient({ groups }: { groups: TemplateGroup[] }) {
  if (groups.length === 0) {
    return (
      <p className="text-[14px] text-rk-muted">No templates available yet.</p>
    );
  }

  return (
    <div className="flex flex-col gap-10">
      {groups.map((group) => {
        const cat = getCategoryMeta(group.category);
        return (
          <section key={group.category} className="flex flex-col gap-4">
            <div className="flex items-center gap-2.5">
              <div
                className="w-8 h-8 rounded-[8px] flex items-center justify-center flex-shrink-0"
                style={{ backgroundColor: `${cat.color}20`, color: cat.color }}
              >
                <CategoryIcon slug={group.category} size={16} />
              </div>
              <h2 className="text-[18px] font-[600] text-rk-primary tracking-tight">
                {cat.label}
              </h2>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
              {group.templates.map((template) => (
                <TemplateCardItem key={template.short_id} template={template} />
              ))}
            </div>
          </section>
        );
      })}
    </div>
  );
}
