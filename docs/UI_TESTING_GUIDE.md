# UI Implementation Testing & Validation

## Pre-Testing Checklist

### Backend Requirements
- [ ] API server running on port 8001
- [ ] Database schema with new tables (kit_inventory, resin_lot_inventory, resin_consumption)
- [ ] Endpoints available:
  - [ ] `GET /api/processes` - List all processes
  - [ ] `GET /api/process/:id/inventory` - Get kit/resin counts
  - [ ] `POST /api/kits/create` - Create kit with auto-bound process
  - [ ] `POST /api/resin/create` - Create resin lot
  - [ ] `GET /api/kits/available/:processId` - Get available kits for process
  - [ ] `GET /api/resin/available` - Get available resin
  - [ ] `POST /api/kits/:id/consume` - Consume a kit
  - [ ] `POST /api/resin/:id/consume` - Consume resin

### Supabase Setup
- [ ] Bucket `kit-photos` exists and is readable
- [ ] Bucket `resin-photos` exists and is readable
- [ ] Authentication tokens configured
- [ ] CORS settings allow uploads

### Frontend Build
- [ ] `npm install` completed
- [ ] `npm run build` succeeds with no errors
- [ ] New components exist:
  - [ ] ProcessHierarchyView.tsx
  - [ ] ProcessSpecificAddKitDialog.tsx
  - [ ] AddResinDialog.tsx
- [ ] ProcessTab.tsx updated with new imports

---

## Functional Testing

### Test 1: Process Hierarchy Display

**Steps**:
1. Open ProcessTab component
2. Look at left sidebar

**Expected Result**:
- [ ] Sidebar shows "Process Inventory" header
- [ ] Global Resin section at top showing:
  - [ ] "Resin Inventory (Shared)" label
  - [ ] Count of available resin units (should be > 0)
  - [ ] [+ Add Resin] button
- [ ] Process categories visible (Inventory, Prefabricated, Moulding, Finishing)
- [ ] Each category shows process list when expanded
- [ ] Each process shows:
  - [ ] Process name
  - [ ] Material Kit count
  - [ ] Glass Kit count
  - [ ] (If inventory) Resin count (same for all)

**Passing Criteria**: All visual elements present and counts are numeric

---

### Test 2: Add Material Kit - Dialog Opening

**Steps**:
1. In process hierarchy, find a process
2. Click the row to expand it
3. Click [Add Material Kit] button

**Expected Result**:
- [ ] Dialog opens with title "Add Material Kit"
- [ ] Process section shows:
  - [ ] "Auto-Bound Process" label
  - [ ] Selected process name
  - [ ] Selected process number
  - [ ] "✓ Bound" indicator
  - [ ] NOT a dropdown (read-only)
- [ ] Photo upload area visible with:
  - [ ] Camera icon
  - [ ] "Click to upload a photo" text
  - [ ] Dashed border around upload area
- [ ] Info box shows auto-generated code format:
  - [ ] Format: KIT-{PROCESS_CODE}-{YYYYMMDD}-###
  - [ ] Example with today's date
- [ ] [Cancel] and [Create Kit] buttons visible
- [ ] [Create Kit] button is disabled (because no photo yet)

**Passing Criteria**: Dialog opens correctly with process auto-bound

---

### Test 3: Add Material Kit - Photo Upload

**Steps**:
1. Dialog is open (from Test 2)
2. Click on the upload area
3. Select an image file from device
4. Wait for upload to complete

**Expected Result**:
- [ ] File dialog opens and closes
- [ ] Photo appears in preview area
- [ ] Photo dimensions reasonable (not too large)
- [ ] "✓ Photo uploaded: {filename}" message appears
- [ ] [Remove Photo] button appears
- [ ] [Create Kit] button becomes ENABLED
- [ ] No error messages

**Passing Criteria**: Photo uploads and preview displays

---

### Test 4: Add Material Kit - Creation Success

**Steps**:
1. Photo is uploaded (from Test 3)
2. Click [Create Kit] button
3. Wait for submission to complete

**Expected Result**:
- [ ] Button shows "Creating..." with spinner
- [ ] API call made to `/api/kits/create`
- [ ] Success message appears showing created kit code
- [ ] Code format: KIT-{PROCESS_CODE}-{YYYYMMDD}-{SEQ}
- [ ] Dialog auto-closes after 1.5 seconds
- [ ] Process hierarchy re-fetches counts
- [ ] Material Kit count increases by 1 for that process

**Passing Criteria**: Kit created with correct code format and count updates

---

### Test 5: Add Glass Kit - Same Process as Test 4

**Steps**:
1. In same process as Test 4
2. Click [Add Glass Kit] button
3. Upload photo
4. Click [Create Glass Kit]

**Expected Result**:
- [ ] Dialog opens with title "Add Glass Kit"
- [ ] Same process is auto-bound
- [ ] Dialog shows it's for glass kit
- [ ] After creation, success shows GLASS-{PROCESS_CODE}-{YYYYMMDD}-{SEQ}
- [ ] Glass Kit count increases by 1 for that process
- [ ] Material Kit count unchanged

**Passing Criteria**: Glass kit created separately, counts update correctly

---

### Test 6: Add Resin - Dialog Opening

**Steps**:
1. In Process Hierarchy sidebar, look at top
2. Click [+ Add Resin] in Global Resin section

**Expected Result**:
- [ ] Dialog opens with title "Add Resin Lot"
- [ ] Subtitle shows: "Resin is shared across all processes"
- [ ] Availability section shows:
  - [ ] "This resin lot will be available to all processes that need it"
  - [ ] No process selector (nowhere to choose process)
- [ ] Photo upload area visible
- [ ] Info box shows code format:
  - [ ] RESIN-{YYYYMMDD}-###
  - [ ] No process code (because it's shared)
- [ ] [Cancel] and [Create Resin Lot] buttons visible

**Passing Criteria**: Dialog opens with shared resin messaging

---

### Test 7: Add Resin - Creation Success

**Steps**:
1. Dialog is open (from Test 6)
2. Upload a photo
3. Click [Create Resin Lot]

**Expected Result**:
- [ ] Photo uploads successfully
- [ ] Button shows "Creating..." with spinner
- [ ] API call made to `/api/resin/create`
- [ ] Success message shows: RESIN-{YYYYMMDD}-{SEQ}
- [ ] Dialog auto-closes
- [ ] ALL process rows update their resin count
- [ ] Resin count increases by 1 across all processes
- [ ] Global Resin section also updates

**Passing Criteria**: Resin created and shared count updates everywhere

---

### Test 8: Process Selection Persistence

**Steps**:
1. Select a process from hierarchy (click on it)
2. Main content area shows selected process details
3. In sidebar, click [Add Material Kit] for that process
4. Dialog opens with process bound
5. Cancel the dialog
6. Selected process still highlighted in sidebar

**Expected Result**:
- [ ] Process selection persists after dialog closes
- [ ] Selected process highlighted with border in sidebar
- [ ] Main content still shows that process's details
- [ ] Can immediately click [Add Material Kit] again

**Passing Criteria**: Selection state preserved across dialog interactions

---

### Test 9: Error Handling - Missing Photo

**Steps**:
1. Open Add Material Kit dialog
2. Try to click [Create Kit] WITHOUT uploading photo

**Expected Result**:
- [ ] Button doesn't submit (disabled state)
- [ ] OR if not disabled, form validation catches it:
  - [ ] Error message appears: "Please upload a photo"
  - [ ] Dialog stays open
  - [ ] Kit not created

**Passing Criteria**: Validation prevents kit creation without photo

---

### Test 10: Error Handling - Photo Upload Failure

**Steps**:
1. Open Add Material Kit dialog
2. Attempt to upload very large file (> 10MB)
3. OR simulate network error by going offline

**Expected Result**:
- [ ] Upload fails
- [ ] Error message appears:
  - [ ] "Photo upload failed: {error message}"
  - [ ] Message is clear and helpful
- [ ] [Create Kit] button remains disabled
- [ ] Can retry with different file

**Passing Criteria**: Error handling is user-friendly

---

### Test 11: Multiple Processes - Independent Counts

**Steps**:
1. Create 2 Material Kits in Process A
2. Create 1 Material Kit in Process B
3. Look at both processes in hierarchy

**Expected Result**:
- [ ] Process A shows: Material Kits: 2
- [ ] Process B shows: Material Kits: 1
- [ ] Counts are independent
- [ ] Glass Kit counts unchanged for both
- [ ] Resin count same for both (12 units if no consumption)

**Passing Criteria**: Counts are per-process for kits, shared for resin

---

### Test 12: UI Responsiveness - Sidebar Width

**Steps**:
1. View process hierarchy in sidebar
2. Check layout at different screen widths:
   - [ ] Wide screen (> 1440px)
   - [ ] Medium screen (1024-1440px)
   - [ ] Mobile (< 1024px)

**Expected Result**:
- [ ] On wide screens: Sidebar visible, process list readable
- [ ] On mobile: Sidebar might collapse or use full width
- [ ] Text not cut off
- [ ] Buttons still clickable
- [ ] No horizontal scrolling needed

**Passing Criteria**: Layout adapts to screen size

---

### Test 13: Auto-Refresh After Creation

**Steps**:
1. Note current kit count for a process (e.g., 5)
2. Create a new kit for that process
3. Dialog closes and you see success message
4. Look at process hierarchy

**Expected Result**:
- [ ] Kit count automatically updates to 6
- [ ] No manual refresh needed
- [ ] Update happens within 1 second
- [ ] Other processes' counts unchanged

**Passing Criteria**: Counts auto-update without page refresh

---

### Test 14: Concurrent Operations

**Steps**:
1. Open two [Add Material Kit] dialogs for different processes
2. Upload photos to both
3. Create both kits (one after the other)

**Expected Result**:
- [ ] Both kits created successfully
- [ ] Both counts update correctly
- [ ] No conflicts or errors
- [ ] Both success messages show different kit codes

**Passing Criteria**: Multiple operations don't interfere

---

### Test 15: Different Kit Types

**Steps**:
1. Create Material Kit (KIT) for Process A → code starts with "KIT-"
2. Create Glass Kit (GLASS) for Process A → code starts with "GLASS-"
3. Create Resin (RESIN) → code starts with "RESIN-"

**Expected Result**:
- [ ] All three codes use correct prefix
- [ ] All show process code where appropriate:
  - [ ] KIT code: KIT-{PROCESS_CODE}-...
  - [ ] GLASS code: GLASS-{PROCESS_CODE}-...
  - [ ] RESIN code: RESIN-... (no process code)
- [ ] Date portion: {YYYYMMDD} = today's date
- [ ] Sequence: ### = 001 for first, 002 for second, etc.

**Passing Criteria**: All ID formats correct

---

## Performance Testing

### Test P1: Initial Load Time

**Steps**:
1. Start fresh browser session
2. Navigate to ProcessTab
3. Measure time until process hierarchy visible

**Expected Result**:
- [ ] Process hierarchy loads within 2 seconds
- [ ] Counts load within 3 seconds
- [ ] No blank areas or loading delays

**Passing Criteria**: Load time acceptable

---

### Test P2: Inventory Count Fetching

**Steps**:
1. Watch network tab in DevTools
2. Open ProcessTab
3. Observe API calls

**Expected Result**:
- [ ] One call to `/api/processes` (list all)
- [ ] N calls to `/api/process/:id/inventory` (one per process)
- [ ] All complete within 2 seconds total
- [ ] No repeated calls (no memory leaks)

**Passing Criteria**: Efficient API usage

---

## Visual Regression Testing

### Test V1: Dialog Appearance

**Steps**:
1. Take screenshot of Add Material Kit dialog
2. Compare to mock-ups in UI_VISUAL_GUIDE.md

**Expected Result**:
- [ ] Dialog styled correctly (colors, fonts, spacing)
- [ ] All elements visible and readable
- [ ] Buttons have proper contrast
- [ ] Dark theme consistent with app

**Passing Criteria**: Matches design specs

---

### Test V2: Process Hierarchy Colors

**Steps**:
1. Take screenshot of process hierarchy
2. Verify category colors:
   - [ ] Inventory: Purple
   - [ ] Prefabricated: Blue
   - [ ] Moulding: Amber/Yellow
   - [ ] Finishing: Emerald/Green

**Expected Result**:
- [ ] Colors match configuration
- [ ] Icons appropriate for category
- [ ] Text readable on background

**Passing Criteria**: Visual design consistent

---

## Edge Cases

### Test E1: Zero Counts

**Steps**:
1. If a process has zero kits
2. Look at process row

**Expected Result**:
- [ ] Shows "0" not blank
- [ ] Still allows adding kits
- [ ] Buttons still enabled

**Passing Criteria**: Zero handled gracefully

---

### Test E2: Very Long Process Names

**Steps**:
1. If any process has very long name
2. Look at hierarchy

**Expected Result**:
- [ ] Text truncates with "..." if needed
- [ ] Doesn't break layout
- [ ] Hover shows full name (tooltip)

**Passing Criteria**: Long names handled

---

### Test E3: Many Processes

**Steps**:
1. If > 30 processes total
2. Scroll through hierarchy

**Expected Result**:
- [ ] Sidebar scrolls smoothly
- [ ] No performance degradation
- [ ] Counts still load

**Passing Criteria**: Scales to many processes

---

## Sign-Off Checklist

### Functionality
- [ ] All 15 functional tests pass
- [ ] All error cases handled
- [ ] All UI elements present

### Performance
- [ ] All 2 performance tests pass
- [ ] Load time < 3 seconds
- [ ] API calls efficient

### Visual
- [ ] All 2 visual tests pass
- [ ] Design consistent
- [ ] Colors and fonts correct

### Edge Cases
- [ ] All 3 edge case tests pass
- [ ] Zero counts handled
- [ ] Long names handled
- [ ] Many processes handled

### Browser Compatibility
- [ ] Chrome/Edge (latest)
- [ ] Firefox (latest)
- [ ] Safari (if available)

---

## Known Limitations

1. **Offline Mode**: Counts won't update without internet
2. **Real-time Updates**: Counts not live-synced between users
3. **Permissions**: All users can see all processes
4. **Concurrency**: If two users create kit simultaneously, counts might be off by 1 until refresh

---

## Post-Testing Tasks

1. **Documentation**: Update any docs that reference old material system
2. **Training**: Train users on new process-first workflow
3. **Monitoring**: Set up logging for API errors
4. **Feedback**: Collect user feedback after launch
5. **Optimization**: Based on feedback, optimize counts or caching
