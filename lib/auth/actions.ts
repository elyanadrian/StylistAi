"use server";

import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { z } from "zod";

import { safeNextPath } from "@/lib/auth/redirect";
import { createClient } from "@/lib/supabase/server";

export type AuthFormState = { error?: string; message?: string };

const LoginSchema = z.object({
  email: z.email(),
  password: z.string().min(1),
});

const SignupSchema = z.object({
  email: z.email(),
  password: z.string().min(8),
});

export async function login(_prev: AuthFormState, formData: FormData): Promise<AuthFormState> {
  const parsed = LoginSchema.safeParse({
    email: formData.get("email"),
    password: formData.get("password"),
  });
  if (!parsed.success) return { error: "Enter your email and password." };

  const supabase = await createClient();
  const { error } = await supabase.auth.signInWithPassword(parsed.data);
  if (error) return { error: "Invalid email or password." };

  redirect(safeNextPath(formData.get("next")));
}

export async function signup(_prev: AuthFormState, formData: FormData): Promise<AuthFormState> {
  const parsed = SignupSchema.safeParse({
    email: formData.get("email"),
    password: formData.get("password"),
  });
  if (!parsed.success) {
    return { error: "Enter a valid email and a password of at least 8 characters." };
  }

  const next = safeNextPath(formData.get("next"));
  const origin = (await headers()).get("origin");
  const emailRedirectTo = origin
    ? `${origin}/auth/callback?next=${encodeURIComponent(next)}`
    : undefined;

  const supabase = await createClient();
  const { data, error } = await supabase.auth.signUp({ ...parsed.data, options: { emailRedirectTo } });
  if (error) return { error: error.message };

  // No session means the project requires email confirmation first.
  if (!data.session) return { message: "Check your email to confirm your account." };

  redirect(next);
}

export async function signOut() {
  const supabase = await createClient();
  await supabase.auth.signOut();
  redirect("/login");
}
