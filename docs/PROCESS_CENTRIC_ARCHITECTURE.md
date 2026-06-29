# Process-Centric MES Architecture - Visual Guide

## ❌ OLD APPROACH (WRONG)
```
┌─────────────────────────────────────────────────┐
│  Inventory Registry (ERP-Style)                 │
│                                                 │
│  ┌─────────────────────────────────────────┐   │
│  │ Global Materials List                   │   │
│  │ ├─ Material Kit #1234 (ready)           │   │
│  │ ├─ Material Kit #1235 (ready)           │   │
│  │ ├─ Glass Kit #5678 (ready)              │   │
│  │ └─ Resin Batch #9999 (ready)            │   │
│  └─────────────────────────────────────────┘   │
│                                                 │
│  When user starts process:                      │
│  "Choose a material from this list"             │
│  ↓                                              │
│  Material selected (divorced from process)      │
│                                                 │
│  Problem: Material could go to WRONG process!   │
└─────────────────────────────────────────────────┘
```

## ✅ NEW APPROACH (PROCESS-CENTRIC)
```
┌──────────────────────────────────────────────────────┐
│ INCOMING (Prepares Materials)                        │
│                                                      │
│ Global Resin: 12 Lots                              │
│ [+ Add Resin]                                       │
│                                                      │
├─ PREFABRICATED                                      │
│  ├─ Spar Boom – SF                                 │
│  │  ├─ Material Kits: 3 [Add]                      │
│  │  ├─ Glass Kits: 2 [Add]                         │
│  │  └─ Resin: 12 (shared)                          │
│  │                                                  │
│  ├─ Spar Boom – PF                                 │
│  │  ├─ Material Kits: 1 [Add]                      │
│  │  ├─ Glass Kits: 0 [Add]                         │
│  │  └─ Resin: 12 (shared)                          │
│  │                                                  │
│  └─ Preform Segment – 1 SF                         │
│     ├─ Material Kits: 2 [Add]                      │
│     ├─ Glass Kits: 1 [Add]                         │
│     └─ Resin: 12 (shared)                          │
│                                                      │
├─ MOULDING                                           │
│  ├─ Shell Suction Face                             │
│  │  ├─ Material Kits: 2 [Add]                      │
│  │  ├─ Glass Kits: 1 [Add]                         │
│  │  └─ Resin: 12 (shared)                          │
│  │                                                  │
│  └─ Shell Leading Edge                             │
│     ├─ Material Kits: 0 [Add]                      │
│     ├─ Glass Kits: 0 [Add]                         │
│     └─ Resin: 12 (shared)                          │
│                                                      │
└─ FINISHING                                          │
   ├─ Trimming                                        │
   │  ├─ Material Kits: 1 [Add]                      │
   │  ├─ Glass Kits: 0 [Add]                         │
   │  └─ Resin: 12 (shared)                          │
   │                                                  │
   └─ Sanding                                         │
      ├─ Material Kits: 3 [Add]                      │
      ├─ Glass Kits: 2 [Add]                         │
      └─ Resin: 12 (shared)                          │

User clicks: Prefab → Spar Boom SF → [Add Material Kit]
   ↓
ProcessSpecificAddKitDialog OPENS
Process: Spar Boom SF (READ-ONLY, NOT DROPDOWN)
   ↓
Upload photo → Create
   ↓
kit_inventory INSERT:
{
  process_id: 5,
  kit_type: 'KIT',
  status: 'AVAILABLE',
  kit_code: 'KIT-SBSF-20250112-001'
}
   ↓
Material Kits: 3 → 4 (automatic update)
```

## Data Flow Comparison

### ❌ OLD: Disconnected Material Registry
```
Materials Table          Processes Table
┌──────────────┐        ┌──────────────┐
│ Material #1  │        │ Process A    │
│ Material #2  │        │ Process B    │
│ Material #3  │        │ Process C    │
└──────────────┘        └──────────────┘
       ↓                       ↓
   No Link!  (User must remember which kit goes where)
   
Result: Kits can be consumed by wrong process
        Materials not traced to their origin
```

### ✅ NEW: Process-Bound Material Inventory
```
kit_inventory Table
┌───────────────────────────────────────────┐
│ id │ kit_code │ process_id │ status      │
├───────────────────────────────────────────┤
│ 1  │ KIT-SBSF │ 5          │ AVAILABLE   │← Process 5 (Spar Boom SF)
│ 2  │ KIT-SBSF │ 5          │ AVAILABLE   │← Process 5
│ 3  │ KIT-SBSF │ 5          │ CONSUMED    │← Process 5 (used already)
│ 4  │ KIT-SHELL│ 7          │ AVAILABLE   │← Process 7 (Shell Suction)
│ 5  │ KIT-TRIM │ 15         │ AVAILABLE   │← Process 15 (Trimming)
└───────────────────────────────────────────┘
     ↓ (linked to)
processes Table
┌───────────────────────────┐
│ id │ code │ name          │
├───────────────────────────┤
│ 5  │ SBSF │ Spar Boom SF  │
│ 7  │ SHELL│ Shell Suction │
│ 15 │ TRIM │ Trimming      │
└───────────────────────────┘

Result: Kit always knows which process it belongs to
        Traceability by process
        Correct material routing
```

## UI Navigation Flow

### OLD ❌
```
User in Process: Prefab → Spar Boom SF
   ↓
Click "Start Process"
   ↓
MaterialSelectionDialog opens
(shows: ALL materials in system)
   ↓
User scrolls, finds material
   ↓
Selects it
   ↓
Process starts
   ↓
Problem: Material linked post-hoc, not at creation!
```

### NEW ✅
```
User navigates to: Incoming
   ↓
Sees: Prefab → Spar Boom SF with Material Kits: 3
   ↓
Clicks: [Add Material Kit]
   ↓
ProcessSpecificAddKitDialog opens
(Process: Spar Boom SF is AUTO-BOUND, no dropdown!)
   ↓
Upload photo
   ↓
Material Kit created WITH process_id already set
   ↓
Later, user starts: Prefab → Spar Boom SF → [Start Process]
   ↓
System shows: Available kits for THIS process (3 available)
   ↓
User selects one: KIT-SBSF-20250112-001
   ↓
Process starts, kit consumed, count decrements to 2
   ↓
Success: Perfect traceability!
```

## Database Schema Alignment

### kit_inventory (NEW - Process Bound)
```
┌──────────────────────────────────────────┐
│ kit_inventory (ONE RECORD = ONE KIT)     │
├──────────────────────────────────────────┤
│ id: 123                                  │
│ kit_code: KIT-SBSF-20250112-001         │
│ process_id: 5 ← ALWAYS BOUND            │
│ kit_type: 'KIT' or 'GLASS'              │
│ status: 'AVAILABLE' or 'CONSUMED'       │
│ photo_url: 'https://...'                │
│ created_by: 'John Doe'                  │
│ process_instance_id: NULL (until used)  │
└──────────────────────────────────────────┘
     ↓ (linked to)
processes
id: 5, name: "Spar Boom – SF"
```

### resin_lot_inventory (NEW - Shared, No Process)
```
┌──────────────────────────────────────┐
│ resin_lot_inventory                  │
├──────────────────────────────────────┤
│ id: 1                                │
│ resin_code: RESIN-20250112-001       │
│ available_count: 3 ← SHARED COUNT   │
│ photo_url: 'https://...'             │
│ created_by: 'John Doe'               │
│ created_at: 2025-01-12T10:00:00Z    │
└──────────────────────────────────────┘
     ↓ (referenced by)
resin_consumption (tracks which process used it)
process_id: 5 (Spar Boom SF used 1)
process_id: 7 (Shell Suction used 1)
process_id: 15 (Trimming used 1)
     ↓
Total available: 3 - 3 = 0 left
```

## API Endpoint Flow

### Fetch Counts (Incoming Page)
```
GET /api/process/5/inventory
   ↓ (server queries)
SELECT COUNT(*) FROM kit_inventory 
WHERE process_id = 5 AND kit_type = 'KIT' AND status = 'AVAILABLE'
Result: 3

SELECT COUNT(*) FROM kit_inventory 
WHERE process_id = 5 AND kit_type = 'GLASS' AND status = 'AVAILABLE'
Result: 2

SELECT SUM(available_count) FROM resin_lot_inventory
Result: 12

   ↓ (server returns)
{
  "materialKits": 3,
  "glassKits": 2,
  "resinLots": 12
}
```

### Create Kit (from Incoming)
```
POST /api/kits/create
{
  "processId": 5,        ← AUTO-BOUND
  "kitType": "KIT",
  "photoUrl": "https://...",
  "createdBy": "John Doe"
}
   ↓ (server)
INSERT INTO kit_inventory (
  kit_code,
  process_id,
  kit_type,
  status,
  photo_url,
  created_by,
  created_at
) VALUES (
  'KIT-SBSF-20250112-001',
  5,
  'KIT',
  'AVAILABLE',
  'https://...',
  'John Doe',
  NOW()
)
   ↓ (server returns)
{
  "success": true,
  "kit": {
    "id": 124,
    "kit_code": "KIT-SBSF-20250112-001",
    "photo_url": "https://..."
  }
}
   ↓ (Incoming page refetches counts)
Material Kits: 3 → 4 ✓
```

### Consume Kit (from Manufacturing)
```
POST /api/kits/123/consume
{
  "consumedBy": "Jane Smith",
  "processInstanceId": 42
}
   ↓ (server)
UPDATE kit_inventory SET
  status = 'CONSUMED',
  consumed_by = 'Jane Smith',
  consumed_at = NOW(),
  process_instance_id = 42
WHERE id = 123
   ↓ (also send back to Incoming)
GET /api/process/5/inventory
Material Kits: 4 → 3 ✓
```

## Key Differences Summary

| Aspect | ❌ OLD | ✅ NEW |
|--------|--------|--------|
| **Material Location** | Global registry | Process-bound at creation |
| **Add Kit Dialog** | No process binding | Auto-bound process (read-only) |
| **Inventory View** | Material-centric | Process-centric |
| **Counts** | Boolean `true/false` | Numeric `3` available |
| **Resin** | Per-material | Shared globally |
| **Traceability** | Weak (post-hoc link) | Strong (process_id bound) |
| **Kit Code** | No process info | Includes PROCESS_CODE |
| **Navigation** | Find material then process | Find process then add material |
| **Consumption** | Manual selection | Dropdown of available items |

## URL Routes

### OLD ❌
```
/inventory (generic inventory screen)
/materials (material registry)
/processes (processes page)
   (Material and Process are SEPARATE)
```

### NEW ✅
```
/incoming (shows Prefab/Moulding/Finishing processes with material)
   (Process-first, material shown IN context)
/processes (shows individual process when started)
   (User navigates FROM Incoming TO process)
```

## Summary: Why This Matters

### Before ❌
- User must remember which kit goes where
- Materials can be used by wrong process
- No clear ownership
- Looks like generic ERP warehouse
- Material registry separated from processes

### After ✅
- User clicks [Add Kit] IN the process context
- Kit is automatically bound to that process
- Perfect traceability by process
- Looks like MES (process-driven manufacturing)
- Material inventory shown where it matters (Incoming, feeding downstream)

---

**The Principle**: In MES, processes are first-class citizens. Everything flows through processes.
