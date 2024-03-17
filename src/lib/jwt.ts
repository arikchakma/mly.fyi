import './server-only';

import type { APIContext, AstroGlobal } from 'astro';
import * as jose from 'jose';
import { serverConfig } from './config';

export const TOKEN_COOKIE_NAME = '__tiny_jt__';

export type TokenPayload = {
  id: string;
  email: string;
};

export async function createToken(data: TokenPayload): Promise<string> {
  const secret = new TextEncoder().encode(serverConfig.jwt.secret);
  const tokenPayload: TokenPayload = {
    id: data.id,
    email: data.email,
  };

  return await new jose.SignJWT(tokenPayload)
    .setProtectedHeader({ alg: 'HS256' })
    .setExpirationTime(serverConfig.jwt.expiresIn)
    .sign(secret);
}

export async function verifyToken(token: string): Promise<TokenPayload> {
  const secret = new TextEncoder().encode(serverConfig.jwt.secret);

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
