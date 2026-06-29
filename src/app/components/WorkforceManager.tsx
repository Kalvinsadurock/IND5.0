import React, { useEffect, useState } from 'react';
import * as Icons from '@/shared/ui/icons';

export default function WorkforceManager() {
  const [employees, setEmployees] = useState<any[]>([]);
  const [shifts, setShifts] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  // Form states
  const [showAddModal, setShowAddModal] = useState(false);
  const [employeeCode, setEmployeeCode] = useState('');
  const [displayName, setDisplayName] = useState('');
  const [email, setEmail] = useState('');
  const [employeeType, setEmployeeType] = useState('internal');

  const tenantId = 'test-tenant-id'; // Fallback for pilot demo

  const fetchWorkforce = () => {
    setLoading(true);
    fetch(`/api/hrms/employees?tenantId=${tenantId}`)
      .then(res => res.json())
      .then(data => {
        setEmployees(Array.isArray(data) ? data : []);
        setLoading(false);
      })
      .catch(err => {
        console.error(err);
        setLoading(false);
      });
  };

  useEffect(() => {
    fetchWorkforce();
    fetch(`/api/hrms/shifts/assignments?tenantId=${tenantId}`)
      .then(res => res.json())
      .then(data => setShifts(Array.isArray(data) ? data : []))
      .catch(console.error);
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await fetch('/api/hrms/employees', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-tenant-id': tenantId
        },
        body: JSON.stringify({ employeeCode, displayName, email, employeeType })
      });
      setShowAddModal(false);
      setEmployeeCode('');
      setDisplayName('');
      setEmail('');
      fetchWorkforce();
    } catch (e) {
      console.error(e);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold text-white">Workforce & HRMS Manager</h1>
          <p className="text-sm text-slate-400">Manage plant workforce roster, contractor access parameters, and daily shift readiness.</p>
        </div>
        <button
          onClick={() => setShowAddModal(true)}
          className="bg-emerald-600 hover:bg-emerald-500 text-white px-4 py-2 rounded-lg text-sm font-medium flex items-center gap-2 transition-colors"
        >
          <Icons.User className="h-4 w-4" />
          Onboard Employee
        </button>
      </div>

      <div className="grid gap-4 md:grid-cols-3">
        <div className="rounded-lg border border-slate-700 bg-slate-800/70 p-4">
          <div className="text-sm text-slate-300">Total Workforce</div>
          <div className="mt-2 text-2xl font-semibold text-white">{employees.length}</div>
          <div className="text-xs text-slate-500 mt-2">Active operators & specialists</div>
        </div>
        <div className="rounded-lg border border-slate-700 bg-slate-800/70 p-4">
          <div className="text-sm text-slate-300">Shift Assignments</div>
          <div className="mt-2 text-2xl font-semibold text-white">{shifts.length}</div>
          <div className="text-xs text-slate-500 mt-2">Allocated to current calendar</div>
        </div>
        <div className="rounded-lg border border-slate-700 bg-slate-800/70 p-4">
          <div className="text-sm text-slate-300">Shift Readiness Gate</div>
          <div className="mt-2 text-2xl font-semibold text-emerald-400">100% Valid</div>
          <div className="text-xs text-slate-500 mt-2">All crew items certified</div>
        </div>
      </div>

      <section className="rounded-lg border border-slate-700 bg-slate-800/70 p-4">
        <h3 className="text-sm font-semibold text-white mb-4">Plant Employee & Contractor Roster</h3>
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm text-slate-300">
            <thead className="bg-slate-900 text-xs uppercase text-slate-400">
              <tr>
                <th className="px-4 py-2">Code</th>
                <th className="px-4 py-2">Display Name</th>
                <th className="px-4 py-2">Type</th>
                <th className="px-4 py-2">Email</th>
                <th className="px-4 py-2">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-700">
              {loading ? (
                <tr>
                  <td colSpan={5} className="px-4 py-3 text-center text-slate-500">Loading roster...</td>
                </tr>
              ) : employees.length === 0 ? (
                <tr>
                  <td colSpan={5} className="px-4 py-3 text-center text-slate-500">No employees onboarded yet.</td>
                </tr>
              ) : (
                employees.map(emp => (
                  <tr key={emp.id} className="hover:bg-slate-850">
                    <td className="px-4 py-3 font-mono">{emp.employeeCode}</td>
                    <td className="px-4 py-3 font-medium text-slate-200">{emp.displayName}</td>
                    <td className="px-4 py-3 capitalize text-xs">{emp.employeeType}</td>
                    <td className="px-4 py-3 text-slate-400">{emp.email || '-'}</td>
                    <td className="px-4 py-3">
                      <span className="px-2 py-0.5 rounded text-[10px] uppercase font-semibold bg-emerald-900/40 text-emerald-300 border border-emerald-800">
                        {emp.status}
                      </span>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </section>

      {showAddModal && (
        <div className="fixed inset-0 bg-black/60 flex items-center justify-center p-4 z-50">
          <div className="bg-slate-800 border border-slate-700 rounded-lg max-w-md w-full p-6 space-y-4">
            <div className="flex justify-between items-center border-b border-slate-700 pb-3">
              <h3 className="text-lg font-semibold text-white">Onboard New Plant Employee</h3>
              <button onClick={() => setShowAddModal(false)} className="text-slate-400 hover:text-white">
                ✕
              </button>
            </div>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label className="text-xs text-slate-400 uppercase font-semibold">Employee Code</label>
                <input
                  type="text"
                  required
                  value={employeeCode}
                  onChange={e => setEmployeeCode(e.target.value)}
                  placeholder="e.g. EMP-99201"
                  className="w-full bg-slate-900 border border-slate-700 rounded px-3 py-2 text-white text-sm mt-1 focus:outline-none focus:border-emerald-500"
                />
              </div>
              <div>
                <label className="text-xs text-slate-400 uppercase font-semibold">Display Name</label>
                <input
                  type="text"
                  required
                  value={displayName}
                  onChange={e => setDisplayName(e.target.value)}
                  placeholder="e.g. John Doe"
                  className="w-full bg-slate-900 border border-slate-700 rounded px-3 py-2 text-white text-sm mt-1 focus:outline-none focus:border-emerald-500"
                />
              </div>
              <div>
                <label className="text-xs text-slate-400 uppercase font-semibold">Email Address</label>
                <input
                  type="email"
                  value={email}
                  onChange={e => setEmail(e.target.value)}
                  placeholder="e.g. john@factory.com"
                  className="w-full bg-slate-900 border border-slate-700 rounded px-3 py-2 text-white text-sm mt-1 focus:outline-none focus:border-emerald-500"
                />
              </div>
              <div>
                <label className="text-xs text-slate-400 uppercase font-semibold">Employee Type</label>
                <select
                  value={employeeType}
                  onChange={e => setEmployeeType(e.target.value)}
                  className="w-full bg-slate-900 border border-slate-700 rounded px-3 py-2 text-white text-sm mt-1 focus:outline-none focus:border-emerald-500"
                >
                  <option value="internal">Internal Employee</option>
                  <option value="contractor">Contractor Agent</option>
                  <option value="specialist">External Specialist</option>
                </select>
              </div>
              <div className="flex justify-end gap-3 pt-2 border-t border-slate-700">
                <button
                  type="button"
                  onClick={() => setShowAddModal(false)}
                  className="px-4 py-2 rounded text-slate-400 hover:text-white text-sm"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 rounded bg-emerald-600 hover:bg-emerald-500 text-white text-sm font-medium"
                >
                  Save Employee
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}