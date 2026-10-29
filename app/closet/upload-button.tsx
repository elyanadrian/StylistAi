"use client";

import { useRef, useState } from "react";

import { createItem, tagItem } from "@/lib/closet/actions";
import { createClient } from "@/lib/supabase/client";
import { WARDROBE_BUCKET } from "@/lib/supabase/env";

// Claude vision works best at ≤1568px on the long edge; this also keeps uploads well under the 5 MB bucket limit.
const MAX_EDGE = 1568;

async function toJpeg(file: File): Promise<Blob> {
  const bitmap = await createImageBitmap(file, { imageOrientation: "from-image" });
  const scale = Math.min(1, MAX_EDGE / Math.max(bitmap.width, bitmap.height));
  const canvas = document.createElement("canvas");
  canvas.width = Math.round(bitmap.width * scale);
  canvas.height = Math.round(bitmap.height * scale);
  canvas.getContext("2d")!.drawImage(bitmap, 0, 0, canvas.width, canvas.height);
  bitmap.close();
  return new Promise((resolve, reject) =>
    canvas.toBlob((blob) => (blob ? resolve(blob) : reject(new Error("Couldn't read the image."))), "image/jpeg", 0.85),
  );
}

export function UploadButton() {
  const inputRef = useRef<HTMLInputElement>(null);
  const [progress, setProgress] = useState<string | null>(null);
  const [errors, setErrors] = useState<string[]>([]);

  async function upload(files: File[]) {
    setErrors([]);
    const supabase = createClient();
    const { data } = await supabase.auth.getClaims();
    const userId = data?.claims.sub;
    if (!userId) {
      setErrors(["You're signed out. Log in again to upload."]);
      return;
    }

    // One at a time: each item shows up as "Tagging…" as soon as it's saved.
    for (const [i, file] of files.entries()) {
      setProgress(files.length > 1 ? `Uploading ${i + 1} of ${files.length}…` : "Uploading…");
      const path = `${userId}/${crypto.randomUUID()}.jpg`;
      try {
        const jpeg = await toJpeg(file);
        const { error } = await supabase.storage.from(WARDROBE_BUCKET).upload(path, jpeg, { contentType: "image/jpeg" });
        if (error) throw new Error("Upload failed.");

        const created = await createItem(path);
        if (!created.id) {
          await supabase.storage.from(WARDROBE_BUCKET).remove([path]);
          throw new Error(created.error ?? "Couldn't save the item.");
        }
        setProgress(files.length > 1 ? `Tagging ${i + 1} of ${files.length}…` : "Tagging…");
        // A tagging failure shows on the item's card, with a retry button.
        await tagItem(created.id);
      } catch (err) {
        setErrors((prev) => [...prev, `${file.name}: ${err instanceof Error ? err.message : "Upload failed."}`]);
      }
    }
    setProgress(null);
  }

  return (
    <div className="flex flex-col items-end gap-1">
      <input
        ref={inputRef}
        type="file"
        accept="image/jpeg,image/png,image/webp"
        multiple
        hidden
        onChange={(e) => {
          const files = Array.from(e.target.files ?? []);
          e.target.value = "";
          if (files.length > 0) void upload(files);
        }}
      />
      <button
        type="button"
        disabled={progress !== null}
        onClick={() => inputRef.current?.click()}
        className="h-10 rounded-full bg-foreground px-5 text-sm font-medium text-background transition-colors hover:bg-[#383838] disabled:opacity-60 dark:hover:bg-[#ccc]"
      >
        {progress ?? "Add items"}
      </button>
      <div aria-live="polite" className="text-sm text-red-600 dark:text-red-400">
        {errors.map((e) => (
          <p key={e}>{e}</p>
        ))}
      </div>
    </div>
  );
}
