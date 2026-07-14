import { AuthError } from "next-auth";
import { getTranslations } from "next-intl/server";
import { signIn, auth } from "@/auth";
import { redirect } from "@/i18n/navigation";

export default async function LoginPage({
  params,
  searchParams,
}: {
  params: Promise<{ locale: string }>;
  searchParams: Promise<{ error?: string; callbackUrl?: string }>;
}) {
  const { locale } = await params;
  const session = await auth();
  if (session) redirect({ href: "/", locale });

  const t = await getTranslations("Login");
  const sp = await searchParams;
  const callbackUrl = sp.callbackUrl ?? "/";

  async function loginAction(formData: FormData) {
    "use server";

    const email = String(formData.get("email") ?? "");
    const password = String(formData.get("password") ?? "");
    const cb = String(formData.get("callbackUrl") ?? "/");

    try {
      await signIn("credentials", {
        email,
        password,
        redirectTo: cb,
      });
    } catch (error) {
      if (error instanceof AuthError) {
        redirect({
          href: `/login?error=1&callbackUrl=${encodeURIComponent(cb)}`,
          locale,
        });
      }
      throw error;
    }
  }

  return (
    <div className="min-h-dvh flex items-center justify-center bg-stone-50 px-4 dark:bg-neutral-950">
      <div className="w-full max-w-sm">
        <div className="mb-8 text-center">
          <h1 className="text-2xl font-semibold text-stone-900 dark:text-stone-50">
            🐴 {t("title")}
          </h1>
          <p className="mt-1 text-sm text-stone-500 dark:text-stone-400">
            {t("subtitle")}
          </p>
        </div>

        <form
          action={loginAction}
          className="space-y-4 rounded-xl border border-stone-200 bg-white p-6 shadow-sm dark:border-neutral-800 dark:bg-neutral-900"
        >
          <input type="hidden" name="callbackUrl" value={callbackUrl} />

          {sp.error && (
            <p className="rounded-md bg-red-50 px-3 py-2 text-sm text-red-700 dark:bg-red-950 dark:text-red-300">
              {t("invalidCredentials")}
            </p>
          )}

          <div>
            <label htmlFor="email" className="block text-sm font-medium text-stone-700 dark:text-stone-300">
              {t("email")}
            </label>
            <input
              id="email"
              name="email"
              type="email"
              required
              autoFocus
              autoComplete="username"
              className="mt-1 w-full rounded-lg border border-stone-300 px-3 py-2 text-base focus:border-emerald-600 focus:outline-none focus:ring-1 focus:ring-emerald-600 dark:border-neutral-700 dark:bg-neutral-800 dark:text-stone-100"
            />
          </div>

          <div>
            <label htmlFor="password" className="block text-sm font-medium text-stone-700 dark:text-stone-300">
              {t("password")}
            </label>
            <input
              id="password"
              name="password"
              type="password"
              required
              autoComplete="current-password"
              className="mt-1 w-full rounded-lg border border-stone-300 px-3 py-2 text-base focus:border-emerald-600 focus:outline-none focus:ring-1 focus:ring-emerald-600 dark:border-neutral-700 dark:bg-neutral-800 dark:text-stone-100"
            />
          </div>

          <button
            type="submit"
            className="w-full rounded-lg bg-emerald-700 px-4 py-2.5 text-base font-medium text-white transition hover:bg-emerald-800 active:bg-emerald-900"
          >
            {t("signIn")}
          </button>
        </form>

        <p className="mt-6 text-center text-xs text-stone-400">
          {t("demoHint")}
        </p>
      </div>
    </div>
  );
}
