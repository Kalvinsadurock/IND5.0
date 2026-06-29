# Manufacturing Pages - Update Guide

## Overview

This document describes how to update manufacturing pages (Prefabricated, Moulding, Finishing) to display **kit/resin availability counts** instead of boolean `true/false` flags.

**Current State**: ❌ Shows `hasKits: true/false`, `hasResin: true/false`  
**Target State**: ✅ Shows `Material Kits: 3`, `Glass Kits: 2`, `Resin Lots: 1`

---

## Architecture

### Data Flow

```
Incoming Process (prepares kits/resin)
       ↓
   Creates kit_inventory records (status: AVAILABLE)
   Creates resin_lot_inventory records
       ↓
   /api/process/:id/inventory endpoint
       ↓
   Returns: { materialKits: 3, glassKits: 2, resinLots: 1 }
       ↓
   Manufacturing Page (Prefabricated/Moulding/Finishing) displays counts
       ↓
   User clicks "Start Process" or selects kit/resin
       ↓
   /api/kits/consume/:kitId  OR  /api/resin/consume/:resinId
       ↓
   Updates status: CONSUMED + linked to process_instance_id
       ↓
   Counts decrement in Incoming (user sees 3 → 2)
```

---

## Pages to Update

### 1. ProcessTab.tsx (Main Process View)

**Location**: `src/app/components/ProcessTab.tsx`

**Current Implementation**:
- Shows process details when selected
- Has "Start Process" button
- May show material availability as boolean

**Changes Required**:

A. Add inventory count display to process header:

```tsx
// Add this section in the process info area
<div className="grid grid-cols-3 gap-4 mb-6">
  <div className="bg-slate-700/30 rounded p-4 border border-slate-600">
    <div className="text-sm text-slate-400 mb-2">Material Kits</div>
    <div className="text-2xl font-bold text-blue-300">{inventory?.materialKits || 0}</div>
  </div>
  <div className="bg-slate-700/30 rounded p-4 border border-slate-600">
    <div className="text-sm text-slate-400 mb-2">Glass Kits</div>
    <div className="text-2xl font-bold text-amber-300">{inventory?.glassKits || 0}</div>
  </div>
  <div className="bg-slate-700/30 rounded p-4 border border-slate-600">
    <div className="text-sm text-slate-400 mb-2">Resin Lots</div>
    <div className="text-2xl font-bold text-emerald-300">{inventory?.resinLots || 0}</div>
  </div>
</div>
```

B. Fetch inventory counts on process selection:

```tsx
useEffect(() => {
  if (!selectedProcess) return;
  
  async function fetchInventory() {
    try {
      const res = await fetch(`/api/process/${selectedProcess.id}/inventory`);
      if (res.ok) {
        const data = await res.json();
        setInventory(data);
      }
    } catch (error) {
      console.error('Failed to fetch inventory:', error);
    }
  }
  
  fetchInventory();
}, [selectedProcess]);
```

C. Add state variable:

```tsx
const [inventory, setInventory] = useState<{
  materialKits: number;
  glassKits: number;
  resinLots: number;
} | null>(null);
```

---

### 2. DashboardView.tsx (Dashboard Process Cards)

**Location**: `src/app/components/DashboardView.tsx`

**Current Implementation**: Shows process buttons without kit availability

**Changes Required**:

A. Fetch inventory for each process:

```tsx
useEffect(() => {
  async function fetchInventory() {
    const counts: Record<number, any> = {};
    for (const process of processes) {
      try {
        const res = await fetch(`/api/process/${process.id}/inventory`);
        if (res.ok) {
          counts[process.id] = await res.json();
        }
      } catch (error) {
        console.error(`Failed to fetch inventory for process ${process.id}:`, error);
      }
    }
    setInventoryCounts(counts);
  }
  
  if (processes.length > 0) fetchInventory();
}, [processes]);
```

B. Add state:

```tsx
const [inventoryCounts, setInventoryCounts] = useState<
  Record<number, { materialKits: number; glassKits: number; resinLots: number }>
>({});
```

C. Display counts on process cards:

```tsx
// In process card render
const counts = inventoryCounts[process.id] || { materialKits: 0, glassKits: 0, resinLots: 0 };

return (
  <div className="...">
    {/* Process name */}
    <h3>{process.name}</h3>
    
    {/* Add this: Availability badges */}
    <div className="flex gap-2 mt-2 flex-wrap">
      <span className="text-xs bg-blue-900 text-blue-300 px-2 py-1 rounded">
        Kits: {counts.materialKits}
      </span>
      <span className="text-xs bg-amber-900 text-amber-300 px-2 py-1 rounded">
        Glass: {counts.glassKits}
      </span>
      <span className="text-xs bg-emerald-900 text-emerald-300 px-2 py-1 rounded">
        Resin: {counts.resinLots}
      </span>
    </div>
    
    <Button onClick={() => onNavigateToProcess(process.id)}>
      Start Process
    </Button>
  </div>
);
```

---

### 3. OperationsTab.tsx (Running Operations)

**Location**: `src/app/components/OperationsTab.tsx`

**Current Implementation**: Shows running blades/parts but no kit availability

**Changes Required**:

A. When showing a process in operations context, display available kits:

```tsx
// In blade card or process section
<div className="mt-3 grid grid-cols-3 gap-2 text-xs">
  <div className="bg-slate-900/50 p-2 rounded border border-slate-600">
    <span className="text-slate-400">Kits</span>
    <div className="text-blue-300 font-bold">{process.availableKits || 0}</div>
  </div>
  <div className="bg-slate-900/50 p-2 rounded border border-slate-600">
    <span className="text-slate-400">Glass</span>
    <div className="text-amber-300 font-bold">{process.availableGlass || 0}</div>
  </div>
  <div className="bg-slate-900/50 p-2 rounded border border-slate-600">
    <span className="text-slate-400">Resin</span>
    <div className="text-emerald-300 font-bold">{process.availableResin || 0}</div>
  </div>
</div>
```

---

### 4. PreparationDashboard.tsx (If using)

**Location**: `src/app/components/PreparationDashboard.tsx`

**Changes Required**: Similar to DashboardView - fetch and display counts for Prefab processes

---

## Backend API Endpoints (Reference)

### 1. Get Available Counts for a Process

```
GET /api/process/:processId/inventory

Response:
{
  "materialKits": 3,
  "glassKits": 2,
  "resinLots": 1
}
```

### 2. Get Available Kits for Kit Selection

```
GET /api/kits/available/:processId

Response:
[
  {
    "id": 1,
    "kit_code": "KIT-SBSF-20250112-001",
    "kit_type": "KIT",
    "photo_url": "https://...",
    "created_at": "2025-01-12T10:00:00Z"
  },
  ...
]
```

### 3. Get Available Resin for Resin Selection

```
GET /api/resin/available

Response:
[
  {
    "id": 1,
    "resin_code": "RESIN-20250112-001",
    "available_count": 3,
    "photo_url": "https://...",
    "created_at": "2025-01-12T10:00:00Z"
  },
  ...
]
```

### 4. Consume a Kit

```
POST /api/kits/:kitId/consume

Body:
{
  "consumedBy": "John Doe",
  "processInstanceId": 42
}

Response:
{
  "success": true,
  "message": "Kit consumed",
  "kit": { ... }
}
```

### 5. Consume Resin

```
POST /api/resin/:resinId/consume

Body:
{
  "consumedBy": "John Doe",
  "processInstanceId": 42
}

Response:
{
  "success": true,
  "message": "Resin consumed",
  "resin": { ... }
}
```

---

## Kit Selection During Process Start

### Current Flow (WRONG)
```
User clicks "Start Process"
   ↓
MaterialSelectionDialog opens (shows old material system)
   ↓
User selects material (boolean flag)
   ↓
Process starts (no actual kit linked)
```

### New Flow (CORRECT)

When a process starts and requires kits:

1. **Display available kits**:
```tsx
// Fetch available kits for this process
const res = await fetch(`/api/kits/available/${processId}`);
const availableKits = await res.json();
```

2. **Show kit selection dropdown**:
```tsx
<Select>
  <SelectTrigger>
    <SelectValue placeholder="Select Material Kit" />
  </SelectTrigger>
  <SelectContent>
    {availableKits.map(kit => (
      <SelectItem key={kit.id} value={kit.id.toString()}>
        {kit.kit_code} ({kit.created_at})
      </SelectItem>
    ))}
  </SelectContent>
</Select>
```

3. **On process start, consume the kit**:
```tsx
const handleStartProcess = async () => {
  if (!selectedKitId) {
    setError('Please select a kit');
    return;
  }
  
  // 1. Start the process
  const processRes = await fetch('/api/process-instances', {
    method: 'POST',
    body: JSON.stringify({
      processId: selectedProcess.id,
      startedBy: userName,
      status: 'ACTIVE'
    })
  });
  const processInstance = await processRes.json();
  
  // 2. Consume the kit
  await fetch(`/api/kits/${selectedKitId}/consume`, {
    method: 'POST',
    body: JSON.stringify({
      consumedBy: userName,
      processInstanceId: processInstance.id
    })
  });
  
  // 3. Refresh counts
  fetchInventory();
};
```

---

## Update Checklist

- [ ] ProcessTab.tsx: Add inventory count display
- [ ] ProcessTab.tsx: Fetch inventory on process selection
- [ ] DashboardView.tsx: Add inventory counts to process cards
- [ ] OperationsTab.tsx: Add inventory display to blade operations
- [ ] Remove boolean-based kit availability checks
- [ ] Update kit selection dialog to use `/api/kits/available/:processId`
- [ ] Update resin selection dialog to use `/api/resin/available`
- [ ] Implement consume endpoints calls on process start
- [ ] Test kit counts decrement after consumption
- [ ] Test resin counts decrement after consumption

---

## Testing Scenarios

### Scenario 1: View Available Kits

1. Navigate to Incoming page
2. See Material Kits: 3 for Prefabricated → Spar Boom SF
3. Navigate to Prefabricated page
4. See Material Kits: 3 displayed
5. ✅ Should show same counts

### Scenario 2: Create Kit and See Count Increase

1. In Incoming, click [Add Material Kit] for Prefabricated → Spar Boom SF
2. Upload photo, create kit
3. Material Kits count increases from 3 to 4
4. ✅ Should show 4 immediately

### Scenario 3: Start Process and Consume Kit

1. Material Kits: 4 for Prefabricated → Spar Boom SF
2. Click "Start Process"
3. Select a kit from dropdown (shows 4 available)
4. Click "Start"
5. Kit is consumed (linked to process_instance_id)
6. Material Kits count decreases to 3
7. ✅ Count should update automatically

### Scenario 4: Resin Shared Across Processes

1. Create 1 Resin Lot in Incoming
2. Resin Lots: 1 in Prefabricated
3. Resin Lots: 1 in Moulding
4. Resin Lots: 1 in Finishing
5. ✅ Same count everywhere

---

## Performance Considerations

1. **Fetch Inventory Once Per Page**
   - Don't refetch on every render
   - Use `useEffect` with dependencies
   - Consider caching for 30 seconds

2. **Batch API Calls**
   - Don't call `/api/process/:id/inventory` for every process on every render
   - Fetch once when page loads
   - Refetch after user interaction (create kit, start process, etc.)

3. **Error Handling**
   - If API fails, show "Unknown" instead of crashing
   - Log errors to console
   - Show toast notification if critical

```tsx
// Example with error handling
useEffect(() => {
  async function fetchInventory() {
    try {
      setLoadingCounts(true);
      const res = await fetch(`/api/process/${processId}/inventory`);
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const data = await res.json();
      setInventory(data);
    } catch (error) {
      console.error('Failed to fetch inventory:', error);
      setInventory({ materialKits: 0, glassKits: 0, resinLots: 0 });
      // Optionally show toast
    } finally {
      setLoadingCounts(false);
    }
  }
  
  fetchInventory();
}, [processId]);
```

---

## Migration Path

### Phase 1: Add Counts Display (Non-Breaking)
- Add inventory display to pages
- Keep existing boolean logic
- Both systems work side-by-side

### Phase 2: Update Kit Selection
- Replace boolean checks with count-based logic
- Show kit dropdowns with available items
- Implement consume endpoints

### Phase 3: Deprecate Old System
- Remove MaterialSelectionDialog (if replaced)
- Remove boolean kit availability logic
- Clean up old material APIs

---

## Edge Cases

### What if process has 0 kits?
- ✅ Show "0"
- ✅ "Start Process" button disabled
- ✅ Show tooltip: "No kits available"

### What if kit counts fail to load?
- ✅ Show "?" or "-"
- ✅ Log error
- ✅ Retry on page refresh

### What if resin is consumed while page is open?
- ✅ User doesn't see live update (not real-time)
- ✅ Counts update when page refocus or user navigates
- ✅ Consider polling every 10 seconds for active processes

---

**Status**: 📝 REFERENCE GUIDE (Implement as pages are updated)
