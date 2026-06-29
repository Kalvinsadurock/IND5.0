import React, { useEffect, useState } from "react";
import * as Icons from "@/shared/ui/icons";
import { readJsonResponse, responseError } from "@/lib/http";

type Role = {
  id: string;
  name: string;
  code: string;
  description?: string;
};

type Permission = {
  id: string;
  module: string;
  resource: string;
  action: string;
  code: string;
  description?: string;
};

type MatrixLink = {
  id: string;
  tenantId: string;
  roleId: string;
  permissionId: string;
};

export default function RolePermissionMatrix() {
  const [roles, setRoles] = useState<Role[]>([]);
  const [permissions, setPermissions] = useState<Permission[]>([]);
  const [links, setLinks] = useState<MatrixLink[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [updatingCell, setUpdatingCell] = useState<string | null>(null);

  const tenantId = localStorage.getItem("tenantId") || "test-tenant-id";

  const fetchMatrix = async () => {
    try {
      const response = await fetch(`/api/platform/rbac/matrix?tenantId=${tenantId}`);
      if (!response.ok) throw new Error("Failed to load RBAC configuration");
      const data = await response.json();
      setRoles(data.roles || []);
      setPermissions(data.permissions || []);
      setLinks(data.matrix || []);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Error fetching RBAC matrix");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchMatrix();
  }, []);

  const handleToggle = async (roleId: string, permissionId: string, currentState: boolean) => {
    const cellKey = `${roleId}-${permissionId}`;
    setUpdatingCell(cellKey);
    setError(null);

    try {
      const response = await fetch(`/api/platform/rbac/matrix?tenantId=${tenantId}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          roleId,
          permissionId,
          state: !currentState
        })
      });

      const body = await readJsonResponse(response);
      if (!response.ok) throw new Error(responseError(response, body, "Failed to update cell"));

      // Refresh matrix
      await fetchMatrix();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Lockout validation blocked toggle");
    } finally {
      setUpdatingCell(null);
    }
  };

  const isGranted = (roleId: string, permissionId: string) => {
    return links.some((l) => l.roleId === roleId && l.permissionId === permissionId);
  };

  // Group permissions by module
  const modules = Array.from(new Set(permissions.map((p) => p.module)));

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-bold text-white">Role-Permission Governance</h2>
          <p className="text-sm text-slate-400">Map specific platform, MES, and OEE permissions directly to roles.</p>
        </div>
      </div>

      {error && (
        <div className="rounded-lg border border-red-800 bg-red-950/20 p-4 text-sm text-red-200 flex items-center gap-3">
          <Icons.ShieldAlert className="h-5 w-5 text-red-500 shrink-0" />
          <span>{error}</span>
        </div>
      )}

      {loading ? (
        <div className="text-slate-400 text-sm">Loading RBAC governance matrix...</div>
      ) : (
        <div className="overflow-x-auto rounded-lg border border-slate-700 bg-slate-800/40">
          <table className="w-full border-collapse text-left text-sm text-slate-300">
            <thead>
              <tr className="border-b border-slate-700 bg-slate-900/60">
                <th className="px-6 py-4 font-semibold text-slate-100 min-w-[280px]">Module & Permission Code</th>
                {roles.map((role) => (
                  <th key={role.id} className="px-6 py-4 font-semibold text-slate-100 text-center min-w-[140px]">
                    <div>{role.name}</div>
                    <div className="text-[10px] font-normal text-slate-400 mt-0.5">{role.code}</div>
                  </th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-700">
              {modules.map((mod) => (
                <React.Fragment key={mod}>
                  <tr className="bg-slate-900/30">
                    <td colSpan={roles.length + 1} className="px-6 py-2 text-xs font-bold uppercase tracking-wider text-emerald-400 bg-slate-900/40">
                      {mod} Permissions
                    </td>
                  </tr>
                  {permissions
                    .filter((p) => p.module === mod)
                    .map((perm) => (
                      <tr key={perm.id} className="hover:bg-slate-800/30 transition-colors">
                        <td className="px-6 py-4">
                          <div className="font-medium text-slate-200">{perm.code}</div>
                          <div className="text-xs text-slate-400 mt-0.5">{perm.description || `${perm.action} ${perm.resource}`}</div>
                        </td>
                        {roles.map((role) => {
                          const active = isGranted(role.id, perm.id);
                          const cellKey = `${role.id}-${perm.id}`;
                          const loadingCell = updatingCell === cellKey;

                          return (
                            <td key={role.id} className="px-6 py-4 text-center">
                              <button
                                disabled={loadingCell}
                                onClick={() => handleToggle(role.id, perm.id, active)}
                                className={`inline-flex items-center justify-center p-1 rounded-md transition-all ${
                                  active
                                    ? "bg-emerald-950/40 text-emerald-400 border border-emerald-700/40"
                                    : "bg-slate-900 text-slate-500 border border-slate-700"
                                } hover:scale-105 disabled:opacity-50`}
                              >
                                {loadingCell ? (
                                  <Icons.Loader2 className="h-4 w-4 animate-spin text-slate-400" />
                                ) : active ? (
                                  <Icons.ShieldCheck className="h-4 w-4" />
                                ) : (
                                  <Icons.X className="h-4 w-4" />
                                )}
                              </button>
                            </td>
                          );
                        })}
                      </tr>
                    ))}
                </React.Fragment>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
