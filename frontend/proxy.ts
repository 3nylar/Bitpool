import { auth } from "@/lib/auth";
import { NextResponse } from "next/server";

// Gate the simulator dashboard behind sign-in (wallet or email). Everything
// else -- the landing page, login, education content -- stays public, since
// there's real value in letting people read about the product before
// committing to a sign-in step.
export default auth((req) => {
  const isLoggedIn = Boolean(req.auth);
  const isProtectedRoute = req.nextUrl.pathname.startsWith("/simulator");

  if (isProtectedRoute && !isLoggedIn) {
    const loginUrl = new URL("/login", req.nextUrl.origin);
    loginUrl.searchParams.set("callbackUrl", req.nextUrl.pathname);
    return NextResponse.redirect(loginUrl);
  }
});

export const config = {
  matcher: ["/simulator/:path*"],
};
