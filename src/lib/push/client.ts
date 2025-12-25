"use client";

import { trpcClient } from "@app/lib/trpc/client";
import { urlBase64ToUint8Array, getVapidPublicKey } from "./vapid";

export type PushPermissionState =
  | "granted"
  | "denied"
  | "default"
  | "unsupported";

export function isPushSupported(): boolean {
  if (typeof window === "undefined") return false;
  return "PushManager" in window && "serviceWorker" in navigator;
}

export function getNotificationPermission(): PushPermissionState {
  if (!isPushSupported()) return "unsupported";
  return Notification.permission;
}

async function getServiceWorkerRegistration(): Promise<ServiceWorkerRegistration | null> {
  if (!("serviceWorker" in navigator)) return null;

  try {
    return await navigator.serviceWorker.ready;
  } catch {
    return null;
  }
}

export async function getCurrentSubscription(): Promise<PushSubscription | null> {
  const registration = await getServiceWorkerRegistration();
  if (!registration) return null;

  try {
    return await registration.pushManager.getSubscription();
  } catch {
    return null;
  }
}

export async function subscribeToPush(): Promise<PushSubscription | null> {
  const registration = await getServiceWorkerRegistration();
  if (!registration) {
    console.error("Service worker not registered");
    return null;
  }

  try {
    const vapidPublicKey = getVapidPublicKey();
    const applicationServerKey = urlBase64ToUint8Array(vapidPublicKey);

    const subscription = await registration.pushManager.subscribe({
      userVisibleOnly: true,
      applicationServerKey,
    });

    return subscription;
  } catch (error) {
    console.error("Failed to subscribe to push:", error);
    return null;
  }
}

export async function unsubscribeFromPush(): Promise<boolean> {
  const subscription = await getCurrentSubscription();
  if (!subscription) return true;

  try {
    return await subscription.unsubscribe();
  } catch (error) {
    console.error("Failed to unsubscribe from push:", error);
    return false;
  }
}

export interface SubscriptionData {
  endpoint: string;
  p256dh: string;
  auth: string;
}

export function extractSubscriptionData(
  subscription: PushSubscription,
): SubscriptionData | null {
  const keys = subscription.toJSON().keys;
  if (!keys?.p256dh || !keys?.auth) {
    console.error("Subscription missing required keys");
    return null;
  }

  return {
    endpoint: subscription.endpoint,
    p256dh: keys.p256dh,
    auth: keys.auth,
  };
}

export async function syncSubscriptionWithServer(
  subscription: PushSubscription,
): Promise<boolean> {
  const data = extractSubscriptionData(subscription);
  if (!data) return false;

  try {
    await trpcClient.push.subscribe.mutate(data);
    return true;
  } catch (error) {
    console.error("Failed to sync subscription with server:", error);
    return false;
  }
}

export async function removeSubscriptionFromServer(
  endpoint: string,
): Promise<boolean> {
  try {
    await trpcClient.push.unsubscribe.mutate({ endpoint });
    return true;
  } catch (error) {
    console.error("Failed to remove subscription from server:", error);
    return false;
  }
}

export async function requestNotificationPermission(): Promise<NotificationPermission> {
  if (!isPushSupported()) {
    throw new Error("Push notifications are not supported");
  }

  return await Notification.requestPermission();
}
