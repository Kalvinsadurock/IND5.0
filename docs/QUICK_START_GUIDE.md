# 🚀 ISA-95 Refactoring - READY TO EXECUTE

**Status:** ✅ All preparation complete  
**Effort:** 4-6 hours for full implementation  
**Risk Level:** Low (non-breaking phases 1-6, staged deployment)  
**Date:** January 15, 2026

---

## 📊 Complete Analysis Available

Your MES codebase has been comprehensively analyzed:

👉 **[CODEBASE_ANALYSIS_DETAILED.md](CODEBASE_ANALYSIS_DETAILED.md)** - Full breakdown of:
- Database & ORM (Supabase PostgreSQL + Drizzle)
- All 28 tables with schema, indexes, relationships
- Core MES entities and current implementation
- Status handling issues (dual status fields ⚠️)
- Query patterns and data redundancy
- Migration readiness assessment

---

## 📋 EXECUTION ROADMAP

### Master Prompt (Complete Guide)
👉 **[GITHUB_COPILOT_AGENT_MASTER_PROMPT.md](GITHUB_COPILOT_AGENT_MASTER_PROMPT.md)**

7-step sequential execution plan with:
- ✅ Detailed actions for each step
- ✅ Success criteria and validation
- ✅ Troubleshooting and rollback
- ✅ Code examples and patterns

---

## 🎯 STEP-BY-STEP EXECUTION

### **STEP 1: Database Migration**
**Files:** `/workspaces/MES/drizzle/2026_mes_execution_refactor.sql`

```bash
# 1. Review migration file (8 phases, production-safe structure)
cat drizzle/2026_mes_execution_refactor.sql

# 2. On STAGING database, execute PHASES 1-6:
#    - Add new columns (execution_state, qa_state, step_payload, execution_context)
#    - Backfill data from legacy fields
#    - Create 4 derived views (current_part_step, part_execution_summary, step_execution_timeline, checkpoint_execution)
#    - Create inventoryConsumption table
#    - Create employeeAssignments table
#    - Create PLM tables (plmObjects, plmSyncEvents)

# 3. Validate views:
SELECT COUNT(*) FROM current_part_step;
SELECT COUNT(*) FROM part_execution_summary WHERE overall_state IS NOT NULL;

# 4. Check row counts match:
SELECT COUNT(*) FROM parts;
SELECT COUNT(*) FROM part_execution_summary;
```

✅ **Success Criteria:**
- All phases execute without errors
- Views return data (non-NULL)
- Row counts match between tables and views
- No data loss in backfill

---

### **STEP 2: Update Drizzle ORM Schema**
**Files:**
- Current: `/workspaces/MES/shared/schema.ts`
- Refactored: `/workspaces/MES/shared/schema_refactored.ts`

```bash
# 1. Backup current schema
cp shared/schema.ts shared/schema.ts.bak

# 2. Replace with refactored version
cp shared/schema_refactored.ts shared/schema.ts

# 3. TypeScript check
npm run type-check

# 4. Verify no errors in build
npm run build
```

**Changes:**
- ❌ REMOVED: `parts.status` (use `part_execution_summary.overall_state`)
- ❌ REMOVED: `parts.currentStepId` (use `current_part_step` view)
- ❌ REMOVED: `checkpointResults.qaApproved, isGatePassed, qaResult` (use single `qaState`)
- ✅ ADDED: `partStepInstances.executionState` (single source of truth)
- ✅ ADDED: `partStepInstances.qaState` (consolidated QA)
- ✅ ADDED: `partStepInstances.stepPayload, executionContext` (JSONB for params)
- ✅ ADDED: `inventoryConsumption` (ISA-95 traceability)
- ✅ ADDED: `plmObjects, plmSyncEvents` (Teamcenter/3DEX ready)

✅ **Success Criteria:**
- `npm run type-check` passes
- No TypeScript errors
- All 12 export types present

---

### **STEP 3: Rewrite Dashboard APIs**
**Reference:** `/workspaces/MES/server/api_dashboard_refactored.ts` (10 query functions)

In `/workspaces/MES/server/index.ts`, find and update:

```typescript
// BAD (OLD):
const activeParts = await db.select()
  .from(parts)
  .where(eq(parts.status, 'in_progress')); // ⚠️ Stale data risk

// GOOD (NEW):
const activeParts = await db.execute(sql`
  SELECT * FROM part_execution_summary
  WHERE overall_state IN ('in_progress', 'blocked')
  ORDER BY priority DESC, last_activity_at DESC
`);
```

**Query Pattern Updates:**

| Old | New | Reason |
|-----|-----|--------|
| `WHERE parts.status = 'in_progress'` | `FROM part_execution_summary WHERE overall_state = 'in_progress'` | View-based, no stale data |
| `parts.currentStepId` | `FROM current_part_step` | Computed, always current |
| `checkpointResults.qaApproved AND isGatePassed` | `checkpointResults.qa_state = 'pass'` | Single field, clear intent |
| Manual sequence ordering | `FROM step_execution_timeline ORDER BY sequence` | Derived view, correct order |

**Endpoints to update:**
```
GET /api/dashboard/active-parts
GET /api/parts/:id/timeline
GET /api/parts/:id/qa-status
GET /api/parts/:id/inventory
POST /api/parts/:id/transition
```

✅ **Success Criteria:**
- All endpoints return 200 status
- Response data includes view fields
- No 500 errors in logs
- Response times < 500ms

---

### **STEP 4: Update React Components**
**Files:** `src/app/components/**/*.tsx`, `src/app/pages/**/*.tsx`

```bash
# Find all status references
grep -r "\.status" src/app/components/ --include="*.tsx"
grep -r "current_step_id" src/app/components/ --include="*.tsx"
grep -r "qaApproved" src/app/components/ --include="*.tsx"
```

For each file, update:

```typescript
// OLD:
import { parts, checkpointResults } from "../../shared/schema";

interface PartData {
  status: string;
  current_step_id: string;
}

if (part.status === 'in_progress') { ... }

// NEW:
import { parts, partStepInstances, partExecutionSummary } from "../../shared/schema";

interface PartData {
  overallState: ExecutionState;  // From view
  currentStep?: PartStep;         // From view
}

if (part.overallState === 'active') { ... }
```

✅ **Success Criteria:**
- No TypeScript errors in components
- Dashboard renders without console errors
- All state indicators display correctly
- Navigation works

---

### **STEP 5: Implement PLM Sync Service**
**Create:** `/workspaces/MES/server/plm-sync.ts`

```typescript
export interface PLMSyncConfig {
  plmSystem: 'teamcenter' | '3dexperience' | 'other';
  apiUrl: string;
  apiKey: string;
  enabled: boolean;
}

export class PLMSyncService {
  async pushPartToPLM(part: Part): Promise<PLMObject> {
    // Push to Teamcenter/3DEX
    // Record in plm_sync_events table
  }

  async pullPartFromPLM(plmUid: string): Promise<Part> {
    // Pull from Teamcenter/3DEX
    // Update MES part
  }

  async recordSyncEvent(event: PLMSyncEvent): Promise<void> {
    // Log to plm_sync_events table
  }
}
```

**Endpoints to add:**
```
POST /api/plm/sync-part/:partId
GET /api/plm/status/:partId
GET /api/plm/mappings/:entityId
```

✅ **Success Criteria:**
- Service compiles without errors
- Endpoints callable via API
- Sync events logged to database

---

### **STEP 6: Create Documentation**
**Create:** `MIGRATION_RUNBOOK.md` and `API_MIGRATION_GUIDE.md`

**MIGRATION_RUNBOOK.md:**
```markdown
# Pre-Migration
- [ ] Backup production database
- [ ] Test on staging copy
- [ ] Stop API services
- [ ] Review migration file

# Execute Phases 1-6
- [ ] Run migration phases 1-6
- [ ] Validate views (SELECT ... LIMIT 1)
- [ ] Check row counts match

# Deploy Code
- [ ] Deploy updated schema
- [ ] Deploy updated APIs
- [ ] Deploy component updates

# Validation
- [ ] API endpoints respond 200
- [ ] Dashboard loads
- [ ] QA status displays correctly

# Phase 7 (Breaking) - ONLY AFTER 24H monitoring
- [ ] Drop legacy columns
- [ ] Update indexes
```

**API_MIGRATION_GUIDE.md:**
```markdown
# Query Pattern Reference

## Finding active parts
OLD: WHERE parts.status = 'in_progress'
NEW: FROM part_execution_summary WHERE overall_state = 'in_progress'

## Current step
OLD: parts.current_step_id
NEW: FROM current_part_step

## QA status
OLD: qaApproved AND isGatePassed
NEW: qa_state = 'pass'
```

✅ **Success Criteria:**
- Documentation complete
- Step-by-step guide provided
- Rollback procedures documented

---

### **STEP 7: Create Pull Request**

```bash
# Create feature branch
git checkout -b feat/isa95-refactor

# Stage changes
git add drizzle/2026_mes_execution_refactor.sql
git add shared/schema.ts
git add server/api_dashboard_refactored.ts
git add server/plm-sync.ts
git add src/app/components/*.tsx
git add MIGRATION_RUNBOOK.md
git add API_MIGRATION_GUIDE.md

# Commit with clear message
git commit -m "feat: ISA-95 database refactoring with execution views and PLM integration

- Migrate from dual status fields to single execution_state source of truth
- Create 4 derived views (current_part_step, part_execution_summary, step_execution_timeline, checkpoint_execution)
- Update Drizzle ORM schema to ISA-95 compliant design
- Refactor dashboard APIs to use views instead of denormalized columns
- Implement PLM sync service for Teamcenter/3DEX integration
- Update React components with new schema types
- Add comprehensive migration and API documentation

BREAKING CHANGE: parts.status field removed (use part_execution_summary.overall_state)
BREAKING CHANGE: parts.currentStepId removed (use current_part_step view)

Fixes #123"

# Push and create PR
git push origin feat/isa95-refactor
```

✅ **Success Criteria:**
- PR created with description
- All files committed
- Tests pass in CI/CD

---

## 📊 VALIDATION CHECKLIST

**After STEP 1 (Database Migration):**
- [ ] Migration phases 1-6 execute without errors
- [ ] Views return data: `SELECT COUNT(*) FROM current_part_step > 0`
- [ ] Row counts match
- [ ] Backfill validation passes

**After STEP 2 (Schema Update):**
- [ ] `npm run type-check` passes
- [ ] No TypeScript errors
- [ ] All 12 types exported
- [ ] Drizzle relations compile

**After STEP 3 (API Rewrite):**
- [ ] All endpoints return 200
- [ ] Response data includes view fields
- [ ] No 500 errors
- [ ] < 500ms response time

**After STEP 4 (Components):**
- [ ] No TypeScript errors
- [ ] Dashboard renders
- [ ] State indicators display
- [ ] Navigation works

**After STEP 5 (PLM Service):**
- [ ] Service compiles
- [ ] Endpoints callable
- [ ] Events logged to database

**After STEP 6 (Documentation):**
- [ ] Runbook clear and complete
- [ ] API guide includes patterns
- [ ] Rollback documented

**After STEP 7 (PR):**
- [ ] PR created
- [ ] Tests pass
- [ ] Code review ready

---

## 🔐 CRITICAL SAFETY GATES

**BEFORE STEP 1:**
```bash
# Backup production database
pg_dump postgres://... > backup_$(date +%Y%m%d_%H%M%S).sql
```

**BEFORE PHASE 7 (Legacy column drops):**
```sql
-- Verify row counts match
SELECT 'parts' as table_name, COUNT(*) as row_count FROM parts
UNION ALL
SELECT 'part_execution_summary', COUNT(*) FROM part_execution_summary
UNION ALL
SELECT 'part_step_instances', COUNT(*) FROM part_step_instances;
```

**BEFORE PRODUCTION DEPLOY:**
- Test on staging copy first
- Monitor logs for 24 hours with new code
- Only drop legacy columns AFTER verified success

**ROLLBACK PLAN:**
Complete rollback script included in migration file. Run in emergency.

---

## 📞 TROUBLESHOOTING

**Migration fails on PHASE 3 (views)?**
- Verify all source tables exist
- Check column names (case-sensitive)
- Run `SELECT * FROM part_step_instances LIMIT 1`

**API endpoints return 404?**
- Verify views created: `SELECT * FROM part_execution_summary LIMIT 1`
- Check Drizzle imports in server/index.ts
- Run `npm run type-check`

**Components show old types?**
- Clear cache: `rm -rf node_modules/.cache`
- Rebuild: `npm run build`
- Verify imports point to new schema.ts

**PLM sync fails?**
- Check API credentials in .env
- Verify network connectivity
- Review errors in plm_sync_events table

---

## 🎓 KEY CONCEPTS

**ISA-95 Model:**
- **Work Orders** (parts) = What needs to be made
- **Work Execution** (partStepInstances) = HOW it's being made
- Never confuse the two!

**Execution States:**
- planned, active, paused, waiting, blocked, breakdown, completed, rework

**QA States:**
- pending, pass, conditional_pass (deviation), fail

**Derived Views:**
- Eliminate need for denormalized columns
- Always provide current data (never stale)
- Single source of truth

**JSONB Best Use:**
- Flexible, unstructured payloads (step parameters)
- NOT for queryable enums (use CHECK constraints)
- NOT for relationships (use junction tables)

**PLM Integration:**
- External systems (Teamcenter, 3DEX) manage CAD/PLM
- MES tracks execution and links back to PLM via plm_objects
- Sync events provide audit trail

---

## 📊 DELIVERABLES CHECKLIST

After full execution, you'll have:

✅ Database migration (8-phase, production-safe)  
✅ Updated Drizzle schema (ISA-95 compliant)  
✅ Refactored dashboard APIs (view-based queries)  
✅ Updated React components (new schema types)  
✅ PLM sync service (Teamcenter/3DEX ready)  
✅ Migration runbook (step-by-step)  
✅ API migration guide (pattern reference)  
✅ Type definitions (12 Select + Insert types)  
✅ Validation queries (data integrity)  
✅ Rollback procedures (emergency recovery)  
✅ GitHub PR (with full documentation)  

---

## 🚀 NEXT ACTION

**Choose your approach:**

### Option A: Manual Execution (Recommended)
Follow this guide step-by-step (STEP 1→7). Each step has clear actions.
- Time: 4-6 hours
- Control: You maintain oversight
- Review: Can pause between steps

### Option B: Automated via Script
Create bash script to automate repetitive operations (e.g., migrations, deployments).
- Time: 2-3 hours (scripts handle execution)
- Risk: Less human oversight
- CI/CD: Can be part of pipeline

### Option C: Request GitHub Copilot Agent
Once agent is enabled for the repo, can run:
```
Execute GITHUB_COPILOT_AGENT_MASTER_PROMPT.md
```

---

## 📚 REFERENCE FILES

- **Master Prompt:** [GITHUB_COPILOT_AGENT_MASTER_PROMPT.md](GITHUB_COPILOT_AGENT_MASTER_PROMPT.md)
- **Codebase Analysis:** [CODEBASE_ANALYSIS_DETAILED.md](CODEBASE_ANALYSIS_DETAILED.md)
- **Migration SQL:** [drizzle/2026_mes_execution_refactor.sql](drizzle/2026_mes_execution_refactor.sql)
- **Refactored Schema:** [shared/schema_refactored.ts](shared/schema_refactored.ts)
- **API Examples:** [server/api_dashboard_refactored.ts](server/api_dashboard_refactored.ts)

---

**Status: ✅ READY TO EXECUTE**

All planning, analysis, and preparation complete. Pick a step above and begin! 🚀
