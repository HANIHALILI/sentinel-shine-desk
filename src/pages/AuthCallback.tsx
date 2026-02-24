/**
 * OIDC callback handler.
 * Receives the authorization code from the IdP redirect,
 * exchanges it for tokens, and redirects to /admin.
 */
import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { handleOIDCCallback, storeOIDCTokens } from '@/lib/auth/oidc';
import { Loader2 } from 'lucide-react';

export default function AuthCallback() {
  const navigate = useNavigate();
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const code = params.get('code');
    const state = params.get('state');
    const oidcError = params.get('error');

    if (oidcError) {
      setError(`IdP error: ${oidcError} — ${params.get('error_description') || ''}`);
      return;
    }

    if (!code || !state) {
      setError('Missing authorization code or state parameter');
      return;
    }

    handleOIDCCallback(code, state)
      .then(tokens => {
        storeOIDCTokens(tokens);
        navigate('/admin', { replace: true });
      })
      .catch(err => setError(err.message));
  }, [navigate]);

  if (error) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background px-4">
        <div className="bg-card border border-border rounded-lg p-6 max-w-md">
          <h2 className="text-lg font-semibold text-destructive mb-2">Authentication Failed</h2>
          <p className="text-sm text-muted-foreground mb-4">{error}</p>
          <button
            onClick={() => navigate('/login', { replace: true })}
            className="px-4 py-2 bg-primary text-primary-foreground rounded-md text-sm hover:opacity-90"
          >
            Back to Login
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-background">
      <div className="flex flex-col items-center gap-3">
        <Loader2 className="w-6 h-6 text-muted-foreground animate-spin" />
        <span className="text-sm text-muted-foreground">Completing authentication...</span>
      </div>
    </div>
  );
}
