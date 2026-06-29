import { db } from '../db';
import { checkpointResults } from '../../shared/schema';
import { eq } from 'drizzle-orm';

async function main() {
    console.log('Checking for checkpoint result 210...');
    const result = await db.select().from(checkpointResults).where(eq(checkpointResults.id, 210));
    console.log('Result length:', result.length);
    if (result.length > 0) {
        console.log('Result found:', result[0]);
    } else {
        console.log('Result 210 NOT FOUND');
    }
    process.exit(0);
}

main();
