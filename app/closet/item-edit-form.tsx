"use client";

import { useActionState } from "react";

import { updateItemTags, type ItemEditState } from "@/lib/closet/actions";
import { COLOR_SWATCHES, FORMALITY_LABELS, WARMTH_LABELS, label } from "@/lib/closet/labels";
import type { ClosetItem } from "@/lib/closet/queries";
import { CATEGORIES, COLORS, PATTERNS } from "@/lib/wardrobe";

const fieldClass =
  "h-9 rounded-lg border border-zinc-300 bg-white px-2 text-sm dark:border-zinc-700 dark:bg-zinc-900";

export function ItemEditForm({ item, onDone }: { item: ClosetItem; onDone: () => void }) {
  const [state, formAction, pending] = useActionState(async (prev: ItemEditState, formData: FormData) => {
    const result = await updateItemTags(item.id, prev, formData);
    if (result.ok) onDone();
    return result;
  }, {});
  const errors = state.fieldErrors ?? {};

  return (
    <form action={formAction} className="flex flex-col gap-2 text-sm">
      <Field label="Name" error={errors.name}>
        <input name="name" defaultValue={item.name ?? ""} required maxLength={80} className={fieldClass} />
      </Field>

      <div className="grid grid-cols-2 gap-2">
        <Field label="Category" error={errors.category}>
          <Select name="category" defaultValue={item.category} options={CATEGORIES.map((c) => [c, label(c)])} />
        </Field>
        <Field label="Pattern" error={errors.pattern}>
          <Select name="pattern" defaultValue={item.pattern} options={PATTERNS.map((p) => [p, label(p)])} />
        </Field>
        <Field label="Formality" error={errors.formality}>
          <Select
            name="formality"
            defaultValue={item.formality?.toString()}
            options={Object.entries(FORMALITY_LABELS).map(([n, l]) => [n, `${n} · ${l}`])}
          />
        </Field>
        <Field label="Warmth" error={errors.warmth}>
          <Select
            name="warmth"
            defaultValue={item.warmth?.toString()}
            options={Object.entries(WARMTH_LABELS).map(([n, l]) => [n, `${n} · ${l}`])}
          />
        </Field>
      </div>

      <Field label="Type (optional)" error={errors.subcategory}>
        <input name="subcategory" defaultValue={item.subcategory ?? ""} maxLength={40} placeholder="e.g. chinos" className={fieldClass} />
      </Field>

      <fieldset className="flex flex-col gap-1">
        <legend className="mb-1 font-medium">Colors</legend>
        <div className="flex flex-wrap gap-1.5">
          {COLORS.map((color) => (
            <label key={color} title={label(color)} className="cursor-pointer">
              <input type="checkbox" name="colors" value={color} defaultChecked={item.colors.includes(color)} className="peer sr-only" />
              <span
                className="block size-6 rounded-full border border-black/15 ring-offset-2 peer-checked:ring-2 peer-checked:ring-zinc-950 peer-focus-visible:outline dark:border-white/25 dark:ring-offset-zinc-950 dark:peer-checked:ring-zinc-50"
                style={{ background: COLOR_SWATCHES[color] }}
              />
              <span className="sr-only">{label(color)}</span>
            </label>
          ))}
        </div>
        <FieldError messages={errors.colors} />
      </fieldset>

      <label className="flex items-center gap-2">
        <input type="checkbox" name="waterproof" defaultChecked={item.waterproof} />
        Waterproof
      </label>

      <p aria-live="polite" className="text-red-600 dark:text-red-400">
        {state.error}
      </p>
      <div className="flex gap-2">
        <button
          type="submit"
          disabled={pending}
          className="rounded-full bg-foreground px-3 py-1 font-medium text-background disabled:opacity-60"
        >
          {pending ? "Saving…" : "Save"}
        </button>
        <button type="button" onClick={onDone} className="px-2 text-zinc-600 underline dark:text-zinc-400">
          Cancel
        </button>
      </div>
    </form>
  );
}

function Field({ label, error, children }: { label: string; error?: string[]; children: React.ReactNode }) {
  return (
    <label className="flex flex-col gap-1">
      <span className="font-medium">{label}</span>
      {children}
      <FieldError messages={error} />
    </label>
  );
}

function FieldError({ messages }: { messages?: string[] }) {
  return messages?.length ? <span className="text-red-600 dark:text-red-400">{messages[0]}</span> : null;
}

function Select({
  name,
  defaultValue,
  options,
}: {
  name: string;
  defaultValue?: string | null;
  options: [value: string, label: string][];
}) {
  return (
    <select name={name} defaultValue={defaultValue ?? ""} required className={fieldClass}>
      <option value="" disabled>
        Choose…
      </option>
      {options.map(([value, text]) => (
        <option key={value} value={value}>
          {text}
        </option>
      ))}
    </select>
  );
}
