import { useState } from 'react';
import { Upload, X, CheckCircle, AlertCircle } from 'lucide-react';
import { Button } from '@/shared/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/shared/ui/dialog';
import { cn } from '@/shared/utils';
import { useAuth } from '@/lib/AuthContext';

interface CheckpointPhotoUploadDialogProps {
  isOpen: boolean;
  onClose: () => void;
  resultId: number;
  checkpointName: string;
  stepName: string;
  onUploadComplete: (publicUrl: string) => void;
}

export function CheckpointPhotoUploadDialog({
  isOpen,
  onClose,
  resultId,
  checkpointName,
  stepName,
  onUploadComplete,
}: CheckpointPhotoUploadDialogProps) {
  const [dragActive, setDragActive] = useState(false);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [isUploading, setIsUploading] = useState(false);
  const [uploadStatus, setUploadStatus] = useState<'idle' | 'success' | 'error'>('idle');
  const [errorMessage, setErrorMessage] = useState<string>('');
  const { token, checkAuth } = useAuth();

  // Generate standardized filename: {SubprocessName} {CheckpointName}
  // Example: "Mould Preparation Clean no debris 2026-01-17.jpg"
  const generateFileName = (file: File): string => {
    const timestamp = new Date().toISOString().split('T')[0]; // YYYY-MM-DD
    // Fallback if props are undefined to prevent crash
    const safeStepName = stepName || 'Step';
    const safeCheckpointName = checkpointName || 'Checkpoint';

    const cleanStepName = safeStepName.replace(/\s+/g, ' ').trim();
    const cleanCheckpointName = safeCheckpointName.replace(/\s+/g, ' ').trim();

    const nameWithoutExtension = `${cleanStepName} ${cleanCheckpointName} ${timestamp}`;
    const extension = file.name.split('.').pop()?.toLowerCase() || 'jpg';

    // Remove any invalid characters for filenames
    const sanitizedName = nameWithoutExtension
      .replace(/[<>:"|?*]/g, '')
      .replace(/\s+/g, '_')
      .toLowerCase();

    return `${sanitizedName}.${extension}`;
  };

  const handleFileSelect = (event: React.ChangeEvent<HTMLInputElement>) => {
    const files = event.target.files;
    if (files && files.length > 0) {
      const file = files[0];

      // Validate file type
      if (!file.type.startsWith('image/')) {
        setErrorMessage('Please select a valid image file (JPG, PNG, etc.)');
        setSelectedFile(null);
        return;
      }

      // Validate file size (max 10MB)
      if (file.size > 10 * 1024 * 1024) {
        setErrorMessage('File size must be less than 10MB');
        setSelectedFile(null);
        return;
      }

      setSelectedFile(file);
      setErrorMessage('');
      setUploadStatus('idle');
    }
  };

  const handleUpload = async () => {
    if (!selectedFile) {
      setErrorMessage('Please select a file to upload');
      return;
    }

    try {
      setIsUploading(true);
      setErrorMessage('');

      // Check auth status first
      const isAuthValid = await checkAuth();
      if (!isAuthValid || !token) {
        throw new Error('Session expired. Please log in again.');
      }

      const formData = new FormData();
      const renamedFile = new File(
        [selectedFile],
        generateFileName(selectedFile),
        { type: selectedFile.type }
      );

      formData.append('file', renamedFile);
      formData.append('bucket', 'checkpoint-photos');
      formData.append('resultId', resultId.toString());

      const response = await fetch(`/api/checkpoints/${resultId}/upload`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`
        },
        body: formData,
      });

      if (!response.ok) {
        if (response.status === 401) {
          throw new Error('Session expired. Please log in again.');
        }
        let errorData;
        try {
          errorData = await response.json();
        } catch (e) {
          // ignore parsing error
        }
        throw new Error(errorData?.error || `Upload failed: ${response.statusText}`);
      }

      const result = await response.json();
      console.log('Upload successful:', result);

      // Notify parent of success (which will trigger data refresh)
      setUploadStatus('success');

      // Close dialog after brief delay
      setTimeout(() => {
        resetDialog();
        onUploadComplete(result.publicUrl);
        onClose();
      }, 1500);
    } catch (error) {
      console.error('Upload error:', error);
      setErrorMessage(error instanceof Error ? error.message : 'Upload failed');
      setUploadStatus('error');
    } finally {
      setIsUploading(false);
    }
  };

  const resetDialog = () => {
    setSelectedFile(null);
    setUploadStatus('idle');
    setErrorMessage('');
  };

  const handleClose = () => {
    resetDialog();
    onClose();
  };

  return (
    <Dialog open={isOpen} onOpenChange={handleClose}>
      <DialogContent className="sm:max-w-[500px] bg-slate-900 border-slate-700">
        <DialogHeader>
          <DialogTitle className="text-white text-lg font-bold">
            Upload Checkpoint Photo
          </DialogTitle>
          <DialogDescription className="text-slate-400">
            {stepName} - {checkpointName}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-4">
          {/* File Name Preview */}
          <div className="bg-slate-800 rounded-lg p-3 border border-slate-700">
            <div className="text-xs text-slate-500 mb-1">Generated Filename:</div>
            <div className="text-sm font-mono text-slate-300 break-all">
              {selectedFile
                ? generateFileName(selectedFile)
                : `${stepName || 'Step'} ${checkpointName || 'Checkpoint'} YYYY-MM-DD.jpg`
              }
            </div>
          </div>

          {/* File Input */}
          <div className="space-y-2">
            <label className="text-sm text-slate-300">Select Image File</label>
            <div className="relative">
              <input
                type="file"
                accept="image/*"
                onChange={handleFileSelect}
                disabled={isUploading}
                className="hidden"
                id="photo-input"
              />
              <label
                htmlFor="photo-input"
                className={cn(
                  "flex items-center justify-center gap-2 px-4 py-6 border-2 border-dashed rounded-lg cursor-pointer transition-colors",
                  selectedFile
                    ? "border-emerald-600 bg-emerald-950/20"
                    : "border-slate-600 bg-slate-800/50 hover:bg-slate-800",
                  isUploading && "opacity-50 cursor-not-allowed"
                )}
              >
                <Upload className="w-5 h-5 text-slate-400" />
                <div className="text-center">
                  <div className="text-sm font-medium text-slate-300">
                    {selectedFile ? selectedFile.name : 'Click to select or drag file here'}
                  </div>
                  <div className="text-xs text-slate-500 mt-1">
                    JPG, PNG or other image format (max 10MB)
                  </div>
                </div>
              </label>
            </div>
          </div>

          {/* Status Messages */}
          {errorMessage && (
            <div className="flex items-start gap-2 p-3 bg-red-950/30 border border-red-700/50 rounded-lg">
              <AlertCircle className="w-5 h-5 text-red-400 flex-shrink-0 mt-0.5" />
              <div className="text-sm text-red-300">{errorMessage}</div>
            </div>
          )}

          {uploadStatus === 'success' && (
            <div className="flex items-start gap-2 p-3 bg-emerald-950/30 border border-emerald-700/50 rounded-lg">
              <CheckCircle className="w-5 h-5 text-emerald-400 flex-shrink-0 mt-0.5" />
              <div className="text-sm text-emerald-300">Photo uploaded and checkpoint validated successfully!</div>
            </div>
          )}

          {/* File Size */}
          {selectedFile && (
            <div className="text-xs text-slate-500">
              File size: {selectedFile.size < 1024 * 1024
                ? `${(selectedFile.size / 1024).toFixed(2)} KB`
                : `${(selectedFile.size / 1024 / 1024).toFixed(2)} MB`}
            </div>
          )}
        </div>

        <DialogFooter className="gap-2">
          <Button
            type="button"
            variant="outline"
            onClick={handleClose}
            className="border-slate-700 text-slate-300 hover:bg-slate-800"
            disabled={isUploading}
          >
            Cancel
          </Button>
          <Button
            onClick={handleUpload}
            disabled={!selectedFile || isUploading || uploadStatus === 'success'}
            className="bg-emerald-600 hover:bg-emerald-700 disabled:bg-slate-700"
          >
            {isUploading ? (
              <>
                <span className="animate-spin mr-2">?</span>
                Uploading...
              </>
            ) : uploadStatus === 'success' ? (
              <>
                <CheckCircle className="w-4 h-4 mr-2" />
                Uploaded
              </>
            ) : (
              <>
                <Upload className="w-4 h-4 mr-2" />
                Upload & Validate
              </>
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
