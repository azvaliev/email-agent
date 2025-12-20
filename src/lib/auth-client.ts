import { createAuthClient } from "better-auth/react";

export const authClient = createAuthClient();

export const { signIn, signOut, useSession, linkSocial } = authClient;

export function signInWithDashboardRedirect(
  provider: Parameters<typeof signIn.social>[0]["provider"],
) {
  return signIn.social({
    provider,
    callbackURL: "/dashboard",
  });
}
