import { useState, useRef } from 'react';
import { Camera, Upload, X, Loader2, AlertCircle } from 'lucide-react';
import { Button } from '@/shared/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/shared/ui/dialog';
import { Label } from '@/shared/ui/label';
import { supabase } from '@/shared/api/supabase';

interface AddResinDialogProps {
  isOpen: boolean;
  onClose: () => void;
  userName: string;
  onSuccess?: (resinCode: string) => void;
}

export function AddResinDialog({
  isOpen,
  onClose,
  userName,
  onSuccess,
}: AddResinDialogProps) {
  const [photoUrl, setPhotoUrl] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [fileName, setFileName] = useState<string | null>(null);

  const handlePhotoCapture = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    try {
      setIsUploading(true);
      setErrorMessage(null);

      // Upload to Supabase Storage in resin-photos bucket
      const uniqueFileName = `${Date.now()}-${file.name}`;
      const { data, error } = await supabase.storage
        .from('resin-photos')
        .upload(uniqueFileName, file);

      if (error) throw error;

      // Store only the path in state (not the full URL)
      // Will generate public URL when saving to database
      setPhotoUrl(uniqueFileName);
      setFileName(file.name);
      setErrorMessage(null);
    } catch (error) {
      setErrorMessage(`Photo upload failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
      setPhotoUrl(null);
    } finally {
      setIsUploading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!photoUrl) {
      setErrorMessage('Please upload a photo of the resin lot');
      return;
    }

    setIsLoading(true);
    setErrorMessage(null);
    setSuccessMessage(null);

    try {
      // Call the new process-driven API endpoint
      const response = await fetch('/api/resin/create', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          photoUrl,
          createdBy: userName,
        }),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Failed to create resin lot');
      }

      const data = await response.json();
      setSuccessMessage(`Resin lot ${data.resin.resin_code} created successfully!`);

      // Reset form
      setPhotoUrl(null);
      setFileName(null);
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }

      // Call callback and close
      if (onSuccess) {
        onSuccess(data.resin.resin_code);
      }

      // Close dialog after a brief delay to show success message
      setTimeout(() => {
        onClose();
      }, 1500);
    } catch (error) {
      setErrorMessage(error instanceof Error ? error.message : 'Failed to create resin lot');
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
          <DialogTitle className="text-white">Add Resin Lot</DialogTitle>
          <DialogDescription className="sr-only">
            Add resin lot with photo that is shared across all processes. Photo will be uploaded to secure storage.
          </DialogDescription>
          <div className="text-sm text-slate-400 mt-2">
            Resin is <span className="font-semibold text-purple-400">shared across all processes</span>
          </div>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Shared Info */}
          <div className="bg-slate-700/50 border border-slate-600 rounded-lg p-4">
            <div className="text-xs text-slate-400 font-medium mb-2">Availability</div>
            <div className="text-sm text-slate-300">
              This resin lot will be available to <span className="font-semibold text-purple-300">all processes</span> that need it.
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
                    alt="Resin lot photo"
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
          <div className="bg-purple-900/30 border border-purple-700/50 rounded-lg p-3 text-sm text-purple-300">
            <p>
              Resin code will be auto-generated as: <br />
              <span className="font-mono text-purple-200 mt-1 block">
                RESIN-{new Date().toISOString().slice(0, 10).replace(/-/g, '')}-###
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
              className="bg-purple-600 hover:bg-purple-700 text-white flex items-center gap-2"
            >
              {isLoading ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  Creating...
                </>
              ) : (
                <>
                  <Upload className="w-4 h-4" />
                  Create Resin Lot
                </>
              )}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
