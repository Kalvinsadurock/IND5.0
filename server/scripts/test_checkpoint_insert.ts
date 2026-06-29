import { db } from '../db';
import { controlCheckpoints, processSteps } from '../../shared/schema';
import { eq } from 'drizzle-orm';

async function testInsert() {
    console.log('🧪 Testing checkpoint insert...');

    // Get step 40.01
    const steps = await db
        .select()
        .from(processSteps)
        .where(eq(processSteps.stepId, 4));

    const step4001 = steps.find(s => s.stepNumber === '40.01');

    if (!step4001) {
        console.error('❌ Step 40.01 not found');
        return;
    }

    console.log(`✅ Found step: ID ${step4001.id}, Number: ${step4001.stepNumber}`);

    // Try to insert one checkpoint
    try {
        await db.insert(controlCheckpoints).values({
            stepId: step4001.id,
            processStep: '40.01',
            name: 'Test Checkpoint',
            characteristic: 'Test Characteristic',
            specification: 'Test Spec',
            tolerance: 'N/A',
            method: 'Visual',
            verifiedBy: 'QA',
            requiresQaValidation: true,
            sampleSize: '1',
            reactionPlan: 'Test Plan',
            sequence: 999,
            isGating: true,
        });
        console.log('✅ Insert successful!');
    } catch (error) {
        console.error('❌ Insert failed:', error);
    }
}

testInsert()
    .then(() => {
        console.log('✅ Test completed');
        process.exit(0);
    })
    .catch((error) => {
        console.error('❌ Test failed:', error);
        process.exit(1);
    });
