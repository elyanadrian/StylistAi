"use client";

import { useSearchParams } from "next/navigation";
import { useActionState } from "react";

import { login, type AuthFormState } from "@/lib/auth/actions";
import { AuthFields, FormStatus, SubmitButton } from "@/components/auth-form";

const initialState: AuthFormState = {};

export function LoginForm() {
  const searchParams = useSearchParams();
  const [state, formAction, pending] = useActionState(login, initialState);

  const callbackError =
    searchParams.get("error") === "auth_callback"
      ? "That sign-in link is invalid or has expired. Please log in again."
      : undefined;

  return (
    <form action={formAction} className="flex flex-col gap-4">
      <input type="hidden" name="next" value={searchParams.get("next") ?? "/"} />
      <AuthFields passwordAutoComplete="current-password" />
      <FormStatus error={state.error ?? callbackError} message={state.message} />
      <SubmitButton pending={pending}>Log in</SubmitButton>
    </form>
  );
}
