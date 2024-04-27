import Cookies from 'js-cookie';

export const TOKEN_COOKIE_NAME = '__mly_jt__';

export function setAuthToken(token: string) {
  Cookies.set(TOKEN_COOKIE_NAME, token, {
    path: '/',
    expires: 30,
    sameSite: 'lax',
    secure: !import.meta.env.DEV,
  });
}

export function removeAuthToken() {
  Cookies.remove(TOKEN_COOKIE_NAME, {
    path: '/',
  });
}

export function redirectAuthSuccess() {
  if (typeof window === 'undefined') {
    return;
  }

  window.location.href = '/';
}

export function logout() {
  Cookies.remove(TOKEN_COOKIE_NAME, {
    path: '/',
  });

  if (typeof window === 'undefined') {
    return;
  }

  // Reloading will automatically redirect the user if required
  window.location.reload();
}
