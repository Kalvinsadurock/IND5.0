import express, { Request } from 'express';
import multer from 'multer';
import { supabaseAdmin, getPublicOrSignedUrl } from '../lib/supabaseAdmin';
import { verifyToken } from '../auth';

const router = express.Router();
const upload = multer({ storage: multer.memoryStorage() });

type MulterRequest = Request & { file?: Express.Multer.File };

// POST /api/uploads/kit-photo
router.post('/kit-photo', upload.single('file'), async (req, res) => {
  try {
    const authHeader = req.headers.authorization as string | undefined;
    const token = authHeader?.replace('Bearer ', '');
    if (!token) return res.status(401).json({ success: false, error: 'No authorization token provided' });

    const user = await verifyToken(token as string); // This line is unchanged
    if (!user) return res.status(401).json({ success: false, error: 'Invalid or expired token' });

    if (!(req as any).file) return res.status(400).json({ success: false, error: 'No file provided' });

    const processId = req.body.processId || 'unknown';
    const stepId = req.body.stepId || 'unknown';
    const filenameOverride = req.body.filename || (req as any).file.originalname;

    const timestamp = Date.now();
    const safeFilename = filenameOverride.replace(/[^a-zA-Z0-9._-]/g, '_');
    const storagePath = `process/${processId}/step/${stepId}/${timestamp}_${safeFilename}`;

    // Upload using supabase admin client
    const fileObj = (req as any).file;
    const { data, error } = await supabaseAdmin.storage
      .from('kit-photos')
      .upload(storagePath, fileObj.buffer, {
        contentType: fileObj.mimetype,
        upsert: true,
      });

    if (error) {
      console.error('Server upload error:', error);
      return res.status(500).json({ success: false, error: 'Upload failed' });
    }

    // Get public or signed URL
    const urlResult = await getPublicOrSignedUrl('kit-photos', storagePath);
    const publicUrl = urlResult.url || '';

    return res.json({ success: true, path: storagePath, publicUrl });
  } catch (err) {
    console.error('Upload proxy error:', err);
    return res.status(500).json({ success: false, error: 'Internal server error' });
  }
});

export default router;
