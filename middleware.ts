import { NextResponse, type NextRequest } from "next/server";

// Inlined from @profullstack/referrals/next `trackReferralCode` to keep this
// middleware Edge-compatible. Importing the package pulls in a CommonJS
// `require("next/server")` shim that makes OpenNext Cloudflare treat this as
// unsupported Node.js middleware.
const REF_PARAM = "ref";
const COOKIE_NAME = "referral_code";
const MAX_AGE_SECONDS = 60 * 60 * 24 * 30;

export function middleware(request: NextRequest) {
  const response = NextResponse.next();
  const code = request.nextUrl.searchParams.get(REF_PARAM);
  if (code) {
    response.cookies.set(COOKIE_NAME, code, {
      httpOnly: false, // readable by client JS for prefill
      sameSite: "lax",
      maxAge: MAX_AGE_SECONDS,
      path: "/",
    });
  }
  return response;
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)"],
};
