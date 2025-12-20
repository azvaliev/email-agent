"use client";

import { Button } from "@app/components/ui/button";
import { signIn } from "@app/lib/auth-client";

export function SignInWithGoogleButton() {
  return (
    <Button
      size="lg"
      onClick={() =>
        signIn.social({ provider: "google", callbackURL: "/dashboard" })
      }
    >
      Sign in with Google
    </Button>
  );
}
