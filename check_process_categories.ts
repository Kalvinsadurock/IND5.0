import { db } from './server/db';
import { processes } from './shared/schema';

async function checkProcessCategories() {
    const allProcesses = await db
        .select({
            id: processes.id,
            processNumber: processes.processNumber,
            name: processes.name,
            category: processes.category,
        })
        .from(processes)
        .orderBy(processes.processNumber);

    console.log('\n=== Process Categories ===\n');
    console.log('ID\tProcess#\tCategory\t\tName');
    console.log('─'.repeat(80));

    allProcesses.forEach(p => {
        console.log(`${p.id}\t${p.processNumber}\t\t${p.category.padEnd(15)}\t${p.name}`);
    });

    console.log('\n=== Summary ===');
    const moulding = allProcesses.filter(p => p.category === 'moulding');
    const prefab = allProcesses.filter(p => p.category === 'prefabricated' || p.category !== 'moulding');

    console.log(`Moulding processes: ${moulding.length}`);
    console.log(`Prefabricated processes: ${prefab.length}`);

    process.exit(0);
}

checkProcessCategories().catch(console.error);
