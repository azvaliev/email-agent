"use client";

import { Button } from "@app/components/ui/button";
import { linkSocial } from "@app/lib/auth-client";
import { toast } from "sonner";
import { Plus } from "lucide-react";

export function LinkGoogleAccountButton() {
  const handleLink = async () => {
    const { error } = await linkSocial({
      provider: "google",
      callbackURL: "/app/settings",
    });

    if (error) {
      toast.error(error.message);
    }
  };

  return (
    <Button variant="outline" onClick={handleLink} className="w-full sm:w-auto">
      <Plus className="mr-2 size-4" />
      Link Google Account
    </Button>
  );
}
