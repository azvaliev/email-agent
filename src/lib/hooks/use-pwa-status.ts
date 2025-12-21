"use client";

import { useMemo } from "react";

function isPWAInstalled(): boolean {
  if (typeof window === "undefined") {
    return false;
  }

  const standaloneMedia = window.matchMedia(
    "(display-mode: standalone)",
  ).matches;

  const iosStandalone =
    "standalone" in navigator && navigator.standalone === true;

  return standaloneMedia || iosStandalone;
}

export function usePWAStatus(): boolean {
  const isInstalled = useMemo(() => isPWAInstalled(), []);
  return isInstalled;
}
