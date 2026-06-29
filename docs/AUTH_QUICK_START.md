# 🚀 Quick Start: Supabase Authentication

## Get Started in 5 Minutes

### Step 1: Enable Email Auth in Supabase
1. Go to **Supabase Dashboard** → **Authentication** → **Providers**
2. Click **Email** and toggle **Enable Email Sign In**
3. Save

### Step 2: Run Database Migration
Execute this SQL in Supabase SQL Editor:
```sql
ALTER TABLE employees 
ADD COLUMN IF NOT EXISTS auth_user_id uuid UNIQUE;

CREATE INDEX IF NOT EXISTS employees_auth_user_id_idx 
ON employees(auth_user_id);
```

### Step 3: Create Test Employee
Insert into your database:
```sql
INSERT INTO employees (
  employee_code, 
  name, 
  email, 
  role, 
  department
) VALUES (
  'EMP001',
  'Test User',
  'test@example.com',
  'Operator',
  'Manufacturing'
);
```

### Step 4: Create Supabase Auth User
In **Supabase Dashboard** → **Authentication** → **Users**:
1. Click **Add user**
2. Email: `test@example.com`
3. Password: `TestPassword123!`
4. Click **Create user**

### Step 5: Start the Application
```bash
# Terminal 1: Backend server
npm run server

# Terminal 2: Frontend development
npm run dev
```

### Step 6: Test Login
1. Open http://localhost:5173
2. Enter:
   - Employee ID: `EMP001`
   - Password: `TestPassword123!`
3. Click **Sign In**
4. You should see the dashboard with your name in the header

---

## 🧪 Test the Full Flow

### Verify Token in localStorage
Open browser DevTools (F12):
```javascript
// In Console tab
localStorage.getItem('auth_token')
// Should return a JWT token starting with "eyJ..."
```

### Make an Authenticated Request
```javascript
const token = localStorage.getItem('auth_token');
fetch('http://localhost:8001/api/auth/me', {
  headers: { 'Authorization': `Bearer ${token}` }
})
  .then(r => r.json())
  .then(console.log)
```

### Test Logout
Click **Logout** button in the header:
- Token should be removed from localStorage
- Should redirect to login screen
- Refreshing should keep you on login screen

---

## 🔐 Protecting Your First Endpoint

### Example: Create a Part with Auth

**Current Code (❌ Not Secure):**
```typescript
app.post("/api/parts", async (req, res) => {
  const { partNumber, processId, createdBy } = req.body;
  // ❌ created_by comes from frontend - anyone can fake it!
  
  await db.insert(parts).values({
    partNumber,
    processId,
    createdBy,  // ❌ WRONG
  });
});
```

**Fixed Code (✅ Secure):**
```typescript
import { requireAuth, AuthRequest } from './auth';

app.post("/api/parts", requireAuth, async (req: AuthRequest, res) => {
  const { partNumber, processId } = req.body;
  // ✅ created_by comes from authenticated user
  
  await db.insert(parts).values({
    partNumber,
    processId,
    created_by: req.user?.email,  // ✅ CORRECT
  });
});
```

### Update Frontend Component

**Before:**
```typescript
const response = await fetch('/api/parts', {
  method: 'POST',
  body: JSON.stringify({
    partNumber: 'P001',
    processId: 1,
    createdBy: 'john.doe',  // ❌ Remove this
  })
});
```

**After:**
```typescript
import { useAuthFetch } from '../lib/useAuthFetch';

export function CreatePartForm() {
  const fetch = useAuthFetch();
  
  const response = await fetch('/api/parts', {
    method: 'POST',
    body: JSON.stringify({
      partNumber: 'P001',
      processId: 1,
      // ✅ No createdBy - backend adds it automatically
    })
  });
}
```

---

## 📋 Checklist for Your Endpoints

For each endpoint that creates/updates data:

- [ ] Add `requireAuth` middleware
- [ ] Change param type to `AuthRequest`
- [ ] Use `req.user?.email` for `created_by`
- [ ] Remove `created_by` from frontend form
- [ ] Test with postman/curl using Bearer token
- [ ] Verify `created_by` is populated correctly

---

## 🐛 Common Issues

### "Invalid Employee ID"
```
✅ Solution:
1. Verify employee exists: SELECT * FROM employees WHERE employee_code = 'EMP001'
2. Verify email is populated: SELECT * FROM employees WHERE id = 1
3. Ensure email matches Supabase Auth user email
```

### "Invalid Token" After Login
```
✅ Solution:
1. Clear localStorage: localStorage.clear()
2. Refresh the page: F5
3. Log in again
4. Token expires after 1 hour by default
```

### User Info Shows "undefined"
```
✅ Solution:
1. Wait for app to load completely (check Console for errors)
2. Check Network tab - /api/auth/me should return 200
3. Verify auth_user_id was added to employees table
4. Check that employee.auth_user_id matches Supabase auth user id
```

### Endpoint Returns 401 Unauthorized
```
✅ Solution:
1. Add console.log in requireAuth middleware to debug
2. Verify token is sent in Authorization header
3. Check token format: should be "Bearer <token>"
4. Verify token is valid (not expired)
```

---

## 📚 Full Documentation

- **Complete Guide**: [AUTH_IMPLEMENTATION.md](./AUTH_IMPLEMENTATION.md)
- **Setup Checklist**: [AUTH_CHECKLIST.md](./AUTH_CHECKLIST.md)
- **Implementation Summary**: [SUPABASE_AUTH_COMPLETE.md](./SUPABASE_AUTH_COMPLETE.md)

---

## 🎯 What's Ready to Use

✅ **Authentication System**
- Email + password login
- JWT tokens
- Token verification
- Automatic session recovery

✅ **Protected Routes**
- `POST /api/auth/login` - Login endpoint
- `GET /api/auth/me` - Get current user
- `POST /api/auth/verify` - Verify token

✅ **Frontend UI**
- Login form with error handling
- User info display in header
- Logout button
- Session persistence

✅ **Developer Tools**
- `useAuth()` hook for state
- `useAuthFetch()` hook for API calls
- `requireAuth` middleware for backend

---

## 🚢 Production Checklist

Before going live:

- [ ] Set SUPABASE_SERVICE_ROLE_KEY in production
- [ ] Enable email verification in Supabase
- [ ] Set up email templates (welcome, reset, etc.)
- [ ] Configure JWT expiration time
- [ ] Test with production database
- [ ] Set up rate limiting on login endpoint
- [ ] Enable HTTPS
- [ ] Test with real Supabase credentials
- [ ] Set up monitoring for auth failures
- [ ] Create admin user management process

---

## ✨ Next: Protect More Endpoints

Once you verify the flow works, add `requireAuth` to these endpoints:

1. `POST /api/kits/create`
2. `POST /api/parts/:partId/steps/:stepId/start`
3. `POST /api/instances/:id/shift-log`
4. `POST /api/supply-lots`
5. `POST /api/resin-lot` (if it exists)
6. All other POST/PUT/DELETE endpoints

For each one:
1. Add `requireAuth` middleware
2. Replace `created_by` from body with `req.user?.email`
3. Remove `created_by` from frontend forms
4. Test the endpoint

---

## 🎓 Learning Resources

- Supabase Auth: https://supabase.com/docs/guides/auth
- JWT Tokens: https://supabase.com/docs/guides/auth/jwts
- React Hooks: https://react.dev/reference/react/useContext
- Express Middleware: https://expressjs.com/en/guide/using-middleware.html

---

## 💬 Need Help?

Check these files in order:
1. **Issue with login?** → `AUTH_IMPLEMENTATION.md` → Troubleshooting
2. **What's next?** → `AUTH_CHECKLIST.md` → Next Steps
3. **How does it work?** → `SUPABASE_AUTH_COMPLETE.md` → Architecture
4. **Code questions?** → Source code comments in:
   - `server/auth.ts`
   - `src/lib/AuthContext.tsx`
   - `src/lib/useAuthFetch.ts`

---

Good luck! 🚀
