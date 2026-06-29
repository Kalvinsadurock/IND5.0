import { useState, useRef, useEffect } from 'react';
import { Camera, Upload, X, Loader2 } from 'lucide-react';
import { Button } from '@/shared/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/shared/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/shared/ui/select';
import { Label } from '@/shared/ui/label';
import { Input } from '@/shared/ui/input';

interface MaterialCreationDialogProps {
  isOpen: boolean;
  onClose: () => void;
  materialType: 'KIT' | 'GLASS' | 'RESIN';
  buttonLabel: string;
  userName: string; // Auto-filled
}

interface Process {
  id: number;
  processNumber: number;
  name: string;
  category: string;
}

export function MaterialCreationDialog({
  isOpen,
  onClose,
  materialType,
  buttonLabel,
  userName,
}: MaterialCreationDialogProps) {
  const [selectedProcess, setSelectedProcess] = useState<number | null>(null);
  const [photoUrl, setPhotoUrl] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [processes, setProcesses] = useState<Process[]>([]);
  const [loadingProcesses, setLoadingProcesses] = useState(true);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Load production processes (exclude inventory)
  useEffect(() => {
    const fetchProcesses = async () => {
      try {
        setLoadingProcesses(true);
        const res = await fetch('/api/processes');
        const data = await res.json();
        // Filter for production processes only (not inventory)
        const prodProcesses = data.filter((p: Process) => p.category !== 'inventory');
        setProcesses(prodProcesses);
      } catch (error) {
        console.error('Failed to load processes:', error);
        setErrorMessage('Failed to load target processes');
      } finally {
        setLoadingProcesses(false);
      }
    };

    if (isOpen) {
      fetchProcesses();
    }
  }, [isOpen]);

  const handlePhotoCapture = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    try {
      setIsLoading(true);
      setErrorMessage(null);

      // Create data URL for preview
      const reader = new FileReader();
      reader.onloadend = () => {
        setPhotoUrl(reader.result as string);
        setIsLoading(false);
      };
      reader.onerror = () => {
        setErrorMessage('Failed to read photo file');
        setIsLoading(false);
      };
      reader.readAsDataURL(file);
    } catch (error) {
      setErrorMessage(`Photo upload failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
      setIsLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!selectedProcess) {
      setErrorMessage('Please select a target process');
      return;
    }
    if (!photoUrl) {
      setErrorMessage('Photo is mandatory');
      return;
    }

    try {
      setIsLoading(true);
      setErrorMessage(null);
      setSuccessMessage(null);

      const response = await fetch('/api/materials/create', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          materialType,
          createdBy: userName,
          photoUrl,
          targetProcessId: selectedProcess,
        }),
      });

      if (!response.ok) throw new Error('Failed to create material');
      const data = await response.json();

      setSuccessMessage(`${buttonLabel} created successfully: ${data.uid}`);

      // Reset form
      setTimeout(() => {
        setSelectedProcess(null);
        setPhotoUrl(null);
        onClose();
        setSuccessMessage(null);
      }, 2000);
    } catch (error) {
      setErrorMessage(`Failed to create material: ${error instanceof Error ? error.message : 'Unknown error'}`);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-[500px] bg-slate-900 border-slate-700">
        <DialogHeader>
          <DialogTitle className="text-white text-lg font-bold">{buttonLabel}</DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-6">
          {/* User Name (Auto-filled) */}
          <div className="space-y-2">
            <Label className="text-slate-300 text-sm">Created by</Label>
            <Input
              type="text"
              value={userName}
              disabled
              className="bg-slate-800 border-slate-700 text-white"
            />
          </div>

          {/* Timestamp (Auto-filled) */}
          <div className="space-y-2">
            <Label className="text-slate-300 text-sm">Created at</Label>
            <Input
              type="text"
              value={new Date().toLocaleString()}
              disabled
              className="bg-slate-800 border-slate-700 text-white"
            />
          </div>

          {/* Photo Upload (Mandatory) */}
          <div className="space-y-2">
            <Label className="text-slate-300 text-sm font-medium">
              Photo <span className="text-red-500">*</span>
            </Label>
            <div className="border-2 border-dashed border-slate-700 rounded-lg p-6 text-center hover:border-slate-600 transition">
              {photoUrl ? (
                <div className="space-y-3">
                  <img
                    src={photoUrl}
                    alt="Material photo"
                    className="w-full h-48 object-cover rounded-md"
                  />
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={() => {
                      setPhotoUrl(null);
                      if (fileInputRef.current) fileInputRef.current.value = '';
                    }}
                    className="w-full bg-red-600 hover:bg-red-700 border-0"
                  >
                    <X className="mr-2 h-4 w-4" /> Remove Photo
                  </Button>
                </div>
              ) : (
                <div className="space-y-3">
                  <Camera className="mx-auto h-8 w-8 text-slate-500" />
                  <p className="text-slate-400 text-sm">Click to upload or drag and drop</p>
                  <input
                    ref={fileInputRef}
                    type="file"
                    accept="image/*"
                    onChange={handlePhotoCapture}
                    className="hidden"
                  />
                  <Button
                    type="button"
                    onClick={() => fileInputRef.current?.click()}
                    disabled={isLoading}
                    className="w-full bg-blue-600 hover:bg-blue-700"
                  >
                    {isLoading ? (
                      <>
                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                        Uploading...
                      </>
                    ) : (
                      <>
                        <Upload className="mr-2 h-4 w-4" />
                        Select Photo
                      </>
                    )}
                  </Button>
                </div>
              )}
            </div>
          </div>

          {/* Target Process Selection */}
          <div className="space-y-2">
            <Label className="text-slate-300 text-sm font-medium">
              Target Process <span className="text-red-500">*</span>
            </Label>
            {loadingProcesses ? (
              <div className="bg-slate-800 border border-slate-700 rounded p-3 flex items-center gap-2 text-slate-400">
                <Loader2 className="w-4 h-4 animate-spin" />
                Loading processes...
              </div>
            ) : (
              <Select value={selectedProcess?.toString() ?? ''} onValueChange={(val) => setSelectedProcess(parseInt(val))}>
                <SelectTrigger className="bg-slate-800 border-slate-700 text-white">
                  <SelectValue placeholder="Select a process" />
                </SelectTrigger>
                <SelectContent className="bg-slate-800 border-slate-700">
                  {processes.map(process => (
                    <SelectItem key={process.id} value={process.id.toString()} className="text-white hover:bg-slate-700">
                      {process.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            )}
          </div>

          {/* Error Message */}
          {errorMessage && (
            <div className="bg-red-900 border border-red-700 rounded p-3 text-red-200 text-sm">
              {errorMessage}
            </div>
          )}

          {/* Success Message */}
          {successMessage && (
            <div className="bg-green-900 border border-green-700 rounded p-3 text-green-200 text-sm">
              {successMessage}
            </div>
          )}
        </form>

        <DialogFooter>
          <Button
            type="button"
            variant="outline"
            onClick={onClose}
            className="border-slate-700 text-slate-300 hover:bg-slate-800"
            disabled={isLoading}
          >
            Cancel
          </Button>
          <Button
            onClick={handleSubmit}
            disabled={isLoading || !photoUrl || !selectedProcess}
            className="bg-green-600 hover:bg-green-700 disabled:bg-slate-700"
          >
            {isLoading ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Creating...
              </>
            ) : (
              'Create Material'
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
