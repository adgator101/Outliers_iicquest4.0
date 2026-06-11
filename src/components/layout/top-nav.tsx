"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { LogOut, LayoutDashboard, PlusCircle, Users2, BadgeCheck, User } from "lucide-react";
import { authClient } from "@/lib/auth-client";
import { roleHomePath } from "@/lib/roles";
import { cn } from "@/lib/utils";
import { BrandMark } from "@/components/layout/brand-mark";
import { Button } from "@/components/ui/button";
import {
  Avatar,
  AvatarFallback,
} from "@/components/ui/avatar";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

type Role =
  | "CITIZEN"
  | "LOCAL_BODY_EMPLOYEE"
  | "LOCAL_BODY_HEAD"
  | "EXECUTIVE_BODY";

// Server-provided user — comes from requireRole() in the layout, so it is always
// the DB-verified identity for the request. Never trust the client-side session
// for role-gated display decisions.
export type NavUser = {
  name: string;
  email: string;
  role: Role;
  municipalityName?: string | null;
};

function navLinksForRole(role: Role): { href: string; label: string; icon: React.ReactNode }[] {
  switch (role) {
    case "CITIZEN":
      return [
        { href: "/dashboard", label: "My Dashboard", icon: <LayoutDashboard className="size-4" /> },
        { href: "/verify", label: "Verify", icon: <BadgeCheck className="size-4" /> },
        { href: "/report", label: "Report Issue", icon: <PlusCircle className="size-4" /> },
      ];
    case "LOCAL_BODY_EMPLOYEE":
      return [
        { href: "/authority/dashboard", label: "Dashboard", icon: <LayoutDashboard className="size-4" /> },
      ];
    case "LOCAL_BODY_HEAD":
      return [
        { href: "/authority/dashboard", label: "Dashboard", icon: <LayoutDashboard className="size-4" /> },
        { href: "/authority/team", label: "Team", icon: <Users2 className="size-4" /> },
      ];
    case "EXECUTIVE_BODY":
      return [
        { href: "/executive/dashboard", label: "National View", icon: <LayoutDashboard className="size-4" /> },
      ];
  }
}

export function TopNav({ user }: { user?: NavUser }) {
  const router = useRouter();
  const pathname = usePathname();

  const role = user?.role ?? "CITIZEN";
  const links = user ? navLinksForRole(role) : [];

  async function handleSignOut() {
    await authClient.signOut();
    router.push("/login");
    router.refresh();
  }

  const initials = (user?.name ?? "?")
    .split(" ")
    .map((p) => p[0])
    .slice(0, 2)
    .join("")
    .toUpperCase();

  return (
    <header className="sticky top-0 z-40 border-b border-border bg-background/95 backdrop-blur">
      <div className="flex h-14 w-full items-center justify-between px-4 sm:px-6">
        <Link href={user ? roleHomePath(user.role) : "/"} className="transition-opacity hover:opacity-80">
          <BrandMark />
        </Link>

        <nav className="flex items-center gap-0.5">
          {links.map((l) => {
            const active =
              pathname === l.href || pathname.startsWith(`${l.href}/`);
            return (
              <Link
                key={l.href}
                href={l.href}
                className={cn(
                  "relative flex h-14 items-center gap-1.5 px-3 text-sm font-medium transition-colors",
                  active
                    ? "text-foreground after:absolute after:inset-x-3 after:bottom-0 after:h-0.5 after:bg-simrik"
                    : "text-muted-foreground hover:text-foreground"
                )}
              >
                {l.icon}
                <span className="hidden sm:inline">{l.label}</span>
              </Link>
            );
          })}

          {user ? (
            <DropdownMenu>
              <DropdownMenuTrigger
                render={
                  <Button variant="ghost" size="icon" className="ml-2 rounded-full">
                    <Avatar className="size-8">
                      <AvatarFallback className="bg-nilo text-xs font-medium text-white">
                        {initials}
                      </AvatarFallback>
                    </Avatar>
                  </Button>
                }
              />
              <DropdownMenuContent align="end" className="w-56">
                <DropdownMenuGroup>
                  <DropdownMenuLabel>
                    <div className="flex flex-col">
                      <span className="truncate font-medium">{user.name}</span>
                      <span className="truncate text-xs font-normal text-muted-foreground">
                        {user.email}
                      </span>
                      <span className="mt-1 text-xs font-normal text-muted-foreground">
                        {role.replaceAll("_", " ")}
                        {user.municipalityName ? ` · ${user.municipalityName}` : ""}
                      </span>
                    </div>
                  </DropdownMenuLabel>
                </DropdownMenuGroup>
                <DropdownMenuSeparator />
                {role === "CITIZEN" && (
                  <DropdownMenuItem render={<Link href="/profile" />}>
                    <User className="size-4" />
                    My profile
                  </DropdownMenuItem>
                )}
                <DropdownMenuItem onClick={handleSignOut}>
                  <LogOut className="size-4" />
                  Sign out
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          ) : (
            <>
              <Button variant="ghost" size="sm" render={<Link href="/login" />}>
                Log in
              </Button>
              <Button size="sm" className="ml-1" render={<Link href="/register" />}>
                Sign up
              </Button>
            </>
          )}
        </nav>
      </div>
    </header>
  );
}
