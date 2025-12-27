"use client";

import { useState, useRef, useCallback, useEffect } from "react";
import Link from "next/link";
import { ArrowLeft, Loader2, Mail } from "lucide-react";
import { useLiveQuery } from "dexie-react-hooks";
import { useVirtualizer } from "@tanstack/react-virtual";
import { Button } from "@app/components/ui/button";
import { EmailCard } from "@app/components/email-card";
import { db } from "@app/lib/db/local-emails";

const PAGE_SIZE = 20;

export default function EmailsPage() {
  const [limit, setLimit] = useState(PAGE_SIZE);
  const [isLoading, setIsLoading] = useState(false);
  const parentRef = useRef<HTMLDivElement>(null);

  const emails = useLiveQuery(
    () => db.emails.orderBy("receivedAt").reverse().limit(limit).toArray(),
    [limit],
  );

  const totalCount = useLiveQuery(() => db.emails.count());

  const hasMore = emails && totalCount ? emails.length < totalCount : false;

  const loadMore = useCallback(() => {
    setIsLoading(true);
    setLimit((prev) => prev + PAGE_SIZE);
  }, []);

  useEffect(() => {
    setIsLoading(false);
  }, [emails?.length]);

  const rowVirtualizer = useVirtualizer({
    count: emails ? (hasMore ? emails.length + 1 : emails.length) : 0,
    getScrollElement: () => parentRef.current,
    estimateSize: () => 80,
    overscan: 5,
    onChange: (instance) => {
      const items = instance.getVirtualItems();
      const lastItem = items[items.length - 1];

      if (
        lastItem &&
        emails &&
        lastItem.index >= emails.length - 1 &&
        hasMore &&
        !isLoading
      ) {
        loadMore();
      }
    },
  });

  if (emails === undefined) {
    return (
      <div className="flex flex-col gap-8">
        <Header />
        <div className="rounded-lg border border-zinc-800 bg-zinc-900/50 p-6">
          <div className="flex items-center gap-2 text-zinc-400">
            <Loader2 className="size-4 animate-spin" />
            <span className="text-sm">Loading emails...</span>
          </div>
        </div>
      </div>
    );
  }

  if (emails.length === 0) {
    return (
      <div className="flex flex-col gap-8">
        <Header />
        <div className="rounded-lg border border-zinc-800 bg-zinc-900/50 p-6">
          <div className="flex flex-col items-center gap-2 text-center">
            <Mail className="size-8 text-zinc-600" />
            <p className="text-sm text-zinc-400">No important emails yet</p>
            <p className="text-xs text-zinc-500">
              When you receive important emails, they&apos;ll appear here
            </p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-8">
      <Header />

      <div
        ref={parentRef}
        className="h-[calc(100vh-200px)] overflow-auto rounded-lg border border-zinc-800 bg-zinc-900/50"
      >
        <div
          style={{
            height: `${rowVirtualizer.getTotalSize()}px`,
            width: "100%",
            position: "relative",
          }}
        >
          {rowVirtualizer.getVirtualItems().map((virtualItem) => {
            const isLoaderRow = virtualItem.index >= emails.length;

            if (isLoaderRow) {
              return (
                <div
                  key="loader"
                  style={{
                    position: "absolute",
                    top: 0,
                    left: 0,
                    width: "100%",
                    height: `${virtualItem.size}px`,
                    transform: `translateY(${virtualItem.start}px)`,
                  }}
                  className="flex items-center justify-center p-4"
                >
                  <Loader2 className="size-4 animate-spin text-zinc-400" />
                </div>
              );
            }

            const email = emails[virtualItem.index];
            if (!email) return null;

            return (
              <div
                key={email.messageId}
                style={{
                  position: "absolute",
                  top: 0,
                  left: 0,
                  width: "100%",
                  height: `${virtualItem.size}px`,
                  transform: `translateY(${virtualItem.start}px)`,
                }}
                className="p-2"
              >
                <EmailCard email={email} />
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}

function Header() {
  return (
    <div className="flex items-center gap-4">
      <Link href="/app/dashboard">
        <Button variant="ghost" size="icon" aria-label="Back to dashboard">
          <ArrowLeft className="size-5" />
        </Button>
      </Link>
      <h1 className="text-2xl font-semibold">Important Emails</h1>
    </div>
  );
}
