import { createHmac, timingSafeEqual } from 'crypto';
import { cookies } from 'next/headers';
import { redirect } from 'next/navigation';
import { NextRequest, NextResponse } from 'next/server';
import { apiError } from './api-response';

const ADMIN_SESSION_COOKIE = 'star-wiki-admin-session';
const ADMIN_SESSION_TTL_SECONDS = 60 * 60 * 12;

interface AdminSessionPayload {
  u: string;
  exp: number;
}

function toBase64Url(value: string) {
  return Buffer.from(value, 'utf8').toString('base64url');
}

function fromBase64Url(value: string) {
  return Buffer.from(value, 'base64url').toString('utf8');
}

function getSigningSecret() {
  return process.env.ADMIN_SESSION_SECRET || process.env.ADMIN_PASSWORD || '';
}

export function getAdminCredentials() {
  const username = process.env.ADMIN_USERNAME || '';
  const password = process.env.ADMIN_PASSWORD || '';

  if (!username || !password) {
    return null;
  }

  return { username, password };
}

export function isAdminConfigured() {
  return Boolean(getAdminCredentials());
}

export function verifyAdminCredentials(username: string, password: string) {
  const credentials = getAdminCredentials();
  if (!credentials) {
    return false;
  }

  return username === credentials.username && password === credentials.password;
}

function signPayload(encodedPayload: string) {
  return createHmac('sha256', getSigningSecret())
    .update(encodedPayload)
    .digest('base64url');
}

export function createAdminSessionToken(username: string) {
  const payload: AdminSessionPayload = {
    u: username,
    exp: Math.floor(Date.now() / 1000) + ADMIN_SESSION_TTL_SECONDS,
  };

  const encodedPayload = toBase64Url(JSON.stringify(payload));
  const signature = signPayload(encodedPayload);
  return `${encodedPayload}.${signature}`;
}

export function validateAdminSessionToken(token?: string | null) {
  if (!token || !getSigningSecret()) {
    return false;
  }

  const [encodedPayload, signature] = token.split('.');
  if (!encodedPayload || !signature) {
    return false;
  }

  const expectedSignature = signPayload(encodedPayload);
  const signatureBuffer = Buffer.from(signature);
  const expectedBuffer = Buffer.from(expectedSignature);

  if (signatureBuffer.length !== expectedBuffer.length) {
    return false;
  }

  if (!timingSafeEqual(signatureBuffer, expectedBuffer)) {
    return false;
  }

  try {
    const payload = JSON.parse(fromBase64Url(encodedPayload)) as AdminSessionPayload;
    if (payload.exp < Math.floor(Date.now() / 1000)) {
      return false;
    }

    const credentials = getAdminCredentials();
    return Boolean(credentials && payload.u === credentials.username);
  } catch {
    return false;
  }
}

export function applyAdminSession(response: NextResponse, username: string) {
  response.cookies.set({
    name: ADMIN_SESSION_COOKIE,
    value: createAdminSessionToken(username),
    httpOnly: true,
    sameSite: 'lax',
    secure: process.env.NODE_ENV === 'production',
    path: '/',
    maxAge: ADMIN_SESSION_TTL_SECONDS,
  });
}

export function clearAdminSession(response: NextResponse) {
  response.cookies.set({
    name: ADMIN_SESSION_COOKIE,
    value: '',
    httpOnly: true,
    sameSite: 'lax',
    secure: process.env.NODE_ENV === 'production',
    path: '/',
    maxAge: 0,
  });
}

export function isAdminRequest(request: NextRequest) {
  return validateAdminSessionToken(request.cookies.get(ADMIN_SESSION_COOKIE)?.value);
}

export function requireAdminApi(request: NextRequest) {
  if (!isAdminConfigured()) {
    return apiError('后台账号密码尚未配置，请先在环境变量中设置。', 503, 'ADMIN_NOT_CONFIGURED');
  }

  if (!isAdminRequest(request)) {
    return apiError('未登录或登录状态已失效。', 401, 'UNAUTHORIZED');
  }

  return null;
}

export async function requireAdminPageAuth() {
  if (!isAdminConfigured()) {
    redirect('/admin/login?reason=not-configured');
  }

  const cookieStore = await cookies();
  const token = cookieStore.get(ADMIN_SESSION_COOKIE)?.value;

  if (!validateAdminSessionToken(token)) {
    redirect('/admin/login');
  }
}

export async function redirectIfAdminAuthenticated() {
  const cookieStore = await cookies();
  const token = cookieStore.get(ADMIN_SESSION_COOKIE)?.value;

  if (validateAdminSessionToken(token)) {
    redirect('/admin');
  }
}
