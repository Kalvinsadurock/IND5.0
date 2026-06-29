import { db } from '../db';
import { employees, controlCheckpoints } from '../../shared/schema';
import { eq } from 'drizzle-orm';

async function main() {
    console.log('--- FETCHING VERIFICATION DATA ---');

    // 1. Get an employee for login
    const employee = await db.query.employees.findFirst({
        // Just grab the first one, or specific one if known
    });

    if (employee) {
        console.log(`EMPLOYEE_CODE=${employee.employeeCode}`);
        console.log(`EMPLOYEE_EMAIL=${employee.email}`);
    } else {
        console.error('No employees found!');
    }

    // 2. Get a valid control checkpoint ID
    const checkpoint = await db.query.controlCheckpoints.findFirst();
    if (checkpoint) {
        console.log(`CHECKPOINT_ID=${checkpoint.id}`);
    } else {
        console.error('No control checkpoints found!');
    }

    console.log('--- END ---');
    process.exit(0);
}

main().catch(console.error);
