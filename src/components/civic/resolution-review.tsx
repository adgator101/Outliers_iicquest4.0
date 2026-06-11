"use client";

import { useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import {
  Check,
  X,
  Loader2,
  Camera,
  MapPin,
  MapPinOff,
  BadgeCheck,
  ShieldAlert,
  Wrench,
  ImageOff,
} from "lucide-react";
import { useAction } from "next-safe-action/hooks";
import { verifyIssueAction } from "@/lib/actions/issues";
import { VerificationType } from "@/generated/prisma/enums";
import { cn, formatRelativeTime } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";

type Vote = "CONFIRM" | "DISPUTE" | null;
type Proof = { url: string; latitude: number | null; longitude: number | null };

export type ResolutionVote = {
  id: string;
  type: "CONFIRM" | "DISPUTE";
  isLocal: boolean;
  comment: string | null;
  proofImages: string[];
  createdAt: string | Date;
  userName: string | null;
};

function deviceLocation(): Promise<{ latitude: number; longitude: number } | null> {
  return new Promise((resolve) => {
    if (!("geolocation" in navigator)) return resolve(null);
    navigator.geolocation.getCurrentPosition(
      (pos) => resolve({ latitude: pos.coords.latitude, longitude: pos.coords.longitude }),
      () => resolve(null),
      { enableHighAccuracy: true, timeout: 8000 }
    );
  });
}

function initials(name: string | null) {
  if (!name) return "?";
  return name.split(" ").map((p) => p[0]).slice(0, 2).join("").toUpperCase() || "?";
}

// Transparent community review of an officer's "resolved" claim. Shows the
// officer's evidence, lets a resident confirm or dispute (with a reason + geotagged
// photo), and lists every vote openly — who, why, and their proof (STORY-018b).
export function ResolutionReview({
  issueId,
  myVote,
  beforeImages,
  officerEvidence,
  votes,
}: {
  issueId: string;
  myVote: Vote;
  beforeImages: string[];
  officerEvidence: {
    content: string;
    images: string[];
    authorName: string | null;
    at: string | Date;
  } | null;
  votes: ResolutionVote[];
}) {
  const router = useRouter();
  const [choice, setChoice] = useState<Vote>(myVote);
  const [comment, setComment] = useState("");
  const [proof, setProof] = useState<Proof | null>(null);
  const [proofBusy, setProofBusy] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);

  const { execute, isPending } = useAction(verifyIssueAction, {
    onSuccess: ({ data }) => {
      if (data?.newStatus === "REOPENED") {
        toast.success("Recorded — enough neighbours agree, the issue has been reopened.");
      } else {
        toast.success("Your verdict was recorded.");
      }
      setComment("");
      setProof(null);
      router.refresh();
    },
    onError: ({ error }) => toast.error(error.serverError ?? "Could not record your verdict."),
  });

  async function onProofSelected(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    setProofBusy(true);
    try {
      const devicePromise = deviceLocation();
      const fd = new FormData();
      fd.append("file", file);
      const res = await fetch("/api/uploads/proof", { method: "POST", body: fd });
      if (!res.ok) throw new Error("upload failed");
      const data = (await res.json()) as { url: string; latitude: number | null; longitude: number | null };
      const device = await devicePromise;
      setProof({
        url: data.url,
        latitude: data.latitude ?? device?.latitude ?? null,
        longitude: data.longitude ?? device?.longitude ?? null,
      });
    } catch {
      toast.error("Could not attach the photo.");
    } finally {
      setProofBusy(false);
      if (fileRef.current) fileRef.current.value = "";
    }
  }

  function submit(type: "CONFIRM" | "DISPUTE") {
    setChoice(type);
    execute({
      issueId,
      type: VerificationType[type],
      comment: comment.trim() || undefined,
      proofImages: proof ? [proof.url] : [],
      proofLatitude: proof?.latitude ?? undefined,
      proofLongitude: proof?.longitude ?? undefined,
    });
  }

  const fixed = votes.filter((v) => v.type === "CONFIRM");
  const broken = votes.filter((v) => v.type === "DISPUTE");

  const beforeImage = beforeImages[0] ?? null;
  const afterImages = officerEvidence?.images ?? [];
  const afterImage = afterImages[0] ?? null;

  return (
    <div className="space-y-5">
      {/* Before / After — the heart of the review */}
      <div className="space-y-2">
        <div className="grid grid-cols-2 gap-2 sm:gap-3">
          {/* Before */}
          <figure className="space-y-1.5">
            <div className="relative aspect-square overflow-hidden rounded-xl border bg-muted">
              {beforeImage ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={beforeImage} alt="Before — when reported" className="size-full object-cover" />
              ) : (
                <div className="grid size-full place-items-center text-center text-xs text-muted-foreground">
                  <span>
                    <ImageOff className="mx-auto mb-1 size-5" />
                    No report photo
                  </span>
                </div>
              )}
              <span className="absolute left-2 top-2 rounded-full bg-nilo/90 px-2 py-0.5 text-[11px] font-medium text-white">
                Before
              </span>
            </div>
            <figcaption className="text-center text-xs text-muted-foreground">When reported</figcaption>
          </figure>

          {/* After */}
          <figure className="space-y-1.5">
            <div className="relative aspect-square overflow-hidden rounded-xl border bg-muted">
              {afterImage ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={afterImage} alt="After — officer's proof" className="size-full object-cover" />
              ) : (
                <div className="grid size-full place-items-center text-center text-xs text-muted-foreground">
                  <span>
                    <ImageOff className="mx-auto mb-1 size-5" />
                    No proof photo
                  </span>
                </div>
              )}
              <span className="absolute left-2 top-2 rounded-full bg-emerald-600/90 px-2 py-0.5 text-[11px] font-medium text-white">
                After
              </span>
            </div>
            <figcaption className="text-center text-xs text-muted-foreground">Officer&apos;s proof</figcaption>
          </figure>
        </div>

        {/* Extra after photos, if any */}
        {afterImages.length > 1 && (
          <div className="flex flex-wrap gap-1.5">
            {afterImages.slice(1).map((src) => (
              // eslint-disable-next-line @next/next/no-img-element
              <img key={src} src={src} alt="Additional proof" className="size-14 rounded-md border object-cover" />
            ))}
          </div>
        )}

        {/* Who marked it resolved + their note */}
        {officerEvidence && (
          <p className="flex flex-wrap items-center gap-x-1.5 text-xs text-muted-foreground">
            <Wrench className="size-3.5 text-emerald-600 dark:text-emerald-400" />
            <span className="font-medium text-foreground/80">
              Marked resolved{officerEvidence.authorName ? ` by ${officerEvidence.authorName}` : ""}
            </span>
            · {formatRelativeTime(new Date(officerEvidence.at))}
            {officerEvidence.content ? <span className="w-full">{officerEvidence.content}</span> : null}
          </p>
        )}
      </div>

      {/* Your verdict */}
      <div className="space-y-2.5">
        <p className="text-sm font-medium">
          You&apos;re near this — is it actually fixed?
        </p>
        <div className="grid grid-cols-2 gap-2">
          <Button
            variant={choice === "CONFIRM" ? "default" : "outline"}
            disabled={isPending}
            onClick={() => submit("CONFIRM")}
            className={cn(
              "h-auto justify-start gap-2 py-2.5",
              choice === "CONFIRM" && "bg-emerald-600 hover:bg-emerald-600/90"
            )}
          >
            {isPending && choice === "CONFIRM" ? (
              <Loader2 className="size-4 animate-spin" />
            ) : (
              <Check className="size-4" />
            )}
            Yes, it&apos;s fixed
          </Button>
          <Button
            variant={choice === "DISPUTE" ? "default" : "outline"}
            disabled={isPending}
            onClick={() => submit("DISPUTE")}
            className={cn(
              "h-auto justify-start gap-2 py-2.5",
              choice === "DISPUTE" && "bg-simrik hover:bg-simrik/90"
            )}
          >
            {isPending && choice === "DISPUTE" ? (
              <Loader2 className="size-4 animate-spin" />
            ) : (
              <X className="size-4" />
            )}
            No, still broken
          </Button>
        </div>

        {/* Reason + proof — makes the verdict transparent to everyone */}
        <Textarea
          rows={2}
          maxLength={500}
          value={comment}
          onChange={(e) => setComment(e.target.value)}
          placeholder="Add a reason (shown publicly) — e.g. “drain still blocked near the corner”."
        />
        <div className="flex flex-wrap items-center gap-2">
          <input
            ref={fileRef}
            type="file"
            accept="image/*"
            capture="environment"
            className="hidden"
            onChange={onProofSelected}
          />
          <Button size="sm" variant="ghost" disabled={proofBusy} onClick={() => fileRef.current?.click()}>
            {proofBusy ? <Loader2 className="size-4 animate-spin" /> : <Camera className="size-4" />}
            {proof ? "Retake photo" : "Add photo proof"}
          </Button>
          {proof &&
            (proof.latitude != null ? (
              <span className="inline-flex items-center gap-1 text-xs text-emerald-600 dark:text-emerald-400">
                <MapPin className="size-3.5" /> Location captured — counts more
              </span>
            ) : (
              <span className="inline-flex items-center gap-1 text-xs text-muted-foreground">
                <MapPinOff className="size-3.5" /> No location on photo
              </span>
            ))}
        </div>
      </div>

      {/* Transparent tally */}
      <div className="flex flex-wrap gap-2 text-sm">
        <span className="inline-flex items-center gap-1.5 rounded-lg bg-emerald-500/10 px-2.5 py-1 text-emerald-700 dark:text-emerald-400">
          <BadgeCheck className="size-4" />
          {fixed.length} say fixed
        </span>
        <span className="inline-flex items-center gap-1.5 rounded-lg bg-simrik/10 px-2.5 py-1 text-simrik">
          <ShieldAlert className="size-4" />
          {broken.length} say still broken
        </span>
      </div>

      {/* Open list of every verdict — who, why, proof */}
      {votes.length > 0 && (
        <ul className="space-y-2.5">
          {votes
            .slice()
            .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
            .map((v) => {
              const isFixed = v.type === "CONFIRM";
              return (
                <li key={v.id} className="flex gap-2.5">
                  <span
                    className={cn(
                      "mt-0.5 grid size-8 shrink-0 place-items-center rounded-full text-xs font-medium",
                      isFixed
                        ? "bg-emerald-500/15 text-emerald-700 dark:text-emerald-400"
                        : "bg-simrik/15 text-simrik"
                    )}
                  >
                    {initials(v.userName)}
                  </span>
                  <div className="min-w-0 flex-1">
                    <p className="flex flex-wrap items-center gap-x-2 gap-y-0.5 text-sm">
                      <span className="font-medium">{v.userName ?? "Resident"}</span>
                      <span
                        className={cn(
                          "rounded-full px-1.5 py-0.5 text-[11px] font-medium",
                          isFixed
                            ? "bg-emerald-500/10 text-emerald-700 dark:text-emerald-400"
                            : "bg-simrik/10 text-simrik"
                        )}
                      >
                        {isFixed ? "Fixed" : "Still broken"}
                      </span>
                      {v.isLocal && (
                        <span className="text-xs text-muted-foreground">· this ward</span>
                      )}
                      <span className="text-xs text-muted-foreground">
                        · {formatRelativeTime(new Date(v.createdAt))}
                      </span>
                    </p>
                    {v.comment && <p className="mt-0.5 text-sm text-foreground/80">{v.comment}</p>}
                    {v.proofImages.length > 0 && (
                      <div className="mt-1.5 flex flex-wrap gap-1.5">
                        {v.proofImages.map((src) => (
                          // eslint-disable-next-line @next/next/no-img-element
                          <img key={src} src={src} alt="Proof" className="size-16 rounded-md border object-cover" />
                        ))}
                      </div>
                    )}
                  </div>
                </li>
              );
            })}
        </ul>
      )}

      <p className="text-xs text-muted-foreground">
        Verdicts from your ward and ones with a geotagged photo count more. If verified
        &ldquo;still broken&rdquo; reports outweigh the confirmations, the issue reopens
        automatically.
      </p>
    </div>
  );
}
