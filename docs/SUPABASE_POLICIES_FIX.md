# 🔧 Supabase Storage Policy Fix

## The Problem

The buckets exist, but they have **no upload permissions**. When you try to upload, Supabase returns a 400 error because the policies are missing.

```
Failed to load resource: the server responded with a status of 400
```

---

## The Solution: Add RLS Policies

### Step 1: Go to Supabase Dashboard

1. Open: https://app.supabase.com
2. Select your **MES_Prod** project
3. Click **Storage** (left sidebar)
4. Click **Buckets**

### Step 2: Configure `kit-photos` Bucket

1. Click on **kit-photos** bucket
2. Click **Policies** tab
3. Click **New Policy** or **Create a policy** button

#### Policy 1: Allow Authenticated Users to Upload

- **Policy Name**: `Allow authenticated users to upload`
- **Target roles**: `authenticated`
- **Permissions**: Check `INSERT`
- **With condition**: Leave empty (allow all)
- Click **Review** → **Create Policy**

#### Policy 2: Allow Authenticated Users to Read

- **Policy Name**: `Allow authenticated users to read`
- **Target roles**: `authenticated`
- **Permissions**: Check `SELECT`
- Click **Review** → **Create Policy**

#### Policy 3: Allow Authenticated Users to Update/Delete Their Own

- **Policy Name**: `Allow users to delete own files`
- **Target roles**: `authenticated`
- **Permissions**: Check `UPDATE`, `DELETE`
- **With condition**: Leave empty or use `(bucket_id = 'kit-photos')`
- Click **Review** → **Create Policy**

### Step 3: Configure `resin-photos` Bucket

Repeat the exact same 3 policies for the **resin-photos** bucket.

---

## Visual Guide: Adding a Policy

```
Supabase → Storage → kit-photos → Policies
                                    ├── New Policy
                                    │   ├── Name: "Allow authenticated users to upload"
                                    │   ├── Target roles: authenticated
                                    │   ├── Permissions: ✓ INSERT
                                    │   ├── Review
                                    │   └── Create Policy ✓
                                    │
                                    ├── New Policy
                                    │   ├── Name: "Allow authenticated users to read"
                                    │   ├── Target roles: authenticated
                                    │   ├── Permissions: ✓ SELECT
                                    │   └── Create Policy ✓
                                    │
                                    └── New Policy
                                        ├── Name: "Allow users to delete own files"
                                        ├── Target roles: authenticated
                                        ├── Permissions: ✓ UPDATE ✓ DELETE
                                        └── Create Policy ✓
```

---

## After Adding Policies

Check **Policies** tab for each bucket. You should see:

```
✓ Allow authenticated users to upload (INSERT)
✓ Allow authenticated users to read (SELECT)
✓ Allow users to delete own files (UPDATE, DELETE)
```

For **both buckets**:
- kit-photos ✓
- resin-photos ✓

---

## Test Upload

After adding policies:

1. **Refresh the browser**
2. Go to **Inventory** page
3. Click **[+ Add Material Kit]** or **[+ Add Resin]**
4. Try uploading a photo
5. Should work now! ✅

---

## If Still Getting 400 Error

### Check 1: Verify Bucket is NOT Public

1. Click on bucket name
2. Click **Settings** tab
3. **Access settings** should show:
   - ❌ NOT "Public bucket"
   - ✓ "Private bucket"

If it says "Public", change it to Private.

### Check 2: Verify Auth is Working

Open browser DevTools (F12):
1. **Application** tab
2. **LocalStorage**
3. Look for `sb-auth` or similar
4. If empty, you're not authenticated

You may need to login first.

### Check 3: Test with cURL

```bash
curl -X POST \
  "https://YOUR_PROJECT_ID.supabase.co/storage/v1/object/kit-photos/test.jpg" \
  -H "Authorization: Bearer YOUR_ANON_KEY" \
  -H "Content-Type: image/jpeg" \
  --data-binary @/path/to/image.jpg
```

If you get 400, policies are wrong.
If you get 401, authentication failed.

---

## Common Policy Mistakes

| ❌ Wrong | ✓ Right |
|---------|---------|
| Using public instead of authenticated | Use `authenticated` role |
| No INSERT policy | Add INSERT policy for uploads |
| No SELECT policy | Add SELECT policy for viewing |
| Policies on wrong bucket | Repeat for ALL buckets |
| Forgot to click "Create Policy" | Always click the button |

---

## Expected Result

After adding all policies to both buckets:

```
Browser: No 400 errors ✓
Upload: Success! ✓
Photo: Shows in dialog ✓
Kit/Resin created: ✓
```

---

**Time to complete**: 5-10 minutes  
**Buckets to configure**: 2 (kit-photos, resin-photos)  
**Policies per bucket**: 3 (upload, read, delete)  
**Total policies**: 6

