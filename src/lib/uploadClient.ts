export interface UploadResult {
  success: boolean;
  path?: string;
  publicUrl?: string;
  error?: string;
}

export interface UploadOptions {
  processId?: number | string;
  stepId?: number | string;
  filename?: string;
}

/**
 * Upload a kit photo to the server-side upload proxy.
 * The server will verify the JWT from localStorage and upload using the service role key.
 * Returns the JSON response from the server.
 */
export type ProgressCallback = (progressPercent: number) => void;

export async function uploadKitPhoto(
  file: File,
  options: UploadOptions = {},
  onProgress?: ProgressCallback,
): Promise<UploadResult> {
  const fd = new FormData();
  fd.append('file', file);
  if (options.processId !== undefined) fd.append('processId', String(options.processId));
  if (options.stepId !== undefined) fd.append('stepId', String(options.stepId));
  if (options.filename) fd.append('filename', options.filename);

  const token = typeof window !== 'undefined' ? localStorage.getItem('auth_token') : null;

  return await new Promise<UploadResult>((resolve) => {
    const xhr = new XMLHttpRequest();
    xhr.open('POST', '/api/uploads/kit-photo');
    if (token) xhr.setRequestHeader('Authorization', `Bearer ${token}`);

    xhr.upload.onprogress = (ev) => {
      if (ev.lengthComputable && onProgress) {
        const pct = Math.round((ev.loaded / ev.total) * 100);
        onProgress(pct);
      }
    };

    xhr.onreadystatechange = () => {
      if (xhr.readyState !== 4) return;
      const status = xhr.status;
      let data: any = null;
      try {
        data = JSON.parse(xhr.responseText || '{}');
      } catch (e) {
        // ignore
      }

      if (status >= 200 && status < 300) {
        resolve({ success: true, path: data.path, publicUrl: data.publicUrl });
      } else {
        resolve({ success: false, error: data?.error || data?.message || `Upload failed (${status})` });
      }
    };

    xhr.onerror = () => resolve({ success: false, error: 'Network error during upload' });
    xhr.send(fd);
  });
}

/** Example usage:
 * const file = input.files[0];
 * const result = await uploadKitPhoto(file, { processId: 40, stepId: 3, filename: 'kit.jpg' });
 * if (result.success) console.log('Uploaded to', result.path, result.publicUrl);
 */
