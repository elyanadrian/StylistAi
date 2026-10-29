"use client";

import { useSearchParams } from "next/navigation";
import { useActionState } from "react";

import { signup, type AuthFormState } from "@/lib/auth/actions";
import { AuthFields, FormStatus, SubmitButton } from "@/components/auth-form";

const initialState: AuthFormState = {};

export function SignupForm() {
  const searchParams = useSearchParams();
  const [state, formAction, pending] = useActionState(signup, initialState);

  return (
    <form action={formAction} className="flex flex-col gap-4">
      <input type="hidden" name="next" value={searchParams.get("next") ?? "/"} />
      <AuthFields passwordAutoComplete="new-password" passwordMinLength={8} />
      <FormStatus error={state.error} message={state.message} />
      <SubmitButton pending={pending}>Sign up</SubmitButton>
    </form>
  );
}
