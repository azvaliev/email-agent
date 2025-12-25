"use client";

import { useEffect } from "react";
import { Workbox } from "workbox-window";

export function ServiceWorkerRegister() {
  useEffect(() => {
    if ("serviceWorker" in navigator) {
      const wb = new Workbox("/sw.js");

      const onControlling = () => {
        window.location.reload();
      };

      wb.addEventListener("controlling", onControlling);
      wb.register();

      return () => {
        wb.removeEventListener("controlling", onControlling);
      };
    }
  }, []);

  return null;
}
