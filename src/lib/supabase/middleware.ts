import { createServerClient } from '@supabase/ssr';
import { NextResponse, type NextRequest } from 'next/server';

export async function updateSession(request: NextRequest) {
  let supabaseResponse = NextResponse.next({
    request,
  });

  const pathname = request.nextUrl.pathname;

  // Check for local demo session cookie first (for interactive preview mode)
  const demoRole = request.cookies.get('fleet_demo_role')?.value;
  if (demoRole && demoRole.trim() !== '') {
    if (pathname.startsWith('/admin') && demoRole !== 'ADMIN') {
      const url = request.nextUrl.clone();
      url.pathname = '/driver';
      return NextResponse.redirect(url);
    }
    if (pathname.startsWith('/driver') && demoRole !== 'DRIVER' && demoRole !== 'ADMIN') {
      const url = request.nextUrl.clone();
      url.pathname = '/login';
      return NextResponse.redirect(url);
    }
    if (pathname === '/login') {
      // Already logged in
      const url = request.nextUrl.clone();
      url.pathname = demoRole === 'ADMIN' ? '/admin' : '/driver';
      return NextResponse.redirect(url);
    }
    return supabaseResponse;
  }

  // Supabase SSR client
  const DEFAULT_SUPABASE_URL = 'https://fxtjhnpdiheosuvfargg.supabase.co';
  const DEFAULT_SUPABASE_KEY = 'sb_publishable_S-fybHl9ZAnFlzy78y-LCg_vspiZP4K';
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || DEFAULT_SUPABASE_URL;
  const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || DEFAULT_SUPABASE_KEY;

  // If no demo role and credentials are placeholder/sample, redirect protected routes to /login
  if (!demoRole || !supabaseUrl || supabaseUrl.includes('sample-fleet-app') || supabaseUrl.includes('your-project-id')) {
    if (pathname.startsWith('/admin') || pathname.startsWith('/driver')) {
      const url = request.nextUrl.clone();
      url.pathname = '/login';
      return NextResponse.redirect(url);
    }
    return supabaseResponse;
  }

  const supabase = createServerClient(supabaseUrl, supabaseKey, {
    cookies: {
      getAll() {
        return request.cookies.getAll();
      },
      setAll(cookiesToSet: Array<{ name: string; value: string; options?: any }>) {
        cookiesToSet.forEach(({ name, value }) => request.cookies.set(name, value));
        supabaseResponse = NextResponse.next({
          request,
        });
        cookiesToSet.forEach(({ name, value, options }) =>
          supabaseResponse.cookies.set(name, value, options)
        );
      },
    },
  });

  const {
    data: { user },
  } = await supabase.auth.getUser();

  // Protected routes check
  if (!user) {
    if (pathname.startsWith('/admin') || pathname.startsWith('/driver')) {
      const url = request.nextUrl.clone();
      url.pathname = '/login';
      return NextResponse.redirect(url);
    }
  } else {
    // User is logged in, verify role from profiles table or metadata
    const userRole = user.user_metadata?.role || 'DRIVER';

    if (pathname.startsWith('/admin') && userRole !== 'ADMIN') {
      const url = request.nextUrl.clone();
      url.pathname = '/driver';
      return NextResponse.redirect(url);
    }

    if (pathname === '/login') {
      const url = request.nextUrl.clone();
      url.pathname = userRole === 'ADMIN' ? '/admin' : '/driver';
      return NextResponse.redirect(url);
    }
  }

  return supabaseResponse;
}
