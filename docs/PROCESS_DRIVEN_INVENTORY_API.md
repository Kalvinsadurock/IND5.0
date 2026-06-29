# Process-Driven Inventory API Documentation

## Overview
This document describes the new process-driven kit and resin inventory management API endpoints. All endpoints follow the principle that **the process is auto-bound at creation time** and **resin is shared across all processes**.

## ID Generation Format

### Kit Code
- **Format**: `KIT-{PROCESS_CODE}-{YYYYMMDD}-{SEQ}`
- **Example**: `KIT-SBSF-20260112-001`
- **Components**:
  - `PROCESS_CODE`: Uppercase code from the `processes.code` field (e.g., "SBSF" for Spar Boom SF)
  - `YYYYMMDD`: Current date in format YYYYMMDD
  - `SEQ`: Zero-padded 3-digit sequence number (001, 002, 003, ...)

### Glass Kit Code
- **Format**: `GLASS-{PROCESS_CODE}-{YYYYMMDD}-{SEQ}`
- **Example**: `GLASS-SBSF-20260112-001`

### Resin Code
- **Format**: `RESIN-{YYYYMMDD}-{SEQ}`
- **Example**: `RESIN-20260112-002`
- **Note**: Resin is process-independent, so it doesn't include a process code

## Endpoints

### 1. Create Kit (Auto-bound to Process)
**Endpoint**: `POST /api/kits/create`

Creates a new kit (or glass kit) that is automatically bound to a specific process.

**Request Body**:
```json
{
  "kitType": "KIT",           // "KIT" or "GLASS"
  "processId": 1,              // Process ID (FK to processes table)
  "photoUrl": "url/to/photo",  // Photo uploaded to Supabase
  "createdBy": "user123"       // User ID of creator
}
```

**Response** (201):
```json
{
  "success": true,
  "kit": {
    "id": 1,
    "kit_code": "KIT-SBSF-20260112-001",
    "kit_type": "KIT",
    "process_id": 1,
    "status": "AVAILABLE",
    "photo_url": "url/to/photo",
    "created_by": "user123",
    "created_at": "2026-01-12T10:30:00Z"
  }
}
```

### 2. Create Resin Lot (Shared, No Process Binding)
**Endpoint**: `POST /api/resin/create`

Creates a new resin lot with `available_count = 1`. Resin is shared across all processes.

**Request Body**:
```json
{
  "photoUrl": "url/to/photo",  // Photo uploaded to Supabase
  "createdBy": "user123"       // User ID of creator
}
```

**Response** (201):
```json
{
  "success": true,
  "resin": {
    "id": 1,
    "resin_code": "RESIN-20260112-001",
    "available_count": 1,
    "photo_url": "url/to/photo",
    "created_by": "user123",
    "created_at": "2026-01-12T10:30:00Z"
  }
}
```

### 3. Get Available Kits for Process
**Endpoint**: `GET /api/kits/available/:processId`

Retrieves all available kits for a specific process.

**Query Parameters**:
- `kitType` (optional): Filter by "KIT" or "GLASS"

**Response**:
```json
[
  {
    "id": 1,
    "kit_code": "KIT-SBSF-20260112-001",
    "kit_type": "KIT",
    "process_id": 1,
    "status": "AVAILABLE",
    "photo_url": "url/to/photo",
    "created_by": "user123",
    "created_at": "2026-01-12T10:30:00Z"
  }
]
```

### 4. Get All Available Resin Lots
**Endpoint**: `GET /api/resin/available`

Retrieves all resin lots with remaining count > 0.

**Response**:
```json
[
  {
    "id": 1,
    "resin_code": "RESIN-20260112-001",
    "available_count": 3,
    "photo_url": "url/to/photo",
    "created_by": "user123",
    "created_at": "2026-01-12T10:30:00Z"
  }
]
```

### 5. Get Process Inventory Counts
**Endpoint**: `GET /api/process/:processId/inventory`

Returns counts of available kits (Material and Glass) and available resin for a process.

**Response**:
```json
{
  "process_id": 1,
  "kit_count": 5,           // Available Material Kits
  "glass_kit_count": 3,     // Available Glass Kits
  "resin_lot_count": 12     // Total available resin units across all lots
}
```

### 6. Consume Kit (Mark as Used)
**Endpoint**: `POST /api/kits/:kitId/consume`

Marks a kit as CONSUMED for manufacturing.

**Request Body**:
```json
{
  "processInstanceId": 123,  // Optional: Instance of process execution
  "consumedBy": "user456"    // User ID of who consumed it
}
```

**Response**:
```json
{
  "success": true,
  "message": "Kit KIT-SBSF-20260112-001 consumed"
}
```

### 7. Consume Resin (Decrement Count)
**Endpoint**: `POST /api/resin/:resinId/consume`

Decrements the available count of a resin lot by 1 and logs the consumption.

**Request Body**:
```json
{
  "processId": 1,                // Required: Process consuming the resin
  "processInstanceId": 123,      // Optional: Instance of process execution
  "consumedBy": "user456"        // User ID of who consumed it
}
```

**Response**:
```json
{
  "success": true,
  "message": "Resin consumed. 2 units remaining"
}
```

## Database Tables

### kit_inventory
```sql
CREATE TABLE kit_inventory (
  id INTEGER PRIMARY KEY,
  kit_code TEXT NOT NULL UNIQUE,
  process_id INTEGER NOT NULL FK -> processes(id),
  kit_type TEXT NOT NULL,  -- 'KIT' or 'GLASS'
  status TEXT NOT NULL,    -- 'AVAILABLE' or 'CONSUMED'
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
  available_count INTEGER NOT NULL,
  photo_url TEXT NOT NULL,
  created_by TEXT NOT NULL,
  created_at TIMESTAMP NOT NULL
);
```

### resin_consumption (Audit Trail)
```sql
CREATE TABLE resin_consumption (
  id INTEGER PRIMARY KEY,
  resin_lot_id INTEGER NOT NULL FK -> resin_lot_inventory(id),
  process_id INTEGER NOT NULL FK -> processes(id),
  process_instance_id INTEGER,
  consumed_by TEXT NOT NULL,
  consumed_at TIMESTAMP NOT NULL
);
```

## Key Design Principles

1. **Process-Centric**: Kits are automatically bound to a process at creation time (`process_id` is required)
2. **Shared Resin**: Resin is NOT bound to a process; it can be consumed by any process
3. **Explicit Status**: Kits have explicit status (AVAILABLE/CONSUMED), not a boolean flag
4. **Count-Based Resin**: Resin uses a count-based availability system where each consumption decrements the count
5. **Audit Trail**: All resin consumption is logged in the `resin_consumption` table for traceability
6. **Photo Storage**: Photos are stored in Supabase Storage bucket "kit-photos" with path format: `kit-photos/{kit_id}.jpg`

## Example Workflow

1. **User navigates to Incoming page** → Sees list of processes
2. **User selects a process** (e.g., Spar Boom SF) → Process ID is auto-bound
3. **User clicks "Add Kit"** → Process ID is pre-filled, NOT selectable
4. **User uploads photo and confirms** → API generates `KIT-SBSF-20260112-001`
5. **Kit is created with status AVAILABLE** → Shows in inventory counts
6. **During manufacturing, kit is consumed** → Status changed to CONSUMED
7. **Resin can be consumed by any process** → Count decrements in central pool
