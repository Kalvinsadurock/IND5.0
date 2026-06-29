# Process Hierarchy UI - Visual Guide

## Screen Layout

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                                ProcessTab                                    │
├────────────────────────────────┬─────────────────────────────────────────────┤
│   Process Inventory            │  Selected Process Details                   │
│   (Left Sidebar: 384px)        │  (Main Content Area)                        │
│                                │                                             │
│  ┌──────────────────────────┐  │  ┌─────────────────────────────────────┐   │
│  │ Global Resin (Shared)    │  │  │ Spar Boom SF                        │   │
│  │ ─────────────────────    │  │  │ Process #5 (SBSF)                  │   │
│  │ Available: 12 units      │  │  │                                     │   │
│  │            [+ Add Resin] │  │  │ [Start Process] [Options]           │   │
│  └──────────────────────────┘  │  └─────────────────────────────────────┘   │
│                                │                                             │
│  ┌──────────────────────────┐  │  ┌─────────────────────────────────────┐   │
│  │ Inventory                │  │  │ Availability Check                  │   │
│  │ ▼                        │  │  │ ─────────────────────               │   │
│  │ ┌──────────────────────┐ │  │  │ Available: 10                       │   │
│  │ │ Incoming             │ │  │  │ Missing: 2                         │   │
│  │ │ Material Kits: 5     │ │  │  │ QA Hold: 1                         │   │
│  │ │ Glass Kits: 2        │ │  │  └─────────────────────────────────────┘   │
│  │ │                      │ │  │                                             │
│  │ │ [Add Material Kit]   │ │  │  ... (more content below)                  │
│  │ │ [Add Glass Kit]      │ │  │                                             │
│  │ └──────────────────────┘ │  │                                             │
│  │                          │  │                                             │
│  │ ┌──────────────────────┐ │  │                                             │
│  │ │ Glass Cutting        │ │  │                                             │
│  │ │ Material Kits: 3     │ │  │                                             │
│  │ │ Glass Kits: 1        │ │  │                                             │
│  │ │                      │ │  │                                             │
│  │ │ [Add Material Kit]   │ │  │                                             │
│  │ │ [Add Glass Kit]      │ │  │                                             │
│  │ └──────────────────────┘ │  │                                             │
│  │                          │  │                                             │
│  │ Prefabricated            │  │                                             │
│  │ ▼                        │  │                                             │
│  │ ┌──────────────────────┐ │  │                                             │
│  │ │ Spar Boom SF         │ │  │ ← Currently selected                       │
│  │ │ Material Kits: 2     │ │  │                                             │
│  │ │ Glass Kits: 1        │ │  │                                             │
│  │ │                      │ │  │                                             │
│  │ │ [Add Material Kit]   │ │  │                                             │
│  │ │ [Add Glass Kit]      │ │  │                                             │
│  │ └──────────────────────┘ │  │                                             │
│  │                          │  │                                             │
│  │ ... (more processes)     │  │                                             │
│  └──────────────────────────┘  │                                             │
│                                │                                             │
└────────────────────────────────┴─────────────────────────────────────────────┘
```

## Dialog Flow - Add Material Kit

### Step 1: Click [Add Material Kit] in process row
```
Click [Add Material Kit] for Spar Boom SF
              ↓
        ProcessSpecificAddKitDialog opens
```

### Step 2: Dialog shows process as BOUND (Read-Only)
```
┌────────────────────────────────────────────┐
│ Add Material Kit                            │
├────────────────────────────────────────────┤
│                                             │
│ Auto-Bound Process                         │
│ ┌──────────────────────────────────────┐  │
│ │ Spar Boom SF                         │  │
│ │ Process #5                           │  │
│ │                          ✓ Bound     │  │
│ └──────────────────────────────────────┘  │
│                                             │
│ Photo *                                    │
│ ┌──────────────────────────────────────┐  │
│ │ [Click to upload a photo]            │  │
│ │ 🎥                                    │  │
│ │ or drag and drop                     │  │
│ └──────────────────────────────────────┘  │
│                                             │
│ Code will be auto-generated:               │
│ KIT-SBSF-20260112-###                     │
│                                             │
│              [Cancel] [Create Kit]         │
└────────────────────────────────────────────┘
```

### Step 3: Upload Photo
```
Click on upload area
         ↓
Choose file from device
         ↓
Photo appears in dialog
```

### Step 4: Success
```
┌────────────────────────────────────────────┐
│ Add Material Kit                            │
├────────────────────────────────────────────┤
│                                             │
│ ✓ Photo uploaded: photo.jpg                │
│ ┌──────────────────────────────────────┐  │
│ │        [Photo Preview Image]         │  │
│ │        (shown here)                  │  │
│ └──────────────────────────────────────┘  │
│                                             │
│ ✓ Kit KIT-SBSF-20260112-001 created!      │
│                                             │
│              [Cancel] [Create Kit]         │
│                       (auto-closes)        │
└────────────────────────────────────────────┘
```

## Dialog Flow - Add Resin

### Step 1: Click [+ Add Resin]
```
Click [+ Add Resin] in Global Resin section
              ↓
        AddResinDialog opens
```

### Step 2: Dialog shows SHARED info
```
┌────────────────────────────────────────────┐
│ Add Resin Lot                               │
├────────────────────────────────────────────┤
│                                             │
│ Availability                                │
│ ┌──────────────────────────────────────┐  │
│ │ This resin lot will be available to  │  │
│ │ all processes that need it.          │  │
│ └──────────────────────────────────────┘  │
│                                             │
│ Photo *                                    │
│ ┌──────────────────────────────────────┐  │
│ │ [Click to upload a photo]            │  │
│ │ 🎥                                    │  │
│ │ or drag and drop                     │  │
│ └──────────────────────────────────────┘  │
│                                             │
│ Code will be auto-generated:               │
│ RESIN-20260112-###                        │
│                                             │
│              [Cancel] [Create Resin]       │
└────────────────────────────────────────────┘
```

## Process Hierarchy Tree Structure

```
┌─ Global Resin (Shared - Available to ALL processes)
│  ├─ Resin Count: 12 units
│  └─ [+ Add Resin]
│
├─ INVENTORY (Category)
│  ├─ Incoming (Process #10)
│  │  ├─ Material Kits: 5
│  │  ├─ Glass Kits: 2
│  │  ├─ Resin: 12 (shared)
│  │  ├─ [Add Material Kit] → Auto-bound to Incoming
│  │  └─ [Add Glass Kit] → Auto-bound to Incoming
│  │
│  ├─ Glass Cutting (Process #20)
│  │  ├─ Material Kits: 3
│  │  ├─ Glass Kits: 4
│  │  ├─ Resin: 12 (shared)
│  │  ├─ [Add Material Kit] → Auto-bound to Glass Cutting
│  │  └─ [Add Glass Kit] → Auto-bound to Glass Cutting
│  │
│  └─ Degassing (Process #30)
│     ├─ Material Kits: 2
│     ├─ Glass Kits: 1
│     ├─ Resin: 12 (shared)
│     ├─ [Add Material Kit] → Auto-bound to Degassing
│     └─ [Add Glass Kit] → Auto-bound to Degassing
│
├─ PREFABRICATED (Category)
│  ├─ Spar Boom SF (Process #5)
│  │  ├─ Material Kits: 2
│  │  ├─ Glass Kits: 1
│  │  ├─ [Add Material Kit] → Auto-bound to Spar Boom SF
│  │  └─ [Add Glass Kit] → Auto-bound to Spar Boom SF
│  │
│  ├─ Wing Assembly (Process #6)
│  │  ├─ Material Kits: 1
│  │  ├─ Glass Kits: 0
│  │  ├─ [Add Material Kit] → Auto-bound to Wing Assembly
│  │  └─ [Add Glass Kit] → Auto-bound to Wing Assembly
│  │
│  └─ ... (more prefab processes)
│
├─ MOULDING (Category)
│  ├─ Main Mould (Process #40)
│  │  ├─ Material Kits: 4
│  │  ├─ Glass Kits: 2
│  │  ├─ [Add Material Kit] → Auto-bound to Main Mould
│  │  └─ [Add Glass Kit] → Auto-bound to Main Mould
│  │
│  └─ ... (more moulding processes)
│
└─ FINISHING (Category)
   ├─ Assembly (Process #50)
   │  ├─ Material Kits: 3
   │  ├─ Glass Kits: 2
   │  ├─ [Add Material Kit] → Auto-bound to Assembly
   │  └─ [Add Glass Kit] → Auto-bound to Assembly
   │
   └─ ... (more finishing processes)
```

## Data Flow

### Adding a Kit

```
User clicks [Add Material Kit] in process row
         ↓
ProcessSpecificAddKitDialog opens with process pre-bound
         ↓
User uploads photo to kit-photos bucket
         ↓
User clicks [Create Kit]
         ↓
Dialog calls: POST /api/kits/create {
  kitType: "KIT",
  processId: 5,                    ← Auto-bound!
  photoUrl: "kit-photos/...",
  createdBy: "user123"
}
         ↓
API response: { kit: { kit_code: "KIT-SBSF-20260112-001", ... } }
         ↓
Dialog shows success message with kit code
         ↓
Dialog auto-closes after 1.5 seconds
         ↓
ProcessHierarchyView re-fetches counts for all processes
         ↓
UI updates to show new counts
```

### Adding Resin

```
User clicks [+ Add Resin]
         ↓
AddResinDialog opens
         ↓
User uploads photo to resin-photos bucket
         ↓
User clicks [Create Resin]
         ↓
Dialog calls: POST /api/resin/create {
  photoUrl: "resin-photos/...",
  createdBy: "user123"
}
         ↓
API response: { resin: { resin_code: "RESIN-20260112-001", available_count: 1 } }
         ↓
Dialog shows success message with resin code
         ↓
Dialog auto-closes after 1.5 seconds
         ↓
ProcessHierarchyView re-fetches counts for all processes
         ↓
UI updates to show new resin count
```

## Key UI Principles

1. **Process First**: User selects process from hierarchy BEFORE any action
2. **No Dropdowns**: Process is auto-bound, not selected from dropdown
3. **Visual Hierarchy**: Categories → Processes → Counts → Actions
4. **Clear Separation**: Process-specific kits vs. shared resin
5. **Traceability**: Kit codes show process code (e.g., SBSF in KIT-SBSF-...)
6. **Mandatory Photos**: Every kit and resin lot must have a photo
7. **Read-Only Process**: Once dialog opens, process cannot be changed
8. **Live Counts**: Inventory counts auto-update after creation

## Responsive Behavior

| Screen Size | Sidebar Width | Behavior |
|-------------|---|---|
| < 1024px | 100% (full width) | Sidebar collapses, drawer or tabs |
| 1024px - 1440px | 384px (32% of 1200px) | Side-by-side layout |
| > 1440px | 384px (27% of 1440px) | Full layout with more space on right |

## Accessibility Features

- ✅ Keyboard navigation in dialog
- ✅ Tab order: Process → Photo → Buttons
- ✅ Clear error messages for missing fields
- ✅ Loading states visible during uploads
- ✅ Success confirmation messages
- ✅ Read-only fields clearly marked
