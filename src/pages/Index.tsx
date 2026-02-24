import { Link } from 'react-router-dom';
import { useStatusPages } from '@/hooks/use-status-pages';
import { getStatusDotClass, getStatusLabel } from '@/lib/status-utils';
import { LoadingPage } from '@/components/LoadingState';
import { ErrorState } from '@/components/ErrorState';
import { EmptyState } from '@/components/EmptyState';
import { ErrorBoundary } from '@/components/ErrorBoundary';
import { Activity, ArrowRight, Shield } from 'lucide-react';

export default function Index() {
  const { data, isLoading, error, refetch } = useStatusPages();

  if (isLoading) return <LoadingPage />;
  if (error) return <ErrorState error={error} onRetry={() => refetch()} />;

  const pages = data?.data || [];

  return (
    <ErrorBoundary>
      <div className="min-h-screen bg-background">
        <header className="border-b border-border bg-card">
          <div className="max-w-4xl mx-auto px-4 sm:px-6 py-6 flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-9 h-9 rounded-lg bg-primary flex items-center justify-center">
                <Activity className="w-5 h-5 text-primary-foreground" />
              </div>
              <div>
                <h1 className="font-bold text-foreground text-xl tracking-tight">StatusGuard</h1>
                <p className="text-xs text-muted-foreground">Self-hosted status monitoring</p>
              </div>
            </div>
            <Link
              to="/admin"
              className="flex items-center gap-2 px-4 py-2 text-sm font-medium bg-secondary text-secondary-foreground rounded-lg hover:bg-accent transition-colors"
            >
              <Shield className="w-4 h-4" />
              Admin
            </Link>
          </div>
        </header>

        <main className="max-w-4xl mx-auto px-4 sm:px-6 py-10">
          <div className="mb-8">
            <h2 className="text-2xl font-bold text-foreground">Status Pages</h2>
            <p className="text-muted-foreground mt-1">Monitor the health of all your services in one place.</p>
          </div>

          {pages.length === 0 ? (
            <EmptyState
              title="No status pages"
              description="Create your first status page from the admin panel."
              action={
                <Link
                  to="/admin/pages"
                  className="px-4 py-2 bg-primary text-primary-foreground rounded-lg text-sm font-medium"
                >
                  Create Status Page
                </Link>
              }
            />
          ) : (
            <div className="grid gap-4">
              {pages.map(page => (
                <Link
                  key={page.id}
                  to={`/status/${page.slug}`}
                  className="group bg-card border border-border rounded-lg p-5 hover:border-ring/30 transition-all hover:shadow-sm"
                >
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <span className={getStatusDotClass(page.globalStatus)} />
                      <div>
                        <h3 className="font-semibold text-card-foreground group-hover:text-foreground transition-colors">
                          {page.name}
                        </h3>
                        <p className="text-sm text-muted-foreground mt-0.5">{page.description}</p>
                      </div>
                    </div>
                    <ArrowRight className="w-4 h-4 text-muted-foreground group-hover:text-foreground transition-colors" />
                  </div>
                  <div className="mt-3 flex items-center gap-2">
                    <span className={`text-xs font-medium ${page.globalStatus === 'operational' ? 'text-operational' : page.globalStatus === 'degraded' ? 'text-degraded' : 'text-down'}`}>
                      {getStatusLabel(page.globalStatus)}
                    </span>
                    <span className="text-xs text-muted-foreground font-mono">/status/{page.slug}</span>
                  </div>
                </Link>
              ))}
            </div>
          )}
        </main>
      </div>
    </ErrorBoundary>
  );
}
