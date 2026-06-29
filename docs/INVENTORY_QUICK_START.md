# QUICK START: Process-Driven Inventory System

## What Changed
Your MES material management system was completely redesigned to be **process-centric** instead of generic.

### The Key Insight
**Old (Wrong)**: "Add Kit" (generic) → Then pick which process
**New (Correct)**: Pick a process → Then "Add Kit" (auto-bound)

## API Endpoints at a Glance

### Creating Inventory Items
```bash
# Create a KIT for process 1 (process ID is auto-bound, NOT selectable)
POST /api/kits/create
{
  "kitType": "KIT",              # or "GLASS"
  "processId": 1,                # REQUIRED - auto-bound, not user input
  "photoUrl": "kit-photos/...",  # from Supabase upload
  "createdBy": "user123"
}

# Create RESIN (no process binding - shared across all processes)
POST /api/resin/create
{
  "photoUrl": "resin-photos/...",
  "createdBy": "user123"
}
```

### Viewing Inventory
```bash
# Get kits for a process
GET /api/kits/available/1?kitType=KIT

# Get all available resin
GET /api/resin/available

# Get counts for a process (shows: "Material Kits Available: 5")
GET /api/process/1/inventory
```

### Using Inventory
```bash
# Mark a kit as consumed
POST /api/kits/1/consume
{
  "consumedBy": "user456",
  "processInstanceId": 789  # optional: which manufacturing run
}

# Consume resin (decrements count)
POST /api/resin/2/consume
{
  "processId": 1,            # which process is consuming
  "consumedBy": "user456",
  "processInstanceId": 789   # optional
}
```

## ID Formats

| Item | Format | Example |
|------|--------|---------|
| Material Kit | `KIT-{PROCESS_CODE}-{YYYYMMDD}-{SEQ}` | `KIT-SBSF-20260112-001` |
| Glass Kit | `GLASS-{PROCESS_CODE}-{YYYYMMDD}-{SEQ}` | `GLASS-SBSF-20260112-001` |
| Resin | `RESIN-{YYYYMMDD}-{SEQ}` | `RESIN-20260112-002` |

**Note**: PROCESS_CODE comes from the `processes.code` field in database

## Database Tables

### kit_inventory (Process-Specific)
```
kit_code        | KIT-SBSF-20260112-001
process_id      | 1                          (REQUIRED FK)
kit_type        | 'KIT' or 'GLASS'
status          | 'AVAILABLE' or 'CONSUMED'  (not boolean!)
photo_url       | kit-photos/{kit_id}.jpg
created_by      | user123
consumed_by     | user456                    (null if AVAILABLE)
consumed_at     | 2026-01-12T10:30:00Z       (null if AVAILABLE)
```

### resin_lot_inventory (Shared)
```
resin_code      | RESIN-20260112-001
available_count | 5                          (integer count, not boolean!)
photo_url       | resin-photos/{id}.jpg
created_by      | user123
```

### resin_consumption (Audit Trail)
```
resin_lot_id    | 2
process_id      | 1                          (which process used it)
consumed_by     | user456
consumed_at     | 2026-01-12T10:30:00Z
```

## UI Pattern (What You Need to Build)

### Old Pattern (WRONG) ❌
```
┌─ INCOMING PAGE ──────────────────┐
│  [+ Add Material Kit]  (global)   │
│  [+ Add Glass Kit]     (global)   │
│  [+ Add Resin]         (global)   │
└──────────────────────────────────┘
    ↓ User clicks "Add Material Kit"
┌─ ADD MATERIAL DIALOG ────────────┐
│  Kit Type: KIT                    │
│  Process: [dropdown] ← USER PICKS │
│  Photo: [upload]                  │
│  [Create]                         │
└──────────────────────────────────┘
```

### New Pattern (CORRECT) ✅
```
┌─ INCOMING PAGE ──────────────────────────┐
│  Process: Spar Boom SF                    │
│    Material Kits Available: 5             │
│    Glass Kits Available: 2                │
│    [+ Add Kit]      ← bound to THIS       │
│    [+ Add Glass]    ← process already!    │
│                                            │
│  Process: Moulding                        │
│    Material Kits Available: 3             │
│    Glass Kits Available: 1                │
│    [+ Add Kit]      ← bound to THIS       │
│    [+ Add Glass]    ← process!            │
│                                            │
│  Resin Available: 12 units (global)       │
│  [+ Add Resin]      ← no process binding  │
└──────────────────────────────────────────┘
    ↓ User clicks "[+ Add Kit]" in Spar Boom SF row
┌─ ADD KIT DIALOG (process auto-bound) ────┐
│  Kit Type: KIT                            │
│  Process: Spar Boom SF  (READ-ONLY! ✓)  │
│  Photo: [upload]                          │
│  [Create] → Generates: KIT-SBSF-20260112- │
└─────────────────────────────────────────┘
```

## File Locations

### API Implementation
- [/workspaces/MES/server/index.ts](server/index.ts) - All 7 endpoints (lines 1579-1800)

### Database Schema
- [/workspaces/MES/shared/schema.ts](shared/schema.ts) - Tables defined here

### Documentation
- [PROCESS_DRIVEN_INVENTORY_API.md](PROCESS_DRIVEN_INVENTORY_API.md) - Detailed API docs
- [PROCESS_DRIVEN_SCHEMA.md](PROCESS_DRIVEN_SCHEMA.md) - Database schema guide
- [API_ENDPOINTS_REPLACEMENT.md](API_ENDPOINTS_REPLACEMENT.md) - What was changed and why

## Common Mistakes to Avoid

### ❌ DON'T: Create kit without processId
```javascript
// WRONG - this will fail!
POST /api/kits/create
{
  "kitType": "KIT",
  "photoUrl": "...",
  "createdBy": "user"
  // Missing: processId
}
```

### ✅ DO: Always include processId
```javascript
// CORRECT - processId is required
POST /api/kits/create
{
  "kitType": "KIT",
  "processId": 1,        // REQUIRED
  "photoUrl": "...",
  "createdBy": "user"
}
```

### ❌ DON'T: Use old endpoints
```javascript
// WRONG - these don't exist anymore
POST /api/materials/create           // REMOVED
GET /api/materials/available         // REMOVED
POST /api/process-execution/start    // REMOVED
```

### ✅ DO: Use new endpoints
```javascript
// CORRECT - use these instead
POST /api/kits/create                // Use this
POST /api/resin/create               // Use this
GET /api/process/:id/inventory       // Use this
```

## Debugging Tips

### "Kit not found" error
- Check that `kitId` exists in database
- Use `GET /api/kits/available/{processId}` to list available kits

### "Process not found" error
- Check that `processId` exists in `processes` table
- Verify the process has a valid `code` field (used for ID generation)

### "Resin not available" error
- Check that `available_count > 0`
- Use `GET /api/resin/available` to see all available resin

### Kit code format wrong (e.g., `KIT-2026-0001`)
- Old code! This is from the previous (wrong) system
- Make sure you're using the CORRECT endpoint
- Old code used year (2026), new code uses PROCESS_CODE

## References

- **TypeScript Types**: See [/workspaces/MES/shared/schema.ts](shared/schema.ts#L77)
- **Endpoints**: See [/workspaces/MES/server/index.ts](server/index.ts#L1579)
- **Photo Storage**: Supabase bucket "kit-photos"
- **Photo Format**: `kit-photos/{kit_id}.jpg`

## Summary

1. ✅ Kits are **process-bound** at creation (FK enforced)
2. ✅ Resin is **shared** across all processes
3. ✅ IDs include **PROCESS_CODE** for traceability
4. ✅ Status is **explicit** (AVAILABLE/CONSUMED, not boolean)
5. ✅ Resin uses **count** (integer), not boolean
6. ✅ Full **audit trail** via resin_consumption table
7. ✅ **Process-first UI**: navigate → then add kit (not add kit → then pick process)
