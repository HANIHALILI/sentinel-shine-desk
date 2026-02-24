import { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useAuth } from '@/lib/auth';
import { Activity, LogIn, UserPlus, Shield } from 'lucide-react';

export default function Login() {
  const { login, signUp, loginWithOIDC, error: authError, oidcMode } = useAuth();
  const navigate = useNavigate();
  const [isSignUp, setIsSignUp] = useState(false);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [name, setName] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);
    try {
      if (isSignUp) {
        await signUp(email, password, name);
      } else {
        await login(email, password);
      }
      navigate('/admin');
    } catch (err: any) {
      setError(err.message || 'Authentication failed');
    } finally {
      setLoading(false);
    }
  };

  const handleOIDCLogin = async () => {
    setLoading(true);
    setError(null);
    try {
      await loginWithOIDC();
    } catch (err: any) {
      setError(err.message || 'OIDC login failed');
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-background flex items-center justify-center px-4">
      <div className="w-full max-w-sm">
        <div className="text-center mb-8">
          <Link to="/" className="inline-flex items-center gap-2.5 mb-4">
            <div className="w-10 h-10 rounded-lg bg-primary flex items-center justify-center">
              <Activity className="w-5 h-5 text-primary-foreground" />
            </div>
            <span className="font-bold text-foreground text-xl tracking-tight">StatusGuard</span>
          </Link>
          <h1 className="text-xl font-bold text-foreground">
            {oidcMode ? 'Sign in with SSO' : isSignUp ? 'Create an account' : 'Sign in to admin'}
          </h1>
          <p className="text-sm text-muted-foreground mt-1">
            {oidcMode ? 'Use your organization identity provider' : isSignUp ? 'Get started with StatusGuard' : 'Manage your status pages'}
          </p>
        </div>

        <div className="bg-card border border-border rounded-lg p-6 space-y-4">
          {(error || authError) && (
            <div className="bg-destructive/10 border border-destructive/30 rounded-md px-3 py-2 text-sm text-destructive">
              {error || authError}
            </div>
          )}

          {/* OIDC SSO button — shown when VITE_OIDC_ISSUER is configured */}
          {oidcMode && (
            <button
              onClick={handleOIDCLogin}
              disabled={loading}
              className="w-full flex items-center justify-center gap-2 px-4 py-2.5 bg-primary text-primary-foreground rounded-md text-sm font-medium hover:opacity-90 transition-opacity disabled:opacity-50"
            >
              {loading ? (
                <div className="w-4 h-4 border-2 border-primary-foreground/30 border-t-primary-foreground rounded-full animate-spin" />
              ) : (
                <><Shield className="w-4 h-4" /> Sign in with SSO (OIDC)</>
              )}
            </button>
          )}

          {/* Separator when both modes could be shown */}
          {oidcMode && (
            <div className="flex items-center gap-3">
              <div className="flex-1 h-px bg-border" />
              <span className="text-xs text-muted-foreground">or use local credentials</span>
              <div className="flex-1 h-px bg-border" />
            </div>
          )}

          {/* Email/password form — always available as fallback */}
          <form onSubmit={handleSubmit} className="space-y-4">
            {!oidcMode && isSignUp && (
              <div>
                <label className="block text-sm font-medium text-card-foreground mb-1.5">Name</label>
                <input
                  type="text"
                  value={name}
                  onChange={e => setName(e.target.value)}
                  className="w-full px-3 py-2 bg-background border border-input rounded-md text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring"
                  placeholder="Your name"
                />
              </div>
            )}

            <div>
              <label className="block text-sm font-medium text-card-foreground mb-1.5">Email</label>
              <input
                type="email"
                value={email}
                onChange={e => setEmail(e.target.value)}
                required
                className="w-full px-3 py-2 bg-background border border-input rounded-md text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring"
                placeholder="admin@example.com"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-card-foreground mb-1.5">Password</label>
              <input
                type="password"
                value={password}
                onChange={e => setPassword(e.target.value)}
                required
                minLength={6}
                className="w-full px-3 py-2 bg-background border border-input rounded-md text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring"
                placeholder="••••••••"
              />
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full flex items-center justify-center gap-2 px-4 py-2.5 bg-primary text-primary-foreground rounded-md text-sm font-medium hover:opacity-90 transition-opacity disabled:opacity-50"
            >
              {loading ? (
                <div className="w-4 h-4 border-2 border-primary-foreground/30 border-t-primary-foreground rounded-full animate-spin" />
              ) : isSignUp ? (
                <><UserPlus className="w-4 h-4" /> Create Account</>
              ) : (
                <><LogIn className="w-4 h-4" /> Sign In</>
              )}
            </button>
          </form>

          {!oidcMode && (
            <div className="text-center">
              <button
                type="button"
                onClick={() => { setIsSignUp(!isSignUp); setError(null); }}
                className="text-sm text-muted-foreground hover:text-foreground transition-colors"
              >
                {isSignUp ? 'Already have an account? Sign in' : "Don't have an account? Sign up"}
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
