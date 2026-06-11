"use client";

import { useRef, useState } from "react";
import { toast } from "sonner";
import { ThumbsUp, ThumbsDown, Loader2, Camera, MapPin, MapPinOff } from "lucide-react";
import { useAction } from "next-safe-action/hooks";
import { verifyIssueAction } from "@/lib/actions/issues";
import { IssueStatus, VerificationType } from "@/generated/prisma/enums";
import type { IssueStatus as IssueStatusType } from "@/generated/prisma/client";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

type Vote = "CONFIRM" | "DISPUTE" | null;
type Proof = { url: string; latitude: number | null; longitude: number | null };

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

export function VerifyIssueButtons({
  issueId,
  initialConfirmCount,
  initialDisputeCount,
  myVerification,
  issueStatus,
}: {
  issueId: string;
  initialConfirmCount: number;
  initialDisputeCount: number;
  myVerification: Vote;
  issueStatus: IssueStatusType;
}) {
  const [vote, setVote] = useState<Vote>(myVerification);
  const [confirmCount, setConfirmCount] = useState(initialConfirmCount);
  const [disputeCount, setDisputeCount] = useState(initialDisputeCount);
  const [proof, setProof] = useState<Proof | null>(null);
  const [proofBusy, setProofBusy] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);

  const { execute, isPending } = useAction(verifyIssueAction, {
    onSuccess: ({ data }) => {
      if (!data) return;
      setConfirmCount(data.confirmCount);
      setDisputeCount(data.disputeCount);
      toast.success(
        data.proofVerified
          ? "Recorded — photo location verified, your vote counts more."
          : "Your response was recorded."
      );
    },
    onError: ({ error }) => {
      toast.error(error.serverError ?? "Could not record your response.");
    },
  });

  const isResolution = issueStatus === IssueStatus.RESOLVED;

  async function onProofSelected(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    setProofBusy(true);
    try {
      // Capture device location as a fallback for missing EXIF GPS.
      const devicePromise = deviceLocation();
      const fd = new FormData();
      fd.append("file", file);
      const res = await fetch("/api/uploads/proof", { method: "POST", body: fd });
      if (!res.ok) throw new Error("upload failed");
      const data = (await res.json()) as {
        url: string;
        latitude: number | null;
        longitude: number | null;
      };
      const device = await devicePromise;
      const latitude = data.latitude ?? device?.latitude ?? null;
      const longitude = data.longitude ?? device?.longitude ?? null;
      setProof({ url: data.url, latitude, longitude });
      if (latitude == null) {
        toast.warning("Photo attached, but no location found — it won't boost your vote.");
      }
    } catch {
      toast.error("Could not attach the photo.");
    } finally {
      setProofBusy(false);
      if (fileRef.current) fileRef.current.value = "";
    }
  }

  function cast(type: "CONFIRM" | "DISPUTE") {
    setVote(type);
    execute({
      issueId,
      type: VerificationType[type],
      proofImages: proof ? [proof.url] : [],
      proofLatitude: proof?.latitude ?? undefined,
      proofLongitude: proof?.longitude ?? undefined,
    });
  }

  return (
    <div className="space-y-3">
      <div className="flex flex-wrap gap-2">
        <Button
          variant={vote === "CONFIRM" ? "default" : "outline"}
          disabled={isPending}
          onClick={() => cast("CONFIRM")}
          className={cn(vote === "CONFIRM" && "ring-2 ring-status-resolved/40")}
        >
          {isPending && vote === "CONFIRM" ? (
            <Loader2 className="size-4 animate-spin" />
          ) : (
            <ThumbsUp className="size-4" />
          )}
          {isResolution ? "Confirm resolution" : "Confirm this issue"}
          <span className="tabular-nums text-muted-foreground">({confirmCount})</span>
        </Button>
        <Button
          variant={vote === "DISPUTE" ? "default" : "outline"}
          disabled={isPending}
          onClick={() => cast("DISPUTE")}
          className={cn(vote === "DISPUTE" && "ring-2 ring-red-500/40")}
        >
          {isPending && vote === "DISPUTE" ? (
            <Loader2 className="size-4 animate-spin" />
          ) : (
            <ThumbsDown className="size-4" />
          )}
          {isResolution ? "Dispute resolution" : "Dispute this issue"}
          <span className="tabular-nums text-muted-foreground">({disputeCount})</span>
        </Button>
      </div>

      {/* Geotagged photo proof (camera capture) */}
      <div className="flex flex-wrap items-center gap-2">
        <input
          ref={fileRef}
          type="file"
          accept="image/*"
          capture="environment"
          className="hidden"
          onChange={onProofSelected}
        />
        <Button
          size="sm"
          variant="ghost"
          disabled={proofBusy}
          onClick={() => fileRef.current?.click()}
        >
          {proofBusy ? <Loader2 className="size-4 animate-spin" /> : <Camera className="size-4" />}
          {proof ? "Retake photo proof" : "Add photo proof"}
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

      <p className="text-xs text-muted-foreground">
        {isResolution
          ? "If most verifiers dispute the resolution, the issue is reopened."
          : "Verifications from your ward and ones with a geotagged photo count more. Use your camera — a photo taken at the spot proves you were there."}
      </p>
    </div>
  );
}
