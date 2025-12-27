"use client";

import { useEffect } from "react";
import { toast } from "sonner";

import { useTRPC } from "@app/lib/trpc/client";
import { LinkGoogleAccountButton } from "./link-google-account-button";
import { Loader2, Mail } from "lucide-react";
import { Badge } from "./ui/badge";
import { useQuery } from "@tanstack/react-query";

export function LinkedAccountsList() {
  const trpc = useTRPC();
  const {
    data: accounts,
    isLoading,
    error,
  } = useQuery(trpc.account.list.queryOptions());

  useEffect(() => {
    if (error) {
      toast.error(error?.message || "Failed to load linked accounts");
    }
  }, [error]);

  if (isLoading) {
    return (
      <div className="flex items-center gap-2 text-zinc-400">
        <Loader2 className="size-4 animate-spin" />
        <span className="text-sm">Loading accounts...</span>
      </div>
    );
  }

  if (!accounts || error) {
    return null;
  }

  return (
    <div className="flex flex-col gap-4">
      <div className="space-y-4">
        {accounts.map((account) => (
          <div
            key={account.id}
            className="flex items-center justify-between rounded-lg border border-zinc-800 bg-zinc-900/50 p-4"
          >
            <div className="flex items-center gap-3">
              <div className="flex size-8 items-center justify-center rounded-full bg-zinc-800">
                <Mail className="size-4 text-zinc-400" />
              </div>
              <div className="flex flex-col">
                <span className="text-sm font-medium text-zinc-200">
                  {account.emailAddress}
                </span>
                <span className="text-xs text-zinc-500 capitalize">
                  {account.providerId}
                </span>
              </div>
            </div>
            <Badge variant="outline" className="text-zinc-400 border-zinc-700">
              Connected
            </Badge>
          </div>
        ))}
      </div>

      <div className="flex justify-end">
        <LinkGoogleAccountButton />
      </div>
    </div>
  );
}
