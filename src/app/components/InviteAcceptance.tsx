import React, { useEffect, useState } from "react";
import * as Icons from "@/shared/ui/icons";

type InviteInfo = {
  valid: boolean;
  email: string;
  tenantId: string;
  tenantName: string;
};

export default function InviteAcceptance() {
  const [token, setToken] = useState("");
  const [invite, setInvite] = useState<InviteInfo | null>(null);
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const t = params.get("token") || "";
    setToken(t);

    if (!t) {
      setError("No invite token provided in the URL.");
      setLoading(false);
      return;
    }

    fetch(`/api/auth/validate-invite?token=${encodeURIComponent(t)}`)
      .then(async (res) => {
        const data = await res.json();
        if (!res.ok || !data.valid) {
          setError(data.error || "Invite token is invalid or expired.");
        } else {
          setInvite(data);
        }
      })
      .catch(() => setError("Could not validate invite token."))
      .finally(() => setLoading(false));
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (password.length < 8) {
      setError("Password must be at least 8 characters.");
      return;
    }
    if (password !== confirmPassword) {
      setError("Passwords do not match.");
      return;
    }

    setSubmitting(true);
    try {
      const res = await fetch("/api/auth/accept-invite", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ token, password }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error || "Failed to accept invite.");
        return;
      }

      // Auto-login: store the token and user in localStorage
      if (data.access_token) {
        localStorage.setItem("access_token", data.access_token);
        localStorage.setItem("tenantId", invite?.tenantId || "");
      }
      if (data.user) {
        localStorage.setItem("auth_user", JSON.stringify(data.user));
      }

      setSuccess(true);

      // Redirect to dashboard after 2 seconds
      setTimeout(() => {
        window.location.href = "/";
      }, 2000);
    } catch {
      setError("Network error. Please try again.");
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-900 flex items-center justify-center">
        <div className="flex items-center gap-3 text-slate-300">
          <Icons.Loader2 className="h-5 w-5 animate-spin" />
          Validating invite token...
        </div>
      </div>
    );
  }

  if (success) {
    return (
      <div className="min-h-screen bg-slate-900 flex items-center justify-center">
        <div className="max-w-md w-full bg-slate-800 border border-emerald-700/40 rounded-xl p-8 shadow-2xl text-center space-y-4">
          <Icons.CheckCircle className="h-12 w-12 text-emerald-400 mx-auto" />
          <h2 className="text-xl font-bold text-white">Account Activated</h2>
          <p className="text-sm text-slate-300">
            Your admin account for <strong className="text-emerald-300">{invite?.tenantName}</strong> is now active.
            Redirecting to dashboard...
          </p>
        </div>
      </div>
    );
  }

  if (!invite) {
    return (
      <div className="min-h-screen bg-slate-900 flex items-center justify-center">
        <div className="max-w-md w-full bg-slate-800 border border-red-700/40 rounded-xl p-8 shadow-2xl text-center space-y-4">
          <Icons.ShieldAlert className="h-12 w-12 text-red-400 mx-auto" />
          <h2 className="text-xl font-bold text-white">Invalid Invite</h2>
          <p className="text-sm text-red-300">{error || "This invite link is invalid or has already been used."}</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-900 flex items-center justify-center px-4">
      <div className="max-w-md w-full bg-slate-800 border border-slate-700 rounded-xl p-8 shadow-2xl space-y-6">
        <div className="text-center space-y-2">
          <Icons.ShieldCheck className="h-10 w-10 text-emerald-400 mx-auto" />
          <h2 className="text-xl font-bold text-white">Accept Admin Invitation</h2>
          <p className="text-sm text-slate-400">
            You've been invited to join <strong className="text-emerald-300">{invite.tenantName}</strong> as a Tenant Admin.
          </p>
        </div>

        <div className="bg-slate-900/60 border border-slate-700 rounded-lg p-4 space-y-1">
          <div className="text-xs text-slate-400">Email</div>
          <div className="text-sm text-white font-medium">{invite.email}</div>
        </div>

        {error && (
          <div className="rounded-lg border border-red-800 bg-red-950/20 p-3 text-sm text-red-300 flex items-center gap-2">
            <Icons.AlertCircle className="h-4 w-4 text-red-400 shrink-0" />
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-xs font-medium text-slate-400 mb-1">Set Password</label>
            <div className="relative">
              <Icons.Lock className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-500" />
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="Minimum 8 characters"
                className="w-full pl-10 pr-4 py-2.5 bg-slate-900 border border-slate-700 rounded-lg text-white text-sm focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500 outline-none"
                required
                minLength={8}
              />
            </div>
          </div>
          <div>
            <label className="block text-xs font-medium text-slate-400 mb-1">Confirm Password</label>
            <div className="relative">
              <Icons.Lock className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-500" />
              <input
                type="password"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                placeholder="Re-enter password"
                className="w-full pl-10 pr-4 py-2.5 bg-slate-900 border border-slate-700 rounded-lg text-white text-sm focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500 outline-none"
                required
                minLength={8}
              />
            </div>
          </div>
          <button
            type="submit"
            disabled={submitting}
            className="w-full py-2.5 bg-emerald-600 hover:bg-emerald-700 disabled:opacity-50 text-white text-sm font-semibold rounded-lg transition-colors flex items-center justify-center gap-2"
          >
            {submitting ? (
              <>
                <Icons.Loader2 className="h-4 w-4 animate-spin" />
                Activating Account...
              </>
            ) : (
              <>
                <Icons.ShieldCheck className="h-4 w-4" />
                Activate Account & Sign In
              </>
            )}
          </button>
        </form>
      </div>
    </div>
  );
}
