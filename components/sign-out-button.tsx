import { signOut } from "@/lib/auth/actions";

/** Plain form post, so it works before hydration and without JS. */
export function SignOutButton() {
  return (
    <form action={signOut}>
      <button
        type="submit"
        className="h-10 rounded-full border border-black/[.08] px-4 text-sm font-medium transition-colors hover:bg-black/[.04] dark:border-white/[.145] dark:hover:bg-[#1a1a1a]"
      >
        Sign out
      </button>
    </form>
  );
}
