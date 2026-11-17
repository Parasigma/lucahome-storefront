import { NextResponse, type NextRequest } from "next/server";
import { defaultLocale, isLocale, locales } from "@/lib/locales";

const LOCALE_COOKIE = "rt_locale";

function pickLocale(req: NextRequest) {
  const saved = req.cookies.get(LOCALE_COOKIE)?.value;
  if (isLocale(saved)) return saved;
  const accepted = (req.headers.get("accept-language") ?? "")
    .split(",")
    .map((p) => p.split(";")[0].trim().slice(0, 2).toLowerCase());
  return accepted.find(isLocale) ?? defaultLocale;
}

export function proxy(req: NextRequest) {
  const { pathname } = req.nextUrl;
  const first = pathname.split("/")[1];

  if (isLocale(first)) {
    // Recuerda el idioma elegido para próximas visitas.
    const res = NextResponse.next();
    if (req.cookies.get(LOCALE_COOKIE)?.value !== first) {
      res.cookies.set(LOCALE_COOKIE, first, { path: "/", maxAge: 60 * 60 * 24 * 365, sameSite: "lax" });
    }
    return res;
  }

  const url = req.nextUrl.clone();
  url.pathname = `/${pickLocale(req)}${pathname === "/" ? "" : pathname}`;
  return NextResponse.redirect(url);
}

export const config = {
  // Todo excepto API, panel de administración, estáticos de Next y archivos con extensión.
  matcher: ["/((?!api|admin|_next/static|_next/image|.*\\..*).*)"],
};

export { locales };
