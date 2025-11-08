import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { withTenant } from "@/lib/tenant-middleware";

export async function middleware(request: NextRequest) {
    // Apply tenant middleware
    return withTenant(request);
}

export const config = {
    matcher: [
        /*
         * Match all request paths except for the ones starting with:
         * - api/auth (authentication routes)
         * - _next/static (static files)
         * - _next/image (image optimization files)
         * - favicon.ico (favicon file)
         * - public (public files)
         */
        "/((?!api/auth|_next/static|_next/image|favicon.ico|public).*)",
    ],
};