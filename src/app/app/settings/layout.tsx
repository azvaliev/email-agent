import type { ReactNode } from "react";

import { DashboardWrapper } from "@app/components/dashboard-wrapper";

export default function SettingsLayout({
  children,
}: {
  children: ReactNode;
}) {
  return (
    <DashboardWrapper>
      <main className="min-h-screen bg-zinc-950 text-white">
        <div className="mx-auto max-w-5xl px-6 py-12">{children}</div>
      </main>
    </DashboardWrapper>
  );
}
