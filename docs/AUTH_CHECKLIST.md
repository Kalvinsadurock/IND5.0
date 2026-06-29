# Authentication Implementation Checklist

## ✅ Completed Tasks

### Backend Authentication
- [x] Created `server/auth.ts` with:
  - `requireAuth` middleware for protecting routes
  - `signInWithPassword()` function
  - `verifyToken()` function
  - `createAuthUser()` function for admin operations
  - `getUserByEmail()` helper

### API Endpoints
- [x] `POST /api/auth/login` - Employee login with ID + password
- [x] `GET /api/auth/me` - Get current user (requires auth)
- [x] `POST /api/auth/verify` - Verify token validity

### Database Schema
- [x] Added `auth_user_id` (uuid, unique) to employees table
- [x] Added index on `auth_user_id`
- [x] Created migration SQL file

### Frontend Auth State Management
- [x] Created `AuthContext.tsx` with:
  - User state management
  - Token storage in localStorage
  - `login()` function
  - `logout()` function
  - `checkAuth()` function
  - Auth loading state

### UI Components
- [x] Updated `LoginScreen.tsx` with:
  - Error handling and display
  - Loading state during login
  - Disabled inputs during submission
  - Real API call to /api/auth/login

### App Integration
- [x] Updated `App.tsx` to:
  - Use `useAuth()` hook
  - Display logged-in user info in header
  - Check auth on mount
  - Handle logout properly

### Utilities
- [x] Created `useAuthFetch.ts` hook for authenticated API calls
- [x] Created `main.tsx` wrapper with AuthProvider
- [x] Created comprehensive `AUTH_IMPLEMENTATION.md` guide

---

## 📋 Next Steps to Complete

### 1. **Database Migration**
   - [ ] Run the migration SQL to add `auth_user_id` column
   - [ ] Verify column exists in employees table

### 2. **Supabase Configuration**
   - [ ] Enable Email Auth in Supabase Dashboard
   - [ ] Create Supabase Auth users for existing employees
   - [ ] Link auth users to employees via email

### 3. **Create Test Employees**
   - [ ] Add test employee records with:
     - employeeCode
     - email
     - name
     - role
   - [ ] Create corresponding Supabase Auth user with same email

### 4. **Protect Existing API Endpoints**
   - Replace in `server/index.ts`:
     ```typescript
     app.post("/api/parts", requireAuth, async (req: AuthRequest, res) => {
       // Use req.user instead of req.body
       const { created_by } = req.body; // ❌ Remove this
       created_by: req.user?.email,     // ✅ Use this instead
     });
     ```

   Endpoints to update:
   - [ ] `POST /api/parts` - Part creation
   - [ ] `POST /api/kits/create` - Kit creation
   - [ ] `POST /api/resin-lot` - Resin lot creation
   - [ ] `POST /api/supply-lots` - Supply lot creation
   - [ ] `POST /api/instances/:id/shift-log` - Shift log
   - [ ] All other data modification endpoints

### 5. **Set up RLS Policies in Supabase**
   Example for resin_lot_inventory:
   ```sql
   -- Allow authenticated users to insert
   CREATE POLICY "Allow authenticated insert"
   ON resin_lot_inventory
   FOR INSERT
   TO authenticated
   WITH CHECK (auth.uid() IS NOT NULL);

   -- Allow users to read all
   CREATE POLICY "Allow read all"
   ON resin_lot_inventory
   FOR SELECT
   TO authenticated
   USING (true);
   ```

### 6. **Test Authentication Flow**
   - [ ] Start backend server: `npm run server`
   - [ ] Start frontend: `npm run dev`
   - [ ] Test login with employee credentials
   - [ ] Verify token is stored in localStorage
   - [ ] Verify user info displays in header
   - [ ] Test logout
   - [ ] Verify page reloads maintain auth session

### 7. **Update IncomingPage and Other Components**
   - [ ] Update components that create kits/inventory to use `useAuthFetch`
   - [ ] Update to NOT pass `createdBy` from form
   - [ ] Verify `created_by` is populated server-side

### 8. **Test Protected Endpoints**
   - [ ] Test creating parts with authentication
   - [ ] Test kit creation
   - [ ] Verify `created_by` field is populated correctly
   - [ ] Test without token (should fail with 401)

---

## 🔐 Security Checklist

- [ ] Never store passwords in localStorage
- [ ] Never pass `created_by` from frontend forms
- [ ] Always verify tokens server-side
- [ ] Use `requireAuth` on all protected endpoints
- [ ] Enable HTTPS in production
- [ ] Rotate JWT secrets regularly
- [ ] Set up refresh token logic (optional)
- [ ] Monitor failed login attempts
- [ ] Implement account lockout after N failed attempts

---

## 📝 Implementation Notes

### Environment Variables Required
```
VITE_SUPABASE_URL=          # Supabase project URL
VITE_SUPABASE_ANON_KEY=     # Supabase anonymous key
SUPABASE_SERVICE_ROLE_KEY=  # Supabase service role (backend only)
```

### Database Migration
Run this to add the `auth_user_id` column:
```sql
ALTER TABLE employees 
ADD COLUMN IF NOT EXISTS auth_user_id uuid UNIQUE;

CREATE INDEX IF NOT EXISTS employees_auth_user_id_idx 
ON employees(auth_user_id);
```

### Creating Test User
In Supabase Dashboard → Authentication → Users:
1. Click "Add user"
2. Email: `testuser@indutch.com`
3. Password: `TestPassword123!`
4. Create corresponding employee record with same email

---

## 🚀 Production Deployment Checklist

Before deploying to production:

- [ ] Enable CORS properly for production domain
- [ ] Set JWT expiration appropriately (default 1 hour)
- [ ] Enable email verification requirement
- [ ] Set up email templates (confirmation, password reset)
- [ ] Configure rate limiting on login endpoint
- [ ] Set up monitoring/alerting for auth failures
- [ ] Test with production Supabase credentials
- [ ] Implement password reset flow
- [ ] Set up session timeout logic
- [ ] Document admin user management process

---

## 📚 Reference

- **Auth Guide**: [AUTH_IMPLEMENTATION.md](./AUTH_IMPLEMENTATION.md)
- **Schema**: [shared/schema.ts](./shared/schema.ts#L421)
- **Backend Auth**: [server/auth.ts](./server/auth.ts)
- **Frontend Context**: [src/lib/AuthContext.tsx](./src/lib/AuthContext.tsx)
- **Supabase Docs**: https://supabase.com/docs/guides/auth

