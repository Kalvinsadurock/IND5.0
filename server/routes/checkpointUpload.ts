console.log('[checkpointUpload] router loaded');
import express, { Request, Response } from 'express';
import multer from 'multer';
import { requireAuth } from '../auth';
import { db } from '../db';
import { eq } from 'drizzle-orm';
import { controlCheckpoints, processSteps, checkpointResults, partStepInstances, evidenceFiles, employees } from '../../shared/schema';
import { supabaseAdmin } from '../lib/supabaseAdmin';
import { randomUUID } from 'crypto';

const router = express.Router();
const upload = multer({ storage: multer.memoryStorage() });

// POST /api/checkpoints/:resultId/upload
router.post('/checkpoints/:resultId/upload', requireAuth, upload.single('file'), async (req: Request, res: Response) => {
    try {
        console.log('[Upload] Starting upload handler');
        const resultId = parseInt(req.params.resultId);
        if (isNaN(resultId)) {
            return res.status(400).json({ success: false, error: 'Invalid resultId' });
        }

        // 1. Get Checkpoint Result to find instanceId and checkpointId
        console.log('[Upload] Looking up result:', resultId);
        const [result] = await db
            .select()
            .from(checkpointResults) // Ensure checkpointResults is imported
            .where(eq(checkpointResults.id, resultId));
        console.log('[Upload] Result found:', !!result);

        if (!result) {
            return res.status(404).json({ success: false, error: 'Checkpoint result not found' });
        }

        // 2. Get Step Instance to find stepId
        console.log('[Upload] Looking up instance:', result.instanceId);
        const [instance] = await db
            .select()
            .from(partStepInstances) // Ensure partStepInstances is imported
            .where(eq(partStepInstances.id, result.instanceId));
        console.log('[Upload] Instance found:', !!instance);

        if (!instance) {
            return res.status(500).json({ success: false, error: 'Step instance not found' });
        }

        // 3. Get Step to find processId (for path)
        console.log('[Upload] Looking up step:', instance.stepId);
        const [step] = await db
            .select()
            .from(processSteps)
            .where(eq(processSteps.id, instance.stepId));
        console.log('[Upload] Step found:', !!step);

        if (!step) {
            return res.status(500).json({ success: false, error: 'Step definition not found' });
        }

        if (!req.file) {
            return res.status(400).json({ success: false, error: 'No file provided' });
        }

        const originalName = req.file.originalname;
        const safeName = originalName.replace(/[^a-zA-Z0-9._-]/g, '_');
        const uuid = randomUUID();
        // Path: process/{processId}/step/{stepId}/checkpoint/{checkpointId}/{uuid}_{filename}
        const storagePath = `process/${step.processId}/step/${step.id}/checkpoint/${result.checkpointId}/${uuid}_${safeName}`;

        console.log('[Upload] Uploading to Supabase:', storagePath);
        const { data, error } = await supabaseAdmin.storage
            .from('checkpoint-photos')
            .upload(storagePath, req.file.buffer, { contentType: req.file.mimetype, upsert: true });
        console.log('[Upload] Supabase complete. Error:', error);

        if (error) {
            console.error('Upload error:', error);
            return res.status(500).json({ success: false, error: 'Upload failed', details: error.message });
        }

        console.log('[Upload] Getting public URL');
        const urlResult = await supabaseAdmin.storage.from('checkpoint-photos').getPublicUrl(storagePath);
        const publicUrl = urlResult?.data?.publicUrl || '';

        // 4. Look up Employee ID (if authenticated)
        let capturedById: number | null = null;
        if ((req as any).user && (req as any).user.id) {
            console.log('[Upload] Looking up employee for user:', (req as any).user.id);
            const [employee] = await db
                .select()
                .from(employees)
                .where(eq(employees.auth_user_id, (req as any).user.id));
            if (employee) {
                capturedById = employee.id;
            }
        }

        // 5. Insert into evidence_files table
        console.log('[Upload] Inserting evidence record');
        await db.insert(evidenceFiles).values({
            resultId: resultId,
            storageKey: storagePath,
            fileName: originalName,
            fileType: req.file.mimetype,
            fileSize: req.file.size,
            capturedById: capturedById,
        });
        console.log('[Upload] Success');

        return res.json({ success: true, path: storagePath, publicUrl });
    } catch (err) {
        console.error('Checkpoint upload handler error:', err);
        return res.status(500).json({ success: false, error: 'Internal server error' });
    }
});

export default router;
