import Link from "next/link";
import {
  ShieldCheck,
  Users,
  GitMerge,
  Network,
  AlarmClock,
  Map,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
const FEATURES = [
  {
    icon: GitMerge,
    title: "Reports cluster into issues",
    body: "40 reports about one pothole become a single issue — not 40 tickets. Duplication becomes a signal of community impact, not noise.",
  },
  {
    icon: Users,
    title: "Community impact score",
    body: "Every related report raises an issue's impact score and confidence, so the loudest real problems rise to the top automatically.",
},
  {
    icon: Network,
    title: "Root cause intelligence",
    body: "AI detects systemic patterns across issues and suggests root causes — but a human official always decides and creates them.",
  },
  {
    icon: AlarmClock,
    title: "Accountability & escalation",
    body: "Issues that sit too long escalate on their own SLA timers, so nothing quietly gets ignored.",
  },
  {
    icon: ShieldCheck,
    title: "Community verification",
    body: "Citizens confirm or dispute issues and resolutions, keeping officials honest end-to-end.",
  },
  {
    icon: Map,
    title: "National transparency",
    body: "A read-only national view surfaces active issues and clusters across every municipality and province.",
  },
];

export default function Home() {
  return (
    <div className="flex min-h-screen flex-col">
      <header className="border-b">
        <div className="mx-auto flex h-14 max-w-6xl items-center justify-between px-4">
          <span className="flex items-center gap-2 font-semibold">
            <ShieldCheck className="size-5 text-primary" />
            CivicChain <span className="text-sm font-normal text-muted-foreground">Nepal</span>
          </span>
          <div className="flex items-center gap-2">
            <Button variant="ghost" size="sm" render={<Link href="/login" />}>
              Log in
            </Button>
            <Button size="sm" render={<Link href="/register" />}>
              Get started
            </Button>
          </div>
        </div>
      </header>

      <main className="flex-1">
        <section className="mx-auto max-w-6xl px-4 py-20 text-center">
          <p className="mx-auto mb-4 w-fit rounded-full border px-3 py-1 text-xs font-medium text-muted-foreground">
            Civic accountability & governance intelligence
          </p>
          <h1 className="mx-auto max-w-3xl text-4xl font-semibold tracking-tight sm:text-5xl">
            Turn citizen reports into outcomes the system can&apos;t ignore.
          </h1>
          <p className="mx-auto mt-5 max-w-2xl text-lg text-muted-foreground">
            Traditional grievance systems collect complaints. CivicChain manages
            outcomes — aggregating reports, verifying issues, surfacing root causes,
            and tracking accountability from report to resolution.
          </p>
          <div className="mt-8 flex flex-col items-center justify-center gap-3 sm:flex-row">
            <Button size="lg" render={<Link href="/register" />}>
              Report an issue
            </Button>
            <Button size="lg" variant="outline" render={<Link href="/login" />}>
              Log in
            </Button>
          </div>
        </section>

        <section className="mx-auto max-w-6xl px-4 pb-24">
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {FEATURES.map((f) => (
              <Card key={f.title}>
                <CardContent className="space-y-2">
                  <f.icon className="size-6 text-primary" />
                  <h3 className="font-medium">{f.title}</h3>
                  <p className="text-sm text-muted-foreground">{f.body}</p>
                </CardContent>
              </Card>
            ))}
          </div>
        </section>
      </main>

      <footer className="border-t py-6">
        <div className="mx-auto max-w-6xl px-4 text-center text-sm text-muted-foreground">
          CivicChain Nepal — making civic issues accountable, transparent, and harder to ignore.
        </div>
      </footer>
    </div>
  );
}
