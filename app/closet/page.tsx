import type { Metadata } from "next";
import Link from "next/link";
import { Suspense } from "react";

import { listItems } from "@/lib/closet/queries";

import { ItemCard } from "./item-card";
import { UploadButton } from "./upload-button";

export const metadata: Metadata = { title: "Closet" };

export default function ClosetPage() {
  return (
    <main className="mx-auto flex w-full max-w-5xl flex-1 flex-col gap-6 px-6 py-10">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div className="flex items-baseline gap-4">
          <h1 className="text-2xl font-semibold tracking-tight">Closet</h1>
          <Link href="/" className="text-sm text-zinc-600 underline dark:text-zinc-400">
            Home
          </Link>
        </div>
        <UploadButton />
      </div>
      {/* Reads the user's items, so it streams in behind the boundary. */}
      <Suspense fallback={<GridSkeleton />}>
        <ClosetGrid />
      </Suspense>
    </main>
  );
}

async function ClosetGrid() {
  const items = await listItems();

  if (items.length === 0) {
    return (
      <p className="rounded-xl border border-dashed border-zinc-300 p-10 text-center text-zinc-600 dark:border-zinc-700 dark:text-zinc-400">
        Upload your first item to start your closet.
      </p>
    );
  }

  return (
    <ul className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-4">
      {items.map((item) => (
        <li key={item.id}>
          <ItemCard item={item} />
        </li>
      ))}
    </ul>
  );
}

function GridSkeleton() {
  return (
    <ul className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-4">
      {Array.from({ length: 8 }, (_, i) => (
        <li key={i} className="aspect-[3/4] animate-pulse rounded-xl bg-zinc-100 dark:bg-zinc-900" />
      ))}
    </ul>
  );
}
