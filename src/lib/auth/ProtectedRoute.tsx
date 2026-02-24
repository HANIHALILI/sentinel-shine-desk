import { Navigate } from 'react-router-dom';
import { useAuth } from './AuthProvider';
import type { UserRole } from '@/lib/api/types';
import { Loader2, ShieldAlert } from 'lucide-react';

interface Props {
  children: React.ReactNode;
  requiredRole?: UserRole;
}

export function ProtectedRoute({ children, requiredRole }: Props) {
  const { isAuthenticated, isLoading, user, hasRole } = useAuth();

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="flex flex-col items-center gap-3">
          <Loader2 className="w-6 h-6 text-muted-foreground animate-spin" />
          <span className="text-sm text-muted-foreground">Authenticating...</span>
        </div>
      </div>
    );
  }

  if (!isAuthenticated) {
    return <Navigate to="/login" replace />;
  }

  if (requiredRole && !hasRole(requiredRole)) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="bg-card border border-border rounded-lg p-6 max-w-md text-center">
          <ShieldAlert className="w-8 h-8 text-destructive mx-auto mb-3" />
          <h2 className="text-lg font-semibold text-card-foreground mb-2">Insufficient Permissions</h2>
          <p className="text-sm text-muted-foreground">
            You need the <strong>{requiredRole}</strong> role to access this page.
            Current roles: {user?.roles.join(', ') || 'none'}
          </p>
        </div>
      </div>
    );
  }

  return <>{children}</>;
}
