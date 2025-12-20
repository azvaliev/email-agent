import { getServerSession } from "@app/lib/auth-server";

export default async function DashboardPage() {
  const session = await getServerSession();
  const email = session?.user?.email ?? "";

  return (
    <div className="flex min-h-[60vh] items-center justify-center">
      <div className="text-center text-2xl font-semibold">
        {email ? `Signed in as ${email}` : "No user session"}
      </div>
    </div>
  );
}
