import { redirect } from "next/navigation";
import type { ReactNode } from "react";

import { getServerSession } from "@app/lib/auth-server";

export default async function AppLayout({ children }: { children: ReactNode }) {
  const session = await getServerSession();

  if (!session) {
    redirect("/");
  }

  return <>{children}</>;
}
