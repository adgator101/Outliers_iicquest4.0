import { requireRole } from "@/lib/session";
import { Role } from "@/generated/prisma/client";
import { TopNav } from "@/components/layout/top-nav";

export default async function ExecutiveLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  await requireRole([Role.EXECUTIVE_BODY]);

  return (
    <div className="flex min-h-screen flex-col">
      <TopNav />
      <main className="mx-auto w-full max-w-6xl flex-1 px-4 py-6">{children}</main>
    </div>
  );
}
