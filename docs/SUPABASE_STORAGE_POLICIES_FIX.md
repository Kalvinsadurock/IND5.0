# Supabase Storage Upload Fix - 400 Bad Request Error

## Problem
Getting `400 (Bad Request)` when uploading files to the `kit-photos` bucket:
```
POST https://nvgjkqwqghgshbiouffr.supabase.co/storage/v1/object/kit-photos/111-1768235867791-Sparoomsf.jpg 400 (Bad Request)
```

## Root Cause
The Supabase storage bucket exists but **RLS (Row Level Security) policies are not properly configured**, preventing unauthenticated or anonymous users from uploading files.

## Solution

### Step 1: Set Bucket Policies in Supabase Console

1. Go to [Supabase Dashboard](https://app.supabase.com/)
2. Select your project
3. Go to **Storage** → **Buckets**
4. Click on `kit-photos` bucket
5. Click **Policies** tab

### Step 2: Add Upload Policy

Create a policy that allows authenticated users to upload:

**Policy Name**: `Allow authenticated users to upload`
**Target roles**: `authenticated`
**Using expression**: 
```sql
auth.role() = 'authenticated'
```

### Step 3: Add Public Read Policy (Optional)

If you want files to be publicly readable:

**Policy Name**: `Allow public read access`
**Target roles**: `anon`, `authenticated`
**Using expression**:
```sql
true
```

### Alternative: Quick Fix via RPC

Run this in Supabase SQL Editor:

```sql
-- Enable RLS on storage.objects
ALTER TABLE storage.objects ENABLE ROW LEVEL SECURITY;

-- Allow authenticated users to upload
CREATE POLICY "allow_auth_upload" ON storage.objects FOR INSERT 
WITH CHECK (bucket_id = 'kit-photos' AND auth.role() = 'authenticated');

-- Allow authenticated users to read
CREATE POLICY "allow_auth_read" ON storage.objects FOR SELECT 
USING (bucket_id = 'kit-photos');

-- Allow authenticated users to update
CREATE POLICY "allow_auth_update" ON storage.objects FOR UPDATE 
USING (bucket_id = 'kit-photos' AND auth.role() = 'authenticated');

-- Allow authenticated users to delete
CREATE POLICY "allow_auth_delete" ON storage.objects FOR DELETE 
USING (bucket_id = 'kit-photos' AND auth.role() = 'authenticated');
```

## Code Fix in ProcessSpecificAddKitDialog.tsx

Add error handling for authentication:

```typescript
const handlePhotoCapture = async (e: React.ChangeEvent<HTMLInputElement>) => {
  const file = e.target.files?.[0];
  if (!file) return;

  try {
    setIsUploading(true);
    setErrorMessage(null);

    // Check if user is authenticated
    const { data: { session }, error: authError } = await supabase.auth.getSession();
    
    if (!session || authError) {
      setErrorMessage('You must be logged in to upload photos');
      return;
    }

    // Upload to Supabase Storage
    const uniqueFileName = `${process.id}-${Date.now()}-${file.name}`;
    const { data, error } = await supabase.storage
      .from('kit-photos')
      .upload(uniqueFileName, file, {
        cacheControl: '3600',
        upsert: false,
      });

    if (error) {
      console.error('Upload error:', error);
      throw error;
    }

    setPhotoUrl(uniqueFileName);
    setFileName(file.name);
    setErrorMessage(null);
  } catch (error) {
    const errorMsg = error instanceof Error ? error.message : 'Unknown error';
    setErrorMessage(`Photo upload failed: ${errorMsg}`);
    setPhotoUrl(null);
  } finally {
    setIsUploading(false);
  }
};
```

## Testing

1. Log in to your application
2. Try uploading a photo
3. Check browser console for detailed error messages
4. If still failing, check Supabase dashboard for policy configuration

## Common 400 Error Causes
- ❌ RLS policies not configured
- ❌ User not authenticated
- ❌ File size too large
- ❌ Invalid bucket name
- ❌ Missing Content-Type header
- ✅ Fixed by enabling proper policies above
