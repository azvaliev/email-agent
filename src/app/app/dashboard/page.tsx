"use client";

import Link from "next/link";
import { Settings } from "lucide-react";
import { usePushNotifications } from "@app/lib/hooks/use-push-notifications";
import { Button } from "@app/components/ui/button";
import { ImportantEmailsList } from "@app/components/important-emails-list";

export default function DashboardPage() {
  const { status } = usePushNotifications();
  const notificationsDisabled =
    status === "unsubscribed" ||
    status === "denied" ||
    status === "unsupported";

  return (
    <div className="flex flex-col gap-8">
      {/* MailBeaver Header */}
      <div className="flex items-center justify-between border-b border-zinc-800 pb-4">
        <h1 className="text-2xl font-semibold">MailBeaver</h1>
        <Link href="/app/settings">
          <Button variant="ghost" size="icon" aria-label="Settings">
            <Settings className="size-5" />
          </Button>
        </Link>
      </div>

      {/* Conditional Warning Banner */}
      {notificationsDisabled && (
        <div className="rounded-lg border border-amber-500/50 bg-amber-500/10 p-4">
          <div className="flex items-center gap-2 text-sm text-amber-200">
            <span className="font-medium">Notifications are disabled</span>
            <span className="text-amber-300/70">
              — Enable them in{" "}
              <Link
                href="/app/settings"
                className="underline hover:text-amber-200"
              >
                Settings
              </Link>{" "}
              to receive email alerts
            </span>
          </div>
        </div>
      )}

      {/* Dashboard Content */}
      <div className="flex flex-col gap-8">
        <div className="space-y-2">
          <h2 className="text-lg font-medium text-zinc-200">
            Important Emails
          </h2>
          <p className="text-sm text-zinc-400">
            Your latest flagged emails from connected accounts
          </p>
        </div>

        <ImportantEmailsList limit={5} showViewMore />
      </div>
    </div>
  );
}
