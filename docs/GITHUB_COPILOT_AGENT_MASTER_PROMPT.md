# 🤖 GitHub Copilot Coding Agent - Master Prompt
## ISA-95 MES Database Refactoring - Complete Implementation

**Status:** Ready for autonomous execution
**Scope:** Database migration + ORM refactoring + API rewrite + PLM integration
**Estimated Effort:** 4-6 hours automated execution
**Rollback Plan:** Included in migration SQL

---

## 📋 COMPLETE TASK SPECIFICATION

You are an expert manufacturing systems engineer tasked with executing a **production-safe database refactoring** for a MES (Manufacturing Execution System) application. The refactoring eliminates dual status fields, implements ISA-95 work execution model, and prepares for PLM (Product Lifecycle Management) integration with Teamcenter/3DEX.

### 🎯 PRIMARY OBJECTIVES

1. **Apply Database Migration** → Execute 8-phase incremental migration (`drizzle/2026_mes_execution_refactor.sql`)
2. **Update Drizzle ORM** → Replace `shared/schema.ts` with ISA-95 compliant refactored schema
3. **Rewrite Dashboard APIs** → Convert status-based queries to view-based queries
4. **Implement PLM Sync** → Create service layer for Teamcenter/3DEX synchronization
5. **Type Safety Audit** → Ensure all React components use new schema types
6. **Create Documentation** → Update API docs and migration guides

### ⚠️ CRITICAL CONSTRAINTS

- **No breaking changes during migration phases 1-6** (can run simultaneously with old code)
- **Phase 7 is breaking** (legacy columns dropped) - comment this out initially
- **Database consistency** - validation PL/pgSQL blocks must pass
- **Data integrity** - 100% of existing execution history must transfer
- **Rollback safety** - complete rollback script must be tested

---

## 📂 REPOSITORY STRUCTURE

```
/workspaces/MES/
├── drizzle/
│   ├── 2026_mes_execution_refactor.sql        [MIGRATION - Ready]
│   └── meta/
├── shared/
│   ├── schema.ts                               [CURRENT - Will be replaced]
│   └── schema_refactored.ts                    [NEW - Target schema]
├── server/
│   ├── index.ts                                [API endpoints - Needs rewrite]
│   ├── db.ts                                   [DB connection]
│   └── api_dashboard_refactored.ts             [NEW - View-based queries]
├── src/app/
│   ├── components/                             [React components - Need type updates]
│   └── pages/
└── package.json
```

---

## 🔄 EXECUTION FLOW (7 SEQUENTIAL STEPS)

### **STEP 1: Database Migration (Non-Breaking Phases 1-6)**

**Target Files:**
- `drizzle/2026_mes_execution_refactor.sql` (phases 1-6 only)

**Actions:**
1. ✅ Verify Supabase PostgreSQL connection in `server/db.ts`
2. ✅ Read the migration file (8 phases, production-safe structure)
3. ✅ Execute PHASES 1-6 against staging database:
   - PHASE 1: Add new columns (execution_state, qa_state, step_payload, execution_context, blocked_reason) with CHECK constraints
   - PHASE 2: Backfill data from legacy fields using CASE statements
   - PHASE 3: Create 4 derived views (current_part_step, part_execution_summary, step_execution_timeline, checkpoint_execution)
   - PHASE 4: Create inventoryConsumption table (ISA-95 traceability)
   - PHASE 5: Create employeeAssignments table (denormalize from JSONB)
   - PHASE 6: Create PLM tables (plmObjects, plmSyncEvents)
4. ⏭️ SKIP PHASE 7 & 8 for now (legacy column drops - breaking change)
5. ✅ Run validation queries to confirm views produce correct data
6. ✅ Compare row counts: parts, part_step_instances, checkpoint_results (should be identical)

**Success Criteria:**
- All 6 phases execute without errors
- Views return non-NULL data
- No data loss in backfill
- Migration log file created

---

### **STEP 2: Update Drizzle ORM Schema**

**Target Files:**
- `shared/schema.ts` (current - REPLACE with refactored version)
- `shared/schema_refactored.ts` (reference - already created)

**Actions:**
1. ✅ Read `shared/schema_refactored.ts` (480+ lines, ISA-95 compliant schema)
2. ✅ Create backup: `shared/schema.ts.bak`
3. ✅ Replace `shared/schema.ts` with content from `schema_refactored.ts`:
   - **Removed Tables:**
     - (parts.status column) ❌ - use part_execution_summary instead
     - (parts.current_step_id column) ❌ - use current_part_step view instead
     - (checkpointResults.qaApproved, isGatePassed, qaResult columns) ❌ - use single qaState field
   
   - **New/Modified Tables:**
     - partStepInstances: Add executionState (single source of truth), qaState, stepPayload, executionContext
     - checkpointResults: Single qaState field, evidenceMetadata JSONB
     - inventoryConsumption: Link parts→steps→supplies
     - employeeAssignments: Explicit employee assignments per step instance
     - plmObjects: Map entity_id → plm_uid (Teamcenter/3DEX)
     - plmSyncEvents: Audit trail of push/pull operations
   
   - **Enums:**
     - ExecutionState: planned, active, paused, waiting, blocked, breakdown, completed, rework
     - QAState: pending, pass, conditional_pass, fail

4. ✅ TypeScript compilation check (verify no errors)
5. ✅ Generate type definitions for all new schema

**Success Criteria:**
- `npm run type-check` passes
- No TypeScript errors in `shared/schema.ts`
- All 12 export types present (Select + Insert pairs)
- Drizzle relations compile correctly

---

### **STEP 3: Rewrite Dashboard APIs**

**Target Files:**
- `server/index.ts` (main API file - update imports and queries)
- `server/api_dashboard_refactored.ts` (reference - already created)

**Actions:**
1. ✅ Read `server/api_dashboard_refactored.ts` (10 query examples + helper functions)
2. ✅ Locate all dashboard API endpoints in `server/index.ts`:
   - Search for patterns: `WHERE status =`, `WHERE parts.status`, `parts.current_step_id`, `qaApproved`
   - Identify affected endpoints (getActiveParts, getBlockedParts, getPartTimeline, getQAStatus, etc.)

3. ✅ Replace queries with view-based versions:
   
   | Old Pattern | New Pattern | View |
   |------------|------------|------|
   | `WHERE parts.status = 'in_progress'` | `FROM part_execution_summary WHERE overall_state = 'in_progress'` | part_execution_summary |
   | `parts.current_step_id` | `FROM current_part_step` | current_part_step |
   | `checkpointResults.qaApproved AND isGatePassed` | `checkpointResults.qa_state = 'pass'` | checkpoint_execution |
   | Manual step ordering by sequence | `FROM step_execution_timeline ORDER BY sequence` | step_execution_timeline |

4. ✅ Update endpoint response DTOs:
   - Add `overallState` derived from `part_execution_summary`
   - Add `qaState` from `checkpoint_execution`
   - Add step timeline including timing data
   - Add inventory consumption data

5. ✅ Test API endpoints:
   - `GET /api/dashboard/active-parts` (uses part_execution_summary)
   - `GET /api/parts/:id/timeline` (uses step_execution_timeline)
   - `GET /api/parts/:id/qa-status` (uses checkpoint_execution)
   - `GET /api/parts/:id/inventory` (uses inventory_consumption)

**Success Criteria:**
- All endpoints return data from views (not legacy tables)
- Response times acceptable (<500ms)
- No 500 errors in logs
- All step sequences ordered correctly
- QA status shows consolidated state

---

### **STEP 4: Update React Components**

**Target Files:**
- `src/app/components/**/*.tsx` (all components referencing parts.status)
- `src/app/pages/**/*.tsx` (all pages)

**Actions:**
1. ✅ Search codebase for status references:
   ```bash
   grep -r "\.status" src/ --include="*.tsx" --include="*.ts"
   grep -r "current_step_id" src/ --include="*.tsx"
   grep -r "qaApproved" src/ --include="*.tsx"
   ```

2. ✅ Update component imports:
   ```typescript
   // OLD:
   import { parts, checkpointResults } from "../../shared/schema";
   
   // NEW:
   import { parts, partStepInstances, partExecutionSummary } from "../../shared/schema";
   ```

3. ✅ Update type annotations:
   ```typescript
   // OLD:
   interface PartData {
     status: string;
     current_step_id: string;
   }
   
   // NEW:
   interface PartData {
     overallState: ExecutionState;  // Derived from view
     currentStep?: PartStep;         // From current_part_step view
   }
   ```

4. ✅ Update component logic:
   - Remove `if (part.status === 'in_progress')` patterns
   - Replace with `if (part.overallState === 'active')`
   - Update visual indicators to use new state enums
   - Update QA status displays to use single `qa_state` field

5. ✅ Test in browser:
   - Verify dashboard loads without errors
   - Check step timelines display correctly
   - Verify QA status displays (pass/fail/conditional_pass)
   - Check inventory consumption tab

**Success Criteria:**
- No TypeScript errors in components
- Dashboard renders correctly
- All state indicators display properly
- Inventory and QA views functional

---

### **STEP 5: Implement PLM Sync Service**

**Target Files:**
- `server/plm-sync.ts` (NEW - create this file)
- `server/index.ts` (add PLM endpoints)

**Actions:**
1. ✅ Create `server/plm-sync.ts` with PLM service layer:
   ```typescript
   export interface PLMSyncConfig {
     plmSystem: 'teamcenter' | '3dexperience' | 'other';
     apiUrl: string;
     apiKey: string;
     enabled: boolean;
   }
   
   export class PLMSyncService {
     // Methods:
     // pushPartToPLM(part: Part): Promise<PLMObject>
     // pullPartFromPLM(plmUid: string): Promise<Part>
     // syncProcess(process: Process): Promise<PLMObject>
     // recordSyncEvent(event: PLMSyncEvent): Promise<void>
     // getObjectMappings(entityId: string): Promise<PLMObject[]>
   }
   ```

2. ✅ Implement push/pull handlers:
   - **Push (MES → PLM):** When part created/modified, push to Teamcenter
   - **Pull (PLM → MES):** When part revision changes in Teamcenter, update MES
   - **Conflict Resolution:** PLM revision wins, MES as staging ground

3. ✅ Create API endpoints:
   - `POST /api/plm/sync-part/:partId` - Manual sync trigger
   - `GET /api/plm/status/:partId` - Get sync status
   - `GET /api/plm/mappings/:entityId` - Get PLM object mappings

4. ✅ Add event logging:
   - Record all sync events in `plm_sync_events` table
   - Track push/pull operations, timestamps, status
   - Enable audit trail for compliance

**Success Criteria:**
- PLM sync service compiles without errors
- Endpoints callable via API
- Sync events logged to database
- Can handle network failures gracefully

---

### **STEP 6: Create Migration Documentation**

**Target Files:**
- `MIGRATION_RUNBOOK.md` (NEW)
- `API_MIGRATION_GUIDE.md` (NEW)

**Actions:**
1. ✅ Create `MIGRATION_RUNBOOK.md`:
   ```
   # MES Database Migration Runbook
   
   ## Pre-Migration Checklist
   - [ ] Backup production database
   - [ ] Verify staging database copy
   - [ ] Review migration SQL (2026_mes_execution_refactor.sql)
   - [ ] Stop all API services
   
   ## Migration Steps
   1. Execute PHASE 1-6 on staging
   2. Validate views with test queries
   3. Deploy updated Drizzle schema
   4. Deploy new API code
   5. Test all dashboard endpoints
   6. Monitor logs for errors
   
   ## Rollback Steps
   If migration fails:
   1. Run rollback SQL (provided in migration file)
   2. Revert Drizzle schema to schema.ts.bak
   3. Restart API services
   ```

2. ✅ Create `API_MIGRATION_GUIDE.md`:
   ```
   # API Migration Guide (Status → Execution Views)
   
   ## Old vs New Patterns
   - `WHERE parts.status = 'in_progress'` → `FROM part_execution_summary WHERE overall_state IN ('active')`
   - `parts.current_step_id` → `FROM current_part_step`
   - `checkpointResults.qaApproved` → `checkpointResults.qa_state = 'pass'`
   
   ## Dashboard Endpoints
   - GET /api/dashboard/active-parts (uses part_execution_summary)
   - GET /api/parts/:id/timeline (uses step_execution_timeline)
   - GET /api/parts/:id/qa-status (uses checkpoint_execution)
   ```

**Success Criteria:**
- Documentation complete and accurate
- Step-by-step runbook provided
- Rollback procedures documented

---

### **STEP 7: Create Pull Request with Summary**

**Target Files:**
- Create new git branch `feat/isa95-refactor`
- Commit all changes with clear messages

**Actions:**
1. ✅ Create git branch:
   ```bash
   git checkout -b feat/isa95-refactor
   ```

2. ✅ Stage and commit changes:
   ```bash
   git add drizzle/2026_mes_execution_refactor.sql
   git add shared/schema.ts
   git add server/api_dashboard_refactored.ts
   git add server/plm-sync.ts
   git add src/app/components/*.tsx
   git add MIGRATION_RUNBOOK.md
   git add API_MIGRATION_GUIDE.md
   
   git commit -m "feat: ISA-95 database refactoring with execution views and PLM integration
   
   - Migrate from dual status fields to single execution_state source of truth
   - Create 4 derived views (current_part_step, part_execution_summary, step_execution_timeline, checkpoint_execution)
   - Update Drizzle ORM schema to ISA-95 compliant design
   - Refactor dashboard APIs to use views instead of denormalized columns
   - Implement PLM sync service for Teamcenter/3DEX integration
   - Update React components with new schema types
   - Add comprehensive migration and API documentation
   
   BREAKING CHANGE: parts.status field removed (use part_execution_summary.overall_state)
   BREAKING CHANGE: parts.current_step_id removed (use current_part_step view)
   
   Fixes #123"
   ```

3. ✅ Create Pull Request with description:
   ```
   ## ISA-95 MES Database Refactoring
   
   ### Changes
   - [x] Database migration (8 phases, production-safe)
   - [x] Drizzle ORM schema update (ISA-95 aligned)
   - [x] Dashboard API rewrite (view-based queries)
   - [x] React component type updates
   - [x] PLM integration tables and service
   - [x] Migration documentation
   
   ### Testing
   - [x] Migration phases 1-6 validated on staging
   - [x] API endpoints tested
   - [x] Dashboard renders without errors
   - [x] Type safety verified (npm run type-check)
   
   ### Migration Path
   - Non-breaking phases 1-6 can run with old code
   - Phase 7 (legacy column drops) is breaking - requires code deployment
   - Complete rollback script included
   ```

**Success Criteria:**
- PR created with clear description
- All commits present and well-organized
- Ready for code review

---

## 📊 VALIDATION CHECKLIST

After each step, verify:

### Step 1: Database Migration
- [ ] Migration executes without errors
- [ ] Views return data (verify with SELECT * FROM current_part_step LIMIT 1)
- [ ] Row counts match (parts ≈ part_execution_summary)
- [ ] Backfill data accuracy (spot-check 10 random parts)

### Step 2: Drizzle ORM
- [ ] TypeScript compilation passes (npm run type-check)
- [ ] No unused imports
- [ ] All relations export correctly
- [ ] Type definitions match database schema

### Step 3: API Rewrite
- [ ] All endpoints return 200 status
- [ ] Response data includes new view fields
- [ ] No 500 errors in logs
- [ ] Response times < 500ms

### Step 4: React Components
- [ ] No TypeScript errors
- [ ] Dashboard renders without console errors
- [ ] All state indicators display
- [ ] Navigation works correctly

### Step 5: PLM Service
- [ ] Service compiles without errors
- [ ] API endpoints callable
- [ ] Sync events logged to database
- [ ] Can handle missing Teamcenter gracefully

### Step 6: Documentation
- [ ] Runbook is clear and step-by-step
- [ ] API guide includes all query patterns
- [ ] Rollback procedures tested

### Step 7: Pull Request
- [ ] All files committed
- [ ] Tests pass in CI/CD
- [ ] Code review approved
- [ ] Ready to merge to main

---

## 🔐 SAFETY GUARDRAILS

**These are HARD CONSTRAINTS - do NOT skip:**

1. **Database Backup Required**
   ```bash
   # Before running migration
   pg_dump postgres://... > backup_$(date +%Y%m%d_%H%M%S).sql
   ```

2. **Staging Environment First**
   - Never run against production initially
   - Test all phases on staging copy
   - Validate view results before production deploy

3. **Validation Queries** (run before phase 7)
   ```sql
   -- Verify row counts
   SELECT 'parts' as table_name, COUNT(*) as row_count FROM parts
   UNION ALL
   SELECT 'part_step_instances', COUNT(*) FROM part_step_instances
   UNION ALL
   SELECT 'checkpoint_results', COUNT(*) FROM checkpoint_results;
   
   -- Verify view data
   SELECT COUNT(*) FROM part_execution_summary WHERE overall_state IS NOT NULL;
   SELECT COUNT(*) FROM current_part_step;
   ```

4. **Phase 7 is Breaking** (commented out)
   - Only execute after ALL code is deployed
   - After monitoring for 24+ hours with new code
   - Only if zero errors in logs

5. **Rollback Tested**
   - Keep backup of migration file
   - Test rollback procedure on staging
   - Have rollback.sql ready for emergency

---

## 📞 TROUBLESHOOTING

**Migration fails on PHASE 3 (views)?**
- Check that all source tables exist
- Verify column names match (case-sensitive)
- Run `SELECT * FROM part_step_instances LIMIT 1` to verify data exists

**API endpoints return 404?**
- Verify views created successfully
- Check Drizzle imports in `server/index.ts`
- Run `npm run type-check` for TypeScript errors

**Components show old types?**
- Clear TypeScript cache: `rm -rf node_modules/.cache`
- Rebuild: `npm run build`
- Check imports point to new schema.ts

**PLM sync fails?**
- Verify API credentials in environment variables
- Check network connectivity to Teamcenter/3DEX
- Review error logs in plm_sync_events table

---

## 📦 DELIVERABLES

After execution, this PR should contain:

✅ Database migration (8-phase, production-safe)
✅ Updated Drizzle schema (ISA-95 compliant)
✅ Refactored dashboard APIs (view-based queries)
✅ Updated React components (new schema types)
✅ PLM sync service (Teamcenter/3DEX ready)
✅ Migration runbook (step-by-step guide)
✅ API migration guide (pattern documentation)
✅ Type definitions (12 Select + Insert types)
✅ Validation queries (data integrity checks)
✅ Rollback procedures (emergency recovery)

---

## 🎓 CONTEXT FOR AI AGENT

**Key Database Concepts:**
- ISA-95: International standard for manufacturing operations management
- Work Orders (parts table) vs Work Execution (part_step_instances table)
- Derived views eliminate denormalization and improve consistency
- JSONB fields for flexible, unstructured data
- PLM objects map internal entities to external CAD systems (Teamcenter, 3DEX)

**Manufacturing Context:**
- Parts move through Process Steps (sequence matters)
- Each step has Execution State (planned, active, completed, etc.)
- Each step has QA State (pending, pass, fail)
- Steps consume Inventory (traceability required)
- Steps are executed by Employees (assignments)
- Deviations recorded in Checkpoint Results

**Technology Stack:**
- Frontend: React + TypeScript + Vite
- Backend: Node.js + Express + Drizzle ORM
- Database: Supabase PostgreSQL
- PLM: Teamcenter / 3DEX (optional integration)

---

## ⚡ EXECUTION NOTES

1. **Execute steps sequentially** (1→2→3→4→5→6→7)
2. **Do NOT skip validation** between steps
3. **Use bash scripts** for multi-step operations (avoid manual copy-paste)
4. **Create clear commit messages** for each logical change
5. **Test in browser** after component updates (don't just type-check)
6. **Monitor logs** during first API calls post-migration
7. **Keep backup** of original schema.ts until production confirmed stable

---

**Ready to execute?** This prompt contains everything needed for autonomous completion of the ISA-95 MES refactoring. The agent should follow steps 1-7 sequentially, validate at each step, and create a comprehensive PR with all changes and documentation.

Good luck! 🚀
