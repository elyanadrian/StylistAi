// Shared pieces of the login and signup forms.

import Link from "next/link";
import type { ReactNode } from "react";

const inputClass =
  "h-11 rounded-lg border border-zinc-300 bg-white px-3 text-base text-zinc-950 outline-none focus:border-zinc-950 dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-50 dark:focus:border-zinc-50";

export function AuthPage({ title, footer, children }: { title: string; footer: ReactNode; children: ReactNode }) {
  return (
    <main className="flex flex-1 items-center justify-center bg-zinc-50 px-6 py-16 dark:bg-black">
      <div className="flex w-full max-w-sm flex-col gap-6">
        <h1 className="text-2xl font-semibold tracking-tight text-zinc-950 dark:text-zinc-50">{title}</h1>
        {children}
        <p className="text-sm text-zinc-600 dark:text-zinc-400">{footer}</p>
      </div>
    </main>
  );
}

export function AuthLink({ href, children }: { href: string; children: ReactNode }) {
  return (
    <Link href={href} className="font-medium text-zinc-950 underline dark:text-zinc-50">
      {children}
    </Link>
  );
}

export function AuthFields({
  passwordAutoComplete,
  passwordMinLength,
}: {
  passwordAutoComplete: "current-password" | "new-password";
  passwordMinLength?: number;
}) {
  return (
    <>
      <label className="flex flex-col gap-1 text-sm font-medium text-zinc-700 dark:text-zinc-300">
        Email
        <input name="email" type="email" autoComplete="email" required className={inputClass} />
      </label>
      <label className="flex flex-col gap-1 text-sm font-medium text-zinc-700 dark:text-zinc-300">
        Password
        <input
          name="password"
          type="password"
          autoComplete={passwordAutoComplete}
          minLength={passwordMinLength}
          required
          className={inputClass}
        />
      </label>
    </>
  );
}

export function FormStatus({ error, message }: { error?: string; message?: string }) {
  return (
    <p aria-live="polite" className="min-h-5 text-sm">
      {error ? <span className="text-red-600 dark:text-red-400">{error}</span> : message}
    </p>
  );
}

export function SubmitButton({ pending, children }: { pending: boolean; children: ReactNode }) {
  return (
    <button
      type="submit"
      disabled={pending}
      className="h-11 rounded-full bg-foreground px-5 font-medium text-background transition-colors hover:bg-[#383838] disabled:opacity-60 dark:hover:bg-[#ccc]"
    >
      {children}
    </button>
  );
}
