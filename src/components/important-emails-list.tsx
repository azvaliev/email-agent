"use client";

import { useLiveQuery } from "dexie-react-hooks";
import Link from "next/link";
import { Loader2, Mail } from "lucide-react";
import { Button } from "@app/components/ui/button";
import { EmailCard } from "./email-card";
import { db } from "@app/lib/db/local-emails";

type ImportantEmailsListProps = {
  limit?: number;
  showViewMore?: boolean;
};

export function ImportantEmailsList({
  limit = 5,
  showViewMore = true,
}: ImportantEmailsListProps) {
  const emails = useLiveQuery(
    () => db.emails.orderBy("receivedAt").reverse().limit(limit).toArray(),
    [limit],
  );

  if (emails === undefined) {
    return (
      <div className="rounded-lg border border-zinc-800 bg-zinc-900/50 p-6">
        <div className="flex items-center gap-2 text-zinc-400">
          <Loader2 className="size-4 animate-spin" />
          <span className="text-sm">Loading emails...</span>
        </div>
      </div>
    );
  }

  if (emails.length === 0) {
    return (
      <div className="rounded-lg border border-zinc-800 bg-zinc-900/50 p-6">
        <div className="flex flex-col items-center gap-2 text-center">
          <Mail className="size-8 text-zinc-600" />
          <p className="text-sm text-zinc-400">No important emails yet</p>
          <p className="text-xs text-zinc-500">
            When you receive important emails, they&apos;ll appear here
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="rounded-lg border border-zinc-800 bg-zinc-900/50 p-3 md:p-6">
      <div className="flex flex-col gap-4">
        <div className="space-y-2 md:space-y-4">
          {emails.map((email) => (
            <EmailCard key={email.messageId} email={email} />
          ))}
        </div>

        {showViewMore && emails.length >= limit && (
          <div className="flex justify-end">
            <Link href="/app/emails">
              <Button variant="ghost" size="sm">
                View all emails
              </Button>
            </Link>
          </div>
        )}
      </div>
    </div>
  );
}
