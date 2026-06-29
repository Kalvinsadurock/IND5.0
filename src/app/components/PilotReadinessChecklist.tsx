import React from 'react';
import * as Icons from '@/shared/ui/icons';

export default function PilotReadinessChecklist() {
  const steps = [
    { title: 'Plant Hierarchy Configured', description: 'At least 1 Plant, Area, Line, and Work Center created.', status: 'complete' },
    { title: 'Access Governance Seeded', description: 'Roles and Permission Matrix adjustments successfully saved.', status: 'complete' },
    { title: 'Admin Account Active', description: 'Primary tenant admin account set up and active.', status: 'complete' },
    { title: 'Workflow Configuration MVP', description: 'Custom work order workflow transitions mapped.', status: 'complete' },
    { title: 'OEE Shift Logged', description: 'At least one shift run logged in OEE tracking.', status: 'complete' }
  ];

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-white">Pilot Readiness Checklist</h1>
        <p className="text-sm text-slate-400">Verify tenant-level setup milestones before operational customer walkthroughs.</p>
      </div>

      <div className="bg-slate-800/70 border border-slate-700 rounded-lg p-6 space-y-4">
        <h3 className="text-sm font-semibold text-white uppercase tracking-wider">Configuration Checklist Status</h3>
        <div className="divide-y divide-slate-700">
          {steps.map((step, idx) => (
            <div key={idx} className="flex items-center justify-between py-4">
              <div>
                <h4 className="text-sm font-medium text-slate-200">{step.title}</h4>
                <p className="text-xs text-slate-400 mt-0.5">{step.description}</p>
              </div>
              <div className="flex items-center gap-2">
                <span className="text-xs text-emerald-400 font-semibold uppercase">Ready</span>
                <Icons.CheckCircle className="h-5 w-5 text-emerald-400" />
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}