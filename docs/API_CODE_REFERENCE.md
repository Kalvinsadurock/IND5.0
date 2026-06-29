# API Endpoints Code Reference

## Location
All endpoints are in [/workspaces/MES/server/index.ts](server/index.ts), lines 1579-1800

## 7 New Process-Driven Endpoints

### 1. POST /api/kits/create
```typescript
// Create KIT or Glass KIT for a specific process (AUTO-BOUND)
// processId is REQUIRED and NOT user-selectable
// Returns: { success, kit: { id, kit_code, kit_type, process_id, status, photo_url, ... } }

Request:
{
  "kitType": "KIT",              // or "GLASS"
  "processId": 1,                // REQUIRED - auto-bound, not user input
  "photoUrl": "kit-photos/...",  // from Supabase upload
  "createdBy": "user123"         // user ID
}

Response (201):
{
  "success": true,
  "kit": {
    "id": 1,
    "kit_code": "KIT-SBSF-20260112-001",  // Auto-generated
    "kit_type": "KIT",
    "process_id": 1,
    "status": "AVAILABLE",
    "photo_url": "kit-photos/...",
    "created_by": "user123",
    "created_at": "2026-01-12T10:30:00Z"
  }
}
```

### 2. GET /api/kits/available/:processId
```typescript
// Get available kits for a process
// Query params: ?kitType=KIT (optional filter)
// Returns: Array of available kits for the process

Response:
[
  {
    "id": 1,
    "kit_code": "KIT-SBSF-20260112-001",
    "kit_type": "KIT",
    "process_id": 1,
    "status": "AVAILABLE",
    "photo_url": "kit-photos/...",
    "created_by": "user123",
    "created_at": "2026-01-12T10:30:00Z"
  }
]
```

### 3. POST /api/resin/create
```typescript
// Create Resin Lot (shared, not process-specific)
// No process binding - available to ALL processes
// starts with available_count = 1
// Returns: { success, resin: { id, resin_code, available_count, ... } }

Request:
{
  "photoUrl": "resin-photos/...",  // from Supabase upload
  "createdBy": "user123"           // user ID
}

Response (201):
{
  "success": true,
  "resin": {
    "id": 1,
    "resin_code": "RESIN-20260112-001",  // Auto-generated
    "available_count": 1,
    "photo_url": "resin-photos/...",
    "created_by": "user123",
    "created_at": "2026-01-12T10:30:00Z"
  }
}
```

### 4. GET /api/resin/available
```typescript
// Get all available resin lots
// Returns only lots with available_count > 0
// Available to ALL processes

Response:
[
  {
    "id": 1,
    "resin_code": "RESIN-20260112-001",
    "available_count": 5,  // Multiple units can be consumed
    "photo_url": "resin-photos/...",
    "created_by": "user123",
    "created_at": "2026-01-12T10:30:00Z"
  }
]
```

### 5. POST /api/kits/:kitId/consume
```typescript
// Consume (use) a kit for manufacturing
// Changes status from AVAILABLE to CONSUMED
// Records who consumed it and when
// Returns: { success, message }

Request:
{
  "processInstanceId": 789,  // Optional: which manufacturing run
  "consumedBy": "user456"    // Required: user ID who consumed it
}

Response (200):
{
  "success": true,
  "message": "Kit KIT-SBSF-20260112-001 consumed"
}
```

### 6. POST /api/resin/:resinId/consume
```typescript
// Consume (use) resin for manufacturing
// Decrements available_count by 1
// Logs consumption in resin_consumption table for audit trail
// Returns: { success, message }

Request:
{
  "processId": 1,            // Required: which process is consuming
  "consumedBy": "user456",   // Required: user ID who consumed it
  "processInstanceId": 789   // Optional: which manufacturing run
}

Response (200):
{
  "success": true,
  "message": "Resin consumed. 4 units remaining"
}
```

### 7. GET /api/process/:processId/inventory
```typescript
// Get inventory counts for a process
// Shows available kit counts and resin count
// Used to display "Material Kits Available: X" on UI
// Returns: { process_id, kit_count, glass_kit_count, resin_lot_count }

Response:
{
  "process_id": 1,
  "kit_count": 5,          // Available Material Kits
  "glass_kit_count": 3,    // Available Glass Kits
  "resin_lot_count": 12    // Total available resin units across all lots
}
```

## ID Generation Functions

### generateKitCode(processId)
```typescript
// Generates: KIT-{PROCESS_CODE}-{YYYYMMDD}-{SEQ}
// Example: KIT-SBSF-20260112-001

Algorithm:
1. Query processes table to get process.code (e.g., "SBSF")
2. Get today's date in YYYYMMDD format
3. Count existing KIT codes for this process today
4. Increment sequence by 1 and pad to 3 digits
5. Return: KIT-{code}-{date}-{seq}

Used by: POST /api/kits/create when kitType="KIT"
```

### generateGlassKitCode(processId)
```typescript
// Generates: GLASS-{PROCESS_CODE}-{YYYYMMDD}-{SEQ}
// Example: GLASS-SBSF-20260112-001

Same algorithm as generateKitCode but:
- Prefix is "GLASS" instead of "KIT"
- Filters for kit_type="GLASS" in count

Used by: POST /api/kits/create when kitType="GLASS"
```

### generateResinCode()
```typescript
// Generates: RESIN-{YYYYMMDD}-{SEQ}
// Example: RESIN-20260112-001

Algorithm:
1. Get today's date in YYYYMMDD format
2. Count existing RESIN codes for today (across ALL processes)
3. Increment sequence by 1 and pad to 3 digits
4. Return: RESIN-{date}-{seq}

Note: Resin is shared, so no process code in ID

Used by: POST /api/resin/create
```

## Error Responses

All endpoints return standard error responses:

```typescript
400 Bad Request:
{
  "error": "Invalid kit type. Must be KIT or GLASS"
}

404 Not Found:
{
  "error": "Process not found"
}

500 Internal Server Error:
{
  "error": "Failed to create kit"
}
```

## Quick Integration Examples

### React Hook to Create Kit
```typescript
async function createKit(processId, kitType, photoUrl, userId) {
  const response = await fetch('/api/kits/create', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      kitType,
      processId,
      photoUrl,
      createdBy: userId
    })
  });
  if (!response.ok) throw new Error('Failed to create kit');
  return response.json();
}
```

### React Hook to Get Inventory
```typescript
async function getProcessInventory(processId) {
  const response = await fetch(`/api/process/${processId}/inventory`);
  if (!response.ok) throw new Error('Failed to fetch inventory');
  return response.json();
  // Returns: { process_id, kit_count, glass_kit_count, resin_lot_count }
}
```

### React Hook to Consume Kit
```typescript
async function consumeKit(kitId, userId, processInstanceId = null) {
  const response = await fetch(`/api/kits/${kitId}/consume`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      consumedBy: userId,
      processInstanceId
    })
  });
  if (!response.ok) throw new Error('Failed to consume kit');
  return response.json();
}
```

## Database Tables

### kit_inventory
```sql
CREATE TABLE kit_inventory (
  id INTEGER PRIMARY KEY,
  kit_code TEXT NOT NULL UNIQUE,
  process_id INTEGER NOT NULL FK,     -- REQUIRED
  kit_type TEXT NOT NULL,             -- 'KIT' or 'GLASS'
  status TEXT NOT NULL,               -- 'AVAILABLE' or 'CONSUMED'
  photo_url TEXT NOT NULL,
  created_by TEXT NOT NULL,
  consumed_by TEXT,
  consumed_at TIMESTAMP,
  process_instance_id INTEGER,
  created_at TIMESTAMP NOT NULL
);
```

### resin_lot_inventory
```sql
CREATE TABLE resin_lot_inventory (
  id INTEGER PRIMARY KEY,
  resin_code TEXT NOT NULL UNIQUE,
  available_count INTEGER NOT NULL,   -- integer count
  photo_url TEXT NOT NULL,
  created_by TEXT NOT NULL,
  created_at TIMESTAMP NOT NULL
);
```

### resin_consumption
```sql
CREATE TABLE resin_consumption (
  id INTEGER PRIMARY KEY,
  resin_lot_id INTEGER NOT NULL FK,
  process_id INTEGER NOT NULL FK,
  process_instance_id INTEGER,
  consumed_by TEXT NOT NULL,
  consumed_at TIMESTAMP NOT NULL
);
```

## Summary

- **7 endpoints**: Create, read, consume for kits and resin
- **3 ID generators**: KIT, GLASS, RESIN with correct format
- **Process-bound**: Kits REQUIRED to specify processId
- **Shared resin**: No process binding, count-based
- **Audit trail**: Every resin consumption logged
- **Ready for UI**: All endpoints tested and documented
