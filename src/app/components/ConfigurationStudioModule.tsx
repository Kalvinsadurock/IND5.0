import { useEffect, useMemo, useState } from 'react';
import * as Icons from '@/shared/ui/icons';
import { readJsonResponse, responseError } from '@/lib/http';

const supportedFieldTypes = ['text', 'textarea', 'number', 'decimal', 'boolean', 'date', 'datetime', 'select', 'multi_select', 'file', 'user_reference', 'object_reference'];
const initialObjectTypes = [
  { objectType: 'employee', moduleKey: 'HRMS', displayName: 'Employee', examples: 'Medical fitness, contractor agency, skill validity' },
  { objectType: 'work_order', moduleKey: 'MES', displayName: 'Work Order', examples: 'Customer priority, curing batch, special instruction' },
  { objectType: 'material', moduleKey: 'ERP', displayName: 'Material', examples: 'Shelf-life class, storage condition, allergen flag' },
  { objectType: 'quality_defect', moduleKey: 'Quality', displayName: 'Quality Defect', examples: 'Severity, root cause, containment action' },
  { objectType: 'ticket', moduleKey: 'Work Management', displayName: 'Ticket', examples: 'Escalation type, customer impact' },
];

function useData<T>(url: string, fallback: T) {
  const [data, setData] = useState<T>(fallback);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let active = true;
    async function load() {
      try {
        const res = await fetch(url);
        const json = await readJsonResponse<T>(res);
        if (!res.ok) throw new Error(responseError(res, json, 'Failed to load configuration data'));
        if (active) {
          setData(json ?? fallback);
          setError(null);
        }
      } catch (err) {
        if (active) setError(err instanceof Error ? err.message : 'Failed to load');
      } finally {
        if (active) setLoading(false);
      }
    }
    load();
    return () => { active = false; };
  }, [url]);

  return { data, error, loading };
}

function Card({ title, value, helper, icon: Icon }: any) {
  return (
    <div className="rounded-lg border border-slate-700 bg-slate-800/70 p-4">
      <div className="flex items-start justify-between gap-3">
        <div>
          <div className="text-sm text-slate-300">{title}</div>
          <div className="mt-2 text-2xl font-semibold text-white">{value}</div>
        </div>
        <Icon className="h-5 w-5 text-emerald-400" />
      </div>
      <div className="mt-3 text-xs text-slate-400">{helper}</div>
    </div>
  );
}

function Pill({ children }: { children: any }) {
  return <span className="rounded border border-slate-600 bg-slate-900 px-2 py-1 text-xs text-slate-300">{children}</span>;
}

export default function ConfigurationStudioModule() {
  const objectTypes = useData<any[]>('/api/configuration/object-types', []);
  const fields = useData<any[]>('/api/configuration/custom-fields', []);
  const workflows = useData<any[]>('/api/configuration/workflows', []);

  const errors = [objectTypes.error, fields.error, workflows.error].filter(Boolean);
  const loading = objectTypes.loading || fields.loading || workflows.loading;
  const effectiveObjects = objectTypes.data.length ? objectTypes.data : initialObjectTypes;

  const fieldTypeCoverage = useMemo(() => {
    const used = new Set(fields.data.map((field) => field.fieldType));
    return supportedFieldTypes.filter((type) => used.has(type)).length;
  }, [fields.data]);

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold text-white">Configuration Studio</h1>
          <p className="text-sm text-slate-400">No-code custom fields and workflow states for industry-specific customization.</p>
        </div>
        <div className="rounded-lg border border-slate-700 bg-slate-800 px-3 py-2 text-sm text-slate-300">
          {loading ? 'Loading configuration' : 'Sprint 1 configurable foundation'}
        </div>
      </div>

      {errors.length > 0 && (
        <div className="rounded-lg border border-amber-700 bg-amber-950/30 p-4 text-sm text-amber-100">
          Configuration tables are not fully available yet. Run the database migration/push before using live APIs. First error: {errors[0]}
        </div>
      )}

      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        <Card title="Object Types" value={effectiveObjects.length} helper="Objects ready for industry configuration" icon={Icons.Layers} />
        <Card title="Custom Fields" value={fields.data.length} helper="Tenant-defined data capture fields" icon={Icons.Settings} />
        <Card title="Workflows" value={workflows.data.length} helper="State machines and lifecycle flows" icon={Icons.Activity} />
        <Card title="Field Type Coverage" value={`${fieldTypeCoverage}/${supportedFieldTypes.length}`} helper="Supported field primitives in use" icon={Icons.Database} />
      </div>

      <div className="grid gap-6 xl:grid-cols-[0.9fr_1.1fr]">
        <section className="rounded-lg border border-slate-700 bg-slate-800/70">
          <div className="flex items-center justify-between border-b border-slate-700 px-4 py-3">
            <div>
              <h2 className="font-semibold text-white">Configurable Objects</h2>
              <p className="text-xs text-slate-400">Initial object catalog for MES, ERP, HRMS, Quality, and Work Management.</p>
            </div>
            <Icons.Layers className="h-5 w-5 text-emerald-400" />
          </div>
          <div className="divide-y divide-slate-700">
            {effectiveObjects.map((object) => (
              <div key={object.id || object.objectType} className="px-4 py-3">
                <div className="flex items-center justify-between gap-3">
                  <div>
                    <div className="font-medium text-white">{object.displayName}</div>
                    <div className="text-xs text-slate-400">{object.objectType} / {object.moduleKey}</div>
                  </div>
                  <Pill>{object.isActive === false ? 'inactive' : 'active'}</Pill>
                </div>
                <div className="mt-2 text-xs text-slate-400">{object.examples || object.description || 'Ready for custom fields and workflow.'}</div>
              </div>
            ))}
          </div>
        </section>

        <section className="rounded-lg border border-slate-700 bg-slate-800/70">
          <div className="flex items-center justify-between border-b border-slate-700 px-4 py-3">
            <div>
              <h2 className="font-semibold text-white">Supported Field Types</h2>
              <p className="text-xs text-slate-400">Sprint 1 primitives for flexible industry data capture.</p>
            </div>
            <Icons.Settings className="h-5 w-5 text-blue-400" />
          </div>
          <div className="flex flex-wrap gap-2 p-4">
            {supportedFieldTypes.map((type) => <Pill key={type}>{type}</Pill>)}
          </div>
          <div className="border-t border-slate-700 p-4">
            <h3 className="mb-3 text-sm font-semibold text-white">Custom Field Definitions</h3>
            {fields.data.length ? (
              <div className="space-y-2">
                {fields.data.slice(0, 8).map((field) => (
                  <div key={field.id} className="rounded border border-slate-700 bg-slate-900/60 p-3">
                    <div className="flex items-center justify-between">
                      <span className="font-medium text-slate-100">{field.fieldLabel}</span>
                      <Pill>{field.fieldType}</Pill>
                    </div>
                    <div className="mt-1 text-xs text-slate-400">{field.objectType} / {field.fieldKey}</div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="rounded border border-slate-700 bg-slate-900/60 p-4 text-sm text-slate-400">
                No custom fields created yet.
              </div>
            )}
          </div>
        </section>
      </div>

      <section className="rounded-lg border border-slate-700 bg-slate-800/70">
        <div className="flex items-center justify-between border-b border-slate-700 px-4 py-3">
          <div>
            <h2 className="font-semibold text-white">Workflow State Engine</h2>
            <p className="text-xs text-slate-400">Reusable states and transitions for onboarding, work orders, defects, material approval, and tickets.</p>
          </div>
          <Icons.Activity className="h-5 w-5 text-amber-400" />
        </div>
        <div className="grid gap-4 p-4 md:grid-cols-3">
          {['Draft', 'Waiting', 'Active', 'Approved', 'Rejected', 'Closed'].map((state) => (
            <div key={state} className="rounded-lg border border-slate-700 bg-slate-900/60 p-4">
              <div className="font-medium text-white">{state}</div>
              <div className="mt-2 text-xs text-slate-400">State category available for configurable workflows.</div>
            </div>
          ))}
        </div>
        <div className="border-t border-slate-700 p-4">
          {workflows.data.length ? (
            <div className="grid gap-3 md:grid-cols-2">
              {workflows.data.slice(0, 6).map((workflow) => (
                <div key={workflow.id} className="rounded-lg border border-slate-700 bg-slate-900/60 p-3">
                  <div className="font-medium text-white">{workflow.workflowName}</div>
                  <div className="text-xs text-slate-400">{workflow.moduleKey} / {workflow.objectType} / {workflow.isActive ? 'active' : 'inactive'}</div>
                </div>
              ))}
            </div>
          ) : (
            <div className="rounded border border-slate-700 bg-slate-900/60 p-4 text-sm text-slate-400">
              No workflow definitions created yet.
            </div>
          )}
        </div>
      </section>
    </div>
  );
}
