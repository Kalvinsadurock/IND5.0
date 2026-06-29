import { db } from '../db';
import { controlCheckpoints, processSteps } from '../../shared/schema';
import { eq, inArray } from 'drizzle-orm';

async function clearProcess4Checkpoints() {
    console.log('🗑️  Clearing existing checkpoints for Process 4...');

    // Get all step IDs for Process 4
    const process4Steps = await db
        .select()
        .from(processSteps)
        .where(eq(processSteps.processId, 4));

    if (process4Steps.length === 0) {
        console.log('No steps found for Process 4');
        return;
    }

    const stepIds = process4Steps.map(s => s.id);
    console.log(`Found ${stepIds.length} steps for Process 4`);

    // Delete all checkpoints for these steps
    const deleted = await db
        .delete(controlCheckpoints)
        .where(inArray(controlCheckpoints.stepId, stepIds));

    console.log(`✅ Cleared checkpoints for Process 4`);
}

clearProcess4Checkpoints()
    .then(() => {
        console.log('✅ Cleanup completed');
        process.exit(0);
    })
    .catch((error) => {
        console.error('❌ Cleanup failed:', error);
        process.exit(1);
    });
