import { NextResponse, type NextRequest } from "next/server";

// Keep the middleware valid for production builds without blocking the app on
// Windows/CI environments while route-level auth still handles protection.
export function middleware(req: NextRequest) {
  void req;
  return NextResponse.next();
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico).*)"],
};
