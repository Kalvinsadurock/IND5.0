import React, { useEffect, useState } from 'react';
import * as Icons from '@/shared/ui/icons';

type ChecklistItem = {
  item: string;
  completed: boolean;
  link: string;
};

export default function PilotReadinessChecklist() {
  const [items, setItems] = useState<ChecklistItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function fetchReadiness() {
      try {
        const tenantId = localStorage.getItem("tenantId") || "test-tenant-id";
        const response = await fetch(`/api/platform/tenant/readiness?tenantId=${tenantId}`);
        if (!response.ok) throw new Error("Failed to load readiness status");
        const data = await response.json();
        setItems(data);
      } catch (err) {
        setError(err instanceof Error ? err.message : "Error fetching checklist");
      } finally {
        setLoading(false);
      }
    }
    fetchReadiness();
  }, []);

  const allReady = items.length > 0 && items.every((i) => i.completed);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-white">Pilot Readiness Checklist</h1>
        <p className="text-sm text-slate-400">Verify tenant-level setup milestones before operational customer walkthroughs.</p>
      </div>

      {loading && (
        <div className="text-slate-300 text-sm">Loading readiness checklist...</div>
      )}

      {error && (
        <div className="text-red-400 text-sm">{error}</div>
      )}

      {!loading && !error && (
        <>
          {allReady ? (
            <div className="bg-emerald-950/40 border border-emerald-700/60 p-4 rounded-lg flex items-center gap-3 text-emerald-200">
              <Icons.CheckCircle className="h-6 w-6 text-emerald-400 shrink-0" />
              <div>
                <h3 className="font-semibold text-white">✅ Tenant Pilot Ready</h3>
                <p className="text-xs text-slate-300">All key configuration milestones are complete. The pilot factory environment is ready for operational runs.</p>
              </div>
            </div>
          ) : (
            <div className="bg-amber-950/20 border border-amber-800/40 p-4 rounded-lg flex items-center gap-3 text-amber-200">
              <Icons.ShieldAlert className="h-6 w-6 text-amber-500 shrink-0" />
              <div>
                <h3 className="font-semibold text-white">Setup Tasks Pending</h3>
                <p className="text-xs text-slate-300">Some milestones are not complete. Please complete configuration tasks listed below before operational delivery.</p>
              </div>
            </div>
          )}

          <div className="bg-slate-800/70 border border-slate-700 rounded-lg p-6 space-y-4">
            <h3 className="text-sm font-semibold text-white uppercase tracking-wider">Configuration Checklist Status</h3>
            <div className="divide-y divide-slate-700">
              {items.map((step, idx) => (
                <div key={idx} className="flex items-center justify-between py-4">
                  <div>
                    <h4 className="text-sm font-medium text-slate-200">{step.item}</h4>
                  </div>
                  <div className="flex items-center gap-4">
                    {step.completed ? (
                      <div className="flex items-center gap-2">
                        <span className="text-xs text-emerald-400 font-semibold uppercase">Ready</span>
                        <Icons.CheckCircle className="h-5 w-5 text-emerald-400" />
                      </div>
                    ) : (
                      <div className="flex items-center gap-2">
                        <span className="text-xs text-rose-400 font-semibold uppercase">Pending</span>
                        <Icons.X className="h-5 w-5 text-rose-400" />
                      </div>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>
        </>
      )}
    </div>
  );
}