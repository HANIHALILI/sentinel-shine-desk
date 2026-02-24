/**
 * Generic OIDC Authorization Code Flow with PKCE.
 * Works with ADFS, Keycloak, Dex, or any compliant OIDC provider.
 * 
 * This module is ONLY used when VITE_OIDC_ISSUER is configured.
 * When running on Lovable Cloud (no OIDC_ISSUER), Supabase Auth is used instead.
 */

import { env } from '@/lib/env';

// ── PKCE helpers ──────────────────────────────────────────────

function generateRandom(len: number): string {
  const arr = new Uint8Array(len);
  crypto.getRandomValues(arr);
  return Array.from(arr, b => b.toString(16).padStart(2, '0')).join('');
}

async function sha256(plain: string): Promise<ArrayBuffer> {
  return crypto.subtle.digest('SHA-256', new TextEncoder().encode(plain));
}

function base64urlEncode(buf: ArrayBuffer): string {
  return btoa(String.fromCharCode(...new Uint8Array(buf)))
    .replace(/\+/g, '-')
    .replace(/\//g, '_')
    .replace(/=+$/, '');
}

async function generatePKCE() {
  const verifier = generateRandom(32);
  const challenge = base64urlEncode(await sha256(verifier));
  return { verifier, challenge };
}

// ── Discovery ─────────────────────────────────────────────────

interface OIDCConfig {
  authorization_endpoint: string;
  token_endpoint: string;
  userinfo_endpoint: string;
  end_session_endpoint?: string;
  jwks_uri: string;
}

let cachedConfig: OIDCConfig | null = null;

export async function discoverOIDC(): Promise<OIDCConfig> {
  if (cachedConfig) return cachedConfig;
  const issuer = env.OIDC_ISSUER;
  if (!issuer) throw new Error('OIDC issuer not configured');

  const wellKnown = `${issuer.replace(/\/$/, '')}/.well-known/openid-configuration`;
  const res = await fetch(wellKnown);
  if (!res.ok) throw new Error(`OIDC discovery failed: ${res.status}`);
  cachedConfig = await res.json();
  return cachedConfig!;
}

// ── Auth flow ─────────────────────────────────────────────────

export async function startOIDCLogin(): Promise<void> {
  const config = await discoverOIDC();
  const { verifier, challenge } = await generatePKCE();
  const state = generateRandom(16);

  // Store PKCE verifier + state for callback validation
  sessionStorage.setItem('oidc_code_verifier', verifier);
  sessionStorage.setItem('oidc_state', state);

  const params = new URLSearchParams({
    response_type: 'code',
    client_id: env.OIDC_CLIENT_ID,
    redirect_uri: env.OIDC_REDIRECT_URI,
    scope: env.OIDC_SCOPES,
    state,
    code_challenge: challenge,
    code_challenge_method: 'S256',
  });

  window.location.href = `${config.authorization_endpoint}?${params}`;
}

export interface OIDCTokenResponse {
  access_token: string;
  id_token: string;
  refresh_token?: string;
  expires_in: number;
  token_type: string;
}

export async function handleOIDCCallback(code: string, state: string): Promise<OIDCTokenResponse> {
  const savedState = sessionStorage.getItem('oidc_state');
  const verifier = sessionStorage.getItem('oidc_code_verifier');

  if (!savedState || savedState !== state) {
    throw new Error('OIDC state mismatch — possible CSRF attack');
  }
  if (!verifier) {
    throw new Error('Missing PKCE verifier');
  }

  const config = await discoverOIDC();

  const body = new URLSearchParams({
    grant_type: 'authorization_code',
    client_id: env.OIDC_CLIENT_ID,
    redirect_uri: env.OIDC_REDIRECT_URI,
    code,
    code_verifier: verifier,
  });

  const res = await fetch(config.token_endpoint, {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body,
  });

  if (!res.ok) {
    const text = await res.text();
    throw new Error(`Token exchange failed: ${res.status} ${text}`);
  }

  // Clean up session storage
  sessionStorage.removeItem('oidc_state');
  sessionStorage.removeItem('oidc_code_verifier');

  return res.json();
}

export async function oidcLogout(): Promise<void> {
  try {
    const config = await discoverOIDC();
    if (config.end_session_endpoint) {
      const idToken = sessionStorage.getItem('oidc_id_token');
      const params = new URLSearchParams({
        post_logout_redirect_uri: env.OIDC_POST_LOGOUT_REDIRECT_URI,
        ...(idToken ? { id_token_hint: idToken } : {}),
      });
      sessionStorage.removeItem('oidc_id_token');
      sessionStorage.removeItem('oidc_access_token');
      sessionStorage.removeItem('oidc_user');
      window.location.href = `${config.end_session_endpoint}?${params}`;
      return;
    }
  } catch {
    // fallback: just clear local state
  }
  sessionStorage.removeItem('oidc_id_token');
  sessionStorage.removeItem('oidc_access_token');
  sessionStorage.removeItem('oidc_user');
}

// ── Token parsing ─────────────────────────────────────────────

function parseJWT(token: string): any {
  const [, payload] = token.split('.');
  const decoded = atob(payload.replace(/-/g, '+').replace(/_/g, '/'));
  return JSON.parse(decoded);
}

/**
 * Extract roles from a JWT claim using a dot-separated path.
 * e.g. "realm_access.roles" → token.realm_access.roles
 */
function extractRoles(claims: any, claimPath: string): string[] {
  const parts = claimPath.split('.');
  let value: any = claims;
  for (const part of parts) {
    value = value?.[part];
    if (value === undefined) return [];
  }
  if (Array.isArray(value)) return value;
  if (typeof value === 'string') return [value];
  return [];
}

export function parseIDToken(idToken: string) {
  const claims = parseJWT(idToken);
  const roles = extractRoles(claims, env.OIDC_ROLE_CLAIM);
  return {
    sub: claims.sub as string,
    name: claims.name || claims.preferred_username || claims.email,
    email: claims.email,
    picture: claims.picture,
    roles,
  };
}

// ── State helpers ─────────────────────────────────────────────

export function storeOIDCTokens(tokens: OIDCTokenResponse) {
  sessionStorage.setItem('oidc_access_token', tokens.access_token);
  sessionStorage.setItem('oidc_id_token', tokens.id_token);
  if (tokens.refresh_token) {
    sessionStorage.setItem('oidc_refresh_token', tokens.refresh_token);
  }
  const parsed = parseIDToken(tokens.id_token);
  sessionStorage.setItem('oidc_user', JSON.stringify(parsed));
}

export function getStoredOIDCUser() {
  const raw = sessionStorage.getItem('oidc_user');
  if (!raw) return null;
  try {
    return JSON.parse(raw);
  } catch {
    return null;
  }
}

export function getStoredAccessToken(): string | null {
  return sessionStorage.getItem('oidc_access_token');
}

/** Check if OIDC mode is enabled (VITE_OIDC_ISSUER is set) */
export function isOIDCMode(): boolean {
  return !!env.OIDC_ISSUER;
}
