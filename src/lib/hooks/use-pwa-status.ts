"use client";

import { useMemo } from "react";

interface IOSNavigator extends Navigator {
  standalone?: boolean;
}

function isPWAInstalled(): boolean {
  if (typeof window === "undefined") {
    return false;
  }

  const standaloneMedia = window.matchMedia(
    "(display-mode: standalone)",
  ).matches;

  const iosStandalone =
    ((navigator as IOSNavigator).standalone ?? false) === true;

  return standaloneMedia || iosStandalone;
}

export function usePWAStatus(): boolean {
  const isInstalled = useMemo(() => isPWAInstalled(), []);
  return isInstalled;
}
