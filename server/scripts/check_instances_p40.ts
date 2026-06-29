import { db } from "../db";
import { parts, partStepInstances, processSteps } from "../../shared/schema";
import { eq } from "drizzle-orm";

async function checkInstances() {
    const partNumber = "P40-964351";

    const [part] = await db.select().from(parts).where(eq(parts.partNumber, partNumber));

    if (!part) {
        console.log("Part not found");
        return;
    }

    console.log(`Part ID: ${part.id}`);

    const instances = await db.select().from(partStepInstances)
        .where(eq(partStepInstances.partId, part.id));

    // Get step info for context
    const steps = await db.select().from(processSteps).where(eq(processSteps.processId, part.processId));
    const stepMap = new Map(steps.map(s => [s.id, s]));

    instances.forEach(inst => {
        const step = stepMap.get(inst.stepId);
        console.log(`Step ${step?.stepNumber} (${inst.stepId}): Status = ${inst.status}`);
    });
}

checkInstances().catch(console.error).finally(() => process.exit());
