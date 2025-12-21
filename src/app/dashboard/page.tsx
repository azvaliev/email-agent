import { getServerSession } from "@app/lib/auth-server";
import { NotificationToggle } from "@app/components/notification-toggle";

export default async function DashboardPage() {
  const session = await getServerSession();
  const email = session?.user?.email ?? "";

  return (
    <div className="flex flex-col gap-8">
      <div className="text-center text-2xl font-semibold">
        {email ? `Signed in as ${email}` : "No user session"}
      </div>

      <div className="mx-auto w-full max-w-md rounded-lg border border-zinc-800 bg-zinc-900/50 p-4">
        <h2 className="mb-4 text-sm font-medium text-zinc-300">
          Notifications
        </h2>
        <NotificationToggle />
      </div>
    </div>
  );
}
