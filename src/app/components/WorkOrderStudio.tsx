import { useEffect, useMemo, useState } from 'react';
import * as Icons from '@/shared/ui/icons';
import { readJsonResponse, responseError } from '@/lib/http';

type WorkOrder = {
  id: string;
  tenantId: string;
  workOrderNumber: string;
  title: string;
  description?: string | null;
  productCode?: string | null;
  productName?: string | null;
  plannedQuantity: string;
  completedQuantity: string;
  unit: string;
  priority: string;
  status: string;
  plannedStartAt?: string | null;
  plannedEndAt?: string | null;
  createdAt: string;
};

type WorkOrderExecution = {
  id: string;
  workOrderId: string;
  executionNumber: string;
  status: string;
  partId?: number | null;
  processId?: number | null;
  currentStepId?: number | null;
  plannedQuantity: string;
  goodQuantity: string;
  rejectedQuantity: string;
  startedAt?: string | null;
  endedAt?: string | null;
  createdAt: string;
};

const statusOptions = ['draft', 'released', 'in_progress', 'quality_hold', 'completed', 'cancelled'];
const executionStatusOptions = ['planned', 'active', 'paused', 'blocked', 'completed', 'cancelled'];
const priorityOptions = ['normal', 'high', 'critical'];

const emptyForm = {
  workOrderNumber: '',
  title: '',
  productCode: '',
  productName: '',
  plannedQuantity: '1',
  unit: 'ea',
  priority: 'normal',
  plannedEndAt: '',
};

function statusLabel(status: string) {
  return status.replace(/_/g, ' ');
}

function Badge({ tone = 'slate', children }: { tone?: 'slate' | 'blue' | 'emerald' | 'amber' | 'rose'; children: any }) {
  const tones = {
    slate: 'border-slate-600 bg-slate-900 text-slate-300',
    blue: 'border-blue-700 bg-blue-950/50 text-blue-200',
    emerald: 'border-emerald-700 bg-emerald-950/50 text-emerald-200',
    amber: 'border-amber-700 bg-amber-950/50 text-amber-200',
    rose: 'border-rose-700 bg-rose-950/50 text-rose-200',
  };
  return <span className={`rounded border px-2 py-1 text-xs capitalize ${tones[tone]}`}>{children}</span>;
}

function statusTone(status: string): 'slate' | 'blue' | 'emerald' | 'amber' | 'rose' {
  if (status === 'released') return 'blue';
  if (status === 'in_progress' || status === 'completed') return 'emerald';
  if (status === 'quality_hold') return 'amber';
  if (status === 'cancelled') return 'rose';
  return 'slate';
}

export default function WorkOrderStudio() {
  const [tenantId, setTenantId] = useState(() => localStorage.getItem('mes_tenant_id') || '');
  const [workOrders, setWorkOrders] = useState<WorkOrder[]>([]);
  const [form, setForm] = useState(emptyForm);
  const [statusFilter, setStatusFilter] = useState('all');
  const [selectedOrder, setSelectedOrder] = useState<WorkOrder | null>(null);
  const [executions, setExecutions] = useState<WorkOrderExecution[]>([]);
  const [executionForm, setExecutionForm] = useState({ processId: '', partId: '', plannedQuantity: '1' });
  const [loading, setLoading] = useState(false);
  const [executionLoading, setExecutionLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const headers = useMemo(() => ({
    'content-type': 'application/json',
    ...(tenantId ? { 'x-tenant-id': tenantId } : {}),
  }), [tenantId]);

  async function loadWorkOrders() {
    if (!tenantId) {
      setWorkOrders([]);
      setError('Enter a tenant id to load work orders.');
      return;
    }

    setLoading(true);
    try {
      localStorage.setItem('mes_tenant_id', tenantId);
      const params = statusFilter === 'all' ? '' : `?status=${encodeURIComponent(statusFilter)}`;
      const res = await fetch(`/api/mes/work-orders${params}`, { headers });
      const json = await readJsonResponse<WorkOrder[]>(res);
      if (!res.ok) throw new Error(responseError(res, json, 'Failed to load work orders'));
      setWorkOrders(json || []);
      setError(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load work orders');
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadWorkOrders();
  }, [tenantId, statusFilter]);

  async function createWorkOrder(event: React.FormEvent) {
    event.preventDefault();
    if (!tenantId) {
      setError('Tenant id is required before creating a work order.');
      return;
    }

    setSaving(true);
    try {
      const payload = {
        ...form,
        plannedEndAt: form.plannedEndAt || null,
      };
      const res = await fetch('/api/mes/work-orders', {
        method: 'POST',
        headers,
        body: JSON.stringify(payload),
      });
      const json = await readJsonResponse<WorkOrder>(res);
      if (!res.ok) throw new Error(responseError(res, json, 'Failed to create work order'));
      setForm(emptyForm);
      setWorkOrders((current) => (json ? [json, ...current] : current));
      setError(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to create work order');
    } finally {
      setSaving(false);
    }
  }

  async function changeStatus(workOrder: WorkOrder, status: string) {
    try {
      const res = await fetch(`/api/mes/work-orders/${workOrder.id}/status`, {
        method: 'PATCH',
        headers,
        body: JSON.stringify({ status }),
      });
      const json = await readJsonResponse<WorkOrder>(res);
      if (!res.ok) throw new Error(responseError(res, json, 'Failed to change status'));
      setWorkOrders((current) => current.map((item) => (item.id === workOrder.id && json ? json : item)));
      setError(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to change status');
    }
  }

  async function loadExecutions(workOrder: WorkOrder) {
    setSelectedOrder(workOrder);
    setExecutionLoading(true);
    try {
      const res = await fetch(`/api/mes/work-orders/${workOrder.id}/executions`, { headers });
      const json = await readJsonResponse<WorkOrderExecution[]>(res);
      if (!res.ok) throw new Error(responseError(res, json, 'Failed to load executions'));
      setExecutions(json || []);
      setExecutionForm({ processId: '', partId: '', plannedQuantity: workOrder.plannedQuantity || '1' });
      setError(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load executions');
    } finally {
      setExecutionLoading(false);
    }
  }

  async function createExecution(event: React.FormEvent) {
    event.preventDefault();
    if (!selectedOrder) return;
    setExecutionLoading(true);
    try {
      const payload = {
        processId: executionForm.processId || null,
        partId: executionForm.partId || null,
        plannedQuantity: executionForm.plannedQuantity || selectedOrder.plannedQuantity,
      };
      const res = await fetch(`/api/mes/work-orders/${selectedOrder.id}/executions`, {
        method: 'POST',
        headers,
        body: JSON.stringify(payload),
      });
      const json = await readJsonResponse<WorkOrderExecution>(res);
      if (!res.ok) throw new Error(responseError(res, json, 'Failed to create execution'));
      if (json) setExecutions((current) => [json, ...current]);
      setExecutionForm({ processId: '', partId: '', plannedQuantity: selectedOrder.plannedQuantity || '1' });
      setError(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to create execution');
    } finally {
      setExecutionLoading(false);
    }
  }

  async function changeExecutionStatus(execution: WorkOrderExecution, status: string) {
    setExecutionLoading(true);
    try {
      const res = await fetch(`/api/mes/work-order-executions/${execution.id}/status`, {
        method: 'PATCH',
        headers,
        body: JSON.stringify({ status }),
      });
      const json = await readJsonResponse<WorkOrderExecution>(res);
      if (!res.ok) throw new Error(responseError(res, json, 'Failed to update execution'));
      setExecutions((current) => current.map((item) => (item.id === execution.id && json ? json : item)));
      setError(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to update execution');
    } finally {
      setExecutionLoading(false);
    }
  }

  const counts = useMemo(() => ({
    total: workOrders.length,
    active: workOrders.filter((order) => order.status === 'in_progress').length,
    hold: workOrders.filter((order) => order.status === 'quality_hold').length,
    complete: workOrders.filter((order) => order.status === 'completed').length,
  }), [workOrders]);

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-3 lg:flex-row lg:items-end lg:justify-between">
        <div>
          <h1 className="text-2xl font-bold text-white">Work Order Studio</h1>
          <p className="text-sm text-slate-400">Create and track tenant-scoped MES work orders.</p>
        </div>
        <div className="flex flex-col gap-2 sm:flex-row">
          <input
            className="h-10 min-w-72 rounded border border-slate-700 bg-slate-900 px-3 text-sm text-white outline-none focus:border-emerald-500"
            placeholder="Tenant id"
            value={tenantId}
            onChange={(event) => setTenantId(event.target.value.trim())}
          />
          <select
            className="h-10 rounded border border-slate-700 bg-slate-900 px-3 text-sm text-white outline-none focus:border-emerald-500"
            value={statusFilter}
            onChange={(event) => setStatusFilter(event.target.value)}
          >
            <option value="all">All statuses</option>
            {statusOptions.map((status) => <option key={status} value={status}>{statusLabel(status)}</option>)}
          </select>
        </div>
      </div>

      {error && (
        <div className="rounded-lg border border-amber-700 bg-amber-950/30 p-4 text-sm text-amber-100">
          {error}
        </div>
      )}

      <div className="grid gap-4 md:grid-cols-4">
        <div className="rounded-lg border border-slate-700 bg-slate-800/70 p-4">
          <div className="flex items-center justify-between text-slate-300"><span>Total</span><Icons.FileText className="h-5 w-5 text-blue-300" /></div>
          <div className="mt-2 text-2xl font-semibold text-white">{counts.total}</div>
        </div>
        <div className="rounded-lg border border-slate-700 bg-slate-800/70 p-4">
          <div className="flex items-center justify-between text-slate-300"><span>Running</span><Icons.Play className="h-5 w-5 text-emerald-300" /></div>
          <div className="mt-2 text-2xl font-semibold text-white">{counts.active}</div>
        </div>
        <div className="rounded-lg border border-slate-700 bg-slate-800/70 p-4">
          <div className="flex items-center justify-between text-slate-300"><span>Hold</span><Icons.AlertTriangle className="h-5 w-5 text-amber-300" /></div>
          <div className="mt-2 text-2xl font-semibold text-white">{counts.hold}</div>
        </div>
        <div className="rounded-lg border border-slate-700 bg-slate-800/70 p-4">
          <div className="flex items-center justify-between text-slate-300"><span>Complete</span><Icons.CheckCircle className="h-5 w-5 text-emerald-300" /></div>
          <div className="mt-2 text-2xl font-semibold text-white">{counts.complete}</div>
        </div>
      </div>

      <div className="grid gap-6 xl:grid-cols-[0.8fr_1.2fr]">
        <form onSubmit={createWorkOrder} className="rounded-lg border border-slate-700 bg-slate-800/70">
          <div className="flex items-center justify-between border-b border-slate-700 px-4 py-3">
            <div>
              <h2 className="font-semibold text-white">New Work Order</h2>
              <p className="text-xs text-slate-400">Minimum dispatch record for Sprint 3.</p>
            </div>
            <Icons.Plus className="h-5 w-5 text-emerald-400" />
          </div>
          <div className="space-y-3 p-4">
            <input className="w-full rounded border border-slate-700 bg-slate-900 px-3 py-2 text-sm text-white outline-none focus:border-emerald-500" placeholder="Work order number" value={form.workOrderNumber} onChange={(event) => setForm({ ...form, workOrderNumber: event.target.value })} required />
            <input className="w-full rounded border border-slate-700 bg-slate-900 px-3 py-2 text-sm text-white outline-none focus:border-emerald-500" placeholder="Title" value={form.title} onChange={(event) => setForm({ ...form, title: event.target.value })} required />
            <div className="grid gap-3 sm:grid-cols-2">
              <input className="rounded border border-slate-700 bg-slate-900 px-3 py-2 text-sm text-white outline-none focus:border-emerald-500" placeholder="Product code" value={form.productCode} onChange={(event) => setForm({ ...form, productCode: event.target.value })} />
              <input className="rounded border border-slate-700 bg-slate-900 px-3 py-2 text-sm text-white outline-none focus:border-emerald-500" placeholder="Product name" value={form.productName} onChange={(event) => setForm({ ...form, productName: event.target.value })} />
            </div>
            <div className="grid gap-3 sm:grid-cols-3">
              <input className="rounded border border-slate-700 bg-slate-900 px-3 py-2 text-sm text-white outline-none focus:border-emerald-500" type="number" min="0" step="0.001" value={form.plannedQuantity} onChange={(event) => setForm({ ...form, plannedQuantity: event.target.value })} />
              <input className="rounded border border-slate-700 bg-slate-900 px-3 py-2 text-sm text-white outline-none focus:border-emerald-500" value={form.unit} onChange={(event) => setForm({ ...form, unit: event.target.value })} />
              <select className="rounded border border-slate-700 bg-slate-900 px-3 py-2 text-sm text-white outline-none focus:border-emerald-500" value={form.priority} onChange={(event) => setForm({ ...form, priority: event.target.value })}>
                {priorityOptions.map((priority) => <option key={priority} value={priority}>{priority}</option>)}
              </select>
            </div>
            <input className="w-full rounded border border-slate-700 bg-slate-900 px-3 py-2 text-sm text-white outline-none focus:border-emerald-500" type="datetime-local" value={form.plannedEndAt} onChange={(event) => setForm({ ...form, plannedEndAt: event.target.value })} />
            <button className="inline-flex h-10 w-full items-center justify-center gap-2 rounded bg-emerald-600 px-4 text-sm font-medium text-white hover:bg-emerald-500 disabled:cursor-not-allowed disabled:bg-slate-700" disabled={saving}>
              {saving ? <Icons.Loader2 className="h-4 w-4 animate-spin" /> : <Icons.Plus className="h-4 w-4" />}
              Create
            </button>
          </div>
        </form>

        <section className="rounded-lg border border-slate-700 bg-slate-800/70">
          <div className="flex items-center justify-between border-b border-slate-700 px-4 py-3">
            <div>
              <h2 className="font-semibold text-white">Work Orders</h2>
              <p className="text-xs text-slate-400">{loading ? 'Loading records' : `${workOrders.length} records loaded`}</p>
            </div>
            <button className="rounded border border-slate-600 bg-slate-900 p-2 text-slate-200 hover:border-emerald-500" onClick={loadWorkOrders} title="Refresh">
              <Icons.RotateCcw className="h-4 w-4" />
            </button>
          </div>
          <div className="divide-y divide-slate-700">
            {workOrders.length ? workOrders.map((order) => (
              <div key={order.id} className="p-4">
                <div className="flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
                  <div>
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="font-semibold text-white">{order.workOrderNumber}</span>
                      <Badge tone={statusTone(order.status)}>{statusLabel(order.status)}</Badge>
                      <Badge tone={order.priority === 'critical' ? 'rose' : order.priority === 'high' ? 'amber' : 'slate'}>{order.priority}</Badge>
                    </div>
                    <div className="mt-1 text-sm text-slate-200">{order.title}</div>
                    <div className="mt-1 text-xs text-slate-400">{order.productCode || 'No product code'} / {order.productName || 'No product name'}</div>
                  </div>
                  <div className="flex flex-wrap gap-2">
                    {statusOptions.filter((status) => status !== order.status).slice(0, 4).map((status) => (
                      <button key={status} className="rounded border border-slate-600 px-2 py-1 text-xs capitalize text-slate-200 hover:border-emerald-500" onClick={() => changeStatus(order, status)}>
                        {statusLabel(status)}
                      </button>
                    ))}
                    <button className="rounded border border-emerald-700 bg-emerald-950/30 px-2 py-1 text-xs text-emerald-100 hover:border-emerald-400" onClick={() => loadExecutions(order)}>
                      Executions
                    </button>
                  </div>
                </div>
                <div className="mt-3 grid gap-3 text-xs text-slate-400 sm:grid-cols-3">
                  <div>Plan: {order.plannedQuantity} {order.unit}</div>
                  <div>Done: {order.completedQuantity} {order.unit}</div>
                  <div>Due: {order.plannedEndAt ? new Date(order.plannedEndAt).toLocaleString() : 'Not set'}</div>
                </div>
              </div>
            )) : (
              <div className="p-6 text-sm text-slate-400">
                No work orders found for this tenant.
              </div>
            )}
          </div>
        </section>
      </div>

      <section className="rounded-lg border border-slate-700 bg-slate-800/70">
        <div className="flex flex-col gap-2 border-b border-slate-700 px-4 py-3 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h2 className="font-semibold text-white">Execution Bridge</h2>
            <p className="text-xs text-slate-400">
              {selectedOrder ? `${selectedOrder.workOrderNumber} execution instances` : 'Select a work order to create or inspect execution runs.'}
            </p>
          </div>
          <Icons.Activity className="h-5 w-5 text-emerald-400" />
        </div>

        {selectedOrder ? (
          <div className="grid gap-6 p-4 xl:grid-cols-[0.8fr_1.2fr]">
            <form onSubmit={createExecution} className="space-y-3 rounded border border-slate-700 bg-slate-900/50 p-4">
              <h3 className="text-sm font-semibold text-white">Create Execution Run</h3>
              <input className="w-full rounded border border-slate-700 bg-slate-950 px-3 py-2 text-sm text-white outline-none focus:border-emerald-500" placeholder="Process id" value={executionForm.processId} onChange={(event) => setExecutionForm({ ...executionForm, processId: event.target.value })} />
              <input className="w-full rounded border border-slate-700 bg-slate-950 px-3 py-2 text-sm text-white outline-none focus:border-emerald-500" placeholder="Existing part id (optional)" value={executionForm.partId} onChange={(event) => setExecutionForm({ ...executionForm, partId: event.target.value })} />
              <input className="w-full rounded border border-slate-700 bg-slate-950 px-3 py-2 text-sm text-white outline-none focus:border-emerald-500" type="number" min="0" step="0.001" value={executionForm.plannedQuantity} onChange={(event) => setExecutionForm({ ...executionForm, plannedQuantity: event.target.value })} />
              <button className="inline-flex h-10 w-full items-center justify-center gap-2 rounded bg-emerald-600 px-4 text-sm font-medium text-white hover:bg-emerald-500 disabled:bg-slate-700" disabled={executionLoading}>
                {executionLoading ? <Icons.Loader2 className="h-4 w-4 animate-spin" /> : <Icons.Play className="h-4 w-4" />}
                Create Execution
              </button>
            </form>

            <div className="space-y-3">
              {executions.length ? executions.map((execution) => (
                <div key={execution.id} className="rounded border border-slate-700 bg-slate-900/50 p-4">
                  <div className="flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
                    <div>
                      <div className="flex flex-wrap items-center gap-2">
                        <span className="font-semibold text-white">{execution.executionNumber}</span>
                        <Badge tone={statusTone(execution.status)}>{statusLabel(execution.status)}</Badge>
                      </div>
                      <div className="mt-2 grid gap-2 text-xs text-slate-400 sm:grid-cols-3">
                        <span>Plan: {execution.plannedQuantity}</span>
                        <span>Good: {execution.goodQuantity}</span>
                        <span>Reject: {execution.rejectedQuantity}</span>
                      </div>
                      <div className="mt-2 text-xs text-slate-500">Process {execution.processId || 'not set'} / Part {execution.partId || 'not linked'}</div>
                    </div>
                    <div className="flex flex-wrap gap-2">
                      {executionStatusOptions.filter((status) => status !== execution.status).slice(0, 4).map((status) => (
                        <button key={status} className="rounded border border-slate-600 px-2 py-1 text-xs capitalize text-slate-200 hover:border-emerald-500" onClick={() => changeExecutionStatus(execution, status)}>
                          {statusLabel(status)}
                        </button>
                      ))}
                    </div>
                  </div>
                </div>
              )) : (
                <div className="rounded border border-slate-700 bg-slate-900/50 p-6 text-sm text-slate-400">
                  No execution runs linked yet.
                </div>
              )}
            </div>
          </div>
        ) : (
          <div className="p-6 text-sm text-slate-400">Open a work order and click Executions.</div>
        )}
      </section>
    </div>
  );
}
