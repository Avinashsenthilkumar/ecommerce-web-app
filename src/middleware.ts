import { NextResponse, type NextRequest } from "next/server";

// Fast edge check: bounce visitors without a session cookie to the right login page.
// Role checks happen on the server in each page and API route.
export function middleware(req: NextRequest) {
  if (req.cookies.has("subsel_session")) return NextResponse.next();

  const { pathname, search } = req.nextUrl;
  const next = encodeURIComponent(pathname + search);
  const to = (path: string) => NextResponse.redirect(new URL(`${path}?next=${next}`, req.url));

  if (pathname.startsWith("/vendor")) {
    const open = pathname.startsWith("/vendor/login") || pathname.startsWith("/vendor/register");
    return open ? NextResponse.next() : to("/vendor/login");
  }
  if (["/admin", "/warehouse", "/hub", "/courier"].some((p) => pathname.startsWith(p))) return to("/staff/login");
  return to("/login");
}

export const config = {
  matcher: [
    "/cart",
    "/orders/:path*",
    "/account/:path*",
    "/wishlist",
    "/admin/:path*",
    "/warehouse/:path*",
    "/hub/:path*",
    "/courier/:path*",
    "/vendor/:path*",
  ],
};
