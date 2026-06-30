import { db } from '../db';
import { processes, processSteps } from '../../shared/schema';
import { eq } from 'drizzle-orm';
import * as fs from 'fs';

async function checkProcesses() {
    const output: string[] = [];

    output.push('🔍 Checking existing processes and steps...\n');

    // Get all processes
    const allProcesses = await db.select().from(processes);

    output.push(`Found ${allProcesses.length} processes:`);
    allProcesses.forEach(p => {
        output.push(`  - ID: ${p.id}, Code: ${p.code}, Name: ${p.name}`);
    });

    // Find Sparboom process
    const sparboomProcess = allProcesses.find(p =>
        p.name?.toLowerCase().includes('spar') ||
        p.code?.includes('40') ||
        p.processNumber === 40
    );

    if (sparboomProcess) {
        output.push(`\n✅ Found Sparboom process: ID ${sparboomProcess.id}, Code: ${sparboomProcess.code}`);

        const steps = await db
            .select()
            .from(processSteps)
            .where(eq(processSteps.processId, sparboomProcess.id));

        output.push(`\n📋 Steps for Process ${sparboomProcess.id}:`);
        steps.forEach(s => {
            output.push(`  - Step ID: ${s.id}, Number: ${s.stepNumber}, Name: ${s.name}`);
        });
    } else {
        output.push('\n❌ No Sparboom/Process 40 found');
    }

    const result = output.join('\n');
    console.log(result);

    // Write to file
    fs.writeFileSync('tmp/process_check.txt', result);
}

checkProcesses()
    .then(() => {
        console.log('\n✅ Check completed - output saved to tmp/process_check.txt');
        process.exit(0);
    })
    .catch((error) => {
        console.error('❌ Check failed:', error);
        process.exit(1);
    });
