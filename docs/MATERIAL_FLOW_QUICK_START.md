# MES Material Flow - Quick Start Guide

## 🎯 What Was Implemented

You now have a complete material preparation and consumption system integrated into the Process Tab. Here's what you can do:

### For Preparation Team (Inventory Processes)

#### Creating Materials in Incoming Process
1. Click on **Incoming** (Process 10) in the left sidebar
2. Click **"Add KIT"** button (blue)
3. A dialog appears with:
   - ✅ Your name (auto-filled)
   - ✅ Current date & time (auto-filled)
   - 📸 Photo upload (drag & drop or click to select)
   - 🎯 Target process (select: Prefabricated, Moulding, or Finishing)
4. Upload a photo (mandatory)
5. Select target process
6. Click "Create Material"
7. Material code auto-generated: `KIT-2026-0001`, `KIT-2026-0002`, etc.

#### Creating Materials in Glass Cutting Process
1. Click on **Glass Cutting** (Process 20) in the left sidebar
2. Click **"Add Glass KIT"** button (green)
3. Same dialog as above, creates `GLASS-2026-0001`, `GLASS-2026-0002`, etc.

#### Creating Materials in Degassing Process
1. Click on **Degassing** (Process 30) in the left sidebar
2. Click **"Add Resin Lot"** button (purple)
3. Same dialog as above, creates `RESIN-2026-0001`, `RESIN-2026-0002`, etc.

### For Production Team (Production Processes)

#### Starting a Production Process with Materials
1. Click on **Prefabricated** (or Moulding/Finishing) in the left sidebar
2. Click **"Start Process"** button (green)
3. Material selection dialog appears showing:
   - All **available** KIT materials prepared for this process
   - All available GLASS materials
   - All available RESIN materials (can be shared)
   - Photo thumbnail for each material
4. Select:
   - One or more KIT/GLASS (they will become unavailable after)
   - Optional: One RESIN lot (stays available for other processes)
5. Click "Start with X materials"
6. Process execution created with materials assigned
7. Selected KIT/GLASS automatically marked as unavailable

## 📊 Database Records Created

When you create a material:
```
material_master
├── id: 1
├── material_code: "KIT-2026-0001"  ← Auto-generated
├── material_type: "KIT"
├── created_by: "System User"       ← Auto-filled (TODO: use login user)
├── photo_url: "https://..."        ← Uploaded photo
├── available: true
└── created_at: now()               ← Auto-filled

material_process_intent
├── material_id: 1
├── process_id: 2  ← e.g., Prefabricated
└── created_at: now()
```

When you start a production process:
```
process_execution
├── id: 1
├── process_id: 5  ← e.g., Prefabricated
├── started_by: "System User"
└── started_at: now()

material_usage (for each material selected)
├── process_execution_id: 1
├── material_id: 1
├── used_by: "System User"
└── used_at: now()

material_master update
├── available: false  ← Only for KIT/GLASS (RESIN stays true)
```

## 🔄 Material Lifecycle

```
Preparation Phase:
1. Preparation team creates KIT-2026-0001
2. System auto-generates code
3. Material status: available=true
4. Linked to intended process (e.g., Prefabricated)

Usage Phase:
5. Production team starts Prefabricated process
6. Selects KIT-2026-0001 + RESIN-2026-0001
7. System records material_usage
8. KIT-2026-0001 now available=false (unavailable)
9. RESIN-2026-0001 stays available=true (shared)

Traceability:
10. Query: GET /api/materials/1/traceability
11. Response includes: Created by + Photo + Process intent + Used in + Used by
```

## 🏗️ File Structure

```
New Files Created:
├── src/app/components/MaterialCreationDialog.tsx
│   └── Dialog for preparation team to create materials
├── src/app/components/MaterialSelectionDialog.tsx
│   └── Dialog for production team to select materials
└── MATERIAL_FLOW_IMPLEMENTATION.md
    └── Complete technical documentation

Modified Files:
├── shared/schema.ts
│   ├── Added material_master table
│   ├── Added material_process_intent table
│   ├── Added process_execution table
│   └── Added material_usage table
├── server/index.ts
│   ├── POST /api/materials/create
│   ├── GET /api/materials/available
│   ├── POST /api/process-execution/start
│   └── GET /api/materials/:id/traceability
├── src/app/lib/api.ts
│   └── Added materialsApi with 4 methods
└── src/app/components/ProcessTab.tsx
    ├── Added material creation buttons for inventory
    ├── Modified start process for production
    └── Added material dialogs
```

## 🧪 Testing Scenarios

### Scenario 1: Create a KIT and Use It
1. Navigate to Incoming (Process 10)
2. Click "Add KIT"
3. Upload a photo
4. Select "Prefabricated" as target
5. Click "Create Material" → Get code: `KIT-2026-0001`
6. Navigate to Prefabricated
7. Click "Start Process"
8. Select `KIT-2026-0001` in the dialog
9. Click "Start with 1 material"
10. ✅ Process execution created, KIT marked unavailable

### Scenario 2: Create Glass KIT for Moulding
1. Navigate to Glass Cutting (Process 20)
2. Click "Add Glass KIT"
3. Upload a photo
4. Select "Moulding" as target
5. Click "Create Material" → Get code: `GLASS-2026-0001`
6. Navigate to Moulding
7. Click "Start Process"
8. See `GLASS-2026-0001` available
9. Select it and start
10. ✅ Material marked unavailable

### Scenario 3: Create Resin Lot (Shared)
1. Navigate to Degassing (Process 30)
2. Click "Add Resin Lot"
3. Upload a photo
4. Select "Finishing" as target
5. Click "Create Material" → Get code: `RESIN-2026-0001`
6. Navigate to Finishing
7. Click "Start Process"
8. Select `RESIN-2026-0001`
9. Click "Start with 1 material"
10. Navigate back to Prefabricated
11. Click "Start Process"
12. ✅ `RESIN-2026-0001` still available (can be used again)

## ⚠️ Known Limitations

1. **User Name**: Currently hardcoded as "System User"
   - TODO: Connect to LoginScreen context to get actual username

2. **Role Enforcement**: UI-level only (TODO: add backend roles)
   - Buttons hidden by category, not enforced server-side

3. **No Quantity**: System treats materials as unit count only
   - 1 KIT = 1 unit (cannot fractional or bulk)

4. **No Batch Operations**: Currently single material at a time
   - TODO: Add bulk creation/assignment

## 🚀 Next Steps

1. **Run the application**:
   ```bash
   npm run dev
   ```

2. **Test the flow** using scenarios above

3. **Connect user context**:
   - Get logged-in user from LoginScreen
   - Pass to components instead of "System User"

4. **Setup Supabase storage**:
   - Create bucket `material_photos` if not exists
   - Set public access for URL sharing

5. **Add traceability UI**:
   - Create material detail view
   - Show timeline and photos

## 📞 Support

If something doesn't work:

1. **Photo upload fails**:
   - Check Supabase storage bucket exists: `material_photos`
   - Verify bucket is public

2. **Process dropdown empty**:
   - Ensure processes are seeded in database
   - Check `/api/processes` endpoint returns data

3. **Material not appearing as available**:
   - Verify material_process_intent was created
   - Check material.available = true
   - Verify process_id matches

4. **TypeError on dialog**:
   - Check all components are imported
   - Verify Dialog, Select, Checkbox UI components exist

## 💡 Architecture Overview

```
┌─────────────────────────────────────────────────────┐
│           ProcessTab (Main Container)               │
├─────────────────────────────────────────────────────┤
│  Inventory Category (10, 20, 30)                    │
│  ├── Show "Add KIT" / "Add Glass KIT" / "Add Resin" │
│  └── → MaterialCreationDialog                       │
│                                                      │
│  Production Category (Prefab, Moulding, Finish)    │
│  ├── Show "Start Process" button                    │
│  └── → MaterialSelectionDialog on click            │
└─────────────────────────────────────────────────────┘
         ↓
    API Endpoints
    ├── POST /api/materials/create
    ├── GET /api/materials/available
    ├── POST /api/process-execution/start
    └── GET /api/materials/{id}/traceability
         ↓
    Database
    ├── material_master
    ├── material_process_intent
    ├── process_execution
    └── material_usage
```

---

**Version**: 1.0  
**Date**: January 12, 2026  
**Status**: Ready for Testing
