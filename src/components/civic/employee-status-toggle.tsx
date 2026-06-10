"use client";

import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Loader2 } from "lucide-react";
import { useAction } from "next-safe-action/hooks";
import { setEmployeeActiveAction } from "@/lib/actions/employees";
import { Button } from "@/components/ui/button";

export function EmployeeStatusToggle({
  userId,
  isActive,
}: {
  userId: string;
  isActive: boolean;
}) {
  const router = useRouter();
  const { execute, isPending } = useAction(setEmployeeActiveAction, {
    onSuccess: () => {
      toast.success(isActive ? "Employee deactivated" : "Employee reactivated");
      router.refresh();
    },
    onError: ({ error }) => {
      toast.error(error.serverError ?? "Could not update the employee.");
    },
  });

  return (
    <Button
      size="sm"
      variant={isActive ? "ghost" : "outline"}
      disabled={isPending}
      onClick={() => execute({ userId, isActive: !isActive })}
    >
      {isPending && <Loader2 className="size-4 animate-spin" />}
      {isActive ? "Deactivate" : "Reactivate"}
    </Button>
  );
}
