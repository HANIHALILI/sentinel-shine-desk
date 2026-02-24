import { Link } from 'react-router-dom';
import { getAllStatusPages } from '@/lib/mock-data';
import { getStatusDotClass, getStatusLabel } from '@/lib/status-utils';
import { Activity, ArrowRight, Shield } from 'lucide-react';

export default function Index() {
  const pages = getAllStatusPages();

  return (
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

        <div className="grid gap-4">
          {pages.map(page => {
            const operationalCount = page.services.filter(s => s.status === 'operational').length;
            return (
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
                  <div className="flex items-center gap-4">
                    <div className="text-right hidden sm:block">
                      <div className="text-sm font-medium text-card-foreground">
                        {operationalCount}/{page.services.length}
                      </div>
                      <div className="text-xs text-muted-foreground">services up</div>
                    </div>
                    <ArrowRight className="w-4 h-4 text-muted-foreground group-hover:text-foreground transition-colors" />
                  </div>
                </div>
                <div className="mt-3 flex items-center gap-2">
                  <span className={`text-xs font-medium ${page.globalStatus === 'operational' ? 'text-operational' : page.globalStatus === 'degraded' ? 'text-degraded' : 'text-down'}`}>
                    {getStatusLabel(page.globalStatus)}
                  </span>
                  {page.incidents.filter(i => i.status !== 'resolved').length > 0 && (
                    <span className="text-xs text-muted-foreground">
                      • {page.incidents.filter(i => i.status !== 'resolved').length} active incident(s)
                    </span>
                  )}
                </div>
              </Link>
            );
          })}
        </div>
      </main>
    </div>
  );
}
