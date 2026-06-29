import { db } from '../db';
import { controlCheckpoints, processSteps } from '../../shared/schema';
import { eq } from 'drizzle-orm';

async function verifyCheckpoints() {
    console.log('🔍 Verifying checkpoint data...\n');

    // Get all Process 4 steps
    const process4Steps = await db
        .select()
        .from(processSteps)
        .where(eq(processSteps.processId, 4));

    console.log(`Found ${process4Steps.length} steps for Process 4`);

    let totalCheckpoints = 0;
    let qaCheckpoints = 0;

    for (const step of process4Steps) {
        const checkpoints = await db
            .select()
            .from(controlCheckpoints)
            .where(eq(controlCheckpoints.stepId, step.id));

        const qaCount = checkpoints.filter(cp =>
            cp.verifiedBy === 'QA' || cp.verifiedBy === 'prod/QA' || cp.requiresQaValidation === true
        ).length;

        console.log(`  Step ${step.stepNumber}: ${checkpoints.length} total, ${qaCount} QA`);

        totalCheckpoints += checkpoints.length;
        qaCheckpoints += qaCount;
    }

    console.log(`\n✅ Total checkpoints: ${totalCheckpoints}`);
    console.log(`✅ QA checkpoints: ${qaCheckpoints}`);
    console.log(`✅ Prod-only checkpoints: ${totalCheckpoints - qaCheckpoints}`);
}

verifyCheckpoints()
    .then(() => {
        console.log('\n✅ Verification completed');
        process.exit(0);
    })
    .catch((error) => {
        console.error('❌ Verification failed:', error);
        process.exit(1);
    });
