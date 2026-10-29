import type { Metadata } from "next";
import { Suspense } from "react";

import { AuthLink, AuthPage } from "@/components/auth-form";

import { SignupForm } from "./signup-form";

export const metadata: Metadata = { title: "Sign up" };

export default function SignupPage() {
  return (
    <AuthPage title="Create an account" footer={<>Already have an account? <AuthLink href="/login">Log in</AuthLink></>}>
      {/* The form reads ?next, which is request-time data. */}
      <Suspense>
        <SignupForm />
      </Suspense>
    </AuthPage>
  );
}
