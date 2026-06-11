"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Loader2 } from "lucide-react";
import { authClient } from "@/lib/auth-client";
import { ROLE_LABELS, ROLE_DESCRIPTIONS, roleHomePath } from "@/lib/roles";
import type { Role } from "@/generated/prisma/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

const ROLE_OPTIONS: Role[] = [
  "CITIZEN",
  "LOCAL_BODY_EMPLOYEE",
  "LOCAL_BODY_HEAD",
  "EXECUTIVE_BODY",
];

export default function RegisterPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [role, setRole] = useState<Role>("CITIZEN");
  const [form, setForm] = useState({
    name: "",
    email: "",
    password: "",
    provinceName: "",
    districtName: "",
    municipalityName: "",
    wardNumber: "",
  });

  function update(key: keyof typeof form, value: string) {
    setForm((f) => ({ ...f, [key]: value }));
  }

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);

    const { error } = await authClient.signUp.email({
      name: form.name,
      email: form.email,
      password: form.password,
      role,
      provinceName: form.provinceName || undefined,
      districtName: form.districtName || undefined,
      municipalityName: form.municipalityName || undefined,
      wardNumber: form.wardNumber ? Number(form.wardNumber) : undefined,
    } as Parameters<typeof authClient.signUp.email>[0]);

    if (error) {
      toast.error(error.message ?? "Could not create account");
      setLoading(false);
      return;
    }

    toast.success("Account created");
    router.push(roleHomePath(role));
    router.refresh();
  }

  const isCitizen = role === "CITIZEN";

  return (
    <div>
      <div className="mb-6">
        <h1 className="text-3xl font-semibold tracking-tight">
          Create your account
        </h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Join CivicChain Nepal to report and track civic issues.
        </p>
      </div>
      <div>
        <form onSubmit={onSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="name">Full name</Label>
            <Input
              id="name"
              required
              value={form.name}
              onChange={(e) => update("name", e.target.value)}
              placeholder="Sita Sharma"
            />
          </div>

          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="email">Email</Label>
              <Input
                id="email"
                type="email"
                autoComplete="email"
                required
                value={form.email}
                onChange={(e) => update("email", e.target.value)}
                placeholder="you@example.com"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="password">Password</Label>
              <Input
                id="password"
                type="password"
                autoComplete="new-password"
                required
                minLength={8}
                value={form.password}
                onChange={(e) => update("password", e.target.value)}
                placeholder="Min. 8 characters"
              />
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="role">Role</Label>
            <Select
              items={ROLE_LABELS}
              value={role}
              onValueChange={(v) => setRole((v as Role) ?? "CITIZEN")}
            >
              <SelectTrigger id="role" className="w-full">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {ROLE_OPTIONS.map((r) => (
                  <SelectItem key={r} value={r}>
                    {ROLE_LABELS[r]}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <p className="text-xs text-muted-foreground">{ROLE_DESCRIPTIONS[role]}</p>
          </div>

          <fieldset className="space-y-4 rounded-lg border p-3">
            <legend className="px-1 text-xs font-medium text-muted-foreground">
              Jurisdiction {isCitizen ? "(your ward)" : "(required for officials)"}
            </legend>
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="province">Province</Label>
                <Input
                  id="province"
                  required={!isCitizen}
                  value={form.provinceName}
                  onChange={(e) => update("provinceName", e.target.value)}
                  placeholder="Bagmati"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="district">District</Label>
                <Input
                  id="district"
                  required={!isCitizen}
                  value={form.districtName}
                  onChange={(e) => update("districtName", e.target.value)}
                  placeholder="Kathmandu"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="municipality">Municipality (Palika)</Label>
                <Input
                  id="municipality"
                  required={!isCitizen}
                  value={form.municipalityName}
                  onChange={(e) => update("municipalityName", e.target.value)}
                  placeholder="Kathmandu Metropolitan City"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="ward">Ward number</Label>
                <Input
                  id="ward"
                  type="number"
                  min={1}
                  max={50}
                  value={form.wardNumber}
                  onChange={(e) => update("wardNumber", e.target.value)}
                  placeholder="10"
                />
              </div>
            </div>
          </fieldset>

          <Button type="submit" className="w-full" disabled={loading}>
            {loading && <Loader2 className="size-4 animate-spin" />}
            Create account
          </Button>
        </form>
        <p className="mt-4 text-center text-sm text-muted-foreground">
          Already have an account?{" "}
          <Link href="/login" className="font-medium text-foreground underline-offset-4 hover:underline">
            Log in
          </Link>
        </p>
      </div>
    </div>
  );
}
