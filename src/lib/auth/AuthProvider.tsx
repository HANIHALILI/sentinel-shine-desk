import { createContext, useContext, useCallback, useEffect, useState, type ReactNode } from 'react';
import { auth, profiles } from '@/lib/db';

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
  login: (email: string, password: string) => Promise<void>;
  signUp: (email: string, password: string, name?: string) => Promise<void>;
  logout: () => Promise<void>;
  hasRole: (role: 'admin' | 'editor' | 'viewer') => boolean;
  getAccessToken: () => Promise<string | null>;
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

  const loadProfile = useCallback(async (authUser: any) => {
    try {
      const profile = await profiles.getByUserId(authUser.id);
      setUser({
        id: authUser.id,
        sub: authUser.id,
        name: profile.name || authUser.email?.split('@')[0],
        email: authUser.email,
        roles: [profile.role as 'admin' | 'editor' | 'viewer'],
      });
    } catch {
      // Profile may not exist yet (race condition on signup)
      setUser({
        id: authUser.id,
        sub: authUser.id,
        name: authUser.email?.split('@')[0],
        email: authUser.email,
        roles: ['viewer'],
      });
    }
  }, []);

  useEffect(() => {
    // Check initial session
    auth.getSession().then(({ data: { session } }) => {
      if (session?.user) {
        loadProfile(session.user).finally(() => setIsLoading(false));
      } else {
        setIsLoading(false);
      }
    });

    // Listen for auth changes
    const { data: { subscription } } = auth.onAuthStateChange(async (_event, session) => {
      if (session?.user) {
        await loadProfile(session.user);
      } else {
        setUser(null);
      }
    });

    return () => subscription.unsubscribe();
  }, [loadProfile]);

  const login = useCallback(async (email: string, password: string) => {
    setError(null);
    const { error: err } = await auth.signIn(email, password);
    if (err) {
      setError(err.message);
      throw err;
    }
  }, []);

  const signUp = useCallback(async (email: string, password: string, name?: string) => {
    setError(null);
    const { error: err } = await auth.signUp(email, password, name);
    if (err) {
      setError(err.message);
      throw err;
    }
  }, []);

  const logout = useCallback(async () => {
    await auth.signOut();
    setUser(null);
  }, []);

  const hasRole = useCallback((role: 'admin' | 'editor' | 'viewer') => {
    if (!user) return false;
    if (user.roles.includes('admin')) return true;
    return user.roles.includes(role);
  }, [user]);

  const getAccessToken = useCallback(async () => {
    const { data: { session } } = await auth.getSession();
    return session?.access_token || null;
  }, []);

  return (
    <AuthContext.Provider value={{
      isAuthenticated: !!user,
      isLoading,
      user,
      error,
      login,
      signUp,
      logout,
      hasRole,
      getAccessToken,
    }}>
      {children}
    </AuthContext.Provider>
  );
}
