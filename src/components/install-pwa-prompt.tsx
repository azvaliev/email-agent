"use client";

import { useMemo } from "react";

export function InstallPWAPrompt() {
  const isIOS = useMemo(
    () =>
      typeof window !== "undefined" &&
      /iphone|ipad|ipod/.test(navigator.userAgent.toLowerCase()),
    [],
  );

  return (
    <div className="fixed inset-0 z-50 flex flex-col bg-zinc-950 text-white">
      <div className="flex-1 flex flex-col items-center justify-center px-6">
        <div className="max-w-sm text-center space-y-6">
          <div className="space-y-2">
            <h1 className="text-3xl font-bold">Install MailBeaver</h1>
            <p className="text-zinc-400">
              Add MailBeaver to your home screen for the best experience and to
              receive notifications
            </p>
          </div>

          <div className="bg-zinc-900 rounded-lg p-6 space-y-4">
            <div className="space-y-3">
              {isIOS ? (
                <>
                  <div className="text-left space-y-2">
                    <div className="font-semibold text-sm text-zinc-300">
                      Step 1: Tap the Share button
                    </div>
                    <p className="text-sm text-zinc-500">
                      Look for the share icon (arrow pointing up) in the bottom
                      toolbar or top-right corner
                    </p>
                  </div>
                  <div className="text-left space-y-2">
                    <div className="font-semibold text-sm text-zinc-300">
                      Step 2: Tap &ldquo;Add to Home Screen&rdquo;
                    </div>
                    <p className="text-sm text-zinc-500">
                      Scroll down and select &ldquo;Add to Home Screen&rdquo;
                    </p>
                  </div>
                  <div className="text-left space-y-2">
                    <div className="font-semibold text-sm text-zinc-300">
                      Step 3: Confirm the name and tap Add
                    </div>
                    <p className="text-sm text-zinc-500">
                      You can keep the default name or customize it
                    </p>
                  </div>
                </>
              ) : (
                <>
                  <div className="text-left space-y-2">
                    <div className="font-semibold text-sm text-zinc-300">
                      Step 1: Tap the menu button
                    </div>
                    <p className="text-sm text-zinc-500">
                      Look for the three dots (⋮) in the top-right or
                      bottom-right corner
                    </p>
                  </div>
                  <div className="text-left space-y-2">
                    <div className="font-semibold text-sm text-zinc-300">
                      Step 2: Tap &ldquo;Install app&rdquo; or &ldquo;Add to
                      Home screen&rdquo;
                    </div>
                    <p className="text-sm text-zinc-500">
                      Select the install option from the menu
                    </p>
                  </div>
                  <div className="text-left space-y-2">
                    <div className="font-semibold text-sm text-zinc-300">
                      Step 3: Confirm the installation
                    </div>
                    <p className="text-sm text-zinc-500">
                      Tap Install to add MailBeaver to your home screen
                    </p>
                  </div>
                </>
              )}
            </div>
          </div>

          <p className="text-sm text-zinc-500">
            Once installed, return to this page to access your dashboard and
            enable notifications
          </p>
        </div>
      </div>

      <div className="h-[10%] border-t border-zinc-900 px-6 py-4 flex items-center justify-center">
        <p className="text-sm text-zinc-500">
          Installed the app? Refresh the page
        </p>
      </div>
    </div>
  );
}
