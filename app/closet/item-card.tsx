"use client";

import { useState, useTransition } from "react";

import { tagItem } from "@/lib/closet/actions";
import { COLOR_SWATCHES, label } from "@/lib/closet/labels";
import type { ClosetItem } from "@/lib/closet/queries";
import type { Color } from "@/lib/wardrobe";

import { ItemEditForm } from "./item-edit-form";

const FAILURE_MESSAGES: Record<string, string> = {
  not_clothing: "This doesn't look like a clothing item.",
  refusal: "Couldn't tag this photo.",
};

function failureReason(item: ClosetItem): string {
  const tags = item.ai_tags;
  const reason = tags && typeof tags === "object" && !Array.isArray(tags) ? tags.error : undefined;
  return (typeof reason === "string" && FAILURE_MESSAGES[reason]) || "Tagging failed.";
}

export function ItemCard({ item }: { item: ClosetItem }) {
  const [editing, setEditing] = useState(false);
  const [retrying, startRetry] = useTransition();
  const pending = item.tag_status === "pending" || retrying;
  const failed = item.tag_status === "failed" && !retrying;

  return (
    <article className="flex flex-col overflow-hidden rounded-xl border border-black/[.08] bg-white dark:border-white/[.145] dark:bg-zinc-950">
      <div className="relative aspect-[3/4] bg-zinc-100 dark:bg-zinc-900">
        {item.imageUrl && (
          // Signed URLs expire, so skip next/image's optimizer cache.
          // eslint-disable-next-line @next/next/no-img-element
          <img src={item.imageUrl} alt={item.name ?? "Clothing item"} className="h-full w-full object-cover" />
        )}
        {pending && (
          <div className="absolute inset-0 flex items-center justify-center bg-white/70 text-sm font-medium dark:bg-black/60">
            Tagging…
          </div>
        )}
        {item.user_edited && (
          <span className="absolute left-2 top-2 rounded-full bg-white/90 px-2 py-0.5 text-xs font-medium text-zinc-700 dark:bg-black/80 dark:text-zinc-300">
            Edited
          </span>
        )}
      </div>

      <div className="flex flex-col gap-2 p-3">
        {editing ? (
          <ItemEditForm item={item} onDone={() => setEditing(false)} />
        ) : failed ? (
          <>
            <p className="text-sm text-red-600 dark:text-red-400">{failureReason(item)}</p>
            <div className="flex gap-2">
              <button
                type="button"
                onClick={() => startRetry(async () => void (await tagItem(item.id)))}
                className="rounded-full bg-foreground px-3 py-1 text-sm font-medium text-background"
              >
                Retry
              </button>
              <EditButton onClick={() => setEditing(true)} />
            </div>
          </>
        ) : (
          <>
            <div className="flex items-start justify-between gap-2">
              <h2 className="font-medium leading-snug">{item.name ?? (pending ? "New item" : "Untitled")}</h2>
              {!pending && <EditButton onClick={() => setEditing(true)} />}
            </div>
            {item.category && <p className="text-sm text-zinc-600 dark:text-zinc-400">{label(item.category)}</p>}
            {item.colors.length > 0 && (
              <ul className="flex flex-wrap gap-1.5" aria-label="Colors">
                {item.colors.map((color) => (
                  <li
                    key={color}
                    title={label(color)}
                    className="size-4 rounded-full border border-black/15 dark:border-white/25"
                    style={{ background: COLOR_SWATCHES[color as Color] ?? color }}
                  >
                    <span className="sr-only">{label(color)}</span>
                  </li>
                ))}
              </ul>
            )}
          </>
        )}
      </div>
    </article>
  );
}

function EditButton({ onClick }: { onClick: () => void }) {
  return (
    <button type="button" onClick={onClick} className="text-sm text-zinc-600 underline dark:text-zinc-400">
      Edit tags
    </button>
  );
}
