import { db } from '../db';
import { controlCheckpoints } from '../../shared/schema';
import { eq } from 'drizzle-orm';

async function checkCheckpointsForStep13() {
    console.log('🔍 Checking checkpoints for Step 13...\n');

    // Query checkpoints for step 13
    const checkpoints = await db
        .select()
        .from(controlCheckpoints)
        .where(eq(controlCheckpoints.stepId, 13));

    console.log(`Found ${checkpoints.length} checkpoints for Step 13`);

    if (checkpoints.length > 0) {
        console.log('\nFirst checkpoint:');
        console.log(JSON.stringify(checkpoints[0], null, 2));

        console.log('\nQA checkpoints:');
        const qaCheckpoints = checkpoints.filter(cp =>
            cp.verifiedBy === 'QA' || cp.verifiedBy === 'prod/QA' || cp.requiresQaValidation === true
        );
        console.log(`QA checkpoints: ${qaCheckpoints.length}`);
    }
}

checkCheckpointsForStep13()
    .then(() => {
        console.log('\n✅ Check completed');
        process.exit(0);
    })
    .catch((error) => {
        console.error('❌ Check failed:', error);
        process.exit(1);
    });
