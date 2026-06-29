import { db } from '../db';
import { controlCheckpoints, checkpointResults, evidenceFiles } from '../../shared/schema';
import { sql, notInArray } from 'drizzle-orm';

async function cleanupOldCheckpoints() {
    console.log('🧹 Cleaning up old checkpoint data...\n');

    try {
        // Step 1: Get all checkpoint IDs that have the new fields (process_step is not null)
        const newCheckpoints = await db
            .select({ id: controlCheckpoints.id })
            .from(controlCheckpoints)
            .where(sql`${controlCheckpoints.processStep} IS NOT NULL`);

        const newCheckpointIds = newCheckpoints.map(cp => cp.id);
        console.log(`Found ${newCheckpointIds.length} new checkpoints to keep`);

        if (newCheckpointIds.length === 0) {
            console.log('⚠️  No new checkpoints found. Aborting cleanup.');
            return;
        }

        // Step 2: Delete evidence files for old checkpoint results
        console.log('\n🗑️  Deleting old evidence files...');
        const oldResults = await db
            .select({ id: checkpointResults.id })
            .from(checkpointResults)
            .where(notInArray(checkpointResults.checkpointId, newCheckpointIds));

        const oldResultIds = oldResults.map(r => r.id);

        if (oldResultIds.length > 0) {
            await db
                .delete(evidenceFiles)
                .where(sql`${evidenceFiles.resultId} IN (${sql.join(oldResultIds.map(id => sql`${id}`), sql`, `)})`);
            console.log(`✅ Deleted evidence files for ${oldResultIds.length} old results`);
        }

        // Step 3: Delete old checkpoint results
        console.log('\n🗑️  Deleting old checkpoint results...');
        const deletedResults = await db
            .delete(checkpointResults)
            .where(notInArray(checkpointResults.checkpointId, newCheckpointIds));
        console.log(`✅ Deleted old checkpoint results`);

        // Step 4: Delete old checkpoints
        console.log('\n🗑️  Deleting old checkpoints...');
        const deletedCheckpoints = await db
            .delete(controlCheckpoints)
            .where(sql`${controlCheckpoints.processStep} IS NULL`);
        console.log(`✅ Deleted old checkpoints`);

        console.log('\n✅ Cleanup completed successfully!');
        console.log(`\nSummary:`);
        console.log(`  - Kept ${newCheckpointIds.length} new checkpoints`);
        console.log(`  - Deleted old checkpoint results and evidence`);
        console.log(`  - Deleted old checkpoint definitions`);

    } catch (error) {
        console.error('❌ Cleanup failed:', error);
        throw error;
    }
}

cleanupOldCheckpoints()
    .then(() => {
        console.log('\n✅ All cleanup operations completed');
        process.exit(0);
    })
    .catch((error) => {
        console.error('❌ Cleanup script failed:', error);
        process.exit(1);
    });
