# MES Material Preparation & Consumption Flow - Implementation Summary

## Overview
Successfully implemented MES material preparation and consumption flow with role-based separation, auto ID generation, photo capture during preparation, and count-based availability for KIT, Glass KIT, and Resin Lot.

## ✅ Completed Implementation

### 1. Database Schema (Drizzle ORM)
**File:** `shared/schema.ts`

Added 4 new tables:
- **material_master**: Stores created materials (KIT/GLASS/RESIN)
  - `material_code` (auto-generated: KIT-YYYY-XXXX)
  - `material_type` (KIT | GLASS | RESIN)
  - `created_by` (user name)
  - `photo_url` (mandatory upload)
  - `available` (boolean)

- **material_process_intent**: Links material to intended downstream process
  - `material_id` → material_master
  - `process_id` → processes

- **process_execution**: Created when production team starts a process
  - `process_id` → processes
  - `started_by` (user name)
  - `started_at` (timestamp)

- **material_usage**: Created when production team assigns material
  - `process_execution_id` → process_execution
  - `material_id` → material_master
  - `used_by` (user name)
  - `used_at` (timestamp)

### 2. API Endpoints (Express)
**File:** `server/index.ts`

Created 4 new API endpoints:

#### POST `/api/materials/create`
Creates a new material with auto-generated code
- **Request body:**
  ```json
  {
    "materialType": "KIT|GLASS|RESIN",
    "createdBy": "username",
    "photoUrl": "https://...",
    "targetProcessId": 1
  }
  ```
- **Response:** Material object with auto-generated code

#### GET `/api/materials/available`
Gets available materials for a process
- **Query params:** 
  - `processId` (required)
  - `materialType` (optional: KIT, GLASS, RESIN, ALL)
- **Response:** Array of available materials

#### POST `/api/process-execution/start`
Starts a process execution and assigns materials
- **Request body:**
  ```json
  {
    "processId": 1,
    "startedBy": "username",
    "materialIds": [1, 2, 3]
  }
  ```
- **Response:** Execution object with materials assigned

#### GET `/api/materials/:materialId/traceability`
Gets complete material traceability
- **Response:** Material + process intent + usage history

### 3. Client API Module
**File:** `src/app/lib/api.ts`

Added `materialsApi` object with methods:
- `create(data)` - Create new material
- `getAvailable(processId, materialType)` - Fetch available materials
- `getTraceability(materialId)` - Get material history
- `startProcessExecution(data)` - Start process with materials

### 4. UI Components

#### MaterialCreationDialog
**File:** `src/app/components/MaterialCreationDialog.tsx`

Modal for preparation team to create KIT/Glass KIT/Resin Lot:
- ✅ Auto-generated material code display
- ✅ Auto-filled user name
- ✅ Auto-filled timestamp
- ✅ Mandatory photo upload to Supabase Storage
- ✅ Dynamic target process selection (fetches from DB)
- ✅ Loading states and error handling
- ✅ Success confirmation message

#### MaterialSelectionDialog
**File:** `src/app/components/MaterialSelectionDialog.tsx`

Modal for production team to select materials when starting a process:
- ✅ Displays available materials for process
- ✅ Grouped by type (KIT, GLASS, RESIN)
- ✅ Multiple selection for KIT/GLASS
- ✅ Single selection for RESIN (shared)
- ✅ Photo thumbnails
- ✅ Auto-assigns materials and marks as unavailable
- ✅ RESIN stays available (shared across processes)

### 5. Integration into Existing UI

#### ProcessTab (Production/Inventory Views)
**File:** `src/app/components/ProcessTab.tsx`

- **For Inventory Processes (10=Incoming, 20=Glass Cutting, 30=Degassing):**
  - Added "Add KIT", "Add Glass KIT", "Add Resin Lot" buttons
  - Opens MaterialCreationDialog with material type
  - User can upload photo and select target process
  - Material code auto-generated on creation

- **For Production Processes (Prefabricated, Moulding, Finishing):**
  - Modified "Start Process" button behavior
  - Now shows MaterialSelectionDialog for production processes
  - User selects materials before process starts
  - System auto-marks KIT/GLASS as unavailable
  - RESIN remains available for other processes

## 🔄 Workflow

### Preparation Team (Inventory Processes)
1. Navigate to Incoming/Glass Cutting/Degassing process
2. Click "Add KIT" / "Add Glass KIT" / "Add Resin Lot" button
3. Material creation dialog opens:
   - User name & timestamp auto-filled
   - User uploads mandatory photo
   - User selects target downstream process
4. System auto-generates material code (e.g., KIT-2026-0001)
5. Material stored with `available=true`
6. Process intent recorded

### Production Team (Production Processes)
1. Navigate to Prefabricated/Moulding/Finishing process
2. Click "Start Process" button
3. Material selection dialog shows available materials:
   - Filters by process intent
   - Shows only `available=true` materials
   - Groups by type
4. User selects:
   - 1+ KIT/GLASS materials
   - 0-1 RESIN lots
5. System creates:
   - process_execution record
   - material_usage records
   - Updates material_master.available=false for KIT/GLASS
   - Keeps RESIN available

## 📊 Key Features

### ✅ Core Rules Enforced
- Preparation team CAN create materials
- Preparation team CANNOT consume materials
- Production team CANNOT create materials
- Production team CAN ONLY select available materials
- Photo MANDATORY during creation
- No photo during consumption
- KIT/GLASS marked unavailable after use
- RESIN shared (stays available)

### ✅ Auto-Generated IDs
- Format: `TYPE-YYYY-SEQUENCE`
- Examples: `KIT-2026-0001`, `GLASS-2026-0001`, `RESIN-2026-0001`
- Auto-incremented per type, per year

### ✅ Role Separation (UI-level)
- Material creation buttons hidden in production processes
- Material selection hidden in inventory processes
- Upload button only in preparation dialog

### ✅ Traceability
- Material ID → Created by → Process intent → Used in → Used by
- Photo stored for reference
- Timestamps auto-captured

## 🗄️ Database Schema Relationships

```
material_master
├── material_process_intent → processes
├── material_usage → process_execution
└── [photo_url stored in Supabase Storage]

process_execution
└── material_usage → material_master

Timeline:
1. material_master (KIT created)
2. material_process_intent (linked to Prefabricated)
3. production process starts
4. process_execution created
5. material_usage (KIT assigned)
6. material_master.available = false
```

## 🔐 Access Control (UI-Level)
- Inventory category processes show "Add Material" buttons
- Production category processes show "Select Materials" dialog on start
- No backend role enforcement yet (TODO: add user roles)

## 📸 Photo Handling
- Upload to Supabase Storage bucket: `material_photos`
- Stored as: `{TYPE}-{TIMESTAMP}-{FILENAME}`
- Public URL stored in `material_master.photo_url`
- Display in dialogs and traceability views

## 🧪 Testing Checklist

### Preparation Flow
- [ ] Navigate to Incoming process
- [ ] Click "Add KIT" button
- [ ] Dialog appears with auto-filled user/timestamp
- [ ] Upload a photo
- [ ] Select target process (Prefabricated/Moulding/Finishing)
- [ ] Click "Create Material"
- [ ] Success message shows auto-generated code
- [ ] Material appears in available materials list

### Production Flow
- [ ] Navigate to Prefabricated process
- [ ] Click "Start Process" button
- [ ] Material selection dialog appears
- [ ] Shows available KIT/GLASS/RESIN
- [ ] Select materials
- [ ] Click "Start with X materials"
- [ ] Process execution created
- [ ] Material marked unavailable (except RESIN)

### Traceability
- [ ] Call GET `/api/materials/{id}/traceability`
- [ ] Returns material + process intent + usage history
- [ ] Timestamp and user info included

## ⚙️ Configuration Notes

### Supabase Storage
Need to create bucket: `material_photos`
- Visibility: Public (for public URL access)
- Policy: Allow authenticated uploads

### Process IDs
- Inventory: 10 (Incoming), 20 (Glass Cutting), 30 (Degassing)
- Production: Prefabricated/Moulding/Finishing (category)

### User Name Source
Currently hardcoded as "System User" in components
**TODO:** Connect to LoginScreen context for actual user name

## 📝 Future Enhancements

1. **Backend Role Enforcement**
   - Add user roles to schema
   - Validate role in API endpoints
   - Hide buttons based on backend roles

2. **Traceability UI**
   - Create material detail view
   - Show complete timeline
   - Display photos

3. **Batch Operations**
   - Create multiple materials at once
   - Bulk material assignment

4. **Resin Lot Sharing**
   - Link multiple materials to single resin lot
   - Track resin lot usage count

5. **Quality Integration**
   - Link QA records to materials
   - Defect traceability

## 🚀 Deployment Notes

1. Run migrations:
   ```bash
   npm run db:migrate
   ```

2. Seed process data (already exists in seed.ts)

3. Create Supabase storage bucket:
   - Name: `material_photos`
   - Public access enabled

4. Update user context in LoginScreen (future)

5. Test all flows before production

## 📞 Support

For issues:
1. Check browser console for errors
2. Check server logs for API errors
3. Verify Supabase storage bucket exists
4. Ensure processes are seeded in database
