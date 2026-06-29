import { useEffect, useMemo, useState } from 'react';
import * as Icons from '@/shared/ui/icons';
import { TenantOnboardingWizard } from './TenantOnboardingWizard';
import { PlantHierarchyManager } from './PlantHierarchyManager';
import { readJsonResponse, responseError } from '@/lib/http';

type LoadState<T> = {
  data: T;
  error: string | null;
  loading: boolean;
};

const emptyList = [] as any[];

function usePlatformData<T>(url: string, fallback: T): LoadState<T> {
  const [state, setState] = useState<LoadState<T>>({ data: fallback, error: null, loading: true });

  useEffect(() => {
    let active = true;
    async function load() {
      try {
        const res = await fetch(url);
        const data = await readJsonResponse<T>(res);
        if (!res.ok) throw new Error(responseError(res, data, 'Failed to load platform data'));
        if (active) setState({ data: data ?? fallback, error: null, loading: false });
      } catch (error) {
        if (active) setState({ data: fallback, error: error instanceof Error ? error.message : 'Failed to load', loading: false });
      }
    }
    load();
    return () => { active = false; };
  }, [url]);

  return state;
}

function MetricCard({ label, value, helper, icon: Icon, tone }: any) {
  const tones: Record<string, string> = {
    emerald: 'border-emerald-700 bg-emerald-950/30 text-emerald-300',
    blue: 'border-blue-700 bg-blue-950/30 text-blue-300',
    amber: 'border-amber-700 bg-amber-950/30 text-amber-300',
    slate: 'border-slate-700 bg-slate-800/70 text-slate-300',
  };

  return (
    <div className={`rounded-lg border p-4 ${tones[tone] || tones.slate}`}>
      <div className="flex items-start justify-between gap-3">
        <div>
          <div className="text-sm text-slate-300">{label}</div>
          <div className="mt-2 text-2xl font-semibold text-white">{value}</div>
        </div>
        <Icon className="h-5 w-5" />
      </div>
      <div className="mt-3 text-xs text-slate-400">{helper}</div>
    </div>
  );
}

function Section({ title, helper, icon: Icon, children }: any) {
  return (
    <section className="rounded-lg border border-slate-700 bg-slate-800/70">
      <div className="flex items-center justify-between border-b border-slate-700 px-4 py-3">
        <div>
          <h2 className="font-semibold text-white">{title}</h2>
          <p className="text-xs text-slate-400">{helper}</p>
        </div>
        <Icon className="h-5 w-5 text-emerald-400" />
      </div>
      <div className="p-4">{children}</div>
    </section>
  );
}

function MiniTable({ columns, rows }: { columns: string[]; rows: any[] }) {
  if (!rows.length) return <div className="rounded-lg border border-slate-700 bg-slate-900/60 p-4 text-sm text-slate-400">No records yet.</div>;
  return (
    <div className="overflow-hidden rounded-lg border border-slate-700">
      <table className="w-full text-left text-sm">
        <thead className="bg-slate-900 text-xs uppercase text-slate-400">
          <tr>{columns.map((column) => <th key={column} className="px-3 py-2">{column}</th>)}</tr>
        </thead>
        <tbody className="divide-y divide-slate-700 bg-slate-800/50">
          {rows.slice(0, 6).map((row, index) => (
            <tr key={row.id || index}>
              {columns.map((column) => (
                <td key={column} className="px-3 py-2 text-slate-200">{row[column] ?? row[column.toLowerCase()] ?? '-'}</td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

export default function PlatformCoreModule() {
  const [refreshKey, setRefreshKey] = useState(0);
  const refreshParam = `?refresh=${refreshKey}`;
  const tenants = usePlatformData<any[]>(`/api/platform/tenants${refreshParam}`, emptyList);
  const companies = usePlatformData<any[]>(`/api/platform/companies${refreshParam}`, emptyList);
  const plants = usePlatformData<any[]>(`/api/platform/plants${refreshParam}`, emptyList);
  const users = usePlatformData<any[]>(`/api/platform/users${refreshParam}`, emptyList);
  const roles = usePlatformData<any[]>(`/api/platform/roles${refreshParam}`, emptyList);
  const permissions = usePlatformData<any[]>(`/api/platform/permissions${refreshParam}`, emptyList);
  const audit = usePlatformData<any[]>(`/api/platform/audit-events${refreshParam}`, emptyList);

  const errors = [tenants, companies, plants, users, roles, permissions, audit].map((s) => s.error).filter(Boolean);
  const loading = [tenants, companies, plants, users, roles, permissions, audit].some((s) => s.loading);

  const setupScore = useMemo(() => {
    const checks = [tenants.data.length, companies.data.length, plants.data.length, users.data.length, roles.data.length, permissions.data.length].filter(Boolean).length;
    return Math.round((checks / 6) * 100);
  }, [tenants.data.length, companies.data.length, plants.data.length, users.data.length, roles.data.length, permissions.data.length]);

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold text-white">Platform Core</h1>
          <p className="text-sm text-slate-400">Tenant, plant hierarchy, users, roles, permissions, and audit foundation for every module.</p>
        </div>
        <div className="rounded-lg border border-slate-700 bg-slate-800 px-3 py-2 text-sm text-slate-300">
          Sprint 1 foundation / {loading ? 'Loading' : `${setupScore}% configured`}
        </div>
      </div>

      {errors.length > 0 && (
        <div className="rounded-lg border border-amber-700 bg-amber-950/30 p-4 text-sm text-amber-100">
          Platform tables are not fully available yet. Run the database migration/push before using live setup APIs. First error: {errors[0]}
        </div>
      )}

      <TenantOnboardingWizard onCompleted={() => setRefreshKey((key) => key + 1)} />

      <PlantHierarchyManager />

      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        <MetricCard label="Tenants" value={tenants.data.length} helper="Customer companies configured" icon={Icons.Layers} tone="emerald" />
        <MetricCard label="Plants" value={plants.data.length} helper="Factories and sites registered" icon={Icons.Activity} tone="blue" />
        <MetricCard label="Users" value={users.data.length} helper="Platform identities" icon={Icons.User} tone="amber" />
        <MetricCard label="Audit Events" value={audit.data.length} helper="Traceability records captured" icon={Icons.ShieldCheck} tone="slate" />
      </div>

      <div className="grid gap-6 xl:grid-cols-2">
        <Section title="Tenant And Company Setup" helper="System of record for customer and legal entity setup." icon={Icons.Database}>
          <MiniTable columns={['name', 'code', 'industryType', 'status']} rows={tenants.data} />
          <div className="mt-4">
            <MiniTable columns={['displayName', 'legalName', 'status']} rows={companies.data} />
          </div>
        </Section>

        <Section title="Plant Hierarchy" helper="Plant, area, line, and work-center base for MES/OEE/HRMS." icon={Icons.Layers}>
          <MiniTable columns={['name', 'code', 'timezone', 'status']} rows={plants.data} />
          <div className="mt-4 rounded-lg border border-slate-700 bg-slate-900/50 p-3 text-xs text-slate-400">
            Next build slice adds area, department, line, and work-center tree editing.
          </div>
        </Section>

        <Section title="Users And Roles" helper="Central RBAC foundation for all modules." icon={Icons.User}>
          <MiniTable columns={['displayName', 'email', 'userType', 'status']} rows={users.data} />
          <div className="mt-4">
            <MiniTable columns={['name', 'code', 'roleType', 'status']} rows={roles.data} />
          </div>
        </Section>

        <Section title="Permission And Audit Control" helper="Action permissions and immutable platform traceability." icon={Icons.ShieldCheck}>
          <MiniTable columns={['module', 'resource', 'action', 'code']} rows={permissions.data} />
          <div className="mt-4">
            <MiniTable columns={['eventType', 'entityType', 'action', 'createdAt']} rows={audit.data} />
          </div>
        </Section>
      </div>

      <RolePermissionMatrix roles={roles.data} permissions={permissions.data} tenantId={tenants.data[0]?.id} />
    </div>
  );
}

function RolePermissionMatrix({ roles, permissions, tenantId }: { roles: any[]; permissions: any[]; tenantId: string }) {
  const [rolePermissions, setRolePermissions] = useState<Record<string, string[]>>({});
  const [selectedRole, setSelectedRole] = useState<string>('');

  useEffect(() => {
    if (selectedRole) {
      fetch(`/api/platform/roles/${selectedRole}/permissions?tenantId=${tenantId || ''}`)
        .then(res => res.json())
        .then((data: any[]) => {
          setRolePermissions(prev => ({
            ...prev,
            [selectedRole]: data.map(rp => rp.permissionId)
          }));
        })
        .catch(console.error);
    }
  }, [selectedRole, tenantId]);

  const handleToggle = async (roleId: string, permissionId: string, hasPerm: boolean) => {
    try {
      const headers = { 'Content-Type': 'application/json', 'x-tenant-id': tenantId };
      if (hasPerm) {
        await fetch(`/api/platform/roles/${roleId}/permissions/${permissionId}`, { method: 'DELETE', headers });
        setRolePermissions(prev => ({
          ...prev,
          [roleId]: (prev[roleId] || []).filter(id => id !== permissionId)
        }));
      } else {
        await fetch(`/api/platform/roles/${roleId}/permissions`, {
          method: 'POST',
          headers,
          body: JSON.stringify({ permissionIds: [permissionId] })
        });
        setRolePermissions(prev => ({
          ...prev,
          [roleId]: [...(prev[roleId] || []), permissionId]
        }));
      }
    } catch (e) {
      console.error(e);
    }
  };

  const activeRole = roles.find(r => r.id === selectedRole) || roles[0];
  useEffect(() => {
    if (roles.length && !selectedRole) {
      setSelectedRole(roles[0].id);
    }
  }, [roles, selectedRole]);

  return (
    <section className="rounded-lg border border-slate-700 bg-slate-800/70 p-4">
      <div className="flex items-center justify-between border-b border-slate-700 pb-3 mb-4">
        <div>
          <h2 className="font-semibold text-white">Role-Permission Matrix</h2>
          <p className="text-xs text-slate-400">Configure role permissions mapping for your tenant pilot.</p>
        </div>
        <Icons.ShieldCheck className="h-5 w-5 text-emerald-400" />
      </div>

      <div className="flex gap-4">
        <div className="w-1/4 border-r border-slate-700 pr-4 space-y-2">
          <label className="text-xs text-slate-400 uppercase font-semibold">Select Role</label>
          <div className="space-y-1">
            {roles.map(role => (
              <button
                key={role.id}
                onClick={() => setSelectedRole(role.id)}
                className={`w-full text-left px-3 py-2 rounded text-sm transition-colors ${
                  selectedRole === role.id ? 'bg-emerald-600 text-white' : 'text-slate-300 hover:bg-slate-700'
                }`}
              >
                {role.name}
              </button>
            ))}
          </div>
        </div>

        <div className="flex-1 space-y-4">
          <div className="text-sm font-semibold text-white">
            Permissions for: <span className="text-emerald-400">{activeRole?.name}</span>
          </div>
          <div className="max-h-96 overflow-y-auto space-y-2">
            {permissions.map(permission => {
              const hasPermission = (rolePermissions[selectedRole] || []).includes(permission.id);
              return (
                <div key={permission.id} className="flex items-center justify-between p-3 rounded border border-slate-700 bg-slate-900/40">
                  <div>
                    <div className="text-sm font-medium text-slate-100">{permission.code}</div>
                    <div className="text-xs text-slate-400">{permission.description || 'No description'}</div>
                  </div>
                  <input
                    type="checkbox"
                    checked={hasPermission}
                    onChange={() => handleToggle(selectedRole, permission.id, hasPermission)}
                    className="h-4 w-4 rounded border-slate-600 bg-slate-800 text-emerald-600 focus:ring-emerald-500 focus:ring-offset-slate-900"
                  />
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </section>
  );
}
