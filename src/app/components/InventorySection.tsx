import { useState, useEffect } from 'react';
import { Card, CardContent } from "@/shared/ui/card";
import { Box, Layers, Droplets, AlertCircle } from "lucide-react";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/shared/ui/select";
import { cn } from "@/shared/utils";
import { InventoryItemDialog } from './InventoryItemDialog';

interface InventorySectionProps {
    onNavigateToProcess: (processId: number) => void;
}

interface DashboardSummary {
    rawMaterial: { available: number; inUse: number; consumed: number; status: string };
    glassKits: { available: number; inUse: number; consumed: number; status: string };
    resin: { available: number; status: string };
    requiredCards: string[];
}

const AREA_CATEGORY_MAP: Record<string, string> = {
    'Prefab': 'prefabricated',
    'Moulding': 'moulding',
    'Finishing': 'finishing'
};

interface Process {
    id: number;
    processNumber: number;
    name: string;
    category: string;
}

type DialogType = 'raw-material' | 'glass-kits' | 'resin' | null;

export function InventorySection({ onNavigateToProcess }: InventorySectionProps) {
    const [selectedArea, setSelectedArea] = useState<string>('Prefab');
    const [selectedProcessId, setSelectedProcessId] = useState<string>(''); // specific process or ""
    const [summary, setSummary] = useState<DashboardSummary | null>(null);
    const [loading, setLoading] = useState(false);
    const [processes, setProcesses] = useState<Process[]>([]);

    // Dialog State
    const [activeDialog, setActiveDialog] = useState<DialogType>(null);


    // Fetch processes on mount
    useEffect(() => {
        async function fetchProcesses() {
            try {
                const res = await fetch('/api/processes');
                const data = await res.json();
                if (Array.isArray(data)) {
                    setProcesses(data);
                }
            } catch (err) {
                console.error("Failed to fetch processes:", err);
            }
        }
        fetchProcesses();
    }, []);

    // Effect to fetch summary
    useEffect(() => {
        async function fetchSummary() {
            try {
                setLoading(true);
                const params = new URLSearchParams();
                if (selectedProcessId && selectedProcessId !== 'all') params.append('processId', selectedProcessId);

                const res = await fetch(`/api/inventory/dashboard-summary?${params.toString()}`);
                const data = await res.json();
                setSummary(data);
            } catch (error) {
                console.error("Failed to fetch inventory summary", error);
            } finally {
                setLoading(false);
            }
        }
        fetchSummary();
    }, [selectedProcessId, selectedArea]);

    // Reset process when area changes
    const handleAreaChange = (area: string) => {
        setSelectedArea(area);
        setSelectedProcessId(''); // Reset specific process
    };

    const areaOptions = ['Prefab', 'Moulding', 'Finishing'];

    // Filter processes by selected area category
    const targetCategory = AREA_CATEGORY_MAP[selectedArea];
    const filteredProcesses = processes
        .filter(p => p.category === targetCategory)
        .filter(p => p.processNumber !== 10 && !(p.processNumber >= 230 && p.processNumber <= 340))
        .sort((a, b) => a.processNumber - b.processNumber);


    return (
        <div className="space-y-6 mb-8">
            {/* Top Controls */}
            <div className="flex flex-col md:flex-row gap-4 justify-between items-start md:items-center bg-slate-800/50 p-4 rounded-lg border border-slate-700/50">
                <div className="flex items-center gap-2">
                    <Layers className="h-5 w-5 text-emerald-400" />
                    <h2 className="text-lg font-semibold text-white">Inventory Overview</h2>
                </div>

                <div className="flex flex-wrap gap-4 items-center">
                    {/* Area Filter Tabs */}
                    <div className="flex bg-slate-900 rounded-lg p-1 border border-slate-700">
                        {areaOptions.map(area => (
                            <button
                                key={area}
                                onClick={() => handleAreaChange(area)}
                                className={cn(
                                    "px-4 py-1.5 text-sm font-medium rounded-md transition-all",
                                    selectedArea === area
                                        ? "bg-emerald-600 text-white shadow-md"
                                        : "text-slate-400 hover:text-white hover:bg-slate-800"
                                )}
                            >
                                {area}
                            </button>
                        ))}
                    </div>

                    {/* Process Selector - Styles Updated for Contrast */}
                    <div className="w-[300px]">
                        <Select value={selectedProcessId} onValueChange={setSelectedProcessId}>
                            <SelectTrigger className="bg-slate-900 border-slate-700 text-slate-200">
                                <SelectValue placeholder={`Select ${selectedArea} Process...`} />
                            </SelectTrigger>
                            <SelectContent className="bg-slate-900 border-slate-700 max-h-[300px]">
                                <SelectItem value="all" className="text-slate-200 focus:bg-slate-800 focus:text-white cursor-pointer">
                                    All {selectedArea} Processes
                                </SelectItem>
                                {filteredProcesses.map(p => (
                                    <SelectItem
                                        key={p.id}
                                        value={p.id.toString()}
                                        className="text-slate-200 focus:bg-slate-800 focus:text-white cursor-pointer"
                                    >
                                        {p.processNumber} - {p.name}
                                    </SelectItem>
                                ))}
                            </SelectContent>
                        </Select>
                    </div>
                </div>
            </div>

            {/* Core Inventory Cards */}
            {loading ? (
                <div className="h-40 flex items-center justify-center">
                    <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-emerald-500" />
                </div>
            ) : summary ? (
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">

                    {/* Card 1 - Raw Material (A) */}
                    {(summary.requiredCards.includes('A')) && (
                        <div onClick={() => setActiveDialog('raw-material')} className="cursor-pointer transition-transform hover:scale-[1.02]">
                            <Card className="bg-slate-800 border-slate-700 shadow-lg relative overflow-hidden group h-full">
                                <div className="absolute top-0 left-0 w-1 h-full bg-blue-500" />
                                <CardContent className="p-6">
                                    <div className="flex justify-between items-start mb-4">
                                        <div>
                                            <h3 className="text-blue-400 font-bold flex items-center gap-2">
                                                <Box className="h-5 w-5" />
                                                RAW MATERIAL (A)
                                            </h3>
                                            <p className="text-xs text-slate-500 mt-1">Ready-to-allocate stock</p>
                                        </div>
                                        <span className={cn(
                                            "px-2 py-1 rounded text-xs font-bold border",
                                            summary.rawMaterial.status === 'Sufficient' ? "bg-green-500/10 text-green-400 border-green-500/20" : "bg-red-500/10 text-red-400 border-red-500/20"
                                        )}>
                                            {summary.rawMaterial.status === 'Sufficient' ? '🟢 Sufficient' : '🔴 Low'}
                                        </span>
                                    </div>

                                    <div className="space-y-3">
                                        <div className="flex justify-between items-center text-sm">
                                            <span className="text-slate-400">Available</span>
                                            <span className="text-white font-mono text-lg">{summary.rawMaterial.available} Kits</span>
                                        </div>
                                        <div className="bg-slate-700/50 h-px" />
                                        <div className="flex justify-between items-center text-sm">
                                            <span className="text-slate-400">In Use</span>
                                            <span className="text-blue-300 font-mono">{summary.rawMaterial.inUse} Kits</span>
                                        </div>
                                        <div className="flex justify-between items-center text-sm">
                                            <span className="text-slate-400">Consumed</span>
                                            <span className="text-slate-500 font-mono">{summary.rawMaterial.consumed} Kits</span>
                                        </div>
                                    </div>
                                </CardContent>
                            </Card>
                        </div>
                    )}

                    {/* Card 2 - Glass Cutting Kits (B) */}
                    {(summary.requiredCards.includes('B')) && (
                        <div onClick={() => setActiveDialog('glass-kits')} className="cursor-pointer transition-transform hover:scale-[1.02]">
                            <Card className="bg-slate-800 border-slate-700 shadow-lg relative overflow-hidden h-full">
                                <div className="absolute top-0 left-0 w-1 h-full bg-purple-500" />
                                <CardContent className="p-6">
                                    <div className="flex justify-between items-start mb-4">
                                        <div>
                                            <h3 className="text-purple-400 font-bold flex items-center gap-2">
                                                <Layers className="h-5 w-5" />
                                                GLASS CUTTING KITS (B)
                                            </h3>
                                            <p className="text-xs text-slate-500 mt-1">Specific for moulding/cutting</p>
                                        </div>
                                        <span className={cn(
                                            "px-2 py-1 rounded text-xs font-bold border",
                                            summary.glassKits.status === 'Monitor' ? "bg-yellow-500/10 text-yellow-400 border-yellow-500/20" :
                                                summary.glassKits.status === 'Low' ? "bg-red-500/10 text-red-400 border-red-500/20" : "bg-green-500/10 text-green-400"
                                        )}>
                                            {summary.glassKits.status === 'Monitor' ? '🟡 Monitor' : summary.glassKits.status === 'Low' ? '🔴 Low' : '🟢 Good'}
                                        </span>
                                    </div>
                                    <div className="space-y-3">
                                        <div className="flex justify-between items-center text-sm">
                                            <span className="text-slate-400">Available</span>
                                            <span className="text-white font-mono text-lg">{summary.glassKits.available} Kits</span>
                                        </div>
                                        <div className="bg-slate-700/50 h-px" />
                                        <div className="flex justify-between items-center text-sm">
                                            <span className="text-slate-400">In Use</span>
                                            <span className="text-purple-300 font-mono">{summary.glassKits.inUse} Kits</span>
                                        </div>
                                        <div className="flex justify-between items-center text-sm">
                                            <span className="text-slate-400">Consumed</span>
                                            <span className="text-slate-500 font-mono">{summary.glassKits.consumed} Kits</span>
                                        </div>
                                    </div>
                                </CardContent>
                            </Card>
                        </div>
                    )}

                    {/* Card 3 - Resin (C) */}
                    {(summary.requiredCards.includes('C')) && (
                        <div onClick={() => setActiveDialog('resin')} className="cursor-pointer transition-transform hover:scale-[1.02]">
                            <Card className="bg-slate-800 border-slate-700 shadow-lg relative overflow-hidden h-full">
                                <div className="absolute top-0 left-0 w-1 h-full bg-amber-500" />
                                <CardContent className="p-6">
                                    <div className="flex justify-between items-start mb-4">
                                        <div>
                                            <h3 className="text-amber-400 font-bold flex items-center gap-2">
                                                <Droplets className="h-5 w-5" />
                                                RESIN – COMMON POOL (C)
                                            </h3>
                                            <p className="text-xs text-slate-500 mt-1">Shared Across All Processes</p>
                                        </div>
                                        <span className={cn(
                                            "px-2 py-1 rounded text-xs font-bold border",
                                            summary.resin.status === 'OK' ? "bg-green-500/10 text-green-400 border-green-500/20" : "bg-red-500/10 text-red-400 border-red-500/20"
                                        )}>
                                            {summary.resin.status === 'OK' ? '🟢 OK' : '🔴 Low'}
                                        </span>
                                    </div>

                                    <div className="space-y-4">
                                        <div className="flex justify-between items-center text-sm">
                                            <span className="text-slate-400">Available Stock</span>
                                            <span className="text-white font-mono text-xl">{summary.resin.available} Litres</span>
                                        </div>

                                        <div className="p-3 bg-slate-900/50 rounded border border-slate-700/50 flex items-start gap-2">
                                            <AlertCircle className="h-4 w-4 text-slate-500 mt-0.5" />
                                            <p className="text-xs text-slate-400">
                                                Resin is not process-scoped. This pool is consumed by all active processes.
                                            </p>
                                        </div>
                                    </div>
                                </CardContent>
                            </Card>
                        </div>
                    )}
                </div>
            ) : null}

            {/* Detail Dialogs */}
            {activeDialog && summary && (
                <InventoryItemDialog
                    title={
                        activeDialog === 'raw-material' ? 'Raw Material (A)' :
                            activeDialog === 'glass-kits' ? 'Glass Cutting Kits (B)' : 'Resin Pool (C)'
                    }
                    type={activeDialog}
                    data={
                        activeDialog === 'raw-material' ? summary.rawMaterial :
                            activeDialog === 'glass-kits' ? summary.glassKits : { ...summary.resin, inUse: 0, consumed: 0 }
                    }
                    onClose={() => setActiveDialog(null)}
                />
            )}
        </div>
    );
}
