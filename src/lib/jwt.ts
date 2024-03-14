import type { APIContext, AstroGlobal } from 'astro';
import * as jose from 'jose';
import { config } from './config';

export const TOKEN_COOKIE_NAME = '__tiny_jt__';

export type TokenPayload = {
  id: string;
  email: string;
};

export async function createToken(data: TokenPayload): Promise<string> {
  const secret = new TextEncoder().encode(config.jwt.secret);
  const tokenPayload: TokenPayload = {
    id: data.id,
    email: data.email,
  };

  return await new jose.SignJWT(tokenPayload)
    .setProtectedHeader({ alg: 'HS256' })
    .setExpirationTime(config.jwt.expiresIn)
    .sign(secret);
}

export async function verifyToken(token: string): Promise<TokenPayload> {
  const secret = new TextEncoder().encode(config.jwt.secret);

  const { payload } = await jose.jwtVerify(token, secret);

  return payload as TokenPayload;
}

export function decodeToken(token: string): TokenPayload {
  const claims = jose.decodeJwt(token);

  return claims as TokenPayload;
}

export function readTokenCookie(
  context: APIContext | AstroGlobal,
): string | undefined {
  const token = context.cookies.get(TOKEN_COOKIE_NAME)?.value;

  if (!token) {
    return undefined;
  }

  const claims = decodeToken(token);
  if (!claims?.email || !claims?.id) {
    return undefined;
  }

  return token;
}

export function createTokenCookie(context: APIContext, token: string): string {
  // Make the cookie to never expire, we will use the token expiration date instead
  // Date after 10 years
  const expires = new Date(Date.now() + 10 * 365 * 24 * 60 * 60 * 1000);

  context.cookies.set(TOKEN_COOKIE_NAME, token, {
    httpOnly: false,
    path: '/',
    sameSite: 'lax',
    expires,
  });

  return token;
}
