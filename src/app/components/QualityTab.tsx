import { useState, useEffect } from 'react';
import { 
  Camera, 
  Upload, 
  CheckCircle, 
  XCircle, 
  AlertTriangle, 
  ArrowRight, 
  ShieldAlert, 
  Check, 
  Trash2, 
  Clock 
} from 'lucide-react';
import { Button } from '@/shared/ui/button';
import { Input } from '@/shared/ui/input';
import { Label } from '@/shared/ui/label';
import { Textarea } from '@/shared/ui/textarea';
import { useAuth } from '@/lib/AuthContext';

interface QualityCheck {
  parameter: string;
  specification: string;
  measured: string;
  status: 'ok' | 'nok' | 'pending';
}

interface Defect {
  id: number;
  instanceId: number;
  checkpointId: number;
  status: string;
  qaResult: string;
  measuredValue: string;
  measuredAt: string | null;
  deviationNumber: string | null;
  notes: string | null;
  createdAt: string;
  checkpointName: string;
  parameter: string;
  specification: string;
  partId: number;
  partNumber: string;
  serialNumber: string;
  partStatus: string;
  stepId: number;
}

interface Step {
  id: number;
  stepNumber: string;
  name: string;
  sequence: number;
}

export function QualityTab() {
  const { user } = useAuth();
  const isSupervisor = user?.role?.toLowerCase() === 'supervisor' || user?.role?.toLowerCase() === 'admin' || user?.role?.toLowerCase() === 'plant_manager';
  
  const [activeTab, setActiveTab] = useState<'log' | 'defects'>('log');
  
  // 1. Daily Parameters Log State
  const [checks, setChecks] = useState<QualityCheck[]>([
    { parameter: 'Blade Length', specification: '2450mm ±5mm', measured: '', status: 'pending' },
    { parameter: 'Blade Width (Root)', specification: '350mm ±3mm', measured: '', status: 'pending' },
    { parameter: 'Blade Width (Tip)', specification: '120mm ±2mm', measured: '', status: 'pending' },
    { parameter: 'Surface Finish', specification: 'Ra < 0.8μm', measured: '', status: 'pending' },
    { parameter: 'Fiber Alignment', specification: '±2° tolerance', measured: '', status: 'pending' },
    { parameter: 'Void Content', specification: '< 2% volume', measured: '', status: 'pending' },
    { parameter: 'Cure Temperature', specification: '80°C ±5°C', measured: '', status: 'pending' },
    { parameter: 'Weight', specification: '12.5kg ±0.3kg', measured: '', status: 'pending' },
  ]);
  const [photos, setPhotos] = useState<string[]>([]);
  const [notes, setNotes] = useState('');

  // 2. Defect Treatments State
  const [defects, setDefects] = useState<Defect[]>([]);
  const [loadingDefects, setLoadingDefects] = useState(false);
  const [selectedDefect, setSelectedDefect] = useState<Defect | null>(null);
  const [treatmentType, setTreatmentType] = useState<'rework' | 'scrap' | 'deviation' | null>(null);
  
  // Rework target states
  const [processSteps, setProcessSteps] = useState<Step[]>([]);
  const [selectedStepId, setSelectedStepId] = useState<string>('');
  const [reworkReason, setReworkReason] = useState('');
  
  // Scrap states
  const [scrapReason, setScrapReason] = useState('');
  
  // Deviation states
  const [deviationNumber, setDeviationNumber] = useState('');
  const [deviationNotes, setDeviationNotes] = useState('');

  // Fetch defects list
  const fetchDefects = async () => {
    setLoadingDefects(true);
    try {
      const res = await fetch('/api/quality/defects');
      if (res.ok) {
        const data = await res.json();
        setDefects(data);
      }
    } catch (err) {
      console.error('Failed to load defects:', err);
    } finally {
      setLoadingDefects(false);
    }
  };

  useEffect(() => {
    if (activeTab === 'defects') {
      fetchDefects();
    }
  }, [activeTab]);

  // Fetch process steps for rework options
  const loadProcessStepsForPart = async (defect: Defect) => {
    try {
      // Find the process ID by checking the active part's steps info
      const res = await fetch(`/api/parts/${defect.partId}/step-instances`);
      if (res.ok) {
        const instances = await res.json();
        // Just load all steps of this process category or first process
        const procRes = await fetch('/api/processes');
        if (procRes.ok) {
          const procs = await procRes.json();
          // Find the active process
          const activeProc = procs.find((p: any) => p.code === defect.partNumber.split('-')[0]) || procs[0];
          if (activeProc) {
            const stepsRes = await fetch(`/api/processes/${activeProc.id}/steps`);
            if (stepsRes.ok) {
              const steps = await stepsRes.json();
              setProcessSteps(steps.sort((a: Step, b: Step) => a.sequence - b.sequence));
              if (steps.length > 0) {
                setSelectedStepId(String(steps[0].id));
              }
            }
          }
        }
      }
    } catch (err) {
      console.error('Failed to load steps for rework:', err);
    }
  };

  const handleSelectDefect = (defect: Defect, type: 'rework' | 'scrap' | 'deviation') => {
    setSelectedDefect(defect);
    setTreatmentType(type);
    if (type === 'rework') {
      loadProcessStepsForPart(defect);
    }
  };

  const submitTreatment = async () => {
    if (!selectedDefect || !treatmentType) return;

    try {
      let endpoint = '';
      let body = {};

      if (treatmentType === 'rework') {
        endpoint = '/api/quality/treatment/rework';
        body = {
          resultId: selectedDefect.id,
          toStepId: parseInt(selectedStepId),
          reason: reworkReason,
          initiatedById: user?.id
        };
      } else if (treatmentType === 'scrap') {
        endpoint = '/api/quality/treatment/scrap';
        body = {
          resultId: selectedDefect.id,
          reason: scrapReason,
          initiatedById: user?.id
        };
      } else if (treatmentType === 'deviation') {
        endpoint = '/api/quality/treatment/deviation';
        body = {
          resultId: selectedDefect.id,
          deviationNumber,
          notes: deviationNotes,
          approvedById: user?.id
        };
      }

      const res = await fetch(endpoint, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body)
      });

      if (res.ok) {
        // Reset states
        setSelectedDefect(null);
        setTreatmentType(null);
        setReworkReason('');
        setScrapReason('');
        setDeviationNumber('');
        setDeviationNotes('');
        // Reload defects
        fetchDefects();
        
        // Push OEE updates in background if OEE integration is linked
        if (treatmentType === 'scrap' || treatmentType === 'rework') {
          // Increment OEE reject count
          const oeeUser = user?.auth_user_id;
          if (oeeUser) {
            // Find active shift and add a reject part
            const { supabase } = await import('@/shared/api/supabase');
            const { data: activeShifts } = await supabase
              .from('shifts')
              .select('id')
              .eq('status', 'active')
              .limit(1);
            if (activeShifts && activeShifts.length > 0) {
              const activeShiftId = activeShifts[0].id;
              // Check if production log exists
              const { data: logs } = await supabase
                .from('production_logs')
                .select('*')
                .eq('shift_id', activeShiftId)
                .limit(1);
              
              if (logs && logs.length > 0) {
                await supabase
                  .from('production_logs')
                  .update({
                    reject_parts: (logs[0].reject_parts || 0) + 1,
                    total_parts: (logs[0].total_parts || 0) + 1
                  })
                  .eq('id', logs[0].id);
              }
            }
          }
        }
      } else {
        const data = await res.json();
        alert(data.error || 'Failed to submit treatment');
      }
    } catch (err) {
      console.error('Treatment error:', err);
    }
  };

  const updateMeasurement = (index: number, value: string) => {
    const updated = [...checks];
    updated[index].measured = value;
    setChecks(updated);
  };

  const setStatus = (index: number, status: 'ok' | 'nok') => {
    const updated = [...checks];
    updated[index].status = status;
    setChecks(updated);
  };

  const handlePhotoUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      const file = e.target.files[0];
      const reader = new FileReader();
      reader.onload = (event) => {
        if (event.target?.result) {
          setPhotos([...photos, event.target.result as string]);
        }
      };
      reader.readAsDataURL(file);
    }
  };

  const removePhoto = (index: number) => {
    setPhotos(photos.filter((_, i) => i !== index));
  };

  const okCount = checks.filter((c) => c.status === 'ok').length;
  const nokCount = checks.filter((c) => c.status === 'nok').length;

  return (
    <div className="flex flex-col h-full space-y-6">
      {/* Module Title Section */}
      <div className="flex items-center justify-between border-b border-slate-850 pb-4">
        <div>
          <h1 className="text-2xl font-bold text-white leading-none">Quality Assurance</h1>
          <p className="text-xs text-slate-400 mt-1">Daily parameters logs and QA defect treatments</p>
        </div>

        {/* Subtabs selection */}
        <div className="flex bg-slate-950/80 p-1 rounded-lg border border-slate-800">
          <button
            onClick={() => setActiveTab('log')}
            className={`px-4 py-2 text-xs font-semibold rounded-md transition-all ${
              activeTab === 'log'
                ? 'bg-emerald-600 text-white'
                : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            Daily Check Sheet
          </button>
          <button
            onClick={() => setActiveTab('defects')}
            className={`px-4 py-2 text-xs font-semibold rounded-md transition-all ${
              activeTab === 'defects'
                ? 'bg-emerald-600 text-white'
                : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            Defects & Treatments {defects.length > 0 && (
              <span className="ml-1 bg-red-600 text-white text-[9px] px-1.5 py-0.5 rounded-full font-bold">
                {defects.length}
              </span>
            )}
          </button>
        </div>
      </div>

      {activeTab === 'log' ? (
        <div className="space-y-6">
          {/* Summary Stats */}
          <div className="grid grid-cols-3 gap-4">
            <div className="bg-slate-900 rounded-xl border-2 border-slate-800 p-4">
              <div className="text-slate-400 mb-1">Total Checks</div>
              <div className="text-slate-100">{checks.length}</div>
            </div>
            <div className="bg-emerald-950/50 rounded-xl border-2 border-emerald-800 p-4">
              <div className="text-emerald-400 mb-1">OK</div>
              <div className="text-emerald-400">{okCount}</div>
            </div>
            <div className="bg-red-950/50 rounded-xl border-2 border-red-800 p-4">
              <div className="text-red-400 mb-1">NOK</div>
              <div className="text-red-400">{nokCount}</div>
            </div>
          </div>

          {/* Quality Checks Table */}
          <div className="bg-slate-900 rounded-xl border-2 border-slate-800 overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-slate-800 border-b-2 border-slate-700">
                  <tr>
                    <th className="text-left p-4 text-slate-300">Parameter</th>
                    <th className="text-left p-4 text-slate-300">Specification</th>
                    <th className="text-left p-4 text-slate-300">Measured Value</th>
                    <th className="text-left p-4 text-slate-300">Status</th>
                  </tr>
                </thead>
                <tbody>
                  {checks.map((check, index) => (
                    <tr key={index} className="border-b border-slate-800">
                      <td className="p-4 text-slate-100">{check.parameter}</td>
                      <td className="p-4 text-slate-400">{check.specification}</td>
                      <td className="p-4">
                        <Input
                          value={check.measured}
                          onChange={(e) => updateMeasurement(index, e.target.value)}
                          placeholder="Enter value..."
                          className="h-10 bg-slate-800 border-slate-700 text-slate-100"
                        />
                      </td>
                      <td className="p-4">
                        <div className="flex gap-2">
                          <Button
                            onClick={() => setStatus(index, 'ok')}
                            size="sm"
                            className={`h-10 px-4 ${
                              check.status === 'ok'
                                ? 'bg-emerald-600 hover:bg-emerald-700 text-white'
                                : 'bg-slate-800 hover:bg-slate-700 text-slate-300'
                            }`}
                          >
                            <CheckCircle className="w-4 h-4 mr-2" />
                            OK
                          </Button>
                          <Button
                            onClick={() => setStatus(index, 'nok')}
                            size="sm"
                            className={`h-10 px-4 ${
                              check.status === 'nok'
                                ? 'bg-red-600 hover:bg-red-700 text-white'
                                : 'bg-slate-800 hover:bg-slate-700 text-slate-300'
                            }`}
                          >
                            <XCircle className="w-4 h-4 mr-2" />
                            NOK
                          </Button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          {/* Photo Documentation */}
          <div className="bg-slate-900 rounded-xl border-2 border-slate-800 p-6">
            <h3 className="text-slate-100 mb-4 flex items-center gap-2 font-medium">
              <Camera className="w-5 h-5" />
              Photo Documentation
            </h3>
            <div className="grid grid-cols-4 gap-4">
              {photos.map((photo, idx) => (
                <div key={idx} className="relative group">
                  <img src={photo} alt={`Check ${idx}`} className="w-full h-32 object-cover rounded-lg border border-slate-700" />
                  <Button
                    onClick={() => removePhoto(idx)}
                    size="sm"
                    className="absolute top-2 right-2 bg-red-600 hover:bg-red-750 text-white p-1 rounded-full h-6 w-6"
                  >
                    <XCircle className="w-4 h-4" />
                  </Button>
                </div>
              ))}
              <label className="h-32 border-2 border-dashed border-slate-700 rounded-lg flex flex-col items-center justify-center cursor-pointer hover:border-slate-600 hover:bg-slate-800/40">
                <Upload className="w-8 h-8 text-slate-600 mb-2" />
                <span className="text-slate-500 text-xs">Upload Photo</span>
                <input type="file" accept="image/*" onChange={handlePhotoUpload} className="hidden" />
              </label>
            </div>
          </div>

          {/* Notes */}
          <div className="bg-slate-900 rounded-xl border-2 border-slate-800 p-6">
            <Label htmlFor="notes" className="text-slate-350 block mb-2 text-sm font-semibold">Inspector Notes</Label>
            <Textarea
              id="notes"
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="Enter observations, remarks, or serial numbers..."
              className="bg-slate-800 border-slate-700 min-h-[96px] text-white"
            />
          </div>

          <Button className="w-full h-14 bg-emerald-605 hover:bg-emerald-700 text-white font-bold text-base rounded-xl">
            Submit Quality Report
          </Button>
        </div>
      ) : (
        <div className="space-y-6">
          {/* Defect Log List */}
          <div className="bg-slate-900 rounded-xl border-2 border-slate-800 p-4">
            <h2 className="text-slate-100 font-bold mb-4 flex items-center gap-2">
              <ShieldAlert className="w-5 h-5 text-red-500 animate-pulse" />
              Active Inspection Failures
            </h2>

            {loadingDefects ? (
              <div className="text-center py-8 text-slate-400">Loading defects...</div>
            ) : defects.length === 0 ? (
              <div className="text-center py-12 text-slate-500 border border-dashed border-slate-800 rounded-xl">
                No active defects reported in the plant. All checkpoints are clear!
              </div>
            ) : (
              <div className="space-y-4">
                {defects.map((def) => (
                  <div key={def.id} className="bg-slate-850/80 border border-slate-750 rounded-xl p-4 flex flex-col md:flex-row md:items-center md:justify-between gap-4">
                    <div className="space-y-1">
                      <div className="flex items-center gap-2">
                        <span className="text-sm font-bold text-slate-205">{def.partNumber} (Serial: {def.serialNumber || 'N/A'})</span>
                        <span className={`px-2 py-0.5 text-[10px] rounded font-bold uppercase ${
                          def.qaResult === 'fail' 
                            ? 'bg-red-500/10 border border-red-500/20 text-red-405' 
                            : 'bg-amber-500/10 border border-amber-500/20 text-amber-405'
                        }`}>
                          {def.qaResult}
                        </span>
                      </div>
                      <p className="text-xs font-semibold text-slate-350">{def.checkpointName} — {def.parameter}</p>
                      <p className="text-xs text-slate-450">Spec: {def.specification} | Measured: <span className="font-bold text-red-400">{def.measuredValue || 'N/A'}</span></p>
                      {def.notes && <p className="text-xs italic text-slate-400 mt-1">"{def.notes}"</p>}
                    </div>

                    <div className="flex gap-2 self-start md:self-center">
                      <Button
                        size="sm"
                        onClick={() => handleSelectDefect(def, 'rework')}
                        className="bg-emerald-600/10 border border-emerald-500/20 text-emerald-400 hover:bg-emerald-650 hover:text-white"
                      >
                        <Clock className="w-3.5 h-3.5 mr-1" />
                        Rework
                      </Button>
                      <Button
                        size="sm"
                        onClick={() => handleSelectDefect(def, 'deviation')}
                        className="bg-amber-600/10 border border-amber-500/20 text-amber-400 hover:bg-amber-650 hover:text-white"
                      >
                        <Check className="w-3.5 h-3.5 mr-1" />
                        Deviation
                      </Button>
                      <Button
                        size="sm"
                        onClick={() => handleSelectDefect(def, 'scrap')}
                        className="bg-red-600/10 border border-red-500/20 text-red-400 hover:bg-red-650 hover:text-white"
                      >
                        <Trash2 className="w-3.5 h-3.5 mr-1" />
                        Scrap
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Treatment Selection Popup Modal */}
          {selectedDefect && treatmentType && (
            <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4">
              <div className="bg-slate-900 border border-slate-800 rounded-2xl w-full max-w-lg overflow-hidden shadow-2xl">
                <div className="bg-slate-850 p-4 border-b border-slate-750 flex items-center gap-3">
                  <AlertTriangle className="w-5 h-5 text-amber-400" />
                  <div>
                    <h3 className="font-bold text-white">Record Defect Treatment</h3>
                    <p className="text-[10px] text-slate-400 mt-0.5">Part: {selectedDefect.partNumber} | {selectedDefect.checkpointName}</p>
                  </div>
                </div>

                <div className="p-6 space-y-4">
                  {treatmentType === 'rework' && (
                    <div className="space-y-4">
                      <div className="space-y-1.5">
                        <Label className="text-slate-300 text-xs font-semibold">Redirect Rework Target Step</Label>
                        <select
                          value={selectedStepId}
                          onChange={(e) => setSelectedStepId(e.target.value)}
                          className="w-full bg-slate-800 border border-slate-700 rounded-lg h-11 text-white px-3 focus:outline-none"
                        >
                          {processSteps.map((step) => (
                            <option key={step.id} value={step.id}>
                              Step {step.stepNumber}: {step.name}
                            </option>
                          ))}
                        </select>
                      </div>
                      <div className="space-y-1.5">
                        <Label className="text-slate-300 text-xs font-semibold">Rework Instructions / Reasons</Label>
                        <Textarea
                          value={reworkReason}
                          onChange={(e) => setReworkReason(e.target.value)}
                          placeholder="Detail which composite layers to scrape or repair..."
                          className="bg-slate-800 border-slate-700 min-h-[80px]"
                        />
                      </div>
                    </div>
                  )}

                  {treatmentType === 'scrap' && (
                    <div className="space-y-4">
                      <div className="bg-red-500/10 border border-red-500/20 p-3 rounded-lg flex items-start gap-2">
                        <Trash2 className="w-5 h-5 text-red-400 shrink-0 mt-0.5" />
                        <div>
                          <p className="text-xs font-bold text-red-450">Confirm Scrap Action</p>
                          <p className="text-[10px] text-slate-400 mt-0.5">This will permanently mark the part as SCRAPPED. This is irreversible.</p>
                        </div>
                      </div>
                      <div className="space-y-1.5">
                        <Label className="text-slate-300 text-xs font-semibold">Scrap Reason</Label>
                        <Textarea
                          value={scrapReason}
                          onChange={(e) => setScrapReason(e.target.value)}
                          placeholder="e.g. Delamination beyond repair threshold"
                          className="bg-slate-800 border-slate-700 min-h-[80px]"
                        />
                      </div>
                    </div>
                  )}

                  {treatmentType === 'deviation' && (
                    <div className="space-y-4">
                      <div className="space-y-1.5">
                        <Label className="text-slate-300 text-xs font-semibold">Deviation Authorization Code</Label>
                        <Input
                          value={deviationNumber}
                          onChange={(e) => setDeviationNumber(e.target.value)}
                          placeholder="e.g. DEV-2026-004"
                          className="bg-slate-800 border-slate-700 h-11"
                        />
                      </div>
                      <div className="space-y-1.5">
                        <Label className="text-slate-300 text-xs font-semibold">Deviation Notes / Concessions</Label>
                        <Textarea
                          value={deviationNotes}
                          onChange={(e) => setDeviationNotes(e.target.value)}
                          placeholder="Justify why deviation was approved..."
                          className="bg-slate-800 border-slate-700 min-h-[80px]"
                        />
                      </div>
                    </div>
                  )}
                </div>

                <div className="bg-slate-850/80 p-4 border-t border-slate-750 flex justify-end gap-2">
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => { setSelectedDefect(null); setTreatmentType(null); }}
                    className="border-slate-700 text-slate-305 hover:bg-slate-800"
                  >
                    Cancel
                  </Button>
                  <Button
                    size="sm"
                    onClick={submitTreatment}
                    className="bg-emerald-600 hover:bg-emerald-700 text-white font-bold"
                  >
                    Submit Treatment
                  </Button>
                </div>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
