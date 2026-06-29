import { db } from '../db';
import { controlCheckpoints } from '../../shared/schema';
import { eq } from 'drizzle-orm';

(async () => {
    const [cp] = await db.select().from(controlCheckpoints).where(eq(controlCheckpoints.id, 1));
    console.log('Checkpoint 1 exists?', !!cp);
    if (cp) {
        console.log('StepId:', cp.stepId);
    }
})();
