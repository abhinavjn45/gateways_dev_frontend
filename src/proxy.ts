import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

const BLOCKED_SUBNETS = [
  '114.29.226.', // Attacker subnet
];

export default function proxy(request: NextRequest) {
  const ip = request.ip || request.headers.get('x-real-ip') || request.headers.get('x-forwarded-for') || '';
  
  if (BLOCKED_SUBNETS.some(subnet => ip.startsWith(subnet))) {
    return new NextResponse('Access Denied', { status: 403 });
  }

  const { pathname } = request.nextUrl;

  if (pathname.startsWith('/art/brand/')) {
    return new NextResponse('Not Found', { status: 404 });
  }

  const token = request.cookies.get('token')?.value;

  // Paths that require authentication
  const isProtectedPath = pathname.startsWith('/dashboard') || pathname.startsWith('/portal') || pathname.startsWith('/travelling');
  
  // Paths that logged-in users shouldn't access
  const isAuthPath = pathname.startsWith('/login') || pathname.startsWith('/signup') || pathname.startsWith('/forgot-password') || pathname.startsWith('/reset-password');

  if (isProtectedPath && !token) {
    // Unauthenticated user trying to access protected route -> redirect to login
    const loginUrl = new URL('/login', request.url);
    loginUrl.searchParams.set('next', pathname);
    return NextResponse.redirect(loginUrl);
  }

  if (isAuthPath && token) {
    // Authenticated user trying to access auth pages -> redirect to dashboard
    return NextResponse.redirect(new URL('/dashboard', request.url));
  }

  return NextResponse.next();
}

// Only run middleware on specific paths to optimize performance
export const config = {
  matcher: [
    /*
     * Match all request paths except for the ones starting with:
     * - _next/static (static files)
     * - _next/image (image optimization files)
     * - favicon.ico (favicon file)
     */
    '/((?!_next/static|_next/image|favicon.ico).*)',
  ],
};
