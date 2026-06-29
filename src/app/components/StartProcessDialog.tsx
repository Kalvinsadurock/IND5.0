
import { useState, useEffect } from 'react';
import * as Icons from '@/shared/ui/icons';
import { Button } from '@/shared/ui/button';
import {
    Dialog, DialogContent, DialogHeader, DialogTitle,
    DialogFooter,
    DialogDescription
} from '@/shared/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/shared/ui/select';
import { Label } from '@/shared/ui/label';
import { fetchSafe, fetchSafePost } from '../../lib/fetchSafe';

interface StartProcessDialogProps {
    isOpen: boolean;
    onClose: () => void;
    processId: number;
    processName: string;
    processCategory: string;
    employeeId: string;
    onSuccess: (part: any) => void;
}

interface Material {
    type: string;
    label: string;
    required: number;
    available: number;
    unit: string;
}

interface AvailableKit {
    id: number;
    kit_code: string;
    process_id: number;
    kit_type: string;
    status: string;
}

interface AvailableResin {
    id: number;
    resin_code: string;
    available_count: number;
}

export function StartProcessDialog({
    isOpen,
    onClose,
    processId,
    processName,
    processCategory,
    employeeId,
    onSuccess,
}: StartProcessDialogProps) {
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [readinessData, setReadinessData] = useState<any>(null);

    // Material selections
    const [selectedMaterialKit, setSelectedMaterialKit] = useState<number | null>(null);
    const [selectedGlassKit, setSelectedGlassKit] = useState<number | null>(null);
    const [selectedResinLot, setSelectedResinLot] = useState<number | null>(null);

    // Available materials
    const [availableKits, setAvailableKits] = useState<AvailableKit[]>([]);
    const [availableResin, setAvailableResin] = useState<AvailableResin[]>([]);

    // Fetch readiness and available materials
    useEffect(() => {
        if (!isOpen) return;

        async function fetchData() {
            try {
                setLoading(true);
                setError(null);

                // Get readiness data
                const readiness = await fetchSafe(`/api/processes/${processId}/readiness`, null);
                if (!readiness) throw new Error('Failed to fetch readiness');
                setReadinessData(readiness);

                // Get available materials from inventory
                const inventory = await fetchSafe(`/api/process/${processId}/inventory`, { kits: [], resin: [] });
                if (!inventory) throw new Error('Failed to fetch inventory');

                // Filter kits and resin based on process category and availability
                let availableKitsList: AvailableKit[] = [];
                let availableResinList: AvailableResin[] = [];

                if (inventory.kits && Array.isArray(inventory.kits)) {
                    availableKitsList = inventory.kits.filter((k: AvailableKit) =>
                        k.status === 'AVAILABLE' && k.process_id === processId
                    );
                }

                if (inventory.resin && Array.isArray(inventory.resin)) {
                    availableResinList = inventory.resin.filter((r: AvailableResin) =>
                        r.available_count > 0
                    );
                }

                setAvailableKits(availableKitsList);
                setAvailableResin(availableResinList);
            } catch (err) {
                console.error('Failed to fetch data:', err);
                setError(err instanceof Error ? err.message : 'Failed to load data');
            } finally {
                setLoading(false);
            }
        }

        fetchData();
    }, [isOpen, processId]);

    const handleStart = async () => {
        if (!readinessData?.executionVerdict.canStart) {
            setError('Process is not ready to start');
            return;
        }

        // Validate material selections - standardized for ALL categories
        const materialBindings: any = {};

        if (!selectedMaterialKit) {
            setError('Please select a material kit');
            return;
        }
        if (!selectedGlassKit) {
            setError('Please select a glass kit');
            return;
        }

        materialBindings.materialKitId = selectedMaterialKit;
        materialBindings.glassKitId = selectedGlassKit;

        // Resin is additional for Moulding if selected
        if (processCategory === 'moulding') {
            if (!selectedResinLot) {
                setError('Please select a resin lot');
                return;
            }
            materialBindings.resinLotId = selectedResinLot;
        }

        try {
            setLoading(true);
            setError(null);

            const result = await fetchSafePost(`/api/processes/${processId}/start`, {
                employeeId,
                materialBindings,
            });

            // Success!
            onSuccess(result.part);
            onClose();
        } catch (err) {
            console.error('Start process error:', err);
            setError(err instanceof Error ? err.message : 'Failed to start process');
        } finally {
            setLoading(false);
        }
    };

    if (loading && !readinessData) {
        return (
            <Dialog open={isOpen} onOpenChange={onClose}>
                <DialogContent className="sm:max-w-[500px] bg-slate-900 border-slate-700">
                    <div className="flex items-center justify-center py-8">
                        <Icons.Loader2 className="w-6 h-6 text-slate-400 animate-spin" />
                        <span className="ml-2 text-slate-400">Loading...</span>
                    </div>
                </DialogContent>
            </Dialog>
        );
    }

    const canStart = readinessData?.executionVerdict.canStart;

    return (
        <Dialog open={isOpen} onOpenChange={onClose}>
            <DialogContent className="sm:max-w-[600px] bg-slate-900 border-slate-700">
                <DialogHeader>
                    <DialogTitle className="text-white text-lg font-bold">
                        Start Process: {processName}
                    </DialogTitle>
                    <DialogDescription className="text-slate-400 text-sm">
                        Verify readiness and select materials to start the process.
                    </DialogDescription>
                </DialogHeader>

                <div className="space-y-6">
                    {/* Readiness Status */}
                    {readinessData && (
                        <div className={`p-4 rounded-lg border ${canStart
                            ? 'bg-emerald-950/50 border-emerald-600'
                            : 'bg-red-950/50 border-red-600'
                            }`}>
                            <div className="flex items-center gap-2">
                                {canStart ? (
                                    <>
                                        <Icons.CheckCircle className="w-5 h-5 text-emerald-400" />
                                        <span className="text-emerald-300 font-semibold">
                                            {readinessData.executionVerdict.readyMessage}
                                        </span>
                                    </>
                                ) : (
                                    <>
                                        <Icons.AlertTriangle className="w-5 h-5 text-red-400" />
                                        <div>
                                            <span className="text-red-300 font-semibold block">Cannot Start</span>
                                            <ul className="ml-5 mt-1 space-y-1">
                                                {readinessData.executionVerdict.blockers.map((blocker: string, idx: number) => (
                                                    <li key={idx} className="text-red-300 text-sm">• {blocker}</li>
                                                ))}
                                            </ul>
                                        </div>
                                    </>
                                )}
                            </div>
                        </div>
                    )}

                    {/* Material Selection */}
                    {canStart && (
                        <div className="space-y-4">
                            <h3 className="text-slate-300 font-medium">Select Materials</h3>

                            {/* Material Kit (All processes) */}
                            <div className="space-y-2">
                                <Label className="text-slate-300">Material Kit *</Label>
                                <Select
                                    value={selectedMaterialKit?.toString() || ''}
                                    onValueChange={(val) => setSelectedMaterialKit(parseInt(val))}
                                >
                                    <SelectTrigger className="bg-slate-800 border-slate-700 text-white">
                                        <SelectValue placeholder="Select a material kit" />
                                    </SelectTrigger>
                                    <SelectContent className="bg-slate-800 border-slate-700">
                                        {availableKits
                                            .filter(k => k.kit_type === 'KIT')
                                            .map(kit => (
                                                <SelectItem key={kit.id} value={kit.id.toString()} className="text-white hover:bg-slate-700">
                                                    {kit.kit_code}
                                                </SelectItem>
                                            ))}
                                    </SelectContent>
                                </Select>
                                <p className="text-xs text-slate-400">
                                    {availableKits.filter(k => k.kit_type === 'KIT').length} kit(s) available
                                </p>
                            </div>


                            {/* Glass Kit (All processes) */}
                            <div className="space-y-2">
                                <Label className="text-slate-300">Glass Kit *</Label>
                                <Select
                                    value={selectedGlassKit?.toString() || ''}
                                    onValueChange={(val) => setSelectedGlassKit(parseInt(val))}
                                >
                                    <SelectTrigger className="bg-slate-800 border-slate-700 text-white">
                                        <SelectValue placeholder="Select a glass kit" />
                                    </SelectTrigger>
                                    <SelectContent className="bg-slate-800 border-slate-700">
                                        {availableKits
                                            .filter(k => k.kit_type === 'GLASS')
                                            .map(kit => (
                                                <SelectItem key={kit.id} value={kit.id.toString()} className="text-white hover:bg-slate-700">
                                                    {kit.kit_code}
                                                </SelectItem>
                                            ))}
                                    </SelectContent>
                                </Select>
                                <p className="text-xs text-slate-400">
                                    {availableKits.filter(k => k.kit_type === 'GLASS').length} kit(s) available
                                </p>
                            </div>

                            {/* Resin Lot (moulding only) */}
                            {processCategory === 'moulding' && (
                                <div className="space-y-2">
                                    <Label className="text-slate-300">Resin Lot *</Label>
                                    <Select
                                        value={selectedResinLot?.toString() || ''}
                                        onValueChange={(val) => setSelectedResinLot(parseInt(val))}
                                    >
                                        <SelectTrigger className="bg-slate-800 border-slate-700 text-white">
                                            <SelectValue placeholder="Select a resin lot" />
                                        </SelectTrigger>
                                        <SelectContent className="bg-slate-800 border-slate-700">
                                            {availableResin.map(resin => (
                                                <SelectItem key={resin.id} value={resin.id.toString()} className="text-white hover:bg-slate-700">
                                                    {resin.resin_code} ({resin.available_count} available)
                                                </SelectItem>
                                            ))}
                                        </SelectContent>
                                    </Select>
                                    <p className="text-xs text-slate-400">
                                        {availableResin.length} lot(s) available
                                    </p>
                                </div>
                            )}
                        </div>
                    )}

                    {/* Error Message */}
                    {error && (
                        <div className="bg-red-900 border border-red-700 rounded p-3 text-red-200 text-sm">
                            {error}
                        </div>
                    )}
                </div>

                <DialogFooter>
                    <Button
                        type="button"
                        variant="outline"
                        onClick={onClose}
                        className="border-slate-700 text-slate-300 hover:bg-slate-800"
                        disabled={loading}
                    >
                        Cancel
                    </Button>
                    <Button
                        onClick={handleStart}
                        disabled={loading || !canStart}
                        className="bg-green-600 hover:bg-green-700 disabled:bg-slate-700"
                    >
                        {loading ? (
                            <>
                                <Icons.Loader2 className="mr-2 h-4 w-4 animate-spin" />
                                Starting...
                            </>
                        ) : (
                            <>
                                <Icons.Play className="mr-2 h-4 w-4" />
                                Start Process
                            </>
                        )}
                    </Button>
                </DialogFooter>
            </DialogContent >
        </Dialog >
    );
}
