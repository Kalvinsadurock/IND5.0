import { useState, useEffect } from 'react';
import * as Icons from '@/shared/ui/icons';
import { Button } from '@/shared/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/shared/ui/dialog';
import { Checkbox } from '@/shared/ui/checkbox';
import { Label } from '@/shared/ui/label';
import { materialsApi } from '@/shared/api/client';

interface MaterialSelectionDialogProps {
  isOpen: boolean;
  onClose: () => void;
  processId: number;
  processName: string;
  // The callback receives either an array of selected material UIDs or an object { materialUids, part }
  onMaterialsSelected: (payload: any) => void;
  userName: string;
}

interface AvailableMaterial {
  id: number;
  uid?: string;
  material_code: string;
  material_type: string;
  created_by: string;
  created_at: string;
  photo_url?: string;
  available_count?: number;
}

export function MaterialSelectionDialog({
  isOpen,
  onClose,
  processId,
  processName,
  onMaterialsSelected,
  userName,
}: MaterialSelectionDialogProps) {
  const [filterType, setFilterType] = useState<string>('');
  const [materials, setMaterials] = useState<AvailableMaterial[]>([]);
  // store selected UIDs (string) to avoid id collisions between tables
  const [selectedMaterials, setSelectedMaterials] = useState<Set<string>>(new Set());
  const [isLoading, setIsLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    if (!isOpen) return;

    const fetchMaterials = async () => {
      try {
        setIsLoading(true);
        setErrorMessage(null);
        const data = await materialsApi.getAvailable(processId);
        console.log('Materials loaded successfully:', data);
        setMaterials(Array.isArray(data) ? data : []);
        setSelectedMaterials(new Set());
      } catch (error) {
        const errorMsg = error instanceof Error ? error.message : String(error);
        console.error('Failed to load materials:', errorMsg, error);
        setErrorMessage(`Failed to load materials: ${errorMsg}`);
        setMaterials([]);
      } finally {
        setIsLoading(false);
      }
    };

    fetchMaterials();
  }, [isOpen, processId]);

  const toggleMaterial = (materialUid: string, materialType: string) => {
    const newSelection = new Set(selectedMaterials);

    if (materialType === 'RESIN') {
      // For RESIN: only allow ONE resin to be selected (remove other resins)
      const existingResins = Array.from(newSelection).filter(uid => uid.startsWith('RESIN:'));
      existingResins.forEach(resinUid => {
        if (resinUid !== materialUid) {
          newSelection.delete(resinUid);
        }
      });

      // Toggle this resin
      if (newSelection.has(materialUid)) {
        newSelection.delete(materialUid);
      } else {
        newSelection.add(materialUid);
      }
    } else {
      // For KIT and GLASS: allow multiple selections
      if (newSelection.has(materialUid)) {
        newSelection.delete(materialUid);
      } else {
        newSelection.add(materialUid);
      }
    }

    setSelectedMaterials(newSelection);
  };

  const handleSubmit = async () => {
    // Validate that we have exactly: 1+ KIT + 1+ GLASS + 1 RESIN
    const kitMaterials = Array.from(selectedMaterials).filter(uid => uid.startsWith('KIT:'));
    const glassMaterials = Array.from(selectedMaterials).filter(uid => uid.startsWith('GLASS:'));
    const resinMaterials = Array.from(selectedMaterials).filter(uid => uid.startsWith('RESIN:'));

    if (kitMaterials.length === 0) {
      setErrorMessage('Please select 1 Material Kit');
      return;
    }

    if (glassMaterials.length === 0) {
      setErrorMessage('Please select 1 Glass Kit');
      return;
    }

    if (resinMaterials.length === 0) {
      setErrorMessage('Please select 1 Resin Lot');
      return;
    }

    if (resinMaterials.length > 1) {
      setErrorMessage('You can only select 1 Resin Lot');
      return;
    }

    try {
      setIsSubmitting(true);
      setErrorMessage(null);

      const result = await materialsApi.startProcessExecution({
        processId,
        startedBy: userName,
        materialIds: Array.from(selectedMaterials),
      });

      // Notify parent component with API response (includes created part)
      onMaterialsSelected({ materialUids: Array.from(selectedMaterials), part: result.part });

      // Close dialog
      setTimeout(() => {
        onClose();
        setSelectedMaterials(new Set());
      }, 1500);
    } catch (error) {
      setErrorMessage(`Failed to start process: ${error instanceof Error ? error.message : 'Unknown error'}`);
    } finally {
      setIsSubmitting(false);
    }
  };

  const groupedByType = materials.reduce((acc, material) => {
    if (!acc[material.material_type]) {
      acc[material.material_type] = [];
    }
    acc[material.material_type].push(material);
    return acc;
  }, {} as Record<string, AvailableMaterial[]>);

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-[600px] bg-slate-900 border-slate-700">
        <DialogHeader>
          <DialogTitle className="text-white text-lg font-bold">
            Select Materials for {processName}
          </DialogTitle>
          <DialogDescription className="text-slate-400">
            Choose the materials you want to use for this process. You can select multiple kits or a single resin lot.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          <div className="flex items-center gap-3">
            <label htmlFor="material-filter" className="text-sm text-slate-300">Filter</label>
            <select
              id="material-filter"
              name="material-filter"
              value={filterType}
              onChange={(e) => setFilterType(e.target.value)}
              className="bg-slate-800 border border-slate-700 text-slate-300 rounded px-2 py-1"
            >
              <option value="">All</option>
              <option value="KIT">Material Kits</option>
              <option value="GLASS">Glass Kits</option>
              <option value="RESIN">Resin Lots</option>
            </select>
          </div>
          {errorMessage && (
            <div className="bg-red-900 border border-red-700 rounded p-3 text-red-200 text-sm flex items-start gap-2">
              <Icons.AlertCircle className="w-5 h-5 mt-0.5 flex-shrink-0" />
              {errorMessage}
            </div>
          )}

          {isLoading ? (
            <div className="flex items-center justify-center py-12">
              <Icons.Loader2 className="w-6 h-6 animate-spin text-emerald-500" />
            </div>
          ) : materials.length === 0 ? (
            <div className="bg-slate-800 border border-slate-700 rounded p-6 text-center">
              <p className="text-slate-400">No materials available for this process</p>
            </div>
          ) : (
            <div className="space-y-4 max-h-96 overflow-y-auto">
              {Object.entries(groupedByType)
                .filter(([type]) => !filterType || filterType === type)
                .map(([type, items]) => (
                  <div key={type}>
                    <h3 className="text-slate-300 font-semibold text-sm mb-2">
                      {type === 'KIT' ? 'Material Kits' : type === 'GLASS' ? 'Glass Kits' : 'Resin Lots'}
                      {type === 'RESIN' && <span className="text-xs text-slate-500"> (single select)</span>}
                    </h3>
                    <div className="space-y-2">
                      {items.map((material, idx) => {
                        const uid = material.uid ?? `${material.material_type}:${material.id}`;
                        return (
                          <div
                            key={uid}
                            className="flex items-start gap-3 p-3 bg-slate-800 border border-slate-700 rounded-lg hover:bg-slate-750 transition"
                          >
                            <Checkbox
                              id={`material-${uid.replace(/[:]/g, '-')}`}
                              checked={selectedMaterials.has(uid)}
                              onCheckedChange={() => toggleMaterial(uid, type)}
                              className="mt-1"
                            />
                            <div className="flex-1 min-w-0">
                              <Label
                                htmlFor={`material-${uid.replace(/[:]/g, '-')}`}
                                className="cursor-pointer block"
                              >
                                <div className="font-medium text-white">{material.material_code}</div>
                                <div className="text-xs text-slate-400 mt-1">
                                  Created by {material.created_by} on {new Date(material.created_at).toLocaleDateString()}
                                </div>
                              </Label>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                ))}
            </div>
          )}
        </div>

        <DialogFooter>
          <Button
            type="button"
            variant="outline"
            onClick={onClose}
            className="border-slate-700 text-slate-300 hover:bg-slate-800"
            disabled={isSubmitting}
          >
            Cancel
          </Button>
          <Button
            onClick={handleSubmit}
            disabled={isSubmitting || materials.length === 0}
            className="bg-emerald-600 hover:bg-emerald-700 disabled:bg-slate-700"
            title={selectedMaterials.size < 3 ? 'Select 1 Material Kit + 1 Glass Kit + 1 Resin' : ''}
          >
            {isSubmitting ? (
              <>
                <Icons.Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Starting...
              </>
            ) : (
              <>
                {(() => {
                  const kitCount = Array.from(selectedMaterials).filter(uid => uid.startsWith('KIT:')).length;
                  const glassCount = Array.from(selectedMaterials).filter(uid => uid.startsWith('GLASS:')).length;
                  const resinCount = Array.from(selectedMaterials).filter(uid => uid.startsWith('RESIN:')).length;

                  const missing = [];
                  if (kitCount === 0) missing.push('Material Kit');
                  if (glassCount === 0) missing.push('Glass Kit');
                  if (resinCount === 0) missing.push('Resin');

                  if (missing.length > 0) {
                    return `Select ${missing.join(' + ')}`;
                  }

                  return `Start with Kit + Glass + Resin`;
                })()}
              </>
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
