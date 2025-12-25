"use client";

import { useEffect } from "react";
import { useParams } from "next/navigation";
import { Button } from "@app/components/ui/button";

export default function MessageRedirectPage() {
  const params = useParams();
  const encodedId = params.id as string;
  // Next.js automatically decodes the route param, so this is the raw Message-ID (e.g., "<id@mail.gmail.com>")
  const messageId = encodedId;
  const deepLink = messageId ? `message://${messageId}` : null;

  useEffect(() => {
    if (!deepLink) {
      return;
    }

    // Redirect to the deep link
    window.location.replace(deepLink);

    // Attempt to close the window after a short delay
    // This only works for windows opened by scripts (like sw.clients.openWindow)
    const timer = setTimeout(() => {
      window.close();
    }, 500);

    return () => clearTimeout(timer);
  }, [deepLink]);

  if (!encodedId || !deepLink) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-black text-white">
        <div className="text-center">
          <p className="text-lg">Invalid message link</p>
        </div>
      </div>
    );
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-black text-white">
      <div className="text-center space-y-8">
        <div className="space-y-2">
          <h1 className="text-2xl font-semibold">Opening Mail...</h1>
          <p className="text-gray-400">Redirecting you to the Mail app</p>
        </div>
        <a href={deepLink}>
          <Button variant="link">Click here if not redirected</Button>
        </a>
      </div>
    </div>
  );
}
