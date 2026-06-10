"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Loader2, UserPlus } from "lucide-react";
import { useAction } from "next-safe-action/hooks";
import { createEmployeeAction } from "@/lib/actions/employees";
import { DEPARTMENT_LABELS, DEPARTMENT_OPTIONS } from "@/lib/departments";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import type { Department } from "@/generated/prisma/client";

const EMPTY = {
  name: "",
  email: "",
  password: "",
  department: "" as Department | "",
  wardNumber: "",
};

export function AddEmployeeDialog() {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState(EMPTY);

  const { execute, isPending } = useAction(createEmployeeAction, {
    onSuccess: ({ data }) => {
      toast.success("Employee added", {
        description: `Share these sign-in details with ${data?.employee.name}: ${data?.employee.email}`,
      });
      setForm(EMPTY);
      setOpen(false);
      router.refresh();
    },
    onError: ({ error }) => {
      toast.error(error.serverError ?? "Could not add the employee.");
    },
  });

  function set<K extends keyof typeof form>(key: K, value: (typeof form)[K]) {
    setForm((f) => ({ ...f, [key]: value }));
  }

  function submit() {
    if (!form.department) {
      toast.error("Choose a section for this employee.");
      return;
    }
    execute({
      name: form.name,
      email: form.email,
      password: form.password,
      department: form.department,
      wardNumber: form.wardNumber ? Number(form.wardNumber) : undefined,
    });
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger
        render={
          <Button size="sm">
            <UserPlus className="size-4" />
            Add employee
          </Button>
        }
      />
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Add a team member</DialogTitle>
          <DialogDescription>
            They&rsquo;ll be added to your municipality. Share the sign-in details so
            they can log in and change their password.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          <div className="space-y-1.5">
            <Label htmlFor="emp-name">Full name</Label>
            <Input
              id="emp-name"
              value={form.name}
              onChange={(e) => set("name", e.target.value)}
              placeholder="Sita Sharma"
            />
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="emp-email">Email</Label>
            <Input
              id="emp-email"
              type="email"
              value={form.email}
              onChange={(e) => set("email", e.target.value)}
              placeholder="officer@palika.gov.np"
            />
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="emp-password">Temporary password</Label>
            <Input
              id="emp-password"
              type="text"
              value={form.password}
              onChange={(e) => set("password", e.target.value)}
              placeholder="Min. 8 characters"
            />
            <p className="text-xs text-muted-foreground">
              The employee can change this after their first sign-in.
            </p>
          </div>

          <div className="space-y-1.5">
            <Label>Section</Label>
            <Select
              items={DEPARTMENT_LABELS}
              value={form.department}
              onValueChange={(v) => set("department", (v as Department) ?? "")}
            >
              <SelectTrigger className="w-full">
                <SelectValue placeholder="Select a section" />
              </SelectTrigger>
              <SelectContent>
                {DEPARTMENT_OPTIONS.map((d) => (
                  <SelectItem key={d} value={d}>
                    {DEPARTMENT_LABELS[d]}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="emp-ward">Ward</Label>
            <Input
              id="emp-ward"
              type="number"
              min={1}
              max={99}
              value={form.wardNumber}
              onChange={(e) => set("wardNumber", e.target.value)}
              placeholder="e.g. 9"
            />
            <p className="text-xs text-muted-foreground">
              Leave blank for staff who serve the whole municipality.
            </p>
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" disabled={isPending} onClick={() => setOpen(false)}>
            Cancel
          </Button>
          <Button disabled={isPending} onClick={submit}>
            {isPending && <Loader2 className="size-4 animate-spin" />}
            Add employee
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
