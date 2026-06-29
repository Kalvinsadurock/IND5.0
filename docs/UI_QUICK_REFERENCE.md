# UI Implementation - Quick Reference

## Component Files Created
- **ProcessHierarchyView.tsx** - Left sidebar with process list & counts
- **ProcessSpecificAddKitDialog.tsx** - Auto-bound kit creation dialog
- **AddResinDialog.tsx** - Shared resin creation dialog

## Files Updated
- **ProcessTab.tsx** - Integrated new components (610 lines)

## Key Architecture Changes

### Before
```
ProcessTab
├── Old sidebar (272px list)
├── Top buttons (global "Add Material Kit/Glass/Resin")
├── Material dropdown + dialog (choose process at creation)
└── Filtered process list
```

### After
```
ProcessTab
├── ProcessHierarchyView (384px hierarchy)
│   ├── Global Resin section
│   ├── Process categories (Inventory, Prefab, Moulding, Finishing)
│   └── Process rows with [Add Material/Glass Kit] buttons
├── No top buttons (moved to hierarchy)
├── ProcessSpecificAddKitDialog (process auto-bound)
├── AddResinDialog (no process binding)
└── Process selection + main content area
```

## API Calls Made by Components

| Component | Endpoint | Method | Params | Purpose |
|-----------|----------|--------|--------|---------|
| ProcessHierarchyView | `/api/process/:id/inventory` | GET | processId | Fetch kit/resin counts |
| ProcessSpecificAddKitDialog | `/api/kits/create` | POST | kitType, processId, photoUrl, createdBy | Create kit with auto-bound process |
| AddResinDialog | `/api/resin/create` | POST | photoUrl, createdBy | Create shared resin |

## State Variables Added to ProcessTab

```typescript
// Dialog states
const [isAddKitDialogOpen, setIsAddKitDialogOpen] = useState(false);
const [isAddResinDialogOpen, setIsAddResinDialogOpen] = useState(false);
const [pendingKitType, setPendingKitType] = useState<'KIT' | 'GLASS'>('KIT');

// Derived from props
const pendingProcess = selectedProcess; // Auto-bound to selected process
```

## Handler Functions Added to ProcessTab

```typescript
// When user clicks [Add Material Kit] or [Add Glass Kit] in hierarchy
function handleAddKit(process: Process, kitType: 'KIT' | 'GLASS') {
  setPendingKitType(kitType);
  setIsAddKitDialogOpen(true);
}

// When user clicks [+ Add Resin] in global resin section
function handleAddResin() {
  setIsAddResinDialogOpen(true);
}

// Called by dialogs on success to refresh counts
function onSuccess() {
  // ProcessHierarchyView re-fetches counts automatically
}
```

## Process Code Format (for ID Generation)

| Entity | Code Format | Example |
|--------|-------------|---------|
| Material Kit | `KIT-{PROCESS_CODE}-{YYYYMMDD}-###` | `KIT-SBSF-20250112-001` |
| Glass Kit | `GLASS-{PROCESS_CODE}-{YYYYMMDD}-###` | `GLASS-SBSF-20250112-001` |
| Resin Lot | `RESIN-{YYYYMMDD}-###` | `RESIN-20250112-001` |

Where:
- `PROCESS_CODE` = 4-char code from process record (e.g., "SBSF" for Sintering Base Single Form)
- `YYYYMMDD` = Creation date (20250112 = January 12, 2025)
- `###` = Sequential number (001, 002, 003...)

## Photo Storage

| Dialog | Bucket | Folder | Filename Format |
|--------|--------|--------|-----------------|
| ProcessSpecificAddKitDialog | `kit-photos` | `/kit-{processId}/` | `{kitCode}-{timestamp}.jpg` |
| AddResinDialog | `resin-photos` | `/` | `{resinCode}-{timestamp}.jpg` |

## Error Scenarios

| Scenario | Handling |
|----------|----------|
| Photo upload fails | Show error message, allow retry |
| API call fails | Show error message with HTTP status, allow retry |
| Process not found | Show error, close dialog |
| Database error | Show generic error, log to console |
| No internet | Show "Connection failed", allow offline retry |

## Build Verification

```bash
# Full build
npm run build

# Expected output
✓ 2358 modules transformed.
✓ built in 6.92s
```

## Component Props Reference

### ProcessHierarchyView
```typescript
interface ProcessHierarchyViewProps {
  processes: Process[];
  selectedProcess: Process | null;
  onSelectProcess: (process: Process) => void;
  onAddKit: (process: Process, kitType: 'KIT' | 'GLASS') => void;
  onAddResin: () => void;
  loading?: boolean;
}
```

### ProcessSpecificAddKitDialog
```typescript
interface ProcessSpecificAddKitDialogProps {
  isOpen: boolean;
  onClose: () => void;
  process: {
    id: number;
    name: string;
    code: string;
    processNumber: number;
  };
  kitType: 'KIT' | 'GLASS';
  userName: string;
  onSuccess?: () => void;
}
```

### AddResinDialog
```typescript
interface AddResinDialogProps {
  isOpen: boolean;
  onClose: () => void;
  userName: string;
  onSuccess?: () => void;
}
```

## Common Issues & Solutions

| Issue | Cause | Solution |
|-------|-------|----------|
| Process dropdown appears in dialog | Wrong component used | Use ProcessSpecificAddKitDialog with auto-bound process |
| Counts don't update after creation | onSuccess callback not firing | Check API response, verify callback is passed |
| Photos not uploading | Supabase bucket not configured | Create `kit-photos` and `resin-photos` buckets |
| Dialog won't close | Success callback missing closeDelay | Ensure setTimeout closes dialog after 1500ms |
| Wrong process code in kit ID | Process not properly bound | Verify process is passed as prop, not selected from dropdown |

## Next Steps

1. **Verify Supabase Setup**
   - [ ] `kit-photos` bucket exists
   - [ ] `resin-photos` bucket exists
   - [ ] Both allow authenticated uploads

2. **Run Full Test Suite**
   - Use UI_TESTING_GUIDE.md for 15 functional tests
   - Run all edge case tests
   - Performance tests

3. **Update Manufacturing Pages**
   - Show kit counts instead of boolean
   - Show resin count instead of boolean
   - Use `/api/kits/available/:processId` and `/api/resin/available`

4. **Remove Legacy Components** (optional)
   - Delete MaterialCreationDialog.tsx
   - Delete MaterialSelectionDialog.tsx
   - Update any remaining imports

## File Locations

```
src/app/components/
├── ProcessHierarchyView.tsx          [NEW - 240 lines]
├── ProcessSpecificAddKitDialog.tsx   [NEW - 230 lines]
├── AddResinDialog.tsx                [NEW - 200 lines]
├── ProcessTab.tsx                    [UPDATED - 610 lines]
├── MaterialCreationDialog.tsx        [OLD - legacy, kept for now]
└── MaterialSelectionDialog.tsx       [OLD - legacy, kept for now]

Documentation/
├── UI_COMPONENTS_UPDATE.md           [300 lines]
├── UI_VISUAL_GUIDE.md                [350 lines]
├── UI_TESTING_GUIDE.md               [500+ lines]
└── UI_QUICK_REFERENCE.md             [this file]
```

## Quick Troubleshooting

**Build fails with "Unexpected end of file"**
- Check ProcessTab.tsx for missing closing braces in functions
- Run: `npm run build 2>&1 | grep -n "error"`

**Components not showing**
- Verify imports in ProcessTab.tsx
- Check if ProcessHierarchyView is rendered in JSX
- Look for console errors (F12 DevTools)

**Counts show as 0**
- Check if `/api/process/:id/inventory` endpoint is running
- Verify database has kit records
- Check browser Network tab for API response

**Photos not saving**
- Verify Supabase project is set up
- Check buckets: `kit-photos` and `resin-photos`
- Confirm Supabase URL and API key in `.env`

**Dialog won't close**
- Check if onSuccess callback is being called
- Verify setTimeout(onClose, 1500) is present
- Look for API errors preventing success state

---

**Last Updated**: Phase 2 - UI Layer Implementation Complete
**Status**: ✅ Ready for Testing
**Build Status**: ✅ SUCCESS (2358 modules, 6.92s)
