import { useState, useRef, useEffect } from 'react';
import { Camera, Upload, X, Loader2, AlertCircle } from 'lucide-react';
import { Button } from '@/shared/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/shared/ui/dialog';
import { Label } from '@/shared/ui/label';
import { uploadKitPhoto } from '../../lib/uploadClient';

interface ProcessSpecificAddKitDialogProps {
  isOpen: boolean;
  onClose: () => void;
  process: {
    id: number;
    name: string;
    code: string;
    processNumber: number;
  };
  kitType: 'KIT' | 'GLASS';
  userName: string;
  onSuccess?: (kitCode: string) => void;
}

export function ProcessSpecificAddKitDialog({
  isOpen,
  onClose,
  process,
  kitType,
  userName,
  onSuccess,
}: ProcessSpecificAddKitDialogProps) {
  const [photoUrl, setPhotoUrl] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState<number | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [fileName, setFileName] = useState<string | null>(null);

  const kitTypeLabel = kitType === 'KIT' ? 'Material Kit' : 'Glass Kit';

  const handlePhotoCapture = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    try {
      setIsUploading(true);
      setErrorMessage(null);
      setFileName(null);

      // No client-side Supabase check required for server-side proxy.
      // We require the JWT to be present in localStorage; the upload helper will include it.
      const tokenFallback = typeof window !== 'undefined' ? localStorage.getItem('auth_token') : null;
      if (!tokenFallback) {
        setErrorMessage('You must be logged in to upload photos');
        setIsUploading(false);
        return;
      }

      // Upload via server-side proxy
      setErrorMessage(null);
      setFileName(file.name);

      const result = await uploadKitPhoto(
        file,
        { processId: process.id },
        (pct) => {
          setUploadProgress(pct);
        },
      );

      if (!result.success) {
        throw new Error(result.error || 'Upload failed');
      }

      // server returns storage path; use publicUrl if available for preview
      setPhotoUrl(result.publicUrl || result.path || null);
    } catch (error) {
      const errorMsg = error instanceof Error ? error.message : 'Unknown error';
      console.error('Photo upload error:', errorMsg);
      setErrorMessage(`Photo upload failed: ${errorMsg}`);
      setPhotoUrl(null);
    } finally {
      setIsUploading(false);
      setUploadProgress(null);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!photoUrl) {
      setErrorMessage('Please upload a photo of the kit');
      return;
    }

    if (!process.id) {
      setErrorMessage('Process ID is missing');
      return;
    }

    setIsLoading(true);
    setErrorMessage(null);
    setSuccessMessage(null);

    try {
      // Call the new process-driven API endpoint
      const response = await fetch('/api/kits/create', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          kitType,
          processId: process.id,
          photoUrl,
          createdBy: userName,
        }),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Failed to create kit');
      }

      const data = await response.json();
      setSuccessMessage(`${kitTypeLabel} ${data.kit.kit_code} created successfully!`);
      
      // Reset form
      setPhotoUrl(null);
      setFileName(null);
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }

      // Call callback and close
      if (onSuccess) {
        onSuccess(data.kit.kit_code);
      }

      // Close dialog after a brief delay to show success message
      setTimeout(() => {
        onClose();
      }, 1500);
    } catch (error) {
      setErrorMessage(error instanceof Error ? error.message : 'Failed to create kit');
    } finally {
      setIsLoading(false);
    }
  };

  const handleClose = () => {
    setPhotoUrl(null);
    setFileName(null);
    setErrorMessage(null);
    setSuccessMessage(null);
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
    onClose();
  };

  return (
    <Dialog open={isOpen} onOpenChange={handleClose}>
      <DialogContent className="sm:max-w-[500px] bg-slate-800 border-slate-700">
        <DialogHeader>
          <DialogTitle className="text-white">Add {kitTypeLabel}</DialogTitle>
          <DialogDescription className="sr-only">
            Add {kitTypeLabel.toLowerCase()} with photo for {process.name} process. Photo will be uploaded to secure storage.
          </DialogDescription>
          <div className="text-sm text-slate-400 mt-2">
            Process: <span className="font-semibold text-emerald-400">{process.name}</span>
            {process.code && <span className="text-slate-500 ml-2">({process.code})</span>}
          </div>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Process Info (Read-Only) */}
          <div className="bg-slate-700/50 border border-slate-600 rounded-lg p-4">
            <div className="text-xs text-slate-400 font-medium mb-2">Auto-Bound Process</div>
            <div className="flex items-center gap-2">
              <div className="flex-1">
                <div className="font-semibold text-white">{process.name}</div>
                <div className="text-sm text-slate-400">Process #{process.processNumber}</div>
              </div>
              <div className="text-emerald-400 text-sm font-medium">✓ Bound</div>
            </div>
          </div>

          {/* Photo Upload */}
          <div className="space-y-3">
            <Label className="text-white font-semibold">Photo *</Label>
            
            <div
              onClick={() => fileInputRef.current?.click()}
              className="border-2 border-dashed border-slate-600 rounded-lg p-6 text-center cursor-pointer hover:border-slate-500 transition-colors"
            >
              <input
                ref={fileInputRef}
                type="file"
                accept="image/*"
                onChange={handlePhotoCapture}
                disabled={isUploading}
                className="hidden"
              />

              {photoUrl ? (
                <div className="space-y-3">
                  <img
                    src={photoUrl}
                    alt="Kit photo"
                    className="w-full h-40 object-cover rounded-lg"
                  />
                  <div className="text-sm text-emerald-400 font-medium">
                    ✓ Photo uploaded: {fileName}
                  </div>
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={() => {
                      setPhotoUrl(null);
                      setFileName(null);
                      if (fileInputRef.current) fileInputRef.current.value = '';
                    }}
                    className="border-slate-600 text-slate-300 hover:bg-slate-700"
                  >
                    <X className="w-4 h-4 mr-2" />
                    Remove Photo
                  </Button>
                </div>
              ) : (
                <div className="space-y-2">
                  {isUploading ? (
                    <>
                      <Loader2 className="w-8 h-8 text-slate-400 mx-auto animate-spin" />
                      <p className="text-sm text-slate-400">Uploading photo...</p>
                      {uploadProgress !== null && (
                        <div className="text-sm text-slate-400">{uploadProgress}%</div>
                      )}
                    </>
                  ) : (
                    <>
                      <Camera className="w-8 h-8 text-slate-400 mx-auto" />
                      <p className="text-sm text-slate-300">Click to upload a photo</p>
                      <p className="text-xs text-slate-500">or drag and drop</p>
                    </>
                  )}
                </div>
              )}
            </div>
          </div>

          {/* Error Message */}
          {errorMessage && (
            <div className="bg-red-900/50 border border-red-700 rounded-lg p-3 flex gap-2">
              <AlertCircle className="w-5 h-5 text-red-400 flex-shrink-0 mt-0.5" />
              <p className="text-sm text-red-300">{errorMessage}</p>
            </div>
          )}

          {/* Success Message */}
          {successMessage && (
            <div className="bg-emerald-900/50 border border-emerald-700 rounded-lg p-3">
              <p className="text-sm text-emerald-300">✓ {successMessage}</p>
            </div>
          )}

          {/* Info Box */}
          <div className="bg-blue-900/30 border border-blue-700/50 rounded-lg p-3 text-sm text-blue-300">
            <p>
              Kit code will be auto-generated as: <br />
              <span className="font-mono text-blue-200 mt-1 block">
                {kitType}-{process.code}-{new Date().toISOString().slice(0, 10).replace(/-/g, '')}-###
              </span>
            </p>
          </div>

          {/* Actions */}
          <DialogFooter className="gap-2">
            <Button
              type="button"
              variant="outline"
              onClick={handleClose}
              disabled={isLoading || isUploading}
              className="border-slate-600 text-slate-300 hover:bg-slate-700"
            >
              Cancel
            </Button>
            <Button
              type="submit"
              disabled={!photoUrl || isLoading || isUploading}
              className="bg-emerald-600 hover:bg-emerald-700 text-white flex items-center gap-2"
            >
              {isLoading ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  Creating...
                </>
              ) : (
                <>
                  <Upload className="w-4 h-4" />
                  Create {kitTypeLabel}
                </>
              )}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
