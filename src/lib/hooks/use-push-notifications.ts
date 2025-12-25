"use client";

import { useState, useEffect, useCallback } from "react";
import {
  isPushSupported,
  getNotificationPermission,
  getCurrentSubscription,
  subscribeToPush,
  unsubscribeFromPush,
  syncSubscriptionWithServer,
  removeSubscriptionFromServer,
  requestNotificationPermission,
  type PushPermissionState,
} from "@app/lib/push/client";

export type PushStatus =
  | "loading"
  | "unsupported"
  | "subscribed"
  | "unsubscribed"
  | "denied";

export interface UsePushNotificationsResult {
  status: PushStatus;
  permission: PushPermissionState;
  isLoading: boolean;
  enable: () => Promise<boolean>;
  disable: () => Promise<boolean>;
}

export function usePushNotifications(): UsePushNotificationsResult {
  const [status, setStatus] = useState<PushStatus>("loading");
  const [permission, setPermission] = useState<PushPermissionState>("default");
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    async function init() {
      if (!isPushSupported()) {
        setStatus("unsupported");
        setPermission("unsupported");
        return;
      }

      const currentPermission = getNotificationPermission();
      setPermission(currentPermission);

      if (currentPermission === "denied") {
        setStatus("denied");
        return;
      }

      const subscription = await getCurrentSubscription();

      if (subscription) {
        await syncSubscriptionWithServer(subscription);
        setStatus("subscribed");
      } else {
        setStatus("unsubscribed");
      }
    }

    init();
  }, []);

  const enable = useCallback(async (): Promise<boolean> => {
    if (!isPushSupported()) return false;

    setIsLoading(true);

    try {
      const permissionResult = await requestNotificationPermission();
      setPermission(permissionResult);

      if (permissionResult === "denied") {
        setStatus("denied");
        return false;
      }

      if (permissionResult !== "granted") {
        return false;
      }

      const subscription = await subscribeToPush();
      if (!subscription) {
        return false;
      }

      const synced = await syncSubscriptionWithServer(subscription);
      if (!synced) {
        await unsubscribeFromPush();
        return false;
      }

      setStatus("subscribed");
      return true;
    } finally {
      setIsLoading(false);
    }
  }, []);

  const disable = useCallback(async (): Promise<boolean> => {
    if (!isPushSupported()) return false;

    setIsLoading(true);

    try {
      const subscription = await getCurrentSubscription();

      if (subscription) {
        const removedFromServer = await removeSubscriptionFromServer(
          subscription.endpoint,
        );
        if (!removedFromServer) {
          return false;
        }

        const unsubscribed = await unsubscribeFromPush();
        if (!unsubscribed) {
          return false;
        }
      }

      setStatus("unsubscribed");
      return true;
    } finally {
      setIsLoading(false);
    }
  }, []);

  return {
    status,
    permission,
    isLoading,
    enable,
    disable,
  };
}
