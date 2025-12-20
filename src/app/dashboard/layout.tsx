import { redirect } from "next/navigation";
import type { ReactNode } from "react";

import { getServerSession } from "@app/lib/auth-server";

export default async function DashboardLayout({
  children,
}: {
  children: ReactNode;
}) {
  const session = await getServerSession();

  if (!session) {
    redirect("/");
  }

  return (
    <main className="min-h-screen bg-zinc-950 text-white">
      <div className="mx-auto max-w-5xl px-6 py-12">{children}</div>
    </main>
  );
}
