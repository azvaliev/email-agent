"use client";

import Link from "next/link";
import { Mail, ChevronRight } from "lucide-react";
import type { LocalEmail } from "@app/lib/db/local-emails";

type EmailCardProps = {
  email: LocalEmail;
};

export function EmailCard({ email }: EmailCardProps) {
  const displayFrom = email.fromUser ?? email.fromEmail ?? email.from;
  const formattedDate = formatRelativeTime(email.receivedAt);
  const href = email.url ?? "#";

  return (
    <Link
      href={href}
      className="flex items-center justify-between rounded-lg border border-zinc-800 bg-zinc-900/50 p-4 transition-colors hover:bg-zinc-800/50"
    >
      <div className="flex items-center gap-3 min-w-0">
        <div className="flex size-8 shrink-0 items-center justify-center rounded-full bg-zinc-800">
          <Mail className="size-4 text-zinc-400" />
        </div>
        <div className="flex flex-col min-w-0">
          <div className="flex items-center gap-2">
            <span className="text-sm font-medium text-zinc-200 truncate">
              {displayFrom}
            </span>
            <span className="text-xs text-zinc-500 shrink-0">
              {formattedDate}
            </span>
          </div>
          <span className="text-xs text-zinc-400 truncate">
            {email.subject}
          </span>
        </div>
      </div>
      <ChevronRight className="size-4 text-zinc-500 shrink-0" />
    </Link>
  );
}

function formatRelativeTime(isoString: string): string {
  const date = new Date(isoString);
  if (isNaN(date.getTime())) {
    return "";
  }

  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffMins = Math.floor(diffMs / 60000);
  const diffHours = Math.floor(diffMs / 3600000);
  const diffDays = Math.floor(diffMs / 86400000);

  if (diffMins < 1) return "now";
  if (diffMins < 60) return `${diffMins}m`;
  if (diffHours < 24) return `${diffHours}h`;
  if (diffDays < 7) return `${diffDays}d`;
  return date.toLocaleDateString();
}
