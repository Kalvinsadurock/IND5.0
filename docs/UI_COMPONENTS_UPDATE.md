# UI Components - Process Hierarchy Implementation

## Overview
Successfully updated React components to display process hierarchies with available kit counts, implementing the process-driven MES architecture in the UI layer.

## New Components Created

### 1. ProcessHierarchyView
**File**: [src/app/components/ProcessHierarchyView.tsx](src/app/components/ProcessHierarchyView.tsx)

**Purpose**: Display processes organized by category with inventory counts

**Key Features**:
- ✅ Shows process hierarchy (Inventory → Prefabricated → Moulding → Finishing)
- ✅ Displays kit counts and resin counts for each process
- ✅ Expandable process rows with [Add Material Kit] and [Add Glass Kit] buttons
- ✅ Global Resin inventory section at the top
- ✅ Fetches and displays live inventory counts from `/api/process/:id/inventory`
- ✅ Auto-refreshes counts whenever processes change

**Usage in ProcessTab**:
```tsx
<ProcessHierarchyView
  processes={processes}
  selectedProcess={selectedProcess}
  onSelectProcess={setSelectedProcess}
  onAddKit={handleAddKit}
  onAddResin={handleAddResin}
  loading={loading}
/>
```

### 2. ProcessSpecificAddKitDialog
**File**: [src/app/components/ProcessSpecificAddKitDialog.tsx](src/app/components/ProcessSpecificAddKitDialog.tsx)

**Purpose**: Create material or glass kits with **auto-bound process** (no dropdown)

**Key Features**:
- ✅ Process is **auto-bound** (read-only, not user-selectable)
- ✅ Mandatory photo upload to `kit-photos` Supabase bucket
- ✅ Shows auto-generated kit code format: `KIT-{PROCESS_CODE}-{YYYYMMDD}-###`
- ✅ Calls new `/api/kits/create` endpoint
- ✅ Success message shows created kit code
- ✅ Error handling with clear messages

**Usage**:
```tsx
<ProcessSpecificAddKitDialog
  isOpen={isAddKitDialogOpen}
  onClose={() => setIsAddKitDialogOpen(false)}
  process={selectedProcess}
  kitType="KIT" // or "GLASS"
  userName={userName}
  onSuccess={(kitCode) => console.log(`Created: ${kitCode}`)}
/>
```

### 3. AddResinDialog
**File**: [src/app/components/AddResinDialog.tsx](src/app/components/AddResinDialog.tsx)

**Purpose**: Create resin lots (shared, process-independent)

**Key Features**:
- ✅ No process binding (resin is shared)
- ✅ Mandatory photo upload to `resin-photos` Supabase bucket
- ✅ Shows auto-generated resin code format: `RESIN-{YYYYMMDD}-###`
- ✅ Calls new `/api/resin/create` endpoint
- ✅ Clear messaging: "Available to all processes"
- ✅ Success message shows created resin code

**Usage**:
```tsx
<AddResinDialog
  isOpen={isAddResinDialogOpen}
  onClose={() => setIsAddResinDialogOpen(false)}
  userName={userName}
  onSuccess={(resinCode) => console.log(`Created: ${resinCode}`)}
/>
```

## Updated Components

### ProcessTab
**File**: [src/app/components/ProcessTab.tsx](src/app/components/ProcessTab.tsx)

**Changes Made**:
1. ✅ Replaced left sidebar with ProcessHierarchyView
2. ✅ Removed global "Add Material" buttons
3. ✅ Removed process dropdown from material creation
4. ✅ Added ProcessSpecificAddKitDialog integration
5. ✅ Added AddResinDialog integration
6. ✅ Widened left sidebar from 288px to 384px for better process hierarchy display

**New State Variables**:
```tsx
const [isAddKitDialogOpen, setIsAddKitDialogOpen] = useState(false);
const [isAddResinDialogOpen, setIsAddResinDialogOpen] = useState(false);
const [pendingKitType, setPendingKitType] = useState<'KIT' | 'GLASS'>('KIT');
```

**New Handler Functions**:
```tsx
const handleAddKit = (process: Process, kitType: 'KIT' | 'GLASS') => {
  setSelectedProcess(process);
  setPendingKitType(kitType);
  setIsAddKitDialogOpen(true);
};

const handleAddResin = () => {
  setIsAddResinDialogOpen(true);
};
```

## UI Flow - Process-Driven (NEW)

### Old Flow (WRONG) ❌
```
User View
    ↓
Global [Add Material Kit] button
    ↓
MaterialCreationDialog with process dropdown
    ↓
User selects process from dropdown
    ↓
Kit created with that process
```

### New Flow (CORRECT) ✅
```
User View: Process Hierarchy
    ├─ Inventory
    │  ├─ Incoming (Material Kits: 5, Glass Kits: 2, Resin: 12)
    │  │  ├─ [Add Material Kit] ← Auto-bound to Incoming
    │  │  └─ [Add Glass Kit] ← Auto-bound to Incoming
    │  └─ [+ Add Resin] ← Shared, no process binding
    │
    ├─ Prefabricated
    │  ├─ Spar Boom SF (Material Kits: 3, Glass Kits: 1)
    │  │  ├─ [Add Material Kit] ← Auto-bound to Spar Boom SF
    │  │  └─ [Add Glass Kit] ← Auto-bound to Spar Boom SF
    │  └─ ...
    │
    ├─ Moulding
    │  └─ ...
    │
    └─ Finishing
       └─ ...
```

**User Action**:
1. User clicks [Add Material Kit] in a specific process row
2. ProcessSpecificAddKitDialog opens with process ALREADY BOUND (read-only)
3. User uploads photo
4. System creates kit with auto-generated code: `KIT-SBSF-20260112-001`

## API Integration

### Endpoints Called

**Create Kit** (Process-Bound):
```
POST /api/kits/create
{
  "kitType": "KIT",           // or "GLASS"
  "processId": 5,              // AUTO-BOUND (from selected process)
  "photoUrl": "url/to/photo",
  "createdBy": "user123"
}
→ Returns: { kit: { id, kit_code, process_id, status, ... } }
```

**Create Resin** (Shared):
```
POST /api/resin/create
{
  "photoUrl": "url/to/photo",
  "createdBy": "user123"
}
→ Returns: { resin: { id, resin_code, available_count, ... } }
```

**Get Inventory Counts** (Shown in hierarchy):
```
GET /api/process/:processId/inventory
→ Returns: { kit_count, glass_kit_count, resin_lot_count }
```

## Supabase Storage

### Buckets Used

**kit-photos**
- **Path format**: `kit-photos/{kit_id}.jpg`
- **Used by**: ProcessSpecificAddKitDialog
- **Access**: Authenticated write, public read

**resin-photos**
- **Path format**: `resin-photos/{resin_id}.jpg`
- **Used by**: AddResinDialog
- **Access**: Authenticated write, public read

## Component Hierarchy

```
ProcessTab
├── ProcessHierarchyView (left sidebar)
│   ├── Global Resin Section
│   │   └── [+ Add Resin] button → AddResinDialog
│   └── Process Categories
│       └── ProcessHierarchyRow (for each process)
│           ├── Process name and counts display
│           └── Expandable [Add Material Kit], [Add Glass Kit] buttons
│               → ProcessSpecificAddKitDialog
├── ProcessSpecificAddKitDialog
│   ├── Auto-bound process info (read-only)
│   ├── Photo upload (to kit-photos)
│   └── Submit → POST /api/kits/create
├── AddResinDialog
│   ├── Shared info (read-only)
│   ├── Photo upload (to resin-photos)
│   └── Submit → POST /api/resin/create
└── Other sections (ProcessFlowView, status, etc.)
```

## Key Differences from Old Implementation

| Aspect | Old (MaterialCreationDialog) | New (ProcessSpecificAddKitDialog) |
|--------|-----|-----|
| **Process Selection** | Dropdown (user selects) | Auto-bound (read-only) |
| **Process Binding Time** | Post-creation (via UI) | At creation (enforced) |
| **UI Flow** | Global button → then pick process | Pick process → then button |
| **Button Location** | Top button bar (global) | Inside each process row |
| **Photo Bucket** | `material_photos` | `kit-photos` |
| **API Endpoint** | `/api/materials/create` (old) | `/api/kits/create` (new) |
| **ID Format** | `KIT-2026-0001` | `KIT-SBSF-20260112-001` |
| **Resin Binding** | Not clear (generic material) | Not bound at all (shared) |

## Build Verification

✅ **Build Status**: SUCCESS
- 2358 modules transformed
- 6.92 seconds
- No errors or warnings (in modified code)

## Testing Checklist

- [ ] Process hierarchy displays correctly with all processes
- [ ] Inventory counts fetch and display for each process
- [ ] [Add Material Kit] button appears in each process row
- [ ] [Add Glass Kit] button appears in each process row
- [ ] [+ Add Resin] button appears at top
- [ ] Clicking [Add Material Kit] opens dialog with correct process bound
- [ ] Process name is shown as read-only in dialog
- [ ] Photo upload works and shows preview
- [ ] Successfully creating kit calls `/api/kits/create`
- [ ] Kit code is auto-generated correctly
- [ ] Resin dialog shows "shared across all processes" message
- [ ] Resin creation calls `/api/resin/create`
- [ ] Dialogs close after successful creation
- [ ] Success messages display with created codes
- [ ] Error messages display clearly if creation fails

## Next Steps

1. **Manual Testing**: Test the complete workflow end-to-end
2. **Backend Integration**: Ensure `/api/kits/create` and `/api/resin/create` endpoints are running
3. **Supabase Setup**: Verify `kit-photos` and `resin-photos` buckets exist
4. **Manufacturing Pages**: Update pages that consume kits/resin to show counts instead of booleans
5. **End-to-End**: Test complete flow from process selection through manufacturing

## File Locations

| File | Purpose |
|------|---------|
| [src/app/components/ProcessHierarchyView.tsx](src/app/components/ProcessHierarchyView.tsx) | Process hierarchy with counts |
| [src/app/components/ProcessSpecificAddKitDialog.tsx](src/app/components/ProcessSpecificAddKitDialog.tsx) | Auto-bound kit creation |
| [src/app/components/AddResinDialog.tsx](src/app/components/AddResinDialog.tsx) | Shared resin creation |
| [src/app/components/ProcessTab.tsx](src/app/components/ProcessTab.tsx) | Updated main process tab |

## Summary

The UI now enforces the process-driven MES architecture by:
1. ✅ Displaying process hierarchy with available inventory counts
2. ✅ Removing global material buttons
3. ✅ Auto-binding process at kit creation time
4. ✅ Showing "select process first, then add kit" workflow
5. ✅ Clearly separating process-specific kits from shared resin
6. ✅ Using correct ID formats with process codes for traceability
