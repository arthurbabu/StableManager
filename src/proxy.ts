import { NextResponse } from "next/server";
import createMiddleware from "next-intl/middleware";
import { auth } from "@/auth";
import { routing } from "@/i18n/routing";

const handleI18nRouting = createMiddleware(routing);

// Matches any locale prefix (including a redundant "/fr" on the default
// locale, which next-intl normalizes away) so the auth check below always
// sees the true unprefixed path.
const anyLocalePattern = new RegExp(`^/(${routing.locales.join("|")})(/.*)?$`);

export default auth((req) => {
  const { pathname } = req.nextUrl;
  const match = pathname.match(anyLocalePattern);
  const matchedLocale = match?.[1];
  // French is the default locale and has no URL prefix ("as-needed"); only
  // non-default locales (English) get a "/en" prefix in generated links.
  const localePrefix = matchedLocale && matchedLocale !== routing.defaultLocale ? `/${matchedLocale}` : "";
  const pathWithoutLocale = match ? (match[2] ?? "/") : pathname;

  const isLoggedIn = !!req.auth;
  const isLoginPage = pathWithoutLocale === "/login";

  if (!isLoggedIn && !isLoginPage) {
    const loginUrl = new URL(`${localePrefix}/login`, req.nextUrl);
    loginUrl.searchParams.set("callbackUrl", pathname);
    return NextResponse.redirect(loginUrl);
  }

  if (isLoggedIn && isLoginPage) {
    return NextResponse.redirect(new URL(localePrefix || "/", req.nextUrl));
  }

  return handleI18nRouting(req);
});

export const config = {
  // All API routes handle their own auth (returning 401/403 rather than
  // redirecting to the HTML login page) and aren't part of the localized
  // page tree, so they're excluded wholesale rather than route-by-route.
  matcher: ["/((?!api/|_next/static|_next/image|favicon.ico|manifest.json|icons).*)"],
};
