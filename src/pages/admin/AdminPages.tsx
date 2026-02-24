import { useState } from 'react';
import { useStatusPages } from '@/hooks/use-status-pages';
import { getStatusDotClass, getStatusLabel } from '@/lib/status-utils';
import { Link } from 'react-router-dom';
import { Plus, ExternalLink, Pencil } from 'lucide-react';
import { LoadingState } from '@/components/LoadingState';
import { ErrorState } from '@/components/ErrorState';
import { EmptyState } from '@/components/EmptyState';
import { StatusPageDialog } from '@/components/admin/StatusPageDialog';
import type { StatusPage } from '@/lib/api/types';

export default function AdminPages() {
  const { data, isLoading, error, refetch } = useStatusPages();
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editPage, setEditPage] = useState<StatusPage | null>(null);

  if (isLoading) return <div className="p-8"><LoadingState /></div>;
  if (error) return <div className="p-8"><ErrorState error={error} onRetry={() => refetch()} /></div>;

  const pages = data?.data || [];

  const openEdit = (page: StatusPage) => { setEditPage(page); setDialogOpen(true); };
  const openCreate = () => { setEditPage(null); setDialogOpen(true); };

  return (
    <div className="p-6 sm:p-8 max-w-5xl">
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold text-foreground">Status Pages</h1>
        <button onClick={openCreate} className="flex items-center gap-2 px-4 py-2 bg-primary text-primary-foreground rounded-lg text-sm font-medium hover:opacity-90 transition-opacity">
          <Plus className="w-4 h-4" /> New Page
        </button>
      </div>

      {pages.length === 0 ? (
        <EmptyState title="No status pages yet" description="Create your first status page to start monitoring services." />
      ) : (
        <div className="bg-card border border-border rounded-lg divide-y divide-border">
          {pages.map(page => (
            <div key={page.id} className="p-5 flex items-center justify-between">
              <div className="flex items-center gap-3">
                <span className={getStatusDotClass(page.globalStatus)} />
                <div>
                  <div className="font-semibold text-card-foreground">{page.name}</div>
                  <div className="text-sm text-muted-foreground mt-0.5">{page.description}</div>
                  <div className="text-xs text-muted-foreground mt-1 font-mono">/status/{page.slug}</div>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <span className={`text-xs font-medium ${page.globalStatus === 'operational' ? 'text-operational' : 'text-degraded'}`}>
                  {getStatusLabel(page.globalStatus)}
                </span>
                <button onClick={() => openEdit(page)} className="p-2 text-muted-foreground hover:text-foreground transition-colors">
                  <Pencil className="w-4 h-4" />
                </button>
                <Link to={`/status/${page.slug}`} className="p-2 text-muted-foreground hover:text-foreground transition-colors">
                  <ExternalLink className="w-4 h-4" />
                </Link>
              </div>
            </div>
          ))}
        </div>
      )}

      <StatusPageDialog open={dialogOpen} onOpenChange={setDialogOpen} editPage={editPage} />
    </div>
  );
}
