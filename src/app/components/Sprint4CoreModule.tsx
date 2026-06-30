import { useEffect, useMemo, useState } from 'react';
import * as Icons from '@/shared/ui/icons';
import { readJsonResponse, responseError } from '@/lib/http';

type Material = { id: string; materialCode: string; materialName: string; materialType: string; baseUom: string; status: string };
type Ledger = { id: string; materialId: string; movementType: string; quantity: string; uom: string; executionId?: string | null; postedAt: string };
type InspectionPlan = { id: string; planCode: string; planName: string; status: string; version: number; stepId?: number | null; checkpointIds?: number[] };
type OeeReason = { id: string; reasonCode: string; reasonName: string; category: string; lossType: string; isPlanned: boolean };

function Panel({ title, helper, icon: Icon, children }: any) {
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

function Pill({ children }: { children: any }) {
  return <span className="rounded border border-slate-600 bg-slate-900 px-2 py-1 text-xs text-slate-300">{children}</span>;
}

export default function Sprint4CoreModule() {
  const [tenantId, setTenantId] = useState(() => localStorage.getItem('mes_tenant_id') || '');
  const [error, setError] = useState<string | null>(null);
  const [materials, setMaterials] = useState<Material[]>([]);
  const [ledger, setLedger] = useState<Ledger[]>([]);
  const [plans, setPlans] = useState<InspectionPlan[]>([]);
  const [reasons, setReasons] = useState<OeeReason[]>([]);
  const [materialForm, setMaterialForm] = useState({ materialCode: '', materialName: '', materialType: 'raw_material', baseUom: 'ea' });
  const [movementForm, setMovementForm] = useState({ materialId: '', movementType: 'issue', quantity: '1', uom: 'ea', executionId: '' });
  const [planForm, setPlanForm] = useState({ planCode: '', planName: '', stepId: '', checkpointIds: '' });
  const [reasonForm, setReasonForm] = useState({ reasonCode: '', reasonName: '', category: 'unplanned', lossType: 'availability' });

  const headers = useMemo(() => ({
    'content-type': 'application/json',
    ...(tenantId ? { 'x-tenant-id': tenantId } : {}),
  }), [tenantId]);

  async function request<T>(url: string, options?: RequestInit) {
    const res = await fetch(url, { ...options, headers: { ...headers, ...(options?.headers || {}) } });
    const json = await readJsonResponse<T>(res);
    if (!res.ok) throw new Error(responseError(res, json, 'Request failed'));
    return json;
  }

  async function loadAll() {
    if (!tenantId) {
      setError('Enter a tenant id to load Sprint 4 setup data.');
      return;
    }
    try {
      localStorage.setItem('mes_tenant_id', tenantId);
      const [loadedMaterials, loadedLedger, loadedPlans, loadedReasons] = await Promise.all([
        request<Material[]>('/api/inventory/materials'),
        request<Ledger[]>('/api/inventory/stock/ledger'),
        request<InspectionPlan[]>('/api/inspection-plans'),
        request<OeeReason[]>('/api/oee/downtime/reasons'),
      ]);
      setMaterials(loadedMaterials || []);
      setLedger(loadedLedger || []);
      setPlans(loadedPlans || []);
      setReasons(loadedReasons || []);
      setError(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load Sprint 4 setup data');
    }
  }

  useEffect(() => {
    loadAll();
  }, [tenantId]);

  async function createMaterial(event: React.FormEvent) {
    event.preventDefault();
    try {
      const created = await request<Material>('/api/inventory/materials', { method: 'POST', body: JSON.stringify(materialForm) });
      if (created) setMaterials((current) => [created, ...current]);
      setMaterialForm({ materialCode: '', materialName: '', materialType: 'raw_material', baseUom: 'ea' });
      setError(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to create material');
    }
  }

  async function postMovement(event: React.FormEvent) {
    event.preventDefault();
    try {
      const created = await request<Ledger>(`/api/inventory/stock/${movementForm.movementType}`, {
        method: 'POST',
        body: JSON.stringify({
          materialId: movementForm.materialId,
          quantity: movementForm.quantity,
          uom: movementForm.uom,
          executionId: movementForm.executionId || null,
        }),
      });
      if (created) setLedger((current) => [created, ...current]);
      setError(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to post stock movement');
    }
  }

  async function createPlan(event: React.FormEvent) {
    event.preventDefault();
    try {
      const created = await request<InspectionPlan>('/api/inspection-plans', {
        method: 'POST',
        body: JSON.stringify({
          ...planForm,
          stepId: planForm.stepId || null,
          checkpointIds: planForm.checkpointIds.split(',').map((item) => item.trim()).filter(Boolean).map(Number),
        }),
      });
      if (created) setPlans((current) => [created, ...current]);
      setPlanForm({ planCode: '', planName: '', stepId: '', checkpointIds: '' });
      setError(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to create inspection plan');
    }
  }

  async function activatePlan(plan: InspectionPlan) {
    try {
      const updated = await request<InspectionPlan>(`/api/inspection-plans/${plan.id}/activate`, { method: 'POST' });
      setPlans((current) => current.map((item) => (item.id === plan.id && updated ? updated : item)));
      setError(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to activate inspection plan');
    }
  }

  async function createReason(event: React.FormEvent) {
    event.preventDefault();
    try {
      const created = await request<OeeReason>('/api/oee/downtime/reasons', { method: 'POST', body: JSON.stringify(reasonForm) });
      if (created) setReasons((current) => [created, ...current]);
      setReasonForm({ reasonCode: '', reasonName: '', category: 'unplanned', lossType: 'availability' });
      setError(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to create OEE reason');
    }
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-3 lg:flex-row lg:items-end lg:justify-between">
        <div>
          <h1 className="text-2xl font-bold text-white">Sprint 4 Core</h1>
          <p className="text-sm text-slate-400">Operational glue setup for work orders, WIP inventory, quality plans, and OEE reasons.</p>
        </div>
        <div className="flex gap-2">
          <input className="h-10 min-w-72 rounded border border-slate-700 bg-slate-900 px-3 text-sm text-white outline-none focus:border-emerald-500" placeholder="Tenant id" value={tenantId} onChange={(event) => setTenantId(event.target.value.trim())} />
          <button className="rounded border border-slate-600 bg-slate-900 p-2 text-slate-200 hover:border-emerald-500" onClick={loadAll} title="Refresh">
            <Icons.RotateCcw className="h-4 w-4" />
          </button>
        </div>
      </div>

      {error && <div className="rounded-lg border border-amber-700 bg-amber-950/30 p-4 text-sm text-amber-100">{error}</div>}

      <div className="grid gap-4 md:grid-cols-4">
        <Panel title="Materials" helper="Generic material master" icon={Icons.Package}><div className="text-2xl font-semibold text-white">{materials.length}</div></Panel>
        <Panel title="Ledger Rows" helper="WIP stock movement trail" icon={Icons.Database}><div className="text-2xl font-semibold text-white">{ledger.length}</div></Panel>
        <Panel title="Inspection Plans" helper="Versioned quality plan shell" icon={Icons.ClipboardCheck}><div className="text-2xl font-semibold text-white">{plans.length}</div></Panel>
        <Panel title="OEE Reasons" helper="Tenant downtime reason catalog" icon={Icons.Activity}><div className="text-2xl font-semibold text-white">{reasons.length}</div></Panel>
      </div>

      <div className="grid gap-6 xl:grid-cols-2">
        <Panel title="Material Master MVP" helper="Create canonical materials beside legacy kit/resin flows." icon={Icons.Package}>
          <form onSubmit={createMaterial} className="grid gap-3 sm:grid-cols-2">
            <input className="rounded border border-slate-700 bg-slate-900 px-3 py-2 text-sm text-white" placeholder="Material code" value={materialForm.materialCode} onChange={(e) => setMaterialForm({ ...materialForm, materialCode: e.target.value })} required />
            <input className="rounded border border-slate-700 bg-slate-900 px-3 py-2 text-sm text-white" placeholder="Material name" value={materialForm.materialName} onChange={(e) => setMaterialForm({ ...materialForm, materialName: e.target.value })} required />
            <input className="rounded border border-slate-700 bg-slate-900 px-3 py-2 text-sm text-white" value={materialForm.materialType} onChange={(e) => setMaterialForm({ ...materialForm, materialType: e.target.value })} />
            <input className="rounded border border-slate-700 bg-slate-900 px-3 py-2 text-sm text-white" value={materialForm.baseUom} onChange={(e) => setMaterialForm({ ...materialForm, baseUom: e.target.value })} />
            <button className="h-10 rounded bg-emerald-600 px-4 text-sm font-medium text-white hover:bg-emerald-500 sm:col-span-2">Create Material</button>
          </form>
          <div className="mt-4 space-y-2">
            {materials.slice(0, 5).map((material) => (
              <div key={material.id} className="flex items-center justify-between rounded border border-slate-700 bg-slate-900/60 p-3">
                <div><div className="text-sm font-medium text-white">{material.materialCode}</div><div className="text-xs text-slate-400">{material.materialName}</div></div>
                <Pill>{material.baseUom}</Pill>
              </div>
            ))}
          </div>
        </Panel>

        <Panel title="WIP Stock Ledger" helper="Post issue, return, receipt, or produced stock against execution runs." icon={Icons.Database}>
          <form onSubmit={postMovement} className="grid gap-3 sm:grid-cols-2">
            <select className="rounded border border-slate-700 bg-slate-900 px-3 py-2 text-sm text-white" value={movementForm.materialId} onChange={(e) => setMovementForm({ ...movementForm, materialId: e.target.value })} required>
              <option value="">Select material</option>
              {materials.map((material) => <option key={material.id} value={material.id}>{material.materialCode}</option>)}
            </select>
            <select className="rounded border border-slate-700 bg-slate-900 px-3 py-2 text-sm text-white" value={movementForm.movementType} onChange={(e) => setMovementForm({ ...movementForm, movementType: e.target.value })}>
              <option value="issue">Issue</option>
              <option value="return">Return</option>
              <option value="receive">Receipt</option>
              <option value="produce-receipt">Produce receipt</option>
            </select>
            <input className="rounded border border-slate-700 bg-slate-900 px-3 py-2 text-sm text-white" type="number" step="0.001" min="0" value={movementForm.quantity} onChange={(e) => setMovementForm({ ...movementForm, quantity: e.target.value })} />
            <input className="rounded border border-slate-700 bg-slate-900 px-3 py-2 text-sm text-white" value={movementForm.uom} onChange={(e) => setMovementForm({ ...movementForm, uom: e.target.value })} />
            <input className="rounded border border-slate-700 bg-slate-900 px-3 py-2 text-sm text-white sm:col-span-2" placeholder="Work order execution id" value={movementForm.executionId} onChange={(e) => setMovementForm({ ...movementForm, executionId: e.target.value })} />
            <button className="h-10 rounded bg-emerald-600 px-4 text-sm font-medium text-white hover:bg-emerald-500 sm:col-span-2">Post Movement</button>
          </form>
        </Panel>

        <Panel title="Inspection Plan Versioning" helper="Define checkpoint plan shells before NC/CAPA depth." icon={Icons.ClipboardCheck}>
          <form onSubmit={createPlan} className="grid gap-3 sm:grid-cols-2">
            <input className="rounded border border-slate-700 bg-slate-900 px-3 py-2 text-sm text-white" placeholder="Plan code" value={planForm.planCode} onChange={(e) => setPlanForm({ ...planForm, planCode: e.target.value })} required />
            <input className="rounded border border-slate-700 bg-slate-900 px-3 py-2 text-sm text-white" placeholder="Plan name" value={planForm.planName} onChange={(e) => setPlanForm({ ...planForm, planName: e.target.value })} required />
            <input className="rounded border border-slate-700 bg-slate-900 px-3 py-2 text-sm text-white" placeholder="Step id" value={planForm.stepId} onChange={(e) => setPlanForm({ ...planForm, stepId: e.target.value })} />
            <input className="rounded border border-slate-700 bg-slate-900 px-3 py-2 text-sm text-white" placeholder="Checkpoint ids comma-separated" value={planForm.checkpointIds} onChange={(e) => setPlanForm({ ...planForm, checkpointIds: e.target.value })} />
            <button className="h-10 rounded bg-emerald-600 px-4 text-sm font-medium text-white hover:bg-emerald-500 sm:col-span-2">Create Plan</button>
          </form>
          <div className="mt-4 space-y-2">
            {plans.slice(0, 5).map((plan) => (
              <div key={plan.id} className="flex items-center justify-between rounded border border-slate-700 bg-slate-900/60 p-3">
                <div><div className="text-sm font-medium text-white">{plan.planCode}</div><div className="text-xs text-slate-400">{plan.planName} / v{plan.version}</div></div>
                {plan.status === 'active' ? <Pill>active</Pill> : <button className="rounded border border-emerald-700 px-2 py-1 text-xs text-emerald-100" onClick={() => activatePlan(plan)}>Activate</button>}
              </div>
            ))}
          </div>
        </Panel>

        <Panel title="OEE Reason Configuration" helper="Replace hardcoded downtime reasons with tenant-managed codes." icon={Icons.Activity}>
          <form onSubmit={createReason} className="grid gap-3 sm:grid-cols-2">
            <input className="rounded border border-slate-700 bg-slate-900 px-3 py-2 text-sm text-white" placeholder="Reason code" value={reasonForm.reasonCode} onChange={(e) => setReasonForm({ ...reasonForm, reasonCode: e.target.value })} required />
            <input className="rounded border border-slate-700 bg-slate-900 px-3 py-2 text-sm text-white" placeholder="Reason name" value={reasonForm.reasonName} onChange={(e) => setReasonForm({ ...reasonForm, reasonName: e.target.value })} required />
            <select className="rounded border border-slate-700 bg-slate-900 px-3 py-2 text-sm text-white" value={reasonForm.category} onChange={(e) => setReasonForm({ ...reasonForm, category: e.target.value })}>
              <option value="unplanned">Unplanned</option>
              <option value="planned">Planned</option>
            </select>
            <input className="rounded border border-slate-700 bg-slate-900 px-3 py-2 text-sm text-white" value={reasonForm.lossType} onChange={(e) => setReasonForm({ ...reasonForm, lossType: e.target.value })} />
            <button className="h-10 rounded bg-emerald-600 px-4 text-sm font-medium text-white hover:bg-emerald-500 sm:col-span-2">Create Reason</button>
          </form>
          <div className="mt-4 flex flex-wrap gap-2">
            {reasons.slice(0, 10).map((reason) => <Pill key={reason.id}>{reason.reasonCode}: {reason.reasonName}</Pill>)}
          </div>
        </Panel>
      </div>
    </div>
  );
}
