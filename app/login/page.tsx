import type { Metadata } from "next";
import { Suspense } from "react";

import { AuthLink, AuthPage } from "@/components/auth-form";

import { LoginForm } from "./login-form";

export const metadata: Metadata = { title: "Log in" };

export default function LoginPage() {
  return (
    <AuthPage title="Log in" footer={<>No account yet? <AuthLink href="/signup">Sign up</AuthLink></>}>
      {/* The form reads ?next and ?error, which are request-time data. */}
      <Suspense>
        <LoginForm />
      </Suspense>
    </AuthPage>
  );
}
