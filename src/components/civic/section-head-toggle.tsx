"use client";

import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Loader2, Star } from "lucide-react";
import { useAction } from "next-safe-action/hooks";
import { setSectionHeadAction } from "@/lib/actions/employees";
import { Button } from "@/components/ui/button";

export function SectionHeadToggle({
  userId,
  isSectionHead,
  hasDepartment,
}: {
  userId: string;
  isSectionHead: boolean;
  hasDepartment: boolean;
}) {
  const router = useRouter();
  const { execute, isPending } = useAction(setSectionHeadAction, {
    onSuccess: () => {
      toast.success(
        isSectionHead ? "Removed as section head" : "Set as section head"
      );
      router.refresh();
    },
    onError: ({ error }) => {
      toast.error(error.serverError ?? "Could not update the section head.");
    },
  });

  return (
    <Button
      size="sm"
      variant={isSectionHead ? "secondary" : "ghost"}
      disabled={isPending || (!hasDepartment && !isSectionHead)}
      title={
        !hasDepartment && !isSectionHead
          ? "Assign a section first"
          : undefined
      }
      onClick={() => execute({ userId, isSectionHead: !isSectionHead })}
    >
      {isPending ? (
        <Loader2 className="size-4 animate-spin" />
      ) : (
        <Star className={isSectionHead ? "size-4 fill-current" : "size-4"} />
      )}
      {isSectionHead ? "Section head" : "Make head"}
    </Button>
  );
}
