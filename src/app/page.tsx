import { redirect } from "next/navigation";

import { Badge } from "@app/components/ui/badge";
import {
  Card,
  CardHeader,
  CardTitle,
  CardDescription,
  CardContent,
} from "@app/components/ui/card";
import { SignInWithGoogleButton } from "@app/components/sign-in-with-google-button";
import { getServerSession } from "@app/lib/auth-server";

export default async function Home() {
  const session = await getServerSession();

  if (session) {
    redirect("/app/dashboard");
  }

  return (
    <main className="min-h-screen py-16">
      <div className="mx-auto flex max-w-5xl flex-col justify-around items-center gap-12 px-6 text-center">
        <div className="flex flex-col items-center gap-4">
          <Badge variant="secondary" className="uppercase tracking-wide">
            Email Agent
          </Badge>
          <h1 className="text-4xl font-semibold tracking-tight sm:text-5xl">
            Summaries and insights for your inbox in seconds
          </h1>
          <p className="max-w-2xl text-balance text-lg text-muted-foreground">
            Connect your Gmail account to generate daily summaries, flag
            important conversations, and teach the agent what really matters.
          </p>
          <SignInWithGoogleButton />
        </div>

        <Card className="w-full max-w-3xl text-left">
          <CardHeader>
            <CardTitle>What you get</CardTitle>
            <CardDescription>
              A quick snapshot of how Email Agent keeps you informed.
            </CardDescription>
          </CardHeader>
          <CardContent className="grid gap-6 sm:grid-cols-3">
            {[
              {
                title: "Daily Digest",
                body: "Catch up on every thread in one concise summary.",
              },
              {
                title: "Important Flags",
                body: "Automatically highlight anything that needs your attention.",
              },
              {
                title: "Personal Tuning",
                body: "Guide the agent so it learns what matters most to you.",
              },
            ].map((item) => (
              <div key={item.title} className="space-y-2">
                <h3 className="text-lg font-semibold text-white">
                  {item.title}
                </h3>
                <p className="text-sm text-zinc-400">{item.body}</p>
              </div>
            ))}
          </CardContent>
        </Card>
      </div>
    </main>
  );
}
