"use client";

import { useMemo } from "react";
import { usePWAStatus } from "@app/lib/hooks/use-pwa-status";
import { InstallPWAPrompt } from "./install-pwa-prompt";

function getIsMobileDevice(): boolean {
  if (typeof window === "undefined") {
    return false;
  }

  const userAgent = navigator.userAgent.toLowerCase();
  return /android|webos|iphone|ipad|ipod|blackberry|iemobile|opera mini/i.test(
    userAgent,
  );
}

interface DashboardWrapperProps {
  children: React.ReactNode;
}

export function DashboardWrapper({ children }: DashboardWrapperProps) {
  const isPWAInstalled = usePWAStatus();
  const isMobile = useMemo(() => getIsMobileDevice(), []);

  if (isMobile && !isPWAInstalled) {
    return <InstallPWAPrompt />;
  }

  return children;
}
