import Link from "next/link";
import { Suspense } from "react";

import { SignOutButton } from "@/components/sign-out-button";
import { getUserId } from "@/lib/supabase/server";

export default function Home() {
  return (
    <main className="flex flex-1 flex-col items-center justify-center gap-6 bg-zinc-50 px-6 py-16 dark:bg-black">
      <h1 className="text-3xl font-semibold tracking-tight text-zinc-950 dark:text-zinc-50">Stylist AI</h1>
      {/* Reads the session cookie, so it streams in behind the boundary. */}
      <Suspense fallback={<div className="h-10" />}>
        <AccountActions />
      </Suspense>
    </main>
  );
}

async function AccountActions() {
  const userId = await getUserId();

  if (userId) {
    return (
      <div className="flex items-center gap-4">
        <Link href="/closet" className="flex h-10 items-center rounded-full bg-foreground px-5 text-sm font-medium text-background">
          Go to closet
        </Link>
        <SignOutButton />
      </div>
    );
  }

  return (
    <div className="flex gap-4 text-sm font-medium">
      <Link href="/login" className="flex h-10 items-center rounded-full bg-foreground px-5 text-background">
        Log in
      </Link>
      <Link
        href="/signup"
        className="flex h-10 items-center rounded-full border border-black/[.08] px-5 dark:border-white/[.145]"
      >
        Sign up
      </Link>
    </div>
  );
}
