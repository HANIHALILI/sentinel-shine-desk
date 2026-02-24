import { createContext, useContext, useCallback, useEffect, useRef, useState, type ReactNode } from 'react';
import { env } from '@/lib/env';
import { setTokenProvider } from '@/lib/api/client';
import type { UserRole } from '@/lib/api/types';

// ============================================================
// OIDC Authorization Code Flow with PKCE
// Tokens stored in memory only — never localStorage.
// ============================================================

interface OIDCConfig {
  issuer: string;
  clientId: string;
  scopes: string;
  redirectUri: string;
  postLogoutRedirectUri: string;
  roleClaim: string;
}

interface AuthUser {
  sub: string;
  name?: string;
  email?: string;
  picture?: string;
  roles: UserRole[];
}

interface AuthState {
  isAuthenticated: boolean;
  isLoading: boolean;
  user: AuthUser | null;
  error: string | null;
  login: () => Promise<void>;
  logout: () => Promise<void>;
  hasRole: (role: UserRole) => boolean;
  getAccessToken: () => Promise<string | null>;
}

const AuthContext = createContext<AuthState | null>(null);

export function useAuth(): AuthState {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used within AuthProvider');
  return ctx;
}

// PKCE helpers
function generateRandomString(length: number): string {
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789-._~';
  const array = new Uint8Array(length);
  crypto.getRandomValues(array);
  return Array.from(array, b => chars[b % chars.length]).join('');
}

async function generateCodeChallenge(verifier: string): Promise<string> {
  const encoder = new TextEncoder();
  const data = encoder.encode(verifier);
  const digest = await crypto.subtle.digest('SHA-256', data);
  return btoa(String.fromCharCode(...new Uint8Array(digest)))
    .replace(/\+/g, '-')
    .replace(/\//g, '_')
    .replace(/=+$/, '');
}

function parseJwt(token: string): Record<string, unknown> {
  const base64 = token.split('.')[1].replace(/-/g, '+').replace(/_/g, '/');
  return JSON.parse(atob(base64));
}

function getNestedClaim(obj: Record<string, unknown>, path: string): unknown {
  return path.split('.').reduce<unknown>((acc, key) => {
    if (acc && typeof acc === 'object') return (acc as Record<string, unknown>)[key];
    return undefined;
  }, obj);
}

interface AuthProviderProps {
  children: ReactNode;
  /** Override config for dynamic OIDC configuration */
  config?: Partial<OIDCConfig>;
}

export function AuthProvider({ children, config: configOverride }: AuthProviderProps) {
  const [user, setUser] = useState<AuthUser | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const accessTokenRef = useRef<string | null>(null);
  const refreshTimerRef = useRef<ReturnType<typeof setTimeout>>();

  const oidcConfig: OIDCConfig = {
    issuer: configOverride?.issuer || env.OIDC_ISSUER,
    clientId: configOverride?.clientId || env.OIDC_CLIENT_ID,
    scopes: configOverride?.scopes || env.OIDC_SCOPES,
    redirectUri: configOverride?.redirectUri || env.OIDC_REDIRECT_URI,
    postLogoutRedirectUri: configOverride?.postLogoutRedirectUri || env.OIDC_POST_LOGOUT_REDIRECT_URI,
    roleClaim: configOverride?.roleClaim || env.OIDC_ROLE_CLAIM,
  };

  const isConfigured = Boolean(oidcConfig.issuer && oidcConfig.clientId);

  const getAccessToken = useCallback(async (): Promise<string | null> => {
    return accessTokenRef.current;
  }, []);

  // Register token provider with API client
  useEffect(() => {
    setTokenProvider(getAccessToken);
  }, [getAccessToken]);

  const extractUser = useCallback((idToken: string): AuthUser => {
    const claims = parseJwt(idToken);
    const roleClaim = getNestedClaim(claims, oidcConfig.roleClaim);
    let roles: UserRole[] = [];
    if (Array.isArray(roleClaim)) {
      roles = roleClaim.filter((r): r is UserRole => ['admin', 'editor', 'viewer'].includes(r as string));
    } else if (typeof roleClaim === 'string') {
      if (['admin', 'editor', 'viewer'].includes(roleClaim)) roles = [roleClaim as UserRole];
    }
    if (roles.length === 0) roles = ['viewer'];

    return {
      sub: claims.sub as string,
      name: (claims.name || claims.preferred_username) as string | undefined,
      email: claims.email as string | undefined,
      picture: claims.picture as string | undefined,
      roles,
    };
  }, [oidcConfig.roleClaim]);

  const scheduleRefresh = useCallback((expiresIn: number) => {
    if (refreshTimerRef.current) clearTimeout(refreshTimerRef.current);
    // Refresh 60s before expiry
    const refreshIn = Math.max((expiresIn - 60) * 1000, 5000);
    refreshTimerRef.current = setTimeout(() => {
      silentRefresh();
    }, refreshIn);
  }, []);

  const silentRefresh = useCallback(async () => {
    if (!isConfigured) return;
    try {
      // Use hidden iframe for silent token refresh
      // In production this would hit the OIDC provider's authorize endpoint with prompt=none
      // For now we signal the token has expired
      console.info('[Auth] Silent refresh would execute here');
    } catch {
      setUser(null);
      accessTokenRef.current = null;
    }
  }, [isConfigured]);

  const login = useCallback(async () => {
    if (!isConfigured) {
      setError('OIDC is not configured. Set VITE_OIDC_ISSUER and VITE_OIDC_CLIENT_ID.');
      return;
    }

    const verifier = generateRandomString(64);
    const challenge = await generateCodeChallenge(verifier);
    const state = generateRandomString(32);

    // Store PKCE verifier and state in sessionStorage (short-lived, same-tab only)
    sessionStorage.setItem('oidc_verifier', verifier);
    sessionStorage.setItem('oidc_state', state);

    const params = new URLSearchParams({
      response_type: 'code',
      client_id: oidcConfig.clientId,
      redirect_uri: oidcConfig.redirectUri,
      scope: oidcConfig.scopes,
      state,
      code_challenge: challenge,
      code_challenge_method: 'S256',
    });

    window.location.href = `${oidcConfig.issuer}/authorize?${params}`;
  }, [isConfigured, oidcConfig]);

  const handleCallback = useCallback(async (code: string, state: string) => {
    const savedState = sessionStorage.getItem('oidc_state');
    const verifier = sessionStorage.getItem('oidc_verifier');

    sessionStorage.removeItem('oidc_state');
    sessionStorage.removeItem('oidc_verifier');

    if (state !== savedState) {
      setError('Invalid state parameter — possible CSRF attack.');
      setIsLoading(false);
      return;
    }

    if (!verifier) {
      setError('Missing PKCE verifier.');
      setIsLoading(false);
      return;
    }

    try {
      const tokenResponse = await fetch(`${oidcConfig.issuer}/token`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
        body: new URLSearchParams({
          grant_type: 'authorization_code',
          code,
          redirect_uri: oidcConfig.redirectUri,
          client_id: oidcConfig.clientId,
          code_verifier: verifier,
        }),
      });

      if (!tokenResponse.ok) {
        throw new Error('Token exchange failed');
      }

      const tokens = await tokenResponse.json();
      accessTokenRef.current = tokens.access_token;

      if (tokens.id_token) {
        setUser(extractUser(tokens.id_token));
      }

      if (tokens.expires_in) {
        scheduleRefresh(tokens.expires_in);
      }

      // Clean URL
      window.history.replaceState({}, '', '/admin');
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setIsLoading(false);
    }
  }, [oidcConfig, extractUser, scheduleRefresh]);

  const logout = useCallback(async () => {
    accessTokenRef.current = null;
    setUser(null);
    if (refreshTimerRef.current) clearTimeout(refreshTimerRef.current);

    if (isConfigured) {
      const params = new URLSearchParams({
        post_logout_redirect_uri: oidcConfig.postLogoutRedirectUri,
        client_id: oidcConfig.clientId,
      });
      window.location.href = `${oidcConfig.issuer}/logout?${params}`;
    }
  }, [isConfigured, oidcConfig]);

  const hasRole = useCallback((role: UserRole): boolean => {
    if (!user) return false;
    if (user.roles.includes('admin')) return true;
    return user.roles.includes(role);
  }, [user]);

  // Check for OIDC callback on mount
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const code = params.get('code');
    const state = params.get('state');

    if (code && state) {
      handleCallback(code, state);
    } else {
      setIsLoading(false);
    }
  }, [handleCallback]);

  // Cleanup
  useEffect(() => {
    return () => {
      if (refreshTimerRef.current) clearTimeout(refreshTimerRef.current);
    };
  }, []);

  const value: AuthState = {
    isAuthenticated: !!user,
    isLoading,
    user,
    error,
    login,
    logout,
    hasRole,
    getAccessToken,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}
