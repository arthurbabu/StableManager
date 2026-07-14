import { requireUser } from "@/lib/auth-helpers";
import { AppShell } from "@/components/AppShell";

export default async function AuthenticatedLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const user = await requireUser();

  return <AppShell user={user}>{children}</AppShell>;
}
