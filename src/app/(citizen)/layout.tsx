import { TopNav } from "@/components/layout/top-nav";
import { requireRole } from "@/lib/session";
import { Role } from "@/generated/prisma/client";

export default async function CitizenLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  await requireRole([Role.CITIZEN]);

  return (
    <div className="flex min-h-screen flex-col">
      <TopNav />
      <main className="mx-auto w-full max-w-6xl flex-1 px-4 py-6">{children}</main>
    </div>
  );
}
