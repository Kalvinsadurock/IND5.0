# URGENT: Supabase Bucket Setup Required

## ⚠️ Error: "Bucket not found"

When you try to upload a photo in Inventory or Process pages, you see:
```
Photo upload failed: Bucket not found
```

**This means the Supabase storage buckets don't exist yet.**

---

## Quick Fix (5 minutes)

### Step 1: Open Supabase Dashboard
Go to: https://app.supabase.com

### Step 2: Select Your Project
Click on your MES project

### Step 3: Create kit-photos Bucket

1. Click **Storage** (left sidebar)
2. Click **Buckets**
3. Click **+ New Bucket**
4. **Bucket name**: `kit-photos` (lowercase, with hyphen)
5. **Privacy**: Select **Private**
6. Click **Create Bucket**

### Step 4: Create resin-photos Bucket

1. Click **+ New Bucket**
2. **Bucket name**: `resin-photos` (lowercase, with hyphen)
3. **Privacy**: Select **Private**
4. Click **Create Bucket**

### Step 5: Add Permissions (Policies)

For **kit-photos** bucket:

1. Click on **kit-photos**
2. Click **Policies** tab
3. Click **+ New Policy**
   - Name: `Allow authenticated users to upload`
   - Target roles: `authenticated`
   - Permissions: `INSERT`
   - Definition: Leave blank or default
   - Click **Review**
   - Click **Save policy**

4. Click **+ New Policy** again
   - Name: `Allow authenticated users to read`
   - Target roles: `authenticated`
   - Permissions: `SELECT`
   - Click **Save policy**

Repeat the same steps for **resin-photos** bucket.

---

## Verify It Works

1. Go back to MES app (http://localhost:5173)
2. Click **Inventory** in sidebar
3. Try to create a Material Kit
4. Upload a photo
5. If successful, you'll see:
   ```
   ✓ Photo uploaded: [filename]
   ```

---

## If Still Not Working

**Check this:**

1. In Supabase, go to **Settings** → **API**
2. Copy **Project URL** - should look like:
   ```
   https://xxxxxxxxxxxxx.supabase.co
   ```
3. Copy **Anon Key** - long string starting with `eyJ...`

4. In MES project, find `.env.local` file:
   ```
   VITE_SUPABASE_URL=https://xxxxxxxxxxxxx.supabase.co
   VITE_SUPABASE_ANON_KEY=eyJ...
   ```

5. Make sure they match your Supabase project

6. Restart the dev server:
   ```bash
   npm run dev
   ```

---

## Buckets Created? ✅

Once you see both buckets in Supabase:
- [ ] `kit-photos` (Private)
- [ ] `resin-photos` (Private)

Photo uploads should work! 🎉

---

## Photo Upload Flow (How It Works)

When you click [Create Material Kit] in Inventory:

1. **Upload photo** → Upload to `kit-photos` bucket
2. **Get photo URL** → Supabase returns public-readable URL
3. **Save to database** → DB stores the photo URL
4. **Create kit record** → Kit created with photo_url linked

Result: Photo stored in cloud, kit traceable! ✓

---

**This is required once per Supabase project. After setup, you won't see this error again.**
