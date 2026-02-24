import { useState, useEffect } from 'react';
import { Shield, Key, Megaphone, Radio } from 'lucide-react';
import { useAuth } from '@/lib/auth';
import { useStatusPages } from '@/hooks/use-status-pages';
import { BroadcastDialog } from '@/components/admin/BroadcastDialog';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

export default function AdminSettings() {
  const { user } = useAuth();
  const { data: pagesData } = useStatusPages();
  const pages = pagesData?.data || [];
  const [broadcastOpen, setBroadcastOpen] = useState(false);

  // Config state
  const [config, setConfig] = useState<Record<string, string>>({});
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    supabase.from('config').select('*').then(({ data }) => {
      if (data) {
        const map: Record<string, string> = {};
        data.forEach((r: any) => { map[r.key] = r.value; });
        setConfig(map);
      }
    });
  }, []);

  const updateConfig = async (key: string, value: string) => {
    setSaving(true);
    const { error } = await supabase.from('config').upsert({ key, value }, { onConflict: 'key' });
    if (error) {
      toast.error(error.message);
    } else {
      setConfig(prev => ({ ...prev, [key]: value }));
      toast.success(`${key} updated`);
    }
    setSaving(false);
  };

  return (
    <div className="p-6 sm:p-8 max-w-3xl">
      <h1 className="text-2xl font-bold text-foreground mb-6">Settings</h1>

      <div className="space-y-6">
        {/* Current User */}
        <section className="bg-card border border-border rounded-lg p-5">
          <div className="flex items-center gap-3 mb-4">
            <Shield className="w-5 h-5 text-muted-foreground" />
            <h2 className="font-semibold text-card-foreground">Current User</h2>
          </div>
          <div className="space-y-3">
            <SettingField label="Name" value={user?.name || '—'} />
            <SettingField label="Email" value={user?.email || '—'} />
            <SettingField label="Role" value={user?.roles.join(', ') || '—'} />
          </div>
        </section>

        {/* RBAC */}
        <section className="bg-card border border-border rounded-lg p-5">
          <div className="flex items-center gap-3 mb-4">
            <Key className="w-5 h-5 text-muted-foreground" />
            <h2 className="font-semibold text-card-foreground">RBAC Roles</h2>
          </div>
          <div className="space-y-2 text-sm">
            {['Admin — Full access to all features', 'Editor — Create & manage pages, services, incidents', 'Viewer — Read-only dashboard access'].map(r => (
              <div key={r} className="px-3 py-2 bg-muted/50 rounded-md text-card-foreground">{r}</div>
            ))}
          </div>
        </section>

        {/* Broadcasts */}
        <section className="bg-card border border-border rounded-lg p-5">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-3">
              <Megaphone className="w-5 h-5 text-muted-foreground" />
              <h2 className="font-semibold text-card-foreground">Broadcasts</h2>
            </div>
            <button onClick={() => setBroadcastOpen(true)} disabled={pages.length === 0} className="px-3 py-1.5 text-sm bg-primary text-primary-foreground rounded-md hover:opacity-90 disabled:opacity-50">
              Post Broadcast
            </button>
          </div>
          <p className="text-sm text-muted-foreground">Post maintenance notices or alerts to your status pages.</p>
        </section>

        {/* Monitoring Config */}
        <section className="bg-card border border-border rounded-lg p-5">
          <div className="flex items-center gap-3 mb-4">
            <Radio className="w-5 h-5 text-muted-foreground" />
            <h2 className="font-semibold text-card-foreground">Monitoring Config</h2>
          </div>
          <div className="space-y-3">
            <EditableField label="Default check interval (s)" value={config['check_interval'] || '60'} onSave={v => updateConfig('check_interval', v)} saving={saving} />
            <EditableField label="Default timeout (ms)" value={config['timeout_ms'] || '5000'} onSave={v => updateConfig('timeout_ms', v)} saving={saving} />
            <EditableField label="Retention days" value={config['retention_days'] || '90'} onSave={v => updateConfig('retention_days', v)} saving={saving} />
          </div>
        </section>
      </div>

      <BroadcastDialog open={broadcastOpen} onOpenChange={setBroadcastOpen} statusPages={pages} />
    </div>
  );
}

function SettingField({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-center justify-between">
      <span className="text-sm text-muted-foreground">{label}</span>
      <span className="text-sm font-mono text-card-foreground bg-muted/50 px-2.5 py-1 rounded">{value}</span>
    </div>
  );
}

function EditableField({ label, value, onSave, saving }: { label: string; value: string; onSave: (v: string) => void; saving: boolean }) {
  const [editing, setEditing] = useState(false);
  const [val, setVal] = useState(value);

  useEffect(() => setVal(value), [value]);

  if (!editing) {
    return (
      <div className="flex items-center justify-between">
        <span className="text-sm text-muted-foreground">{label}</span>
        <button onClick={() => setEditing(true)} className="text-sm font-mono text-card-foreground bg-muted/50 px-2.5 py-1 rounded hover:bg-muted transition-colors cursor-pointer">
          {value}
        </button>
      </div>
    );
  }

  return (
    <div className="flex items-center justify-between gap-2">
      <span className="text-sm text-muted-foreground">{label}</span>
      <div className="flex items-center gap-1">
        <input value={val} onChange={e => setVal(e.target.value)} className="w-20 px-2 py-1 text-sm font-mono bg-background border border-input rounded" autoFocus />
        <button onClick={() => { onSave(val); setEditing(false); }} disabled={saving} className="px-2 py-1 text-xs bg-primary text-primary-foreground rounded">Save</button>
        <button onClick={() => { setVal(value); setEditing(false); }} className="px-2 py-1 text-xs border border-input rounded">✕</button>
      </div>
    </div>
  );
}
