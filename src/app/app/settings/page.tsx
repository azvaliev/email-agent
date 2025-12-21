import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { Button } from "@app/components/ui/button";
import { NotificationToggle } from "@app/components/notification-toggle";

export default function SettingsPage() {
  return (
    <div className="flex flex-col gap-8">
      {/* Header */}
      <div className="flex items-center gap-4">
        <Link href="/app/dashboard">
          <Button variant="ghost" size="icon" aria-label="Back to dashboard">
            <ArrowLeft className="size-5" />
          </Button>
        </Link>
        <h1 className="text-2xl font-semibold">Settings</h1>
      </div>

      {/* Settings Content */}
      <div className="flex flex-col gap-6">
        <div className="space-y-2">
          <h2 className="text-lg font-medium text-zinc-200">
            Push Notifications
          </h2>
          <p className="text-sm text-zinc-400">
            Configure how you receive notifications for important emails.
          </p>
        </div>

        <div className="rounded-lg border border-zinc-800 bg-zinc-900/50 p-6">
          <NotificationToggle />
        </div>
      </div>
    </div>
  );
}
