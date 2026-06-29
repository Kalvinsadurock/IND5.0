import { useState, useEffect } from 'react';
import * as Icons from '@/shared/ui/icons';
import { StartProcessDialog } from './StartProcessDialog';
import { useAuth } from '../../lib/AuthContext';
import { fetchSafe } from '../../lib/fetchSafe';

interface ProcessReadinessProps {
    processId: number;
    onReadinessChange?: (canStart: boolean) => void;
}

interface Material {
    type: string;
    label: string;
    required: number;
    available: number;
    unit: string;
}

interface ExecutionVerdict {
    canStart: boolean;
    blockers: string[];
    readyMessage: string | null;
}

interface ReadinessData {
    processId: number;
    processName: string;
    processCategory: string;
    materials: Material[];
    executionVerdict: ExecutionVerdict;
}

export function ProcessReadiness({ processId, onReadinessChange }: ProcessReadinessProps) {
    const { user } = useAuth();
    const [readiness, setReadiness] = useState<ReadinessData | null>(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    useEffect(() => {
        async function fetchReadiness() {
            try {
                setLoading(true);
                setError(null);
                const data = await fetchSafe(`/api/processes/${processId}/readiness`, null);

                if (!data) {
                    throw new Error('Failed to fetch process readiness');
                }

                setReadiness(data);
                // Notify parent about readiness status
                if (onReadinessChange) {
                    onReadinessChange(data.executionVerdict.canStart);
                }
            } catch (err) {
                console.error('Readiness fetch error:', err);
                setError(err instanceof Error ? err.message : 'Unknown error');
                if (onReadinessChange) onReadinessChange(false);
            } finally {
                setLoading(false);
            }
        }

        fetchReadiness();
    }, [processId]);

    if (loading) {
        return (
            <div className="bg-slate-800 border border-slate-700 rounded-xl p-6">
                <div className="flex items-center justify-center py-8">
                    <Icons.Loader2 className="w-6 h-6 text-slate-400 animate-spin" />
                    <span className="ml-2 text-slate-400">Loading readiness...</span>
                </div>
            </div>
        );
    }

    if (error || !readiness) {
        return (
            <div className="bg-slate-800 border border-slate-700 rounded-xl p-6">
                <div className="flex items-center gap-2 text-red-400">
                    <Icons.AlertCircle className="w-5 h-5" />
                    <span>Failed to load process readiness</span>
                </div>
            </div>
        );
    }

    return (
        <div className="bg-slate-800 border border-slate-700 rounded-xl p-6 space-y-6">
            {/* Header */}
            <div className="flex items-center justify-between">
                <h3 className="text-white font-semibold flex items-center gap-2">
                    <Icons.Package className="w-5 h-5" />
                    Process Readiness
                </h3>
            </div>

            {/* Execution Verdict Banner */}
            {readiness.executionVerdict.canStart ? (
                <div className="bg-emerald-950/50 border border-emerald-600 rounded-lg p-4">
                    <div className="flex items-center gap-2">
                        <Icons.CheckCircle className="w-5 h-5 text-emerald-400" />
                        <span className="text-emerald-300 font-semibold">
                            {readiness.executionVerdict.readyMessage}
                        </span>
                    </div>
                </div>
            ) : (
                <div className="bg-red-950/50 border border-red-600 rounded-lg p-4 space-y-2">
                    <div className="flex items-center gap-2">
                        <Icons.AlertTriangle className="w-5 h-5 text-red-400" />
                        <span className="text-red-300 font-semibold">Cannot Start Process</span>
                    </div>
                    <ul className="ml-7 space-y-1">
                        {readiness.executionVerdict.blockers.map((blocker, idx) => (
                            <li key={idx} className="text-red-300 text-sm">
                                • {blocker}
                            </li>
                        ))}
                    </ul>
                </div>
            )}

            {/* Material Readiness Table */}
            <div className="space-y-3">
                <h4 className="text-slate-300 font-medium text-sm">Material Availability</h4>
                <div className="bg-slate-900/50 border border-slate-700 rounded-lg overflow-hidden">
                    <table className="w-full text-sm">
                        <thead className="bg-slate-800/50">
                            <tr className="border-b border-slate-700">
                                <th className="text-left px-3 py-2 text-slate-400 font-medium">Material</th>
                                <th className="text-center px-3 py-2 text-slate-400 font-medium">Required</th>
                                <th className="text-center px-3 py-2 text-slate-400 font-medium">Available</th>
                                <th className="text-center px-3 py-2 text-slate-400 font-medium">Status</th>
                            </tr>
                        </thead>
                        <tbody>
                            {readiness.materials.map((material, idx) => {
                                const isSufficient = material.available >= material.required;
                                return (
                                    <tr key={idx} className="border-b border-slate-700/50 last:border-0">
                                        <td className="px-3 py-3 text-slate-200">{material.label}</td>
                                        <td className="px-3 py-3 text-center text-slate-300">
                                            {material.required} {material.unit}{material.required > 1 ? 's' : ''}
                                        </td>
                                        <td className="px-3 py-3 text-center">
                                            <span className={isSufficient ? 'text-emerald-400' : 'text-red-400'}>
                                                {material.available} {material.unit}{material.available > 1 ? 's' : ''}
                                            </span>
                                        </td>
                                        <td className="px-3 py-3 text-center">
                                            {isSufficient ? (
                                                <Icons.CheckCircle className="w-5 h-5 text-emerald-400 mx-auto" />
                                            ) : (
                                                <Icons.X className="w-5 h-5 text-red-400 mx-auto" />
                                            )}
                                        </td>
                                    </tr>
                                );
                            })}
                        </tbody>
                    </table>
                </div>
            </div>
        </div>
    );
}

