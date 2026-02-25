import { useState, useEffect } from 'react';
import { Shield, Key, Megaphone, Users, Wifi } from 'lucide-react';
import { useAuth } from '@/lib/auth';
import { useStatusPages } from '@/hooks/use-status-pages';
import { BroadcastDialog } from '@/components/admin/BroadcastDialog';
import { supabase } from '@/integrations/supabase/client';
import { auth } from '@/lib/db';
import { toast } from 'sonner';
import { env } from '@/lib/env';

export default function AdminSettings() {
  const { user } = useAuth();
  const { data: pagesData } = useStatusPages();
  const pages = pagesData?.data || [];
  const [broadcastOpen, setBroadcastOpen] = useState(false);

  // SSO config state (stored in config table)
  const [config, setConfig] = useState<Record<string, string>>({});
  const [saving, setSaving] = useState(false);

  // User creation state
  const [newEmail, setNewEmail] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [newName, setNewName] = useState('');
  const [newRole, setNewRole] = useState('viewer');
  const [creatingUser, setCreatingUser] = useState(false);

  // All users
  const [allUsers, setAllUsers] = useState<any[]>([]);

  useEffect(() => {
    supabase.from('config').select('*').then(({ data }) => {
      if (data) {
        const map: Record<string, string> = {};
        data.forEach((r: any) => { map[r.key] = r.value; });
        setConfig(map);
      }
    });
    loadUsers();
  }, []);

  const loadUsers = async () => {
    const { data } = await supabase.from('profiles').select('*').order('created_at');
    if (data) setAllUsers(data);
  };

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

  const handleCreateUser = async (e: React.FormEvent) => {
    e.preventDefault();
    setCreatingUser(true);
    try {
      const { error } = await auth.signUp(newEmail, newPassword, newName);
      if (error) throw error;
      // Update role if not viewer (default)
      if (newRole !== 'viewer') {
        // Wait briefly for the trigger to create the profile
        await new Promise(r => setTimeout(r, 1000));
        await supabase.from('profiles').update({ role: newRole }).eq('email', newEmail);
      }
      toast.success(`User ${newEmail} created with role ${newRole}`);
      setNewEmail(''); setNewPassword(''); setNewName(''); setNewRole('viewer');
      loadUsers();
    } catch (err: any) {
      toast.error(err.message || 'Failed to create user');
    }
    setCreatingUser(false);
  };

  const updateUserRole = async (profileId: string, role: string) => {
    const { error } = await supabase.from('profiles').update({ role }).eq('id', profileId);
    if (error) {
      toast.error(error.message);
    } else {
      toast.success('Role updated');
      loadUsers();
    }
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

        {/* User Management */}
        <section className="bg-card border border-border rounded-lg p-5">
          <div className="flex items-center gap-3 mb-4">
            <Users className="w-5 h-5 text-muted-foreground" />
            <h2 className="font-semibold text-card-foreground">User Management</h2>
          </div>

          {/* Existing users */}
          {allUsers.length > 0 && (
            <div className="mb-4 space-y-2">
              {allUsers.map(u => (
                <div key={u.id} className="flex items-center justify-between px-3 py-2 bg-muted/50 rounded-md">
                  <div className="text-sm">
                    <span className="font-medium text-card-foreground">{u.name || u.email}</span>
                    {u.name && <span className="text-muted-foreground ml-2">{u.email}</span>}
                  </div>
                  <select
                    value={u.role}
                    onChange={e => updateUserRole(u.id, e.target.value)}
                    className="text-xs px-2 py-1 bg-background border border-input rounded-md"
                  >
                    <option value="admin">Admin</option>
                    <option value="editor">Editor</option>
                    <option value="viewer">Viewer</option>
                  </select>
                </div>
              ))}
            </div>
          )}

          {/* Create user form */}
          <form onSubmit={handleCreateUser} className="space-y-3 border-t border-border pt-4">
            <p className="text-sm font-medium text-card-foreground">Create New User</p>
            <div className="grid grid-cols-2 gap-2">
              <input value={newName} onChange={e => setNewName(e.target.value)} placeholder="Name" className="px-3 py-2 bg-background border border-input rounded-md text-sm" />
              <input value={newEmail} onChange={e => setNewEmail(e.target.value)} placeholder="Email" required type="email" className="px-3 py-2 bg-background border border-input rounded-md text-sm" />
            </div>
            <div className="grid grid-cols-2 gap-2">
              <input value={newPassword} onChange={e => setNewPassword(e.target.value)} placeholder="Password" required type="password" minLength={6} className="px-3 py-2 bg-background border border-input rounded-md text-sm" />
              <select value={newRole} onChange={e => setNewRole(e.target.value)} className="px-3 py-2 bg-background border border-input rounded-md text-sm">
                <option value="admin">Admin</option>
                <option value="editor">Editor</option>
                <option value="viewer">Viewer</option>
              </select>
            </div>
            <button type="submit" disabled={creatingUser} className="px-4 py-2 text-sm bg-primary text-primary-foreground rounded-md hover:opacity-90 disabled:opacity-50">
              {creatingUser ? 'Creating...' : 'Create User'}
            </button>
          </form>
        </section>

        {/* SSO / OIDC Config */}
        <section className="bg-card border border-border rounded-lg p-5">
          <div className="flex items-center gap-3 mb-4">
            <Wifi className="w-5 h-5 text-muted-foreground" />
            <h2 className="font-semibold text-card-foreground">SSO / OIDC Configuration</h2>
          </div>
          <p className="text-xs text-muted-foreground mb-3">
            These values are read from environment variables at build time. To change them, update your deployment environment and rebuild.
          </p>
          <div className="space-y-3">
            <SettingField label="OIDC Issuer" value={env.OIDC_ISSUER || '(not configured)'} />
            <SettingField label="Client ID" value={env.OIDC_CLIENT_ID || '(not configured)'} />
            <SettingField label="Scopes" value={env.OIDC_SCOPES} />
            <SettingField label="Redirect URI" value={env.OIDC_REDIRECT_URI} />
            <SettingField label="Role Claim" value={env.OIDC_ROLE_CLAIM} />
            <SettingField label="Mode" value={env.OIDC_ISSUER ? 'OIDC (SSO)' : 'Cloud Auth (Email/Password)'} />
          </div>
          <div className="mt-3 space-y-3 border-t border-border pt-3">
            <p className="text-xs text-muted-foreground">Override SSO settings via config (used by self-hosted backend):</p>
            <EditableField label="OIDC Issuer Override" value={config['oidc_issuer'] || ''} onSave={v => updateConfig('oidc_issuer', v)} saving={saving} placeholder="https://adfs.example.com/adfs" />
            <EditableField label="OIDC Client ID Override" value={config['oidc_client_id'] || ''} onSave={v => updateConfig('oidc_client_id', v)} saving={saving} placeholder="statusguard-client" />
            <EditableField label="OIDC Role Claim" value={config['oidc_role_claim'] || ''} onSave={v => updateConfig('oidc_role_claim', v)} saving={saving} placeholder="roles" />
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
      </div>

      <BroadcastDialog open={broadcastOpen} onOpenChange={setBroadcastOpen} statusPages={pages} />
    </div>
  );
}

function SettingField({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-center justify-between">
      <span className="text-sm text-muted-foreground">{label}</span>
      <span className="text-sm font-mono text-card-foreground bg-muted/50 px-2.5 py-1 rounded max-w-[60%] truncate">{value}</span>
    </div>
  );
}

function EditableField({ label, value, onSave, saving, placeholder }: { label: string; value: string; onSave: (v: string) => void; saving: boolean; placeholder?: string }) {
  const [editing, setEditing] = useState(false);
  const [val, setVal] = useState(value);

  useEffect(() => setVal(value), [value]);

  if (!editing) {
    return (
      <div className="flex items-center justify-between">
        <span className="text-sm text-muted-foreground">{label}</span>
        <button onClick={() => setEditing(true)} className="text-sm font-mono text-card-foreground bg-muted/50 px-2.5 py-1 rounded hover:bg-muted transition-colors cursor-pointer max-w-[60%] truncate">
          {value || '(empty)'}
        </button>
      </div>
    );
  }

  return (
    <div className="flex items-center justify-between gap-2">
      <span className="text-sm text-muted-foreground shrink-0">{label}</span>
      <div className="flex items-center gap-1">
        <input value={val} onChange={e => setVal(e.target.value)} placeholder={placeholder} className="w-48 px-2 py-1 text-sm font-mono bg-background border border-input rounded" autoFocus />
        <button onClick={() => { onSave(val); setEditing(false); }} disabled={saving} className="px-2 py-1 text-xs bg-primary text-primary-foreground rounded">Save</button>
        <button onClick={() => { setVal(value); setEditing(false); }} className="px-2 py-1 text-xs border border-input rounded">✕</button>
      </div>
    </div>
  );
}
