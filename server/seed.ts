import { db } from "./db";
import { 
  processes, processSteps, controlCheckpoints, employees, moulds, supplyLots, supplyRequirements,
  parts, partStepInstances, checkpointResults, evidenceFiles
} from "@shared/schema";
import { eq, and } from "drizzle-orm";

async function seed() {
  console.log("Seeding database...");

  const allProcesses = [
    { processNumber: 10, code: "INCOMING", name: "Incoming", category: "inventory" },
    { processNumber: 20, code: "GLASS-CUT", name: "Glass Cutting", category: "inventory" },
    { processNumber: 30, code: "DEGASSING", name: "Degassing", category: "inventory" },
    { processNumber: 40, code: "SPARBOOM-SF", name: "Spar Boom - SF", category: "prefabricated" },
    { processNumber: 50, code: "SPARBOOM-PF", name: "Spar Boom - PF", category: "prefabricated" },
    { processNumber: 60, code: "PREFORM-1SF", name: "Preform Segment -1 SF", category: "prefabricated" },
    { processNumber: 70, code: "PREFORM-1PF", name: "Preform Segment -1 PF", category: "prefabricated" },
    { processNumber: 80, code: "GLUECAP-SEG1-LE", name: "Glue Cap Preform Seg1 - LE", category: "prefabricated" },
    { processNumber: 90, code: "GLUECAP-SEG1-TE", name: "Glue Cap Preform Seg1 - TE", category: "prefabricated" },
    { processNumber: 100, code: "PREFORM-2SF", name: "Preform Segment -2 SF", category: "prefabricated" },
    { processNumber: 110, code: "PREFORM-2PF", name: "Preform Segment -2 PF", category: "prefabricated" },
    { processNumber: 120, code: "LE-WEB", name: "LE Web", category: "prefabricated" },
    { processNumber: 130, code: "TE-WEB", name: "TE Web", category: "prefabricated" },
    { processNumber: 140, code: "HAT-WEB-SEG4", name: "Hat Web Seg-4", category: "prefabricated" },
    { processNumber: 150, code: "WEB-SEG5", name: "Web Segment -5", category: "prefabricated" },
    { processNumber: 160, code: "FLATBACK-WEB", name: "Flatback Web", category: "prefabricated" },
    { processNumber: 170, code: "GLUECAP-LE", name: "Glue Cap LE (Root TE & LE)", category: "prefabricated" },
    { processNumber: 180, code: "GLUECAP-TE", name: "Glue Cap TE (Root TE & LE)", category: "prefabricated" },
    { processNumber: 190, code: "TE-GLUECAP-2", name: "Trailing Edges Glue Cap - 2", category: "prefabricated" },
    { processNumber: 200, code: "LE-CAP", name: "Leading Edges Cap", category: "prefabricated" },

    { processNumber: 210, code: "SHELL-SF", name: "Shell Suction Face", category: "moulding" },
    { processNumber: 220, code: "SHELL-PF", name: "Shell Pressure Face", category: "moulding" },
    { processNumber: 230, code: "WEB-ASSY", name: "Web Assembly (Glactica)", category: "moulding" },
    { processNumber: 240, code: "WEG-REINF", name: "Weg & Reinforcement Bonding", category: "moulding" },
    { processNumber: 250, code: "SHELL-BOND", name: "Shell Bonding", category: "moulding" },

    { processNumber: 260, code: "TRIMMING", name: "Trimming", category: "finishing" },
    { processNumber: 270, code: "LAMINATION", name: "Lamination & Assembly", category: "finishing" },
    { processNumber: 280, code: "DRILLING-VG", name: "Drilling and Vortex Generator Assembly", category: "finishing" },
    { processNumber: 290, code: "MILLING-STUD", name: "Blade Milling & Drilling, Stud(Pins) Bolt Assembly", category: "finishing" },
    { processNumber: 300, code: "SURFACE-PAINT", name: "Blade Surface Sanding, Putty, LEP and Painting", category: "finishing" },
    { processNumber: 310, code: "FINAL-ASSY", name: "Final Assembly", category: "finishing" },
    { processNumber: 320, code: "BALANCING", name: "Blade Balancing & Set Formation", category: "finishing" },
    { processNumber: 330, code: "STICKERING", name: "Stickering", category: "finishing" },
    { processNumber: 340, code: "LOADING-STORAGE", name: "Blade Loading into Fixture and Storage", category: "finishing" },
    { processNumber: 350, code: "GLUECAP-HAT4", name: "Glue Cap Hat Web Segment 4", category: "finishing" },
  ];

  for (const proc of allProcesses) {
    const [insertedProcess] = await db.insert(processes).values(proc).onConflictDoNothing().returning();
    
    if (insertedProcess) {
      console.log(`Created process: ${proc.name}`);
      
      const steps = getStepsForProcess(proc.processNumber);
      for (const step of steps) {
        const [insertedStep] = await db.insert(processSteps).values({
          processId: insertedProcess.id,
          ...step,
        }).onConflictDoNothing().returning();

        if (insertedStep) {
          const checkpointsForStep = getCheckpointsForStep(`${proc.processNumber}.${step.stepNumber.split('.')[1]}`);
          for (let i = 0; i < checkpointsForStep.length; i++) {
            await db.insert(controlCheckpoints).values({
              stepId: insertedStep.id,
              ...checkpointsForStep[i],
              sequence: i + 1,
              isGating: checkpointsForStep[i].measuredBy === "QA",
            }).onConflictDoNothing();
          }

          const supplyReqs = getSupplyRequirementsForStep(`${proc.processNumber}.${step.stepNumber.split('.')[1]}`);
          for (const req of supplyReqs) {
            await db.insert(supplyRequirements).values({
              stepId: insertedStep.id,
              ...req,
            }).onConflictDoNothing();
          }
        }
      }
    }
  }

  const mouldData = [
    { code: "M1", name: "Mould 1 - Primary Shell" },
    { code: "M2", name: "Mould 2 - Secondary Shell" },
    { code: "M3", name: "Mould 3 - Backup" },
  ];

  for (const mould of mouldData) {
    await db.insert(moulds).values(mould).onConflictDoNothing();
  }
  console.log("Created moulds");

  const supplyData = [
    { lotNumber: "CF-2024-001", materialType: "Carbon Fiber Prepreg", quantity: "500.00", unit: "m2", state: "usable" },
    { lotNumber: "CF-2024-002", materialType: "Carbon Fiber Prepreg", quantity: "300.00", unit: "m2", state: "qa_pending" },
    { lotNumber: "ADH-2024-001", materialType: "Structural Adhesive", quantity: "50.00", unit: "kg", state: "usable" },
    { lotNumber: "ADH-2024-002", materialType: "Structural Adhesive", quantity: "25.00", unit: "kg", state: "ready", curingEndTime: new Date(Date.now() + 2 * 60 * 60 * 1000) },
    { lotNumber: "RES-2024-001", materialType: "Epoxy Resin", quantity: "100.00", unit: "kg", state: "usable" },
    { lotNumber: "VAC-2024-001", materialType: "Vacuum Bag Film", quantity: "200.00", unit: "m2", state: "usable" },
    { lotNumber: "REL-2024-001", materialType: "Release Agent", quantity: "20.00", unit: "L", state: "usable" },
    { lotNumber: "GL-2024-001", materialType: "Glass Layers", quantity: "800.00", unit: "m2", state: "usable" },
    { lotNumber: "GL-2024-002", materialType: "Glass Layers", quantity: "450.00", unit: "m2", state: "usable" },
    { lotNumber: "RES-2024-002", materialType: "Resin", quantity: "150.00", unit: "kg", state: "usable" },
    { lotNumber: "RES-2024-003", materialType: "Resin", quantity: "75.00", unit: "kg", state: "qa_pending" },
  ];

  for (const supply of supplyData) {
    await db.insert(supplyLots).values(supply as any).onConflictDoNothing();
  }
  console.log("Created supply lots");

  const employeeData = [
    { employeeCode: "EMP001", name: "Rajesh Kumar", role: "Operator", department: "Production", skills: ["Layer build up", "De-bulking"], currentShift: "A" },
    { employeeCode: "EMP002", name: "Priya Sharma", role: "Operator", department: "Production", skills: ["Trimming", "Drilling"], currentShift: "A" },
    { employeeCode: "EMP003", name: "Amit Patel", role: "QA Inspector", department: "Quality", skills: ["C-Scan", "Final Inspection"], currentShift: "A" },
    { employeeCode: "EMP004", name: "Sunita Devi", role: "Operator", department: "Production", skills: ["Assembly", "Cleaning"], currentShift: "B" },
    { employeeCode: "EMP005", name: "Vikram Singh", role: "Supervisor", department: "Production", skills: ["All operations"], currentShift: "A" },
    { employeeCode: "EMP006", name: "Meera Reddy", role: "QA Inspector", department: "Quality", skills: ["Documentation", "Final Inspection"], currentShift: "B" },
    { employeeCode: "EMP007", name: "Arjun Nair", role: "Operator", department: "Production", skills: ["Curing cycle", "De-moulding"], currentShift: "B" },
    { employeeCode: "EMP008", name: "Deepa Menon", role: "Operator", department: "Production", skills: ["Labelling", "Storage"], currentShift: "C" },
  ];

  for (const emp of employeeData) {
    await db.insert(employees).values(emp).onConflictDoNothing();
  }
  console.log("Created employees");

  const sparBoomProcess = await db.select().from(processes).where(eq(processes.processNumber, 40));
  
  if (sparBoomProcess.length > 0) {
    const processId = sparBoomProcess[0].id;
    
    const sparBoomSteps = await db.select().from(processSteps).where(eq(processSteps.processId, processId));
    
    if (sparBoomSteps.length > 0) {
      const step7 = sparBoomSteps.find(s => s.stepNumber === "40.07");
      const step12 = sparBoomSteps.find(s => s.stepNumber === "40.12");
      const step6 = sparBoomSteps.find(s => s.stepNumber === "40.06");
      
      const allMoulds = await db.select().from(moulds);
      const mould1 = allMoulds[0];
      
      const sampleParts = [
        { 
          partNumber: "40-2024-0001", 
          processId, 
          bladeType: "Spar Boom SF", 
          status: "in_progress", 
          priority: "normal",
          entryReason: "normal",
          currentStepId: step7?.id,
        },
        { 
          partNumber: "40-2024-0002", 
          processId, 
          bladeType: "Spar Boom SF", 
          status: "completed", 
          priority: "normal",
          entryReason: "normal",
          currentStepId: step12?.id,
        },
        { 
          partNumber: "40-2024-0003", 
          processId, 
          bladeType: "Spar Boom SF", 
          status: "completed", 
          priority: "normal",
          entryReason: "normal",
          currentStepId: step12?.id,
        },
        { 
          partNumber: "40-2024-0004", 
          processId, 
          bladeType: "Spar Boom SF", 
          status: "completed", 
          priority: "high",
          entryReason: "normal",
          currentStepId: step12?.id,
        },
      ];
      
      for (const partData of sampleParts) {
        const [insertedPart] = await db.insert(parts).values(partData as any).onConflictDoNothing().returning();
        
        if (insertedPart) {
          console.log(`Created part: ${partData.partNumber}`);
          
          const completedStepCount = partData.status === "completed" ? 12 : 6;
          
          for (let i = 0; i < completedStepCount; i++) {
            const step = sparBoomSteps[i];
            if (!step) continue;
            
            const isCompleted = i < completedStepCount - 1 || partData.status === "completed";
            
            const [instance] = await db.insert(partStepInstances).values({
              partId: insertedPart.id,
              stepId: step.id,
              status: isCompleted ? "completed" : "active",
              startedAt: new Date(Date.now() - (12 - i) * 60 * 60 * 1000),
              endedAt: isCompleted ? new Date(Date.now() - (11 - i) * 60 * 60 * 1000) : null,
              elapsedMinutes: isCompleted ? step.targetCycleTime : Math.floor(step.targetCycleTime * 0.6),
              mouldId: step.requiresMould ? mould1?.id : null,
            } as any).onConflictDoNothing().returning();
            
            if (instance && isCompleted) {
              const stepCheckpoints = await db.select().from(controlCheckpoints).where(eq(controlCheckpoints.stepId, step.id));
              
              for (const checkpoint of stepCheckpoints) {
                const [result] = await db.insert(checkpointResults).values({
                  instanceId: instance.id,
                  checkpointId: checkpoint.id,
                  actualValue: checkpoint.specification,
                  isConforming: true,
                  qaResult: checkpoint.measuredBy === "QA" ? "pass" : null,
                  qaConfirmedAt: checkpoint.measuredBy === "QA" ? new Date() : null,
                } as any).onConflictDoNothing().returning();
                
                if (result && step.stepNumber === "40.06" && partData.status === "completed") {
                  await db.insert(evidenceFiles).values({
                    resultId: result.id,
                    storageKey: "evidence/40-2024/" + partData.partNumber + "/vacuum_test_report.pdf",
                    fileName: "Vacuum_Test_Report.pdf",
                    fileType: "application/pdf",
                  } as any).onConflictDoNothing();
                  
                  await db.insert(evidenceFiles).values({
                    resultId: result.id,
                    storageKey: "evidence/40-2024/" + partData.partNumber + "/vacuum_gauge_reading.jpg",
                    fileName: "Vacuum_Gauge_Reading.jpg",
                    fileType: "image/jpeg",
                  } as any).onConflictDoNothing();
                }
              }
            }
          }
        }
      }
      console.log("Created sample Spar Boom SF parts with step instances and evidence");
    }
  }

  console.log("Seeding complete!");
  process.exit(0);
}

function getStepsForProcess(processNumber: number) {
  const baseSteps: Record<number, Array<{ stepNumber: string; name: string; sequence: number; targetCycleTime: number; requiresMould?: boolean; isInspection?: boolean; isStorage?: boolean; isBatchable?: boolean }>> = {
    40: [
      { stepNumber: "40.01", name: "Mould Preparation", sequence: 1, targetCycleTime: 30, requiresMould: true },
      { stepNumber: "40.02", name: "Lower Process Material Placement", sequence: 2, targetCycleTime: 25, requiresMould: true },
      { stepNumber: "40.03", name: "Loading of Glass Rolls", sequence: 3, targetCycleTime: 110, requiresMould: true },
      { stepNumber: "40.04", name: "Layup & Core Material Placement", sequence: 4, targetCycleTime: 50, requiresMould: true },
      { stepNumber: "40.05", name: "Upper Process Materials Placement", sequence: 5, targetCycleTime: 45, requiresMould: true },
      { stepNumber: "40.06", name: "Vacuum Test", sequence: 6, targetCycleTime: 30, requiresMould: true },
      { stepNumber: "40.07", name: "Infusion", sequence: 7, targetCycleTime: 180, requiresMould: true },
      { stepNumber: "40.08", name: "Curing", sequence: 8, targetCycleTime: 480, requiresMould: true, isBatchable: true },
      { stepNumber: "40.09", name: "Debagging & Demould", sequence: 9, targetCycleTime: 45, requiresMould: true },
      { stepNumber: "40.10", name: "Trimming", sequence: 10, targetCycleTime: 60 },
      { stepNumber: "40.11", name: "Inspection", sequence: 11, targetCycleTime: 45, isInspection: true },
      { stepNumber: "40.12", name: "Storage", sequence: 12, targetCycleTime: 15, isStorage: true },
    ],
    210: [
      { stepNumber: "210.01", name: "Mould preparation", sequence: 1, targetCycleTime: 60, requiresMould: true },
      { stepNumber: "210.02", name: "Gelcoat application", sequence: 2, targetCycleTime: 45, requiresMould: true },
      { stepNumber: "210.03", name: "Core placement", sequence: 3, targetCycleTime: 120, requiresMould: true },
      { stepNumber: "210.04", name: "Layup", sequence: 4, targetCycleTime: 240, requiresMould: true },
      { stepNumber: "210.05", name: "Vacuum bagging", sequence: 5, targetCycleTime: 60, requiresMould: true },
      { stepNumber: "210.06", name: "Infusion", sequence: 6, targetCycleTime: 180, requiresMould: true },
      { stepNumber: "210.07", name: "Inspection", sequence: 7, targetCycleTime: 30, isInspection: true },
    ],
    220: [
      { stepNumber: "220.01", name: "Mould preparation", sequence: 1, targetCycleTime: 60, requiresMould: true },
      { stepNumber: "220.02", name: "Gelcoat application", sequence: 2, targetCycleTime: 45, requiresMould: true },
      { stepNumber: "220.03", name: "Core placement", sequence: 3, targetCycleTime: 120, requiresMould: true },
      { stepNumber: "220.04", name: "Layup", sequence: 4, targetCycleTime: 240, requiresMould: true },
      { stepNumber: "220.05", name: "Vacuum bagging", sequence: 5, targetCycleTime: 60, requiresMould: true },
      { stepNumber: "220.06", name: "Infusion", sequence: 6, targetCycleTime: 180, requiresMould: true },
      { stepNumber: "220.07", name: "Inspection", sequence: 7, targetCycleTime: 30, isInspection: true },
    ],
    230: [
      { stepNumber: "230.01", name: "Pre-cure check", sequence: 1, targetCycleTime: 15 },
      { stepNumber: "230.02", name: "Oven loading", sequence: 2, targetCycleTime: 30, isBatchable: true },
      { stepNumber: "230.03", name: "Curing cycle", sequence: 3, targetCycleTime: 480, isBatchable: true },
      { stepNumber: "230.04", name: "Cool down", sequence: 4, targetCycleTime: 120 },
      { stepNumber: "230.05", name: "Post-cure inspection", sequence: 5, targetCycleTime: 30, isInspection: true },
    ],
    330: [
      { stepNumber: "330.01", name: "Visual inspection", sequence: 1, targetCycleTime: 60, isInspection: true },
      { stepNumber: "330.02", name: "Dimensional check", sequence: 2, targetCycleTime: 120, isInspection: true },
      { stepNumber: "330.03", name: "Weight verification", sequence: 3, targetCycleTime: 30, isInspection: true },
      { stepNumber: "330.04", name: "Documentation review", sequence: 4, targetCycleTime: 45, isInspection: true },
      { stepNumber: "330.05", name: "Final approval", sequence: 5, targetCycleTime: 30, isInspection: true },
    ],
  };

  if (baseSteps[processNumber]) {
    return baseSteps[processNumber];
  }

  return [
    { stepNumber: `${processNumber}.01`, name: "Setup", sequence: 1, targetCycleTime: 30 },
    { stepNumber: `${processNumber}.02`, name: "Execution", sequence: 2, targetCycleTime: 60 },
    { stepNumber: `${processNumber}.03`, name: "Quality check", sequence: 3, targetCycleTime: 20, isInspection: true },
    { stepNumber: `${processNumber}.04`, name: "Handover", sequence: 4, targetCycleTime: 15 },
  ];
}

function getCheckpointsForStep(stepNumber: string) {
  const checkpoints: Record<string, Array<{ characteristic: string; specification: string; tolerance: string; measurementMethod: string; frequency: string; measuredBy: string }>> = {
    "40.01": [
      { characteristic: "Mould surface condition", specification: "Clean, no debris", tolerance: "N/A", measurementMethod: "Visual inspection", frequency: "Before start", measuredBy: "Operator" },
      { characteristic: "Release agent application", specification: "Uniform coverage", tolerance: "N/A", measurementMethod: "Visual check", frequency: "100%", measuredBy: "Operator" },
    ],
    "40.02": [
      { characteristic: "Peel ply placement", specification: "Per procedure", tolerance: "N/A", measurementMethod: "Visual check", frequency: "Each layer", measuredBy: "Operator" },
      { characteristic: "Material alignment", specification: "Parallel to mould edge", tolerance: "±2mm", measurementMethod: "Ruler", frequency: "Each placement", measuredBy: "Operator" },
    ],
    "40.03": [
      { characteristic: "Glass roll orientation", specification: "As per drawing", tolerance: "±2°", measurementMethod: "Angle gauge", frequency: "Each roll", measuredBy: "Operator" },
      { characteristic: "Glass roll overlap", specification: "50mm minimum", tolerance: "+10mm", measurementMethod: "Ruler", frequency: "Each joint", measuredBy: "Operator" },
      { characteristic: "Glass layers count", specification: "Per layup schedule", tolerance: "N/A", measurementMethod: "Count check", frequency: "Each section", measuredBy: "Operator" },
    ],
    "40.04": [
      { characteristic: "Core material position", specification: "As per drawing", tolerance: "±5mm", measurementMethod: "Template", frequency: "Each placement", measuredBy: "Operator" },
      { characteristic: "Layup sequence", specification: "Per layup schedule", tolerance: "N/A", measurementMethod: "Visual check", frequency: "Each layer", measuredBy: "QA" },
    ],
    "40.05": [
      { characteristic: "Upper material coverage", specification: "100% coverage", tolerance: "N/A", measurementMethod: "Visual inspection", frequency: "100%", measuredBy: "Operator" },
      { characteristic: "Mesh & film placement", specification: "Per procedure", tolerance: "N/A", measurementMethod: "Visual check", frequency: "Each part", measuredBy: "Operator" },
    ],
    "40.06": [
      { characteristic: "Vacuum drops", specification: "20mbar in 10mins", tolerance: "Max 25mbar", measurementMethod: "Vacuum gauge, stop watch", frequency: "Each test", measuredBy: "QA" },
      { characteristic: "Pre-heat of Mould", specification: "40°C", tolerance: "±5°C", measurementMethod: "IR Gun", frequency: "Before infusion", measuredBy: "QA" },
      { characteristic: "Resin:Hardener Grade", specification: "Leuna:Infu 1a/Hard 175 ABC:YD 585/TH 7255E, TH 7257E", tolerance: "N/A", measurementMethod: "Label Visual", frequency: "Each batch", measuredBy: "QA" },
    ],
    "40.07": [
      { characteristic: "Resin flow rate", specification: "Per calculation", tolerance: "±10%", measurementMethod: "Flow meter", frequency: "Continuous", measuredBy: "Operator" },
      { characteristic: "Infusion completion", specification: "100% wet-out", tolerance: "N/A", measurementMethod: "Visual check", frequency: "100%", measuredBy: "Operator" },
    ],
    "40.08": [
      { characteristic: "Cure temperature", specification: "80°C", tolerance: "±5°C", measurementMethod: "Thermocouple", frequency: "Continuous", measuredBy: "Autoclave" },
      { characteristic: "Cure time", specification: "480 min", tolerance: "+30 min", measurementMethod: "Timer", frequency: "Each cycle", measuredBy: "Autoclave" },
    ],
    "40.09": [
      { characteristic: "Surface damage", specification: "No visible damage", tolerance: "N/A", measurementMethod: "Visual inspection", frequency: "100%", measuredBy: "Operator" },
      { characteristic: "Demould cleanliness", specification: "Clean separation", tolerance: "N/A", measurementMethod: "Visual check", frequency: "Each part", measuredBy: "Operator" },
    ],
    "40.10": [
      { characteristic: "Trim dimensions", specification: "As per drawing", tolerance: "±2mm", measurementMethod: "Tape measure", frequency: "Each part", measuredBy: "Operator" },
      { characteristic: "Edge quality", specification: "No delamination", tolerance: "N/A", measurementMethod: "Visual check", frequency: "100%", measuredBy: "Operator" },
    ],
    "40.11": [
      { characteristic: "Dimensional check", specification: "As per drawing", tolerance: "Per drawing", measurementMethod: "CMM", frequency: "100%", measuredBy: "QA" },
      { characteristic: "Visual inspection", specification: "No defects", tolerance: "N/A", measurementMethod: "Visual check", frequency: "100%", measuredBy: "QA" },
      { characteristic: "Weight verification", specification: "Per spec", tolerance: "±2%", measurementMethod: "Scale", frequency: "Each part", measuredBy: "QA" },
      { characteristic: "Documentation complete", specification: "All records", tolerance: "N/A", measurementMethod: "Document review", frequency: "Each part", measuredBy: "QA" },
    ],
    "40.12": [
      { characteristic: "Storage location", specification: "Designated area", tolerance: "N/A", measurementMethod: "Visual check", frequency: "Each part", measuredBy: "Operator" },
      { characteristic: "Protection applied", specification: "Protective cover", tolerance: "N/A", measurementMethod: "Visual check", frequency: "Each part", measuredBy: "Operator" },
    ],
  };
  
  return checkpoints[stepNumber] || [];
}

function getSupplyRequirementsForStep(stepNumber: string) {
  const requirements: Record<string, Array<{ materialType: string; quantityRequired: string; unit: string; isMandatory: boolean }>> = {
    "40.01": [
      { materialType: "Release Agent", quantityRequired: "0.5", unit: "L", isMandatory: true },
    ],
    "40.02": [
      { materialType: "Vacuum Bag Film", quantityRequired: "10.00", unit: "m2", isMandatory: true },
    ],
    "40.03": [
      { materialType: "Glass Layers", quantityRequired: "50.00", unit: "m2", isMandatory: true },
    ],
    "40.04": [
      { materialType: "Carbon Fiber Prepreg", quantityRequired: "25.00", unit: "m2", isMandatory: true },
    ],
    "40.07": [
      { materialType: "Resin", quantityRequired: "15.00", unit: "kg", isMandatory: true },
    ],
  };
  
  return requirements[stepNumber] || [];
}

seed().catch(console.error);
