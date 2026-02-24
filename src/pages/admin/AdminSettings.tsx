import { Shield, Key, Database, Clock } from 'lucide-react';

export default function AdminSettings() {
  return (
    <div className="p-6 sm:p-8 max-w-3xl">
      <h1 className="text-2xl font-bold text-foreground mb-6">Settings</h1>

      <div className="space-y-6">
        {/* OIDC */}
        <section className="bg-card border border-border rounded-lg p-5">
          <div className="flex items-center gap-3 mb-4">
            <Shield className="w-5 h-5 text-muted-foreground" />
            <h2 className="font-semibold text-card-foreground">OIDC Authentication</h2>
          </div>
          <div className="space-y-3">
            <SettingField label="Issuer URL" value="https://auth.example.com" />
            <SettingField label="Client ID" value="statusguard-admin" />
            <SettingField label="Client Secret" value="••••••••••••" />
            <SettingField label="Scopes" value="openid profile email" />
          </div>
        </section>

        {/* RBAC */}
        <section className="bg-card border border-border rounded-lg p-5">
          <div className="flex items-center gap-3 mb-4">
            <Key className="w-5 h-5 text-muted-foreground" />
            <h2 className="font-semibold text-card-foreground">RBAC Roles</h2>
          </div>
          <div className="space-y-2 text-sm">
            {['Admin — Full access', 'Editor — Create & manage pages/incidents', 'Viewer — Read-only dashboard access'].map(r => (
              <div key={r} className="px-3 py-2 bg-muted/50 rounded-md text-card-foreground">{r}</div>
            ))}
          </div>
        </section>

        {/* Retention */}
        <section className="bg-card border border-border rounded-lg p-5">
          <div className="flex items-center gap-3 mb-4">
            <Database className="w-5 h-5 text-muted-foreground" />
            <h2 className="font-semibold text-card-foreground">Data Retention</h2>
          </div>
          <div className="space-y-3">
            <SettingField label="1-minute resolution" value="24 hours" />
            <SettingField label="5-minute aggregation" value="7 days" />
            <SettingField label="1-hour aggregation" value="90 days" />
          </div>
        </section>

        {/* Monitoring */}
        <section className="bg-card border border-border rounded-lg p-5">
          <div className="flex items-center gap-3 mb-4">
            <Clock className="w-5 h-5 text-muted-foreground" />
            <h2 className="font-semibold text-card-foreground">Monitoring Defaults</h2>
          </div>
          <div className="space-y-3">
            <SettingField label="Default check interval" value="60 seconds" />
            <SettingField label="Default timeout" value="5000ms" />
            <SettingField label="Max concurrent checks" value="50" />
          </div>
        </section>
      </div>
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
