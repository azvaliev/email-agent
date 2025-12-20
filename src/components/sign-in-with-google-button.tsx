"use client";

import { Button } from "@app/components/ui/button";
import { signInWithDashboardRedirect } from "@app/lib/auth-client";

export function SignInWithGoogleButton() {
  return (
    <Button size="lg" onClick={() => signInWithDashboardRedirect("google")}>
      Sign in with Google
    </Button>
  );
}
