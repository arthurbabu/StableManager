import { signOut } from "@/auth";
import { SidebarLinks, BottomTabBar } from "@/components/NavLinks";

export function AppShell({
  user,
  children,
}: {
  user: { name?: string | null; email?: string | null; role: string };
  children: React.ReactNode;
}) {
  const isAdmin = user.role === "ADMIN";

  return (
    <div className="min-h-dvh bg-stone-50 dark:bg-neutral-950">
      <div className="mx-auto flex max-w-6xl">
        <aside className="sticky top-0 hidden h-dvh w-56 shrink-0 flex-col justify-between border-r border-stone-200 p-4 md:flex dark:border-neutral-800">
          <div>
            <div className="mb-6 px-2">
              <p className="text-lg font-semibold text-stone-900 dark:text-stone-50">
                🐴 Stable Manager
              </p>
            </div>
            <SidebarLinks isAdmin={isAdmin} />
          </div>
          <div className="border-t border-stone-200 pt-3 dark:border-neutral-800">
            <p className="truncate px-2 text-sm font-medium text-stone-700 dark:text-stone-300">
              {user.name}
            </p>
            <p className="truncate px-2 text-xs text-stone-400">{user.role}</p>
            <form
              action={async () => {
                "use server";
                await signOut({ redirectTo: "/login" });
              }}
            >
              <button
                type="submit"
                className="mt-2 w-full rounded-lg px-2 py-1.5 text-left text-sm text-stone-500 hover:bg-stone-100 dark:text-stone-400 dark:hover:bg-neutral-800"
              >
                Sign out
              </button>
            </form>
          </div>
        </aside>

        <div className="min-h-dvh flex-1">
          <header className="sticky top-0 z-30 flex items-center justify-between border-b border-stone-200 bg-white/90 px-4 py-3 backdrop-blur md:hidden dark:border-neutral-800 dark:bg-neutral-900/90">
            <p className="font-semibold text-stone-900 dark:text-stone-50">
              🐴 Stable Manager
            </p>
            <form
              action={async () => {
                "use server";
                await signOut({ redirectTo: "/login" });
              }}
            >
              <button
                type="submit"
                className="text-sm text-stone-500 dark:text-stone-400"
              >
                Sign out
              </button>
            </form>
          </header>

          <main className="px-4 py-6 pb-24 md:px-8 md:pb-8">{children}</main>
        </div>
      </div>

      <BottomTabBar />
    </div>
  );
}
