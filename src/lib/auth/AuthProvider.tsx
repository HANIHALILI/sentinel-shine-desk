import { createContext, useContext, useCallback, useEffect, useState, type ReactNode } from 'react';
import { auth, profiles } from '@/lib/db';
import { isOIDCMode, getStoredOIDCUser, getStoredAccessToken, oidcLogout, startOIDCLogin } from '@/lib/auth/oidc';

interface AuthUser {
  id: string;
  sub: string;
  name?: string;
  email?: string;
  picture?: string;
  roles: ('admin' | 'editor' | 'viewer')[];
}

interface AuthState {
  isAuthenticated: boolean;
  isLoading: boolean;
  user: AuthUser | null;
  error: string | null;
  /** Email/password login (Cloud mode only) */
  login: (email: string, password: string) => Promise<void>;
  /** Email/password signup (Cloud mode only) */
  signUp: (email: string, password: string, name?: string) => Promise<void>;
  /** Start OIDC redirect login (OIDC mode only) */
  loginWithOIDC: () => Promise<void>;
  logout: () => Promise<void>;
  hasRole: (role: 'admin' | 'editor' | 'viewer') => boolean;
  getAccessToken: () => Promise<string | null>;
  /** Whether the app is using OIDC mode (ADFS/Keycloak) vs Cloud auth */
  oidcMode: boolean;
}

const AuthContext = createContext<AuthState | null>(null);

export function useAuth(): AuthState {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used within AuthProvider');
  return ctx;
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<AuthUser | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const oidcMode = isOIDCMode();

  // ── Cloud auth helpers ──────────────────────────────────
  const loadProfile = useCallback(async (authUser: any) => {
    try {
      const profile = await profiles.getByUserId(authUser.id);
      setUser({
        id: authUser.id,
        sub: authUser.id,
        name: authUser.name || profile.name || authUser.email?.split('@')[0],
        email: authUser.email,
        roles: [(authUser.role || profile.role || 'viewer') as 'admin' | 'editor' | 'viewer'],
      });
    } catch {
      setUser({
        id: authUser.id,
        sub: authUser.id,
        name: authUser.name || authUser.email?.split('@')[0],
        email: authUser.email,
        roles: [(authUser.role || 'viewer') as 'admin' | 'editor' | 'viewer'],
      });
    }
  }, []);

  useEffect(() => {
    if (oidcMode) {
      // ── OIDC mode: restore from sessionStorage ──────
      const stored = getStoredOIDCUser();
      if (stored) {
        const validRoles = (stored.roles || []).filter((r: string) =>
          ['admin', 'editor', 'viewer'].includes(r)
        );
        setUser({
          id: stored.sub,
          sub: stored.sub,
          name: stored.name,
          email: stored.email,
          picture: stored.picture,
          roles: validRoles.length > 0 ? validRoles : ['viewer'],
        });
      }
      setIsLoading(false);
      return;
    }

    // ── Cloud mode: use Supabase session ──────────────
    if (auth?.getSession) {
      auth.getSession().then((result) => {
        const session = result?.data?.session;
        if (session?.user) {
          loadProfile(session.user).finally(() => setIsLoading(false));
        } else {
          setIsLoading(false);
        }
      }).catch(() => {
        setIsLoading(false);
      });

      try {
        const result = auth.onAuthStateChange(async (_event, session) => {
          if (session?.user) {
            await loadProfile(session.user);
          } else {
            setUser(null);
          }
        });

        const subscription = result?.data?.subscription;
        if (subscription?.unsubscribe) {
          return () => subscription.unsubscribe();
        }
      } catch (err) {
        console.error('Auth state change listener error:', err);
      }
      return;
    } else {
      setIsLoading(false);
    }
  }, [loadProfile, oidcMode]);

  const login = useCallback(async (email: string, password: string) => {
    if (oidcMode) throw new Error('Use OIDC login in offline mode');
    setError(null);
    const result = await auth.signIn(email, password);
    const err = result?.error;
    const user = result?.user;
    if (err) {
      setError(err.message);
      throw err;
    }
    if (user) {
      await loadProfile(user);
    }
  }, [oidcMode, loadProfile]);

  const signUp = useCallback(async (email: string, password: string, name?: string) => {
    if (oidcMode) throw new Error('Signup not available in OIDC mode');
    setError(null);
    const result = await auth.signUp(email, password, name);
    const err = result?.error;
    const user = result?.user;
    if (err) {
      setError(err.message);
      throw err;
    }
    if (user) {
      await loadProfile(user);
    }
  }, [oidcMode, loadProfile]);

  const loginWithOIDC = useCallback(async () => {
    setError(null);
    try {
      await startOIDCLogin();
    } catch (err: any) {
      setError(err.message);
      throw err;
    }
  }, []);

  const logout = useCallback(async () => {
    if (oidcMode) {
      await oidcLogout();
      setUser(null);
    } else {
      await auth.signOut();
      setUser(null);
    }
  }, [oidcMode]);

  const hasRole = useCallback((role: 'admin' | 'editor' | 'viewer') => {
    if (!user) return false;
    if (user.roles.includes('admin')) return true;
    return user.roles.includes(role);
  }, [user]);

  const getAccessToken = useCallback(async () => {
    if (oidcMode) {
      return getStoredAccessToken();
    }
    const { data: { session } } = await auth.getSession();
    return session?.access_token || null;
  }, [oidcMode]);

  return (
    <AuthContext.Provider value={{
      isAuthenticated: !!user,
      isLoading,
      user,
      error,
      login,
      signUp,
      loginWithOIDC,
      logout,
      hasRole,
      getAccessToken,
      oidcMode,
    }}>
      {children}
    </AuthContext.Provider>
  );
}
