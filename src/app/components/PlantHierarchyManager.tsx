import { useEffect, useMemo, useState } from 'react';
import type { FormEvent } from 'react';
import * as Icons from '@/shared/ui/icons';
import { readJsonResponse, responseError } from '@/lib/http';

type Plant = {
  id: string;
  tenantId: string;
  name: string;
  code: string;
  timezone?: string;
  status?: string;
};

type HierarchyRecord = {
  id: string;
  tenantId: string;
  plantId: string;
  name: string;
  code: string;
  status?: string;
  areaId?: string | null;
  lineId?: string | null;
  areaType?: string;
  functionType?: string;
  lineType?: string;
  workCenterType?: string;
};

type Tenant = {
  id: string;
  name: string;
  code: string;
};

type HierarchyData = {
  plant: Plant | null;
  areas: HierarchyRecord[];
  departments: HierarchyRecord[];
  lines: HierarchyRecord[];
  workCenters: HierarchyRecord[];
};

type EntityKind = 'area' | 'department' | 'line' | 'workCenter';

type Draft = {
  name: string;
  code: string;
  status: string;
  areaType: string;
  functionType: string;
  lineType: string;
  workCenterType: string;
  areaId: string;
  lineId: string;
};

const emptyHierarchy: HierarchyData = {
  plant: null,
  areas: [],
  departments: [],
  lines: [],
  workCenters: [],
};

const blankDraft: Draft = {
  name: '',
  code: '',
  status: 'active',
  areaType: 'production',
  functionType: 'production',
  lineType: 'discrete',
  workCenterType: 'manual_station',
  areaId: '',
  lineId: '',
};

const entityConfig: Record<EntityKind, {
  title: string;
  collection: keyof Pick<HierarchyData, 'areas' | 'departments' | 'lines' | 'workCenters'>;
  endpoint: string;
  parentLabel?: string;
  typeKey: keyof Draft;
  typeLabel: string;
}> = {
  area: { title: 'Areas', collection: 'areas', endpoint: '/api/platform/areas', typeKey: 'areaType', typeLabel: 'Area Type' },
  department: { title: 'Departments', collection: 'departments', endpoint: '/api/platform/departments', typeKey: 'functionType', typeLabel: 'Function Type' },
  line: { title: 'Lines', collection: 'lines', endpoint: '/api/platform/lines', parentLabel: 'Area', typeKey: 'lineType', typeLabel: 'Line Type' },
  workCenter: { title: 'Work Centers', collection: 'workCenters', endpoint: '/api/platform/work-centers', parentLabel: 'Line', typeKey: 'workCenterType', typeLabel: 'Work Center Type' },
};

function makeCode(value: string) {
  return value.trim().toUpperCase().replace(/[^A-Z0-9]+/g, '_').replace(/^_+|_+$/g, '').slice(0, 40);
}

async function requestJson<T>(url: string, options?: RequestInit) {
  const response = await fetch(url, options);
  const body = await readJsonResponse<T & { error?: string; message?: string }>(response);
  if (!response.ok) throw new Error(responseError(response, body, 'Platform request failed'));
  return body as T;
}

function Field({ label, value, onChange, required = true }: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  required?: boolean;
}) {
  return (
    <label className="block">
      <span className="mb-1 block text-xs font-medium text-slate-300">{label}</span>
      <input
        value={value}
        required={required}
        onChange={(event) => onChange(event.target.value)}
        className="h-10 w-full rounded-md border border-slate-600 bg-slate-900 px-3 text-sm text-slate-100 outline-none focus:border-emerald-500"
      />
    </label>
  );
}

function SelectField({ label, value, onChange, options, required = true }: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  options: Array<{ value: string; label: string }>;
  required?: boolean;
}) {
  return (
    <label className="block">
      <span className="mb-1 block text-xs font-medium text-slate-300">{label}</span>
      <select
        value={value}
        required={required}
        onChange={(event) => onChange(event.target.value)}
        className="h-10 w-full rounded-md border border-slate-600 bg-slate-900 px-3 text-sm text-slate-100 outline-none focus:border-emerald-500"
      >
        {!required && <option value="">None</option>}
        {options.map((option) => <option key={option.value} value={option.value}>{option.label}</option>)}
      </select>
    </label>
  );
}

function StatusPill({ status }: { status?: string }) {
  const active = status === 'active';
  return (
    <span className={`inline-flex min-w-16 items-center justify-center rounded-md border px-2 py-1 text-xs ${active ? 'border-emerald-700 bg-emerald-950/30 text-emerald-200' : 'border-slate-600 bg-slate-900 text-slate-300'}`}>
      {status || 'draft'}
    </span>
  );
}

function emptyMessage(label: string) {
  return <div className="rounded-lg border border-slate-700 bg-slate-900/60 p-4 text-sm text-slate-400">No {label.toLowerCase()} configured.</div>;
}

export function PlantHierarchyManager({ initialTenantId, initialPlantId, onChanged }: {
  initialTenantId?: string;
  initialPlantId?: string;
  onChanged?: () => void;
}) {
  const [tenants, setTenants] = useState<Tenant[]>([]);
  const [plants, setPlants] = useState<Plant[]>([]);
  const [tenantId, setTenantId] = useState(initialTenantId || '');
  const [plantId, setPlantId] = useState(initialPlantId || '');
  const [hierarchy, setHierarchy] = useState<HierarchyData>(emptyHierarchy);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [editing, setEditing] = useState<{ kind: EntityKind; id: string } | null>(null);
  const [drafts, setDrafts] = useState<Record<EntityKind, Draft>>({
    area: blankDraft,
    department: blankDraft,
    line: blankDraft,
    workCenter: blankDraft,
  });

  const selectedTenant = useMemo(() => tenants.find((tenant) => tenant.id === tenantId) || null, [tenantId, tenants]);
  const visiblePlants = useMemo(() => plants.filter((plant) => !tenantId || plant.tenantId === tenantId), [plants, tenantId]);
  const areaOptions = hierarchy.areas.map((area) => ({ value: area.id, label: `${area.name} (${area.code})` }));
  const lineOptions = hierarchy.lines.map((line) => ({ value: line.id, label: `${line.name} (${line.code})` }));

  async function loadFoundation() {
    setLoading(true);
    setError(null);
    try {
      const [tenantRows, plantRows] = await Promise.all([
        requestJson<Tenant[]>('/api/platform/tenants'),
        requestJson<Plant[]>('/api/platform/plants'),
      ]);
      setTenants(tenantRows || []);
      setPlants(plantRows || []);
      const nextTenantId = initialTenantId || tenantId || tenantRows?.[0]?.id || '';
      const nextPlantId = initialPlantId || plantId || plantRows?.find((plant) => plant.tenantId === nextTenantId)?.id || plantRows?.[0]?.id || '';
      setTenantId(nextTenantId);
      setPlantId(nextPlantId);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load hierarchy setup');
    } finally {
      setLoading(false);
    }
  }

  async function loadHierarchy(nextPlantId = plantId, nextTenantId = tenantId) {
    if (!nextPlantId) {
      setHierarchy(emptyHierarchy);
      return;
    }
    setError(null);
    try {
      const query = nextTenantId ? `?tenantId=${encodeURIComponent(nextTenantId)}` : '';
      const data = await requestJson<HierarchyData>(`/api/platform/plants/${nextPlantId}/hierarchy${query}`);
      setHierarchy({
        plant: data?.plant || null,
        areas: data?.areas || [],
        departments: data?.departments || [],
        lines: data?.lines || [],
        workCenters: data?.workCenters || [],
      });
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load plant hierarchy');
    }
  }

  useEffect(() => {
    loadFoundation();
  }, []);

  useEffect(() => {
    loadHierarchy();
  }, [plantId, tenantId]);

  function setDraft(kind: EntityKind, patch: Partial<Draft>) {
    setDrafts((current) => ({ ...current, [kind]: { ...current[kind], ...patch } }));
  }

  function beginEdit(kind: EntityKind, record: HierarchyRecord) {
    setEditing({ kind, id: record.id });
    setDraft(kind, {
      name: record.name,
      code: record.code,
      status: record.status || 'active',
      areaType: record.areaType || 'production',
      functionType: record.functionType || 'production',
      lineType: record.lineType || 'discrete',
      workCenterType: record.workCenterType || 'manual_station',
      areaId: record.areaId || '',
      lineId: record.lineId || '',
    });
  }

  function resetDraft(kind: EntityKind) {
    setEditing(null);
    setDrafts((current) => ({ ...current, [kind]: blankDraft }));
  }

  function payloadFor(kind: EntityKind) {
    const draft = drafts[kind];
    const payload: Record<string, string | null> = {
      tenantId,
      plantId,
      name: draft.name.trim(),
      code: (draft.code || makeCode(draft.name)).trim(),
      status: draft.status,
    };
    if (kind === 'area') payload.areaType = draft.areaType;
    if (kind === 'department') payload.functionType = draft.functionType;
    if (kind === 'line') {
      payload.areaId = draft.areaId || null;
      payload.lineType = draft.lineType;
    }
    if (kind === 'workCenter') {
      payload.lineId = draft.lineId || null;
      payload.workCenterType = draft.workCenterType;
    }
    return payload;
  }

  async function save(kind: EntityKind, event: FormEvent) {
    event.preventDefault();
    if (!tenantId || !plantId) {
      setError('Select a tenant and plant before editing hierarchy.');
      return;
    }

    setSaving(true);
    setError(null);
    try {
      const config = entityConfig[kind];
      const isEditing = editing?.kind === kind;
      const endpoint = isEditing ? `${config.endpoint}/${editing.id}?tenantId=${encodeURIComponent(tenantId)}` : config.endpoint;
      await requestJson<HierarchyRecord>(endpoint, {
        method: isEditing ? 'PATCH' : 'POST',
        headers: { 'Content-Type': 'application/json', 'x-tenant-id': tenantId },
        body: JSON.stringify(payloadFor(kind)),
      });
      resetDraft(kind);
      await loadHierarchy();
      onChanged?.();
    } catch (err) {
      setError(err instanceof Error ? err.message : `Failed to save ${kind}`);
    } finally {
      setSaving(false);
    }
  }

  async function remove(kind: EntityKind, record: HierarchyRecord) {
    const confirmed = window.confirm(`Delete ${record.name}?`);
    if (!confirmed) return;

    setSaving(true);
    setError(null);
    try {
      await requestJson<HierarchyRecord>(`${entityConfig[kind].endpoint}/${record.id}?tenantId=${encodeURIComponent(tenantId)}`, {
        method: 'DELETE',
        headers: { 'x-tenant-id': tenantId },
      });
      await loadHierarchy();
      onChanged?.();
    } catch (err) {
      setError(err instanceof Error ? err.message : `Failed to delete ${kind}`);
    } finally {
      setSaving(false);
    }
  }

  function switchTenant(nextTenantId: string) {
    const nextPlantId = plants.find((plant) => plant.tenantId === nextTenantId)?.id || '';
    setTenantId(nextTenantId);
    setPlantId(nextPlantId);
  }

  function renderForm(kind: EntityKind) {
    const config = entityConfig[kind];
    const draft = drafts[kind];
    const isEditing = editing?.kind === kind;

    return (
      <form onSubmit={(event) => save(kind, event)} className="grid gap-3 border-t border-slate-700 bg-slate-900/30 p-4 md:grid-cols-2 xl:grid-cols-4">
        <Field
          label="Name"
          value={draft.name}
          onChange={(value) => setDraft(kind, { name: value, code: draft.code || makeCode(value) })}
        />
        <Field label="Code" value={draft.code} onChange={(value) => setDraft(kind, { code: makeCode(value) })} />
        {kind === 'line' && (
          <SelectField label="Area" value={draft.areaId} onChange={(value) => setDraft(kind, { areaId: value })} options={areaOptions} required={false} />
        )}
        {kind === 'workCenter' && (
          <SelectField label="Line" value={draft.lineId} onChange={(value) => setDraft(kind, { lineId: value })} options={lineOptions} required={false} />
        )}
        <Field label={config.typeLabel} value={String(draft[config.typeKey] || '')} onChange={(value) => setDraft(kind, { [config.typeKey]: value } as Partial<Draft>)} />
        <SelectField
          label="Status"
          value={draft.status}
          onChange={(value) => setDraft(kind, { status: value })}
          options={[{ value: 'active', label: 'Active' }, { value: 'inactive', label: 'Inactive' }, { value: 'draft', label: 'Draft' }]}
        />
        <div className="flex items-end gap-2 md:col-span-2 xl:col-span-4">
          <button
            type="submit"
            disabled={saving || !draft.name.trim()}
            className="inline-flex h-10 items-center justify-center gap-2 rounded-md bg-emerald-600 px-4 text-sm font-semibold text-white hover:bg-emerald-500 disabled:cursor-not-allowed disabled:bg-slate-600"
          >
            {saving ? <Icons.Loader2 className="h-4 w-4 animate-spin" /> : <Icons.Check className="h-4 w-4" />}
            {isEditing ? 'Save Changes' : `Add ${config.title.slice(0, -1)}`}
          </button>
          {isEditing && (
            <button
              type="button"
              onClick={() => resetDraft(kind)}
              className="inline-flex h-10 items-center justify-center gap-2 rounded-md border border-slate-600 bg-slate-900 px-4 text-sm font-semibold text-slate-200 hover:bg-slate-800"
            >
              <Icons.X className="h-4 w-4" />
              Cancel
            </button>
          )}
        </div>
      </form>
    );
  }

  function renderRecords(kind: EntityKind) {
    const config = entityConfig[kind];
    const rows = hierarchy[config.collection];
    if (!rows.length) return emptyMessage(config.title);

    return (
      <div className="divide-y divide-slate-700">
        {rows.map((row) => {
          const parent = kind === 'line'
            ? hierarchy.areas.find((area) => area.id === row.areaId)
            : kind === 'workCenter'
              ? hierarchy.lines.find((line) => line.id === row.lineId)
              : null;
          const typeValue = row.areaType || row.functionType || row.lineType || row.workCenterType || '-';
          return (
            <div key={row.id} className="grid gap-3 px-4 py-3 md:grid-cols-[1fr_140px_130px_150px] md:items-center">
              <div className="min-w-0">
                <div className="truncate font-medium text-slate-100">{row.name}</div>
                <div className="mt-1 text-xs text-slate-400">{row.code}{parent ? ` / ${parent.name}` : ''}</div>
              </div>
              <div>
                <div className="text-xs text-slate-500">{config.typeLabel}</div>
                <div className="truncate text-sm text-slate-200">{typeValue}</div>
              </div>
              <StatusPill status={row.status} />
              <div className="flex justify-start gap-2 md:justify-end">
                <button
                  type="button"
                  onClick={() => beginEdit(kind, row)}
                  className="inline-flex h-9 items-center gap-2 rounded-md border border-slate-600 bg-slate-900 px-3 text-xs font-medium text-slate-200 hover:bg-slate-800"
                >
                  <Icons.Settings className="h-3.5 w-3.5" />
                  Edit
                </button>
                <button
                  type="button"
                  onClick={() => remove(kind, row)}
                  disabled={saving}
                  className="inline-flex h-9 items-center gap-2 rounded-md border border-red-900 bg-red-950/20 px-3 text-xs font-medium text-red-200 hover:bg-red-950/40 disabled:opacity-60"
                >
                  <Icons.X className="h-3.5 w-3.5" />
                  Delete
                </button>
              </div>
            </div>
          );
        })}
      </div>
    );
  }

  const counts = [
    { label: 'Areas', value: hierarchy.areas.length },
    { label: 'Departments', value: hierarchy.departments.length },
    { label: 'Lines', value: hierarchy.lines.length },
    { label: 'Work Centers', value: hierarchy.workCenters.length },
  ];

  return (
    <section className="rounded-lg border border-slate-700 bg-slate-800/70">
      <div className="flex flex-col gap-4 border-b border-slate-700 px-4 py-4 xl:flex-row xl:items-end xl:justify-between">
        <div>
          <div className="flex items-center gap-2 text-white">
            <Icons.Layers className="h-5 w-5 text-emerald-400" />
            <h2 className="font-semibold">Plant Hierarchy Manager</h2>
          </div>
          <p className="mt-1 text-xs text-slate-400">Maintain areas, departments, production lines, and work centers for the selected plant.</p>
        </div>

        <div className="grid gap-3 md:grid-cols-[220px_260px_auto] md:items-end">
          <SelectField
            label="Tenant"
            value={tenantId}
            onChange={switchTenant}
            options={tenants.map((tenant) => ({ value: tenant.id, label: tenant.name }))}
            required={false}
          />
          <SelectField
            label="Plant"
            value={plantId}
            onChange={setPlantId}
            options={visiblePlants.map((plant) => ({ value: plant.id, label: `${plant.name} (${plant.code})` }))}
            required={false}
          />
          <button
            type="button"
            onClick={() => loadHierarchy()}
            className="inline-flex h-10 items-center justify-center gap-2 rounded-md border border-slate-600 bg-slate-900 px-3 text-sm font-semibold text-slate-200 hover:bg-slate-800"
          >
            <Icons.RotateCcw className="h-4 w-4" />
            Refresh
          </button>
        </div>
      </div>

      {error && (
        <div className="m-4 rounded-lg border border-red-800 bg-red-950/30 p-3 text-sm text-red-100">
          <Icons.AlertCircle className="mr-2 inline h-4 w-4" />
          {error}
        </div>
      )}

      {loading ? (
        <div className="flex items-center gap-2 p-4 text-sm text-slate-300">
          <Icons.Loader2 className="h-4 w-4 animate-spin" />
          Loading hierarchy tools
        </div>
      ) : !plantId ? (
        <div className="p-4">
          <div className="rounded-lg border border-slate-700 bg-slate-900/60 p-4 text-sm text-slate-400">Create a plant before editing its hierarchy.</div>
        </div>
      ) : (
        <div className="space-y-4 p-4">
          <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-5">
            <div className="rounded-lg border border-slate-700 bg-slate-900/60 p-3 xl:col-span-1">
              <div className="text-xs text-slate-400">Selected Plant</div>
              <div className="mt-1 truncate font-semibold text-white">{hierarchy.plant?.name || 'Plant'}</div>
              <div className="mt-1 text-xs text-slate-500">{selectedTenant?.code || 'Tenant'} / {hierarchy.plant?.code || '-'}</div>
            </div>
            {counts.map((item) => (
              <div key={item.label} className="rounded-lg border border-slate-700 bg-slate-900/60 p-3">
                <div className="text-xl font-semibold text-white">{item.value}</div>
                <div className="text-xs text-slate-400">{item.label}</div>
              </div>
            ))}
          </div>

          {(['area', 'department', 'line', 'workCenter'] as EntityKind[]).map((kind) => (
            <section key={kind} className="overflow-hidden rounded-lg border border-slate-700 bg-slate-800/80">
              <div className="flex items-center justify-between px-4 py-3">
                <div>
                  <h3 className="font-semibold text-white">{entityConfig[kind].title}</h3>
                  <p className="text-xs text-slate-400">{entityConfig[kind].parentLabel ? `Linked by ${entityConfig[kind].parentLabel.toLowerCase()}` : 'Plant-level hierarchy record'}</p>
                </div>
                <Icons.Database className="h-4 w-4 text-emerald-400" />
              </div>
              {renderRecords(kind)}
              {renderForm(kind)}
            </section>
          ))}
        </div>
      )}
    </section>
  );
}

export default PlantHierarchyManager;
