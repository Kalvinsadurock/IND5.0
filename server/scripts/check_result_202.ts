import { db } from '../db';
import { checkpointResults } from '../../shared/schema';
import { eq } from 'drizzle-orm';

async function main() {
    console.log('Checking for checkpoint result 202...');
    const result = await db.select().from(checkpointResults).where(eq(checkpointResults.id, 202));
    console.log('Result length:', result.length);
    if (result.length > 0) {
        console.log('Result found:', result[0]);
    } else {
        console.log('Result 202 NOT FOUND');
    }
    process.exit(0);
}

main();
