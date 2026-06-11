import { requireRole } from "@/lib/session";
import { Role } from "@/generated/prisma/client";
import { TopNav } from "@/components/layout/top-nav";

export default async function AuthorityLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const user = await requireRole([Role.LOCAL_BODY_EMPLOYEE, Role.LOCAL_BODY_HEAD]);

  return (
    <div className="flex min-h-screen flex-col">
      <TopNav user={user} />
      <main className="flex-1">{children}</main>
    </div>
  );
}
