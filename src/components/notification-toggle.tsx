"use client";

import { Bell, BellOff, Loader2 } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@app/components/ui/button";
import {
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from "@app/components/ui/tabs";
import {
  usePushNotifications,
  type PushStatus,
} from "@app/lib/hooks/use-push-notifications";

function getStatusMessage(status: PushStatus): string {
  switch (status) {
    case "loading":
      return "Checking notification status...";
    case "unsupported":
      return "Push notifications are not supported on this device";
    case "subscribed":
      return "Notifications enabled";
    case "unsubscribed":
      return "Notifications disabled";
    case "denied":
      return "Notifications blocked in browser settings";
  }
}

function NotificationDescription({ isEnabled }: { isEnabled?: boolean }) {
  return (
    <p className="text-xs text-zinc-500">
      {isEnabled ? "You'll be notified" : "Get notified"} when important emails
      arrive, based on criteria you define.
    </p>
  );
}

export function NotificationToggle() {
  const { status, isLoading, enable, disable } = usePushNotifications();

  const handleEnable = async () => {
    const success = await enable();
    if (success) {
      toast.success("Notifications enabled");
    } else if (status === "denied") {
      toast.error("Notifications blocked", {
        description:
          "Please enable notifications in your browser settings to receive alerts.",
      });
    } else {
      toast.error("Failed to enable notifications");
    }
  };

  const handleDisable = async () => {
    const success = await disable();
    if (success) {
      toast.success("Notifications disabled");
    } else {
      toast.error("Failed to disable notifications");
    }
  };

  if (status === "loading") {
    return (
      <div className="flex items-center gap-3 text-zinc-400">
        <Loader2 className="size-4 animate-spin" />
        <span className="text-sm">{getStatusMessage(status)}</span>
      </div>
    );
  }

  if (status === "unsupported") {
    return (
      <div className="flex items-center gap-3 text-zinc-500">
        <BellOff className="size-4" />
        <span className="text-sm">{getStatusMessage(status)}</span>
      </div>
    );
  }

  if (status === "denied") {
    return (
      <div className="flex flex-col gap-4">
        <div className="flex flex-col gap-2">
          <div className="flex items-center gap-3">
            <BellOff className="size-4 text-zinc-500" />
            <span className="text-sm text-zinc-400">
              {getStatusMessage(status)}
            </span>
          </div>
          <NotificationDescription />
          <p className="text-xs text-zinc-500">
            To enable them, follow the steps for your browser:
          </p>
        </div>

        <Tabs defaultValue="safari" className="flex-col">
          <TabsList className="rounded-sm text-md">
            <TabsTrigger value="safari" className="flex-1">
              Safari
            </TabsTrigger>
            <TabsTrigger value="chrome" className="flex-1">
              Chrome
            </TabsTrigger>
            <TabsTrigger value="firefox" className="flex-1">
              Firefox
            </TabsTrigger>
          </TabsList>
          <TabsContent value="safari" className="text-xs text-zinc-400">
            <ol className="list-inside list-decimal space-y-1">
              <li>
                Tap the <strong>aA</strong> button in the address bar
              </li>
              <li>
                Tap <strong>Website Settings</strong>
              </li>
              <li>
                Set <strong>Notifications</strong> to <strong>Allow</strong>
              </li>
            </ol>
          </TabsContent>
          <TabsContent value="chrome" className="text-xs text-zinc-400">
            <ol className="list-inside list-decimal space-y-1">
              <li>
                Click the <strong>lock icon</strong> in the address bar
              </li>
              <li>
                Click <strong>Site settings</strong>
              </li>
              <li>
                Set <strong>Notifications</strong> to <strong>Allow</strong>
              </li>
            </ol>
          </TabsContent>
          <TabsContent value="firefox" className="text-xs text-zinc-400">
            <ol className="list-inside list-decimal space-y-1">
              <li>
                Click the <strong>lock icon</strong> in the address bar
              </li>
              <li>
                Click <strong>Connection secure</strong>
              </li>
              <li>
                Click <strong>More information</strong>
              </li>
              <li>
                Go to <strong>Permissions</strong> tab and allow notifications
              </li>
            </ol>
          </TabsContent>
        </Tabs>

        <Button
          onClick={handleEnable}
          disabled={isLoading}
          className="mx-auto px-3"
        >
          {isLoading ? (
            <Loader2 className="size-3 animate-spin" />
          ) : (
            "Try Again"
          )}
        </Button>
      </div>
    );
  }

  const isSubscribed = status === "subscribed";

  return (
    <div className="flex items-center justify-between gap-4">
      <div className="flex items-center gap-3">
        {isSubscribed ? (
          <Bell className="size-4 text-emerald-500" />
        ) : (
          <BellOff className="size-4 text-zinc-500" />
        )}
        <div className="flex flex-col gap-0.5">
          <span className="text-sm text-zinc-200">
            {getStatusMessage(status)}
          </span>
          <NotificationDescription isEnabled={isSubscribed} />
        </div>
      </div>
      <Button
        variant={isSubscribed ? "outline" : "default"}
        size="sm"
        onClick={isSubscribed ? handleDisable : handleEnable}
        disabled={isLoading}
      >
        {isLoading ? (
          <Loader2 className="size-3 animate-spin" />
        ) : isSubscribed ? (
          "Disable"
        ) : (
          "Enable"
        )}
      </Button>
    </div>
  );
}
