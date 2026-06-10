"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Loader2, ImagePlus, X } from "lucide-react";
import { useAction } from "next-safe-action/hooks";
import { updateIssueStatusAction } from "@/lib/actions/issues";
import { statusLabel } from "@/lib/utils";
import type { IssueStatus } from "@/generated/prisma/client";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";

async function uploadImages(files: File[]): Promise<string[]> {
  if (files.length === 0) return [];
  const fd = new FormData();
  files.forEach((f) => fd.append("files", f));
  const res = await fetch("/api/uploads", { method: "POST", body: fd });
  if (!res.ok) {
    const data = await res.json().catch(() => ({}));
    throw new Error(data.error ?? "Image upload failed");
  }
  const data = (await res.json()) as { urls: string[] };
  return data.urls;
}

export function StatusUpdateForm({
  issueId,
  allowedNextStatuses,
}: {
  issueId: string;
  allowedNextStatuses: IssueStatus[];
}) {
  const router = useRouter();
  const [target, setTarget] = useState<IssueStatus | null>(null);
  const [comment, setComment] = useState("");
  const [files, setFiles] = useState<File[]>([]);
  const [uploading, setUploading] = useState(false);

  const { execute, isPending } = useAction(updateIssueStatusAction, {
    onSuccess: () => {
      toast.success("Status updated.");
      setTarget(null);
      setComment("");
      setFiles([]);
      router.refresh();
    },
    onError: ({ error }) => {
      toast.error(error.serverError ?? "Could not update status.");
    },
  });

  function onPickFiles(e: React.ChangeEvent<HTMLInputElement>) {
    const picked = Array.from(e.target.files ?? []);
    setFiles((prev) => [...prev, ...picked].slice(0, 5));
    e.target.value = "";
  }

  async function submit() {
    if (!target) return;
    setUploading(true);
    try {
      const images = await uploadImages(files);
      execute({ issueId, status: target, comment: comment || undefined, images });
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Upload failed");
    } finally {
      setUploading(false);
    }
  }

  if (allowedNextStatuses.length === 0) {
    return (
      <p className="text-sm text-muted-foreground">
        No status changes available at this stage.
      </p>
    );
  }

  const busy = isPending || uploading;

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap gap-2">
        {allowedNextStatuses.map((s) => (
          <Button
            key={s}
            size="sm"
            variant={target === s ? "default" : "outline"}
            onClick={() => setTarget(s)}
          >
            Mark {statusLabel(s)}
          </Button>
        ))}
      </div>

      {target && (
        <div className="space-y-3 rounded-lg border p-3">
          <div className="space-y-1.5">
            <Label htmlFor="statusComment">Note</Label>
            <Textarea
              id="statusComment"
              rows={3}
              maxLength={500}
              value={comment}
              onChange={(e) => setComment(e.target.value)}
              placeholder={`Add context for marking this ${statusLabel(target)}.`}
            />
          </div>

          <div className="space-y-1.5">
            <Label>Evidence photos (optional, up to 5)</Label>
            <div className="flex flex-wrap gap-3">
              {files.map((file, idx) => (
                <div
                  key={idx}
                  className="relative size-20 overflow-hidden rounded-md border"
                >
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src={URL.createObjectURL(file)}
                    alt={file.name}
                    className="size-full object-cover"
                  />
                  <button
                    type="button"
                    onClick={() => setFiles((p) => p.filter((_, i) => i !== idx))}
                    className="absolute right-0.5 top-0.5 rounded-full bg-background/80 p-0.5"
                    aria-label="Remove image"
                  >
                    <X className="size-3.5" />
                  </button>
                </div>
              ))}
              {files.length < 5 && (
                <label className="grid size-20 cursor-pointer place-items-center rounded-md border border-dashed text-muted-foreground hover:bg-muted/40">
                  <ImagePlus className="size-5" />
                  <input
                    type="file"
                    accept="image/png,image/jpeg,image/webp"
                    multiple
                    className="hidden"
                    onChange={onPickFiles}
                  />
                </label>
              )}
            </div>
          </div>

          <div className="flex gap-2">
            <Button disabled={busy} onClick={submit}>
              {busy && <Loader2 className="size-4 animate-spin" />}
              Confirm {statusLabel(target)}
            </Button>
            <Button variant="ghost" disabled={busy} onClick={() => setTarget(null)}>
              Cancel
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}
