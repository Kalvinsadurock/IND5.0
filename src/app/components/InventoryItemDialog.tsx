import { X, Box, Layers, Droplets, AlertCircle, CheckCircle, Clock } from 'lucide-react';
import { cn } from "@/shared/utils";

interface InventoryItemDialogProps {
    title: string;
    type: 'raw-material' | 'glass-kits' | 'resin';
    data: {
        available: number;
        inUse?: number;
        consumed?: number;
        status: string;
    };
    onClose: () => void;
}

export function InventoryItemDialog({
    title,
    type,
    data,
    onClose,
}: InventoryItemDialogProps) {

    const getIcon = () => {
        switch (type) {
            case 'raw-material': return <Box className="w-6 h-6 text-blue-400" />;
            case 'glass-kits': return <Layers className="w-6 h-6 text-purple-400" />;
            case 'resin': return <Droplets className="w-6 h-6 text-amber-400" />;
        }
    };

    const getStatusColor = (status: string) => {
        if (['Sufficient', 'Good', 'OK'].includes(status)) return 'text-emerald-400 bg-emerald-400/10 border-emerald-400/20';
        if (['Monitor'].includes(status)) return 'text-yellow-400 bg-yellow-400/10 border-yellow-400/20';
        if (['Not Required'].includes(status)) return 'text-slate-400 bg-slate-400/10 border-slate-400/20';
        return 'text-red-400 bg-red-400/10 border-red-400/20';
    };

    return (
        <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50 p-4">
            {/* Matches size of ProcessOverviewDialog: max-w-4xl */}
            <div className="bg-slate-800 rounded-xl w-full max-w-4xl max-h-[80vh] flex flex-col shadow-2xl border border-slate-700">

                {/* Header */}
                <div className="flex items-center justify-between p-6 border-b border-slate-700 bg-slate-800/50">
                    <div className="flex items-center gap-3">
                        <div className={cn("p-2 rounded-lg bg-slate-700/50",
                            type === 'raw-material' ? "text-blue-400" :
                                type === 'glass-kits' ? "text-purple-400" : "text-amber-400")}>
                            {getIcon()}
                        </div>
                        <div>
                            <h2 className="text-xl font-bold text-white tracking-tight">{title}</h2>
                            <p className="text-slate-400 text-sm">Detailed Inventory Status</p>
                        </div>
                    </div>
                    <button
                        onClick={onClose}
                        className="p-2 hover:bg-slate-700 rounded-lg transition-colors text-slate-400 hover:text-white"
                    >
                        <X className="w-5 h-5" />
                    </button>
                </div>

                {/* Content Body */}
                <div className="flex-1 overflow-y-auto p-6 bg-slate-900/30">

                    {/* Summary Metrics Row */}
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-8">
                        <div className="bg-slate-800 p-5 rounded-lg border border-slate-700 flex flex-col gap-2">
                            <span className="text-slate-400 text-sm font-medium uppercase tracking-wider">Available Stock</span>
                            <div className="flex items-baseline gap-2">
                                <span className="text-3xl font-bold text-white">{data.available}</span>
                                <span className="text-slate-500 text-sm">{type === 'resin' ? 'Litres' : 'Kits'}</span>
                            </div>
                            <span className={cn("text-xs px-2 py-0.5 rounded border w-fit mt-1", getStatusColor(data.status))}>
                                {data.status}
                            </span>
                        </div>

                        {type !== 'resin' && (
                            <>
                                <div className="bg-slate-800 p-5 rounded-lg border border-slate-700 flex flex-col gap-2">
                                    <span className="text-slate-400 text-sm font-medium uppercase tracking-wider">Currently In Use</span>
                                    <div className="flex items-baseline gap-2">
                                        <span className="text-3xl font-bold text-blue-400">{data.inUse}</span>
                                        <span className="text-slate-500 text-sm">Kits</span>
                                    </div>
                                    <p className="text-xs text-slate-500 mt-1">Allocated to active processes</p>
                                </div>

                                <div className="bg-slate-800 p-5 rounded-lg border border-slate-700 flex flex-col gap-2">
                                    <span className="text-slate-400 text-sm font-medium uppercase tracking-wider">Consumed (Session)</span>
                                    <div className="flex items-baseline gap-2">
                                        <span className="text-3xl font-bold text-slate-500">{data.consumed}</span>
                                        <span className="text-slate-500 text-sm">Kits</span>
                                    </div>
                                    <p className="text-xs text-slate-500 mt-1">Historically used (this filter)</p>
                                </div>
                            </>
                        )}
                        {type === 'resin' && (
                            <div className="col-span-2 bg-slate-800 p-5 rounded-lg border border-slate-700 flex flex-col justify-center">
                                <p className="text-slate-300">
                                    Resin is a shared resource pool extracted by weight.
                                    <br />
                                    <span className="text-slate-500 text-sm">Detailed lot tracking coming soon.</span>
                                </p>
                            </div>
                        )}
                    </div>

                    {/* List Section (Placeholder for Detail View) */}
                    <div className="space-y-4">
                        <h3 className="text-lg font-semibold text-white flex items-center gap-2">
                            <Layers className="w-5 h-5 text-emerald-400" />
                            Active Allocations
                        </h3>

                        {type !== 'resin' && data.inUse === 0 ? (
                            <div className="bg-slate-800/50 rounded-lg p-8 text-center border border-slate-700 border-dashed">
                                <p className="text-slate-400">No active kits currently allocated to running processes.</p>
                            </div>
                        ) : data.status === 'Not Required' ? (
                            <div className="bg-slate-800 rounded-lg border border-slate-700 p-8 text-center">
                                <p className="text-slate-400 text-lg">Resin is not required for this process.</p>
                            </div>
                        ) : (
                            <div className="bg-slate-800 rounded-lg border border-slate-700 overflow-hidden">
                                <table className="w-full text-left text-sm">
                                    <thead className="bg-slate-900/50 text-slate-400 font-medium border-b border-slate-700">
                                        <tr>
                                            <th className="p-4">Kit ID</th>
                                            <th className="p-4">Process</th>
                                            <th className="p-4">Allocated At</th>
                                            <th className="p-4">Status</th>
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y divide-slate-700">
                                        {/* Mock Data for now as backend doesn't return list yet */}
                                        {(data.inUse || 0) > 0 && (
                                            <tr>
                                                <td className="p-4 text-white font-mono">KIT-{Math.floor(Math.random() * 1000)}</td>
                                                <td className="p-4 text-slate-300">Spar Boom - SF (Process 40)</td>
                                                <td className="p-4 text-slate-400">today at 10:00 AM</td>
                                                <td className="p-4"><span className="text-xs bg-blue-500/10 text-blue-400 px-2 py-1 rounded">In Use</span></td>
                                            </tr>
                                        )}
                                    </tbody>
                                </table>
                                {(!data.inUse || data.inUse === 0) && type !== 'resin' && (
                                    <div className="p-4 text-center text-slate-500">No data available</div>
                                )}
                            </div>
                        )}
                    </div>

                </div>
            </div>
        </div>
    );
}
