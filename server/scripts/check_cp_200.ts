import { db } from '../db';
import { controlCheckpoints } from '../../shared/schema';
import { eq } from 'drizzle-orm';

async function main() {
    console.log('Checking for checkpoint 200...');
    const result = await db.select().from(controlCheckpoints).where(eq(controlCheckpoints.id, 200));
    console.log('Checkpoint 200:', result);
    if (result.length === 0) {
        console.log('DOES NOT EXIST');
    } else {
        console.log('EXISTS');
    }
    process.exit(0);
}

main();
