"use client";

import { Button } from "@app/components/ui/button";
import { signIn } from "@app/lib/auth-client";
import { toast } from "sonner";

export function SignInWithGoogleButton() {
  const handleSignIn = async () => {
    const { error } = await signIn.social({
      provider: "google",
      callbackURL: "/app/dashboard",
    });

    if (error) {
      toast.error(error.message);
    }
  };

  return (
    <Button size="lg" onClick={handleSignIn}>
      Sign in with Google
    </Button>
  );
}
