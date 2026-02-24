import { useParams, Link } from 'react-router-dom';
import { getStatusPage } from '@/lib/mock-data';
import { GlobalStatusBanner } from '@/components/status/GlobalStatusBanner';
import { BroadcastBanner } from '@/components/status/BroadcastBanner';
import { ServiceCard } from '@/components/status/ServiceCard';
import { IncidentTimeline } from '@/components/status/IncidentTimeline';
import { Activity, ArrowLeft } from 'lucide-react';

export default function StatusPageView() {
  const { slug } = useParams<{ slug: string }>();
  const page = getStatusPage(slug || 'platform');

  if (!page) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="text-center">
          <h1 className="text-2xl font-bold text-foreground">Status page not found</h1>
          <Link to="/" className="text-sm text-muted-foreground hover:text-foreground mt-2 inline-block">
            ← Back to overview
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <header className="border-b border-border bg-card">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 py-5 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-md bg-primary flex items-center justify-center">
              <Activity className="w-4 h-4 text-primary-foreground" />
            </div>
            <div>
              <h1 className="font-bold text-foreground text-lg leading-tight">{page.name}</h1>
              <p className="text-xs text-muted-foreground">{page.description}</p>
            </div>
          </div>
          <Link
            to="/"
            className="text-xs text-muted-foreground hover:text-foreground flex items-center gap-1 transition-colors"
          >
            <ArrowLeft className="w-3 h-3" />
            All pages
          </Link>
        </div>
      </header>

      <main className="max-w-4xl mx-auto px-4 sm:px-6 py-8 space-y-6">
        {page.broadcastMessage && <BroadcastBanner message={page.broadcastMessage} />}

        <GlobalStatusBanner status={page.globalStatus} />

        <section>
          <h2 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider mb-4">Services</h2>
          <div className="grid gap-4 sm:grid-cols-2">
            {page.services.map(service => (
              <ServiceCard key={service.id} service={service} />
            ))}
          </div>
        </section>

        <section>
          <h2 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider mb-4">Incidents</h2>
          <IncidentTimeline incidents={page.incidents} />
        </section>

        <footer className="text-center py-8 text-xs text-muted-foreground">
          Powered by StatusGuard • Updated every 60 seconds
        </footer>
      </main>
    </div>
  );
}
