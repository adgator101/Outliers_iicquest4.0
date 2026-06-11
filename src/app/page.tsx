import Link from "next/link";
import { GitMerge, Users, Network, MapPin } from "lucide-react";
import { TopNav } from "@/components/layout/top-nav";
import { BrandMark, PennantMark } from "@/components/layout/brand-mark";
import { Button } from "@/components/ui/button";

const STEPS = [
  {
    title: "Report",
    body: "A citizen reports a problem with a photo and location — in their own words, Nepali or English.",
  },
  {
    title: "Cluster",
    body: "Reports about the same problem merge into one issue. 14 reports become one case, not 14 tickets.",
  },
  {
    title: "Verify",
    body: "Neighbours confirm the issue is real. Three confirmations move it into the municipality's queue.",
  },
  {
    title: "Assign",
    body: "The section head routes it to an officer. Every handoff is recorded on a public timeline.",
  },
  {
    title: "Resolve",
    body: "The officer posts photo evidence of the fix. The community confirms — or reopens it.",
  },
];

const FEATURES = [
  {
    icon: GitMerge,
    title: "Duplication is a signal",
    body: "More reports on one problem means more people affected — priority rises automatically with the count.",
  },
  {
    icon: Network,
    title: "Root causes, not symptoms",
    body: "Patterns across nearby issues surface systemic causes. A human official always reviews before anything is created.",
  },
  {
    icon: Users,
    title: "Community keeps it honest",
    body: "Citizens verify both the problem and the fix. A resolution only stands when the people who reported it agree.",
  },
  {
    icon: MapPin,
    title: "Nothing sits quietly",
    body: "Issues that wait too long are flagged in plain terms — \"Unassigned 5d\", \"Open 17d\" — visible to everyone.",
  },
];

function MockIssueCard() {
  return (
    <div className="w-full max-w-sm">
      {/* stacked report hints behind the card */}
      <div className="relative">
        <div className="absolute -top-3 left-3 right-3 h-10 rounded-lg border border-border bg-card/60" />
        <div className="absolute -top-1.5 left-1.5 right-1.5 h-10 rounded-lg border border-border bg-card/80" />
        <div className="pennant-clip relative rounded-lg border border-border bg-card p-5 shadow-sm">
          <div className="flex items-start justify-between gap-3">
            <div>
              <p className="font-heading text-lg font-semibold leading-tight">
                Road damage — Bhrikuti Chowk
              </p>
              <p className="mt-0.5 text-xs text-muted-foreground">
                Ward 7 · Lalitpur Metropolitan City
              </p>
            </div>
            <span className="rounded-full bg-priority-high/10 px-2.5 py-0.5 text-xs font-semibold text-priority-high">
              HIGH
            </span>
          </div>

          <div className="mt-4 space-y-1.5">
            <div className="flex items-center justify-between text-xs">
              <span className="font-medium">14 citizens affected</span>
              <span className="text-muted-foreground">Open 3d</span>
            </div>
            <div className="h-2 overflow-hidden rounded-full bg-muted">
              <div className="h-full w-[88%] rounded-full bg-simrik" />
            </div>
          </div>

          <div className="mt-4 flex items-center gap-2 border-t border-border pt-3 text-xs text-muted-foreground">
            <GitMerge className="size-3.5 text-simrik" />
            14 reports merged into one issue
          </div>
        </div>
      </div>
    </div>
  );
}

export default function Home() {
  return (
    <div className="flex min-h-screen flex-col">
      <TopNav />

      <main className="flex-1">
        {/* Hero */}
        <section className="mx-auto grid max-w-6xl items-center gap-12 px-4 py-16 sm:py-24 lg:grid-cols-[1.1fr_0.9fr]">
          <div>
            <p className="mb-4 flex items-center gap-2 text-xs font-medium uppercase tracking-[0.18em] text-simrik">
              <PennantMark className="size-4" />
              जनताको आवाज — on the record
            </p>
            <h1 className="max-w-xl text-5xl font-semibold leading-[1.05] tracking-tight sm:text-6xl">
              Reports the system can&apos;t ignore.
            </h1>
            <p className="mt-5 max-w-lg text-lg leading-relaxed text-muted-foreground">
              CivicChain turns citizen complaints into public, trackable issues —
              clustered by community, verified by neighbours, and followed from
              report to resolution.
            </p>
            <div className="mt-8 flex flex-col gap-3 sm:flex-row">
              <Button size="lg" render={<Link href="/register" />}>
                Report an issue
              </Button>
              <Button size="lg" variant="outline" render={<Link href="/login" />}>
                Log in
              </Button>
            </div>
          </div>

          <div className="flex justify-center lg:justify-end">
            <MockIssueCard />
          </div>
        </section>

        {/* How it works — a real sequence, so the numbering carries meaning */}
        <section className="border-y border-border bg-card">
          <div className="mx-auto max-w-6xl px-4 py-16">
            <h2 className="text-2xl font-semibold tracking-tight">
              From complaint to closed — in public
            </h2>
            <div className="mt-8 grid gap-8 sm:grid-cols-2 lg:grid-cols-5">
              {STEPS.map((s, i) => (
                <div key={s.title}>
                  <p className="font-heading text-3xl font-semibold text-simrik">
                    {String(i + 1).padStart(2, "0")}
                  </p>
                  <h3 className="mt-2 text-base font-semibold">{s.title}</h3>
                  <p className="mt-1.5 text-sm leading-relaxed text-muted-foreground">
                    {s.body}
                  </p>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* Principles */}
        <section className="mx-auto max-w-6xl px-4 py-16">
          <div className="grid gap-x-10 gap-y-10 sm:grid-cols-2">
            {FEATURES.map((f) => (
              <div key={f.title} className="flex gap-4">
                <div className="flex size-10 shrink-0 items-center justify-center rounded-lg bg-accent">
                  <f.icon className="size-5 text-simrik" />
                </div>
                <div>
                  <h3 className="text-base font-semibold">{f.title}</h3>
                  <p className="mt-1 text-sm leading-relaxed text-muted-foreground">
                    {f.body}
                  </p>
                </div>
              </div>
            ))}
          </div>
        </section>
      </main>

      <footer className="bg-nilo py-10 text-white">
        <div className="mx-auto flex max-w-6xl flex-col items-start justify-between gap-6 px-4 sm:flex-row sm:items-center">
          <BrandMark inverted />
          <p className="text-sm text-white/70">
            Making civic issues accountable, transparent, and harder to ignore.
          </p>
        </div>
      </footer>
    </div>
  );
}
