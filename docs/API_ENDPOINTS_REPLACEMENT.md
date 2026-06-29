# API Endpoints Replacement - COMPLETED ✅

## Summary
Successfully replaced all old generic material management API endpoints with new **process-driven inventory endpoints** that enforce strict MES architecture.

## What Was Replaced

### ❌ OLD ENDPOINTS (REMOVED)
1. `POST /api/materials/create` - Generic material creation with post-hoc process selection
2. `GET /api/materials/available` - Generic material retrieval
3. `POST /api/process-execution/start` - Process execution with material assignment
4. `GET /api/materials/:materialId/traceability` - Material traceability query
5. Helper function: `generateMaterialCode()` - Used wrong format (YYYY instead of PROCESS_CODE)

### ✅ NEW ENDPOINTS (IMPLEMENTED)

#### Kit Management (Process-Bound)
1. **POST /api/kits/create** - Create KIT or GLASS kit with auto-bound processId
   - Required: `kitType`, `processId`, `photoUrl`, `createdBy`
   - Process ID is NOT user-selectable (auto-bound)
   - Generates code: `KIT-{PROCESS_CODE}-{YYYYMMDD}-{SEQ}`

2. **GET /api/kits/available/:processId** - Get available kits for a process
   - Optional filter: `kitType` (KIT or GLASS)
   - Returns only AVAILABLE status kits

3. **POST /api/kits/:kitId/consume** - Mark kit as CONSUMED
   - Changes status from AVAILABLE to CONSUMED
   - Records `consumed_by` and `consumed_at`

#### Resin Management (Shared, No Process Binding)
4. **POST /api/resin/create** - Create resin lot (process-independent)
   - Required: `photoUrl`, `createdBy`
   - Starts with `available_count = 1`
   - Generates code: `RESIN-{YYYYMMDD}-{SEQ}`

5. **GET /api/resin/available** - Get all available resin lots
   - Returns only lots with `available_count > 0`
   - Available to ALL processes

6. **POST /api/resin/:resinId/consume** - Consume resin (decrement count)
   - Decrements `available_count` by 1
   - Logs consumption in `resin_consumption` table
   - Requires: `processId`, `consumedBy`

#### Inventory Overview
7. **GET /api/process/:processId/inventory** - Get inventory counts for a process
   - Returns: `kit_count`, `glass_kit_count`, `resin_lot_count`
   - Used to display "Material Kits Available: X" on UI

## ID Generation Changes

### Old Format (WRONG)
```
KIT-2026-0001    ← Used year, not process code
GLASS-2026-0001  ← Used year, not process code
RESIN-2026-0001  ← Year-based
```

### New Format (CORRECT)
```
KIT-SBSF-20260112-001        ← Includes PROCESS_CODE
GLASS-SBSF-20260112-001      ← Includes PROCESS_CODE
RESIN-20260112-001           ← No process code (shared)
```

**Why this matters**: 
- The process code in the kit ID provides immediate visual traceability
- Manufacturing can see at a glance which process a kit belongs to
- No ambiguity about what process a kit is for (it's literally in the ID)

## Database Schema Updates

### New Tables
1. **kit_inventory** - Process-specific kits
   - Required: `process_id` (FK constraint, NOT NULL)
   - Status: AVAILABLE or CONSUMED (not boolean)
   - One physical kit = one row

2. **resin_lot_inventory** - Shared resin lots
   - NO process_id (shared across all)
   - Count-based: `available_count` (integer)
   - Each consumption decrements count

3. **resin_consumption** - Audit trail
   - Logs every resin consumption
   - Links resin_lot_id, process_id, and consumed_by
   - Append-only for traceability

### Old Tables (DEPRECATED)
- `material_master` - Generic materials (no longer used)
- `material_process_intent` - Post-hoc process binding (no longer needed)
- `process_execution` - Old process tracking (no longer used)
- `material_usage` - Old material consumption (no longer used)

## Architecture Principles Enforced

### 1. Process-First Design
- User selects process → Then adds kit
- Process ID is auto-bound (NOT user-selected)
- Can't create kit without a process

### 2. Distinct Inventory Types
- **Kits**: Process-specific, one per row, status-based (AVAILABLE/CONSUMED)
- **Resin**: Shared, count-based, available to all processes

### 3. Manufacturing Traceability
- Every kit has a photo (mandatory)
- Every resin consumption is logged
- Can trace exactly which resources used in which process

### 4. No Ambiguous State
- Kit status is explicit (AVAILABLE/CONSUMED), not boolean
- Resin count is integer (multiple units), not boolean
- Process binding is enforced by FK, not just UI

## File Changes

### Modified Files
1. **[/workspaces/MES/server/index.ts](server/index.ts)**
   - Removed 5 old endpoints (~200 lines)
   - Added 7 new process-driven endpoints (~350 lines)
   - Updated imports to use new tables
   - Total: Build ✅ SUCCESS

### New Documentation Files
1. **[PROCESS_DRIVEN_INVENTORY_API.md](PROCESS_DRIVEN_INVENTORY_API.md)**
   - Complete API endpoint documentation
   - Request/response examples
   - ID generation rules
   - Workflow examples

2. **[PROCESS_DRIVEN_SCHEMA.md](PROCESS_DRIVEN_SCHEMA.md)**
   - Database schema documentation
   - Comparison with old design
   - SQL query examples
   - Migration notes

3. **[API_ENDPOINTS_REPLACEMENT.md](API_ENDPOINTS_REPLACEMENT.md)** (this file)
   - Summary of changes
   - What was replaced and why
   - Architecture principles

## Next Steps

These API endpoints are now ready, but the UI components still need updates:

### ❌ Still TODO
1. **Incoming/Glass Cutting/Degassing Pages**
   - Must show process hierarchy (nested list, not global buttons)
   - Must show available kit counts per process
   - Must have [Add Kit] button INSIDE each process row

2. **Process-Specific Add Kit Dialog**
   - Replace old MaterialCreationDialog
   - Auto-bind process ID (NO dropdown)
   - Mandatory photo upload to `kit-photos` bucket
   - Auto-generate code with correct format

3. **Manufacturing Pages**
   - Update material selection to show kit counts (not booleans)
   - Show available resin count (global)
   - On selection: decrement count, create traceability

4. **Remove Old Components**
   - Delete MaterialCreationDialog.tsx (had dropdown)
   - Delete MaterialSelectionDialog.tsx (generic selection)
   - Delete old Material components

## Testing Recommendations

### Manual API Testing
```bash
# Create a kit (auto-bound to process 1)
curl -X POST http://localhost:8001/api/kits/create \
  -H "Content-Type: application/json" \
  -d '{"kitType": "KIT", "processId": 1, "photoUrl": "photo.jpg", "createdBy": "user123"}'

# Get available kits for process 1
curl http://localhost:8001/api/kits/available/1

# Get inventory counts for process 1
curl http://localhost:8001/api/process/1/inventory

# Create resin
curl -X POST http://localhost:8001/api/resin/create \
  -H "Content-Type: application/json" \
  -d '{"photoUrl": "resin.jpg", "createdBy": "user123"}'

# Get available resin
curl http://localhost:8001/api/resin/available

# Consume resin (process 1 uses resin 1)
curl -X POST http://localhost:8001/api/resin/1/consume \
  -H "Content-Type: application/json" \
  -d '{"processId": 1, "consumedBy": "user456"}'
```

### Verification Checklist
- ✅ API endpoints build without errors
- ✅ New process-driven tables are created by schema
- ✅ ID generation uses PROCESS_CODE format
- ✅ Kits are bound to process at creation (FK enforced)
- ✅ Resin is not bound to process (no process_id in table)
- ❌ UI components updated to use new endpoints (TODO)

## Completion Status

| Component | Status | Notes |
|-----------|--------|-------|
| **Schema Design** | ✅ COMPLETE | New tables with correct structure |
| **API Endpoints** | ✅ COMPLETE | All 7 new endpoints implemented |
| **ID Generation** | ✅ COMPLETE | Uses PROCESS_CODE format |
| **Build Success** | ✅ COMPLETE | Vite build passes |
| **Documentation** | ✅ COMPLETE | Full API and schema docs |
| **UI Components** | ❌ PENDING | Needs redesign for process hierarchy |
| **Integration** | ❌ PENDING | Components need to call new endpoints |
| **Testing** | ⚠️ PARTIAL | API endpoints can be tested, UI testing blocked |

## Key Takeaway

The **infrastructure for process-driven inventory is now complete**. The database schema enforces that kits are process-bound and resin is shared. The API endpoints implement all necessary operations with correct ID generation.

The remaining work is **UI/UX layer**: updating components to navigate through processes first, then add kits within those processes, with no global "Add Kit" dialog.
