"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { ShieldCheck, LogOut, LayoutDashboard, PlusCircle, Users2 } from "lucide-react";
import { authClient, useSession } from "@/lib/auth-client";
import { Button } from "@/components/ui/button";
import {
  Avatar,
  AvatarFallback,
} from "@/components/ui/avatar";
import {
  DropdownMenu,
  DropdownMenuContent,
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

function navLinksForRole(role: Role): { href: string; label: string; icon: React.ReactNode }[] {
  switch (role) {
    case "CITIZEN":
      return [
        { href: "/dashboard", label: "My Dashboard", icon: <LayoutDashboard className="size-4" /> },
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

export function TopNav() {
  const router = useRouter();
  const { data: session, isPending } = useSession();
  const user = session?.user as
    | { name: string; email: string; role?: Role; municipalityName?: string | null }
    | undefined;
  const role = (user?.role ?? "CITIZEN") as Role;
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
    <header className="sticky top-0 z-40 border-b bg-background/95 backdrop-blur">
      <div className="mx-auto flex h-14 max-w-6xl items-center justify-between px-4">
        <Link href="/" className="flex items-center gap-2 font-semibold">
          <ShieldCheck className="size-5 text-primary" />
          <span>CivicChain</span>
          <span className="hidden text-xs font-normal text-muted-foreground sm:inline">
            Nepal
          </span>
        </Link>

        <nav className="flex items-center gap-1">
          {links.map((l) => (
            <Button key={l.href} variant="ghost" size="sm" render={<Link href={l.href} />}>
              {l.icon}
              <span className="hidden sm:inline">{l.label}</span>
            </Button>
          ))}

          {isPending ? null : user ? (
            <DropdownMenu>
              <DropdownMenuTrigger
                render={
                  <Button variant="ghost" size="icon" className="ml-1 rounded-full">
                    <Avatar className="size-8">
                      <AvatarFallback className="text-xs">{initials}</AvatarFallback>
                    </Avatar>
                  </Button>
                }
              />
              <DropdownMenuContent align="end" className="w-56">
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
                <DropdownMenuSeparator />
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
              <Button size="sm" render={<Link href="/register" />}>
                Sign up
              </Button>
            </>
          )}
        </nav>
      </div>
    </header>
  );
}
