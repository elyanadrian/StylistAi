// Public Supabase settings. Safe for the browser: access is enforced by RLS.
// Referenced as literal `process.env.NEXT_PUBLIC_*` so Next inlines them into
// client bundles.

export function supabaseUrl(): string {
  const value = process.env.NEXT_PUBLIC_SUPABASE_URL;
  if (!value) throw new Error("NEXT_PUBLIC_SUPABASE_URL is not set");
  return value;
}

export function supabasePublishableKey(): string {
  const value = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY;
  if (!value) throw new Error("NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY is not set");
  return value;
}

export const WARDROBE_BUCKET = "wardrobe";
