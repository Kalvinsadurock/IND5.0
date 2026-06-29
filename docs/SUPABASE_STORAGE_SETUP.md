# Supabase Storage Configuration for MES

## Critical Setup Steps

### 1. Create `kit-photos` Bucket

**In Supabase Dashboard:**

1. Navigate to **Storage** → **Buckets**
2. Click **New Bucket**
3. Bucket name: `kit-photos`
4. Privacy: **PRIVATE** (not public)
5. Click **Create Bucket**

### 2. Create `resin-photos` Bucket

**In Supabase Dashboard:**

1. Navigate to **Storage** → **Buckets**
2. Click **New Bucket**
3. Bucket name: `resin-photos`
4. Privacy: **PRIVATE** (not public)
5. Click **Create Bucket**

---

## Set Storage Policies

### For `kit-photos` Bucket

Go to **Storage** → **kit-photos** → **Policies**

**Add Policy 1: Allow Authenticated Insert**
- Name: `Allow authenticated insert`
- Definition: `(bucket_id = 'kit-photos')`
- Permission: `INSERT` ✅

**Add Policy 2: Allow Authenticated Select**
- Name: `Allow authenticated select`
- Definition: `(bucket_id = 'kit-photos')`
- Permission: `SELECT` ✅

**Add Policy 3: Allow Authenticated Delete (own files)**
- Name: `Allow authenticated delete own files`
- Definition: `(bucket_id = 'kit-photos' AND auth.uid()::text = owner)`
- Permission: `DELETE` ✅

### For `resin-photos` Bucket

Repeat the same 3 policies for the `resin-photos` bucket.

---

## File Upload Paths

### Kit Photos

**Path Format:**
```
kit-photos/{kit_id}.jpg
```

**Example:**
```
kit-photos/123.jpg
kit-photos/456.jpg
kit-photos/789.jpg
```

Where `{kit_id}` is the numeric ID from `kit_inventory.id`.

### Resin Photos

**Path Format:**
```
resin-photos/{resin_id}.jpg
```

**Example:**
```
resin-photos/1.jpg
resin-photos/2.jpg
resin-photos/3.jpg
```

Where `{resin_id}` is the numeric ID from `resin_lot_inventory.id`.

---

## Database Column for Photo URLs

### In `kit_inventory` Table

Column: `photo_url` (text)

**Example Values:**
```
https://YOUR_PROJECT_ID.supabase.co/storage/v1/object/authenticated/kit-photos/123.jpg
https://YOUR_PROJECT_ID.supabase.co/storage/v1/object/authenticated/kit-photos/456.jpg
```

### In `resin_lot_inventory` Table

Column: `photo_url` (text)

**Example Values:**
```
https://YOUR_PROJECT_ID.supabase.co/storage/v1/object/authenticated/resin-photos/1.jpg
https://YOUR_PROJECT_ID.supabase.co/storage/v1/object/authenticated/resin-photos/2.jpg
```

---

## Frontend Upload Function

The dialogs in MES use this pattern:

```typescript
// 1. Create FormData with file
const formData = new FormData();
formData.append('file', file);

// 2. Upload to Supabase
const response = await supabaseClient.storage
  .from('kit-photos')
  .upload(`${kitId}.jpg`, file, { upsert: false });

// 3. Get public URL
if (response.data) {
  const { data } = supabaseClient.storage
    .from('kit-photos')
    .getPublicUrl(`${kitId}.jpg`);
  
  photoUrl = data.publicUrl;
}

// 4. Save to database
await fetch('/api/kits/create', {
  method: 'POST',
  body: JSON.stringify({
    kitType: 'KIT',
    processId: 123,
    photoUrl: photoUrl,
    createdBy: 'John Doe'
  })
});
```

---

## Environment Variables

Ensure these are set in `.env.local`:

```
VITE_SUPABASE_URL=https://YOUR_PROJECT_ID.supabase.co
VITE_SUPABASE_ANON_KEY=YOUR_ANON_KEY
```

---

## Testing Upload

### Manual Test via Dashboard

1. Go to **Storage** → **kit-photos**
2. Click **Upload file**
3. Select a test image
4. Verify file appears in the bucket

### Test via Frontend

1. Open Incoming page
2. Select a process
3. Click [Add Material Kit]
4. Upload a photo
5. Click [Create Kit]
6. Check Supabase Storage → kit-photos for new file

---

## Troubleshooting

### Error: "Bucket not found"
- [ ] Verify bucket name is exactly `kit-photos` (lowercase, hyphens)
- [ ] Verify bucket is not deleted
- [ ] Verify Supabase project is correct

### Error: "Unauthorized"
- [ ] Verify user is authenticated (logged in)
- [ ] Verify storage policies include `INSERT` and `SELECT` for authenticated users
- [ ] Verify `auth.uid()` is set in your session

### Error: "File size too large"
- [ ] Limit file uploads to < 10MB in frontend validation
- [ ] Compress images before upload

### Error: "CORS error"
- [ ] Supabase CORS should be auto-configured
- [ ] Verify browser console for exact error
- [ ] Check Supabase project settings → API

---

## Production Considerations

1. **CDN**: Supabase uses Cloudflare CDN by default
2. **Cache Headers**: Files cached for 1 hour by default
3. **Backup**: Enable Supabase automated backups
4. **Cost**: Storage charges per GB (~$0.15/GB for first 10GB)
5. **Cleanup**: Implement retention policy (delete old photos after X days)

---

## Bucket Status Checklist

- [ ] `kit-photos` bucket created
- [ ] `kit-photos` privacy set to PRIVATE
- [ ] `kit-photos` policies configured (INSERT, SELECT, DELETE)
- [ ] `resin-photos` bucket created
- [ ] `resin-photos` privacy set to PRIVATE
- [ ] `resin-photos` policies configured (INSERT, SELECT, DELETE)
- [ ] Database columns have `photo_url` (text)
- [ ] Environment variables set in `.env.local`
- [ ] Manual upload test successful
- [ ] Frontend upload dialog tested

**Status**: ⏳ PENDING (Manual Supabase configuration required)
