import React, { useEffect, useState } from 'react';
import * as Icons from '@/shared/ui/icons';

export default function SapIntegrationModule() {
  const [syncLogs, setSyncLogs] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    setSyncLogs([
      { id: 1, objectType: 'Material Master', extId: 'MAT-10029', status: 'synced', time: '2 mins ago', msg: 'Successfully posted goods receipt to SAP ECC' },
      { id: 2, objectType: 'BOM', extId: 'BOM-BLADE-82', status: 'synced', time: '10 mins ago', msg: 'Synchronized structure parameters' },
      { id: 3, objectType: 'Production Order', extId: 'PO-992019', status: 'pending', time: '15 mins ago', msg: 'Awaiting operator completion sign-off' },
      { id: 4, objectType: 'Inventory Value', extId: 'LOC-A1-SEC3', status: 'error', time: '1 hour ago', msg: 'SAP Posting failed: Cost center locked for posting' }
    ]);
    setLoading(false);
  }, []);

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold text-white">ERP / SAP Integration Hub</h1>
          <p className="text-sm text-slate-400">Monitor external synchronization logs, posting queues, and BOM mappings.</p>
        </div>
      </div>

      <div className="grid gap-4 md:grid-cols-3">
        <div className="rounded-lg border border-slate-700 bg-slate-800/70 p-4">
          <div className="text-sm text-slate-300">Total Sync Queue</div>
          <div className="mt-2 text-2xl font-semibold text-white">1,249</div>
          <div className="text-xs text-slate-500 mt-2">Active postings last 24h</div>
        </div>
        <div className="rounded-lg border border-slate-700 bg-slate-800/70 p-4">
          <div className="text-sm text-slate-300">Errors Requiring Review</div>
          <div className="mt-2 text-2xl font-semibold text-red-400">1</div>
          <div className="text-xs text-red-500 mt-2">1 transaction blocked</div>
        </div>
        <div className="rounded-lg border border-emerald-800 bg-emerald-950/20 p-4">
          <div className="text-sm text-emerald-300">Integration Gateway</div>
          <div className="mt-2 text-xl font-semibold text-emerald-400">Connected</div>
          <div className="text-xs text-slate-400 mt-2">RFC Status: OK</div>
        </div>
      </div>

      <section className="rounded-lg border border-slate-700 bg-slate-800/70 p-4">
        <h3 className="text-sm font-semibold text-white mb-4">SAP Synchronization & Posting Logs</h3>
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm text-slate-300">
            <thead className="bg-slate-900 text-xs uppercase text-slate-400">
              <tr>
                <th className="px-4 py-2">ID</th>
                <th className="px-4 py-2">Object Type</th>
                <th className="px-4 py-2">External SAP ID</th>
                <th className="px-4 py-2">Sync Time</th>
                <th className="px-4 py-2">Status</th>
                <th className="px-4 py-2">Message</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-700">
              {syncLogs.map(log => (
                <tr key={log.id} className="hover:bg-slate-850">
                  <td className="px-4 py-3">{log.id}</td>
                  <td className="px-4 py-3 font-medium text-slate-200">{log.objectType}</td>
                  <td className="px-4 py-3 font-mono">{log.extId}</td>
                  <td className="px-4 py-3 text-xs">{log.time}</td>
                  <td className="px-4 py-3">
                    <span className={`px-2 py-0.5 rounded text-[10px] uppercase font-semibold ${
                      log.status === 'synced' ? 'bg-emerald-900/40 text-emerald-300 border border-emerald-800' :
                      log.status === 'pending' ? 'bg-amber-900/40 text-amber-300 border border-amber-800' :
                      'bg-red-900/40 text-red-300 border border-red-800'
                    }`}>
                      {log.status}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-xs text-slate-400">{log.msg}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>
    </div>
  );
}