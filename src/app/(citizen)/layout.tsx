import { requireRole } from "@/lib/session";
import { Role } from "@/generated/prisma/client";
import { TopNav } from "@/components/layout/top-nav";

export default async function CitizenLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const user = await requireRole([Role.CITIZEN]);

  return (
    <div className="flex min-h-screen flex-col">
      <TopNav user={user} />
      <main className="mx-auto w-full max-w-6xl flex-1 px-4 py-6">{children}</main>
    </div>
  );
}
