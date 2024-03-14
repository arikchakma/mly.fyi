import { readTokenCookie } from '@/lib/jwt';
import type { APIContext, AstroGlobal } from 'astro';

function isGuest(context: APIContext | AstroGlobal): boolean {
  return !readTokenCookie(context);
}

export function requireAuthentication(Astro: AstroGlobal): Response | null {
  if (isGuest(Astro)) {
    return Astro.redirect('/login');
  }

  return null;
}

export function requireGuest(Astro: APIContext | AstroGlobal): Response | null {
  if (!isGuest(Astro)) {
    return Astro.redirect('/');
  }

  return null;
}
