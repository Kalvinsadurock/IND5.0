import { useMemo, useState } from 'react';
import type { FormEvent } from 'react';
import * as Icons from '@/shared/ui/icons';

type OnboardingResult = {
  tenant?: { id: string; name: string; code: string; industryType?: string };
  company?: { displayName: string };
  plant?: { name: string; code: string };
  hierarchy?: { workCenters?: Array<{ id: string; name: string }> };
  roles?: Array<{ id: string; name: string }>;
  permissions?: Array<{ id: string; code: string }>;
  objectTypes?: Array<{ id: string; displayName: string }>;
  customFields?: Array<{ id: string; fieldLabel: string }>;
  workflow?: { workflow?: { workflowName: string }; states?: unknown[]; transitions?: unknown[] };
  industryTemplate?: string;
};

const industryOptions = [
  { value: 'discrete_manufacturing', label: 'Discrete Manufacturing' },
  { value: 'process_manufacturing', label: 'Process Manufacturing' },
  { value: 'composites', label: 'Composites' },
];

const initialForm = {
  tenantName: 'Demo Industrial Tenant',
  tenantCode: 'DEMO_IND',
  companyName: 'Demo Manufacturing Company',
  legalName: 'Demo Manufacturing Company Pvt Ltd',
  plantName: 'Main Plant',
  plantCode: 'MAIN_PLANT',
  plantLocation: 'Primary manufacturing site',
  industryType: 'discrete_manufacturing',
  timezone: 'Asia/Calcutta',
  adminName: 'Tenant Admin',
  adminEmail: 'admin@example.com',
};

function Field({ label, value, onChange, type = 'text', required = true }: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  type?: string;
  required?: boolean;
}) {
  return (
    <label className="block">
      <span className="mb-1 block text-xs font-medium text-slate-300">{label}</span>
      <input
        value={value}
        type={type}
        required={required}
        onChange={(event) => onChange(event.target.value)}
        className="w-full rounded-md border border-slate-600 bg-slate-900 px-3 py-2 text-sm text-slate-100 outline-none focus:border-emerald-500"
      />
    </label>
  );
}

function SummaryPill({ label, value }: { label: string; value: number | string }) {
  return (
    <div className="rounded-md border border-slate-700 bg-slate-900/70 px-3 py-2">
      <div className="text-lg font-semibold text-white">{value}</div>
      <div className="text-xs text-slate-400">{label}</div>
    </div>
  );
}

export function TenantOnboardingWizard({ onCompleted }: { onCompleted?: () => void }) {
  const [form, setForm] = useState(initialForm);
  const [result, setResult] = useState<OnboardingResult | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  const selectedIndustry = useMemo(
    () => industryOptions.find((option) => option.value === form.industryType)?.label || 'Industry template',
    [form.industryType],
  );

  const update = (key: keyof typeof form, value: string) => {
    setForm((current) => ({ ...current, [key]: value }));
  };

  async function submit(event: FormEvent) {
    event.preventDefault();
    setSubmitting(true);
    setError(null);
    setResult(null);

    try {
      const response = await fetch('/api/platform/onboarding/bootstrap', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(form),
      });
      const body = await response.json();
      if (!response.ok) throw new Error(body?.error || 'Onboarding failed');
      setResult(body);
      onCompleted?.();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Onboarding failed');
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <section className="rounded-lg border border-slate-700 bg-slate-800/70">
      <div className="flex flex-col gap-3 border-b border-slate-700 px-4 py-3 md:flex-row md:items-center md:justify-between">
        <div>
          <h2 className="font-semibold text-white">Tenant Onboarding Wizard</h2>
          <p className="text-xs text-slate-400">Create the first tenant, company, plant, admin, roles, permissions, industry fields, and work-order workflow.</p>
        </div>
        <div className="rounded-md border border-emerald-700 bg-emerald-950/30 px-3 py-2 text-xs text-emerald-200">
          {selectedIndustry}
        </div>
      </div>

      <form onSubmit={submit} className="grid gap-4 p-4 xl:grid-cols-[1fr_0.8fr]">
        <div className="grid gap-4 md:grid-cols-2">
          <Field label="Tenant Name" value={form.tenantName} onChange={(value) => update('tenantName', value)} />
          <Field label="Tenant Code" value={form.tenantCode} onChange={(value) => update('tenantCode', value)} />
          <Field label="Company Name" value={form.companyName} onChange={(value) => update('companyName', value)} />
          <Field label="Legal Name" value={form.legalName} onChange={(value) => update('legalName', value)} />
          <Field label="Plant Name" value={form.plantName} onChange={(value) => update('plantName', value)} />
          <Field label="Plant Code" value={form.plantCode} onChange={(value) => update('plantCode', value)} />
          <Field label="Plant Location" value={form.plantLocation} onChange={(value) => update('plantLocation', value)} required={false} />
          <Field label="Timezone" value={form.timezone} onChange={(value) => update('timezone', value)} />

          <label className="block">
            <span className="mb-1 block text-xs font-medium text-slate-300">Industry Template</span>
            <select
              value={form.industryType}
              onChange={(event) => update('industryType', event.target.value)}
              className="w-full rounded-md border border-slate-600 bg-slate-900 px-3 py-2 text-sm text-slate-100 outline-none focus:border-emerald-500"
            >
              {industryOptions.map((option) => <option key={option.value} value={option.value}>{option.label}</option>)}
            </select>
          </label>

          <Field label="Admin Name" value={form.adminName} onChange={(value) => update('adminName', value)} />
          <Field label="Admin Email" value={form.adminEmail} onChange={(value) => update('adminEmail', value)} type="email" />
        </div>

        <div className="space-y-4">
          <div className="rounded-lg border border-slate-700 bg-slate-900/60 p-4">
            <div className="mb-3 flex items-center gap-2 text-sm font-semibold text-white">
              <Icons.ShieldCheck className="h-4 w-4 text-emerald-400" />
              Bootstrap Includes
            </div>
            <div className="grid gap-2 text-sm text-slate-300">
              {['Tenant and company record', 'Main plant with starter hierarchy', 'Admin invite and Tenant Admin role', 'Default roles and permissions', 'Configurable object catalog', 'Industry custom fields', 'Standard work-order workflow'].map((item) => (
                <div key={item} className="flex items-center gap-2">
                  <Icons.CheckCircle className="h-4 w-4 text-emerald-400" />
                  <span>{item}</span>
                </div>
              ))}
            </div>
          </div>

          {error && (
            <div className="rounded-lg border border-red-800 bg-red-950/30 p-3 text-sm text-red-100">{error}</div>
          )}

          {result && (
            <div className="space-y-3 rounded-lg border border-emerald-800 bg-emerald-950/20 p-4">
              <div className="flex items-center gap-2 text-sm font-semibold text-emerald-100">
                <Icons.CheckCircle className="h-4 w-4" />
                {result.tenant?.name} is ready
              </div>
              <div className="grid grid-cols-2 gap-2">
                <SummaryPill label="Work Centers" value={result.hierarchy?.workCenters?.length || 0} />
                <SummaryPill label="Roles" value={result.roles?.length || 0} />
                <SummaryPill label="Permissions" value={result.permissions?.length || 0} />
                <SummaryPill label="Objects" value={result.objectTypes?.length || 0} />
                <SummaryPill label="Custom Fields" value={result.customFields?.length || 0} />
                <SummaryPill label="Workflow States" value={result.workflow?.states?.length || 0} />
              </div>
            </div>
          )}

          <button
            type="submit"
            disabled={submitting}
            className="inline-flex w-full items-center justify-center gap-2 rounded-md bg-emerald-600 px-4 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-emerald-500 disabled:cursor-not-allowed disabled:bg-slate-600"
          >
            {submitting ? <Icons.Loader2 className="h-4 w-4 animate-spin" /> : <Icons.Plus className="h-4 w-4" />}
            {submitting ? 'Creating Foundation' : 'Create Tenant Foundation'}
          </button>
        </div>
      </form>
    </section>
  );
}
