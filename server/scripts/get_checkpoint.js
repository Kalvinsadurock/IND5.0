import { db } from '../db';
import { controlCheckpoints } from '../../shared/schema';
import { eq } from 'drizzle-orm';

(async () => {
    const cp = await db.select().from(controlCheckpoints).limit(1);
    console.log('Checkpoint ID:', cp[0]?.id);
})();
