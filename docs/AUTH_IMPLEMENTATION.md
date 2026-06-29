# Supabase Authentication Implementation Guide

## Overview

This MES system now implements **Supabase Auth** with JWT tokens for secure authentication. The architecture links Supabase Auth users to the employees table for role-based access control.

## Architecture

### User Model Mapping
```
Supabase Auth (auth.users)
        ↓
    JWT Token
        ↓
    employees table
    (auth_user_id ← links to auth.users.id)
```

### Key Files

**Backend:**
- `server/auth.ts` - Auth middleware and utility functions
- `server/index.ts` - Auth API endpoints (/api/auth/*)

**Frontend:**
- `src/lib/AuthContext.tsx` - React Context for auth state
- `src/lib/useAuthFetch.ts` - Hook for authenticated API calls
- `src/app/components/LoginScreen.tsx` - Login UI component
- `src/main.tsx` - App initialization with AuthProvider

**Database:**
- `shared/schema.ts` - Updated employees table with `auth_user_id` field
- `drizzle/0001_add_auth_user_id.sql` - Migration SQL

## Setup Steps

### 1. Enable Email Auth in Supabase
- Go to Supabase Dashboard → Authentication → Providers
- Enable "Email"
- Configure email templates as needed

### 2. Add auth_user_id Column to Database
```bash
# The migration is in drizzle/0001_add_auth_user_id.sql
# Run it via Supabase SQL Editor or Drizzle migrations
```

### 3. Environment Variables (Already Configured)
```
VITE_SUPABASE_URL=your_supabase_url
VITE_SUPABASE_ANON_KEY=your_anon_key
SUPABASE_SERVICE_ROLE_KEY=your_service_role_key
```

## Authentication Flow

### Login Flow
```
User enters Employee ID + Password
        ↓
/api/auth/login endpoint
        ↓
Map Employee ID → Employee Email
        ↓
Call Supabase Auth with email + password
        ↓
Supabase returns JWT token
        ↓
Backend updates employee.auth_user_id
        ↓
Return token to frontend
        ↓
Frontend stores token in localStorage
        ↓
Frontend redirects to dashboard
```

### Request Authentication
```
Client makes API request with header:
Authorization: Bearer <JWT_TOKEN>

Backend requireAuth middleware:
  ↓
Verify token with Supabase
  ↓
Extract user.id
  ↓
Attach user object to req
  ↓
Allow request to proceed
```

### Getting Current User
```
GET /api/auth/me (requires Bearer token)
  ↓
Returns: { id, email, employeeId, employeeName, role, department }
```

## API Endpoints

### POST /api/auth/login
**Login with Employee ID and Password**

Request:
```json
{
  "employeeId": "EMP001",
  "password": "securePassword123"
}
```

Response:
```json
{
  "access_token": "eyJhbGc...",
  "user": {
    "id": "uuid-from-supabase",
    "email": "user@company.com",
    "employeeId": "EMP001",
    "employeeName": "John Doe",
    "role": "Operator"
  }
}
```

### GET /api/auth/me
**Get current authenticated user**

Request Header:
```
Authorization: Bearer <JWT_TOKEN>
```

Response:
```json
{
  "id": "uuid-from-supabase",
  "email": "user@company.com",
  "employeeId": "EMP001",
  "employeeName": "John Doe",
  "role": "Operator",
  "department": "Manufacturing"
}
```

### POST /api/auth/verify
**Verify if a token is valid**

Request:
```json
{
  "token": "eyJhbGc..."
}
```

Response:
```json
{
  "valid": true,
  "user": {
    "id": "uuid",
    "email": "user@company.com",
    "employeeId": "EMP001",
    "employeeName": "John Doe",
    "role": "Operator"
  }
}
```

## Frontend Usage

### Using Auth Context
```typescript
import { useAuth } from '../lib/AuthContext';

export function MyComponent() {
  const { user, token, isLoggedIn, login, logout } = useAuth();

  if (!isLoggedIn) {
    return <LoginScreen />;
  }

  return (
    <div>
      <p>Welcome, {user?.employeeName}!</p>
      <p>Role: {user?.role}</p>
      <button onClick={logout}>Logout</button>
    </div>
  );
}
```

### Making Authenticated API Calls
```typescript
import { useAuthFetch } from '../lib/useAuthFetch';

export function MyComponent() {
  const fetch = useAuthFetch();

  async function fetchParts() {
    try {
      const data = await fetch('/api/parts');
      // data is automatically deserialized
    } catch (error) {
      console.error('Error:', error.message);
    }
  }

  return <button onClick={fetchParts}>Load Parts</button>;
}
```

### Or use fetch with Bearer token directly
```typescript
const { token } = useAuth();

const response = await fetch('/api/parts', {
  headers: {
    'Authorization': `Bearer ${token}`,
  },
});
```

## Protecting API Endpoints

### Require Authentication
```typescript
import { requireAuth, AuthRequest } from './auth';

// Apply middleware to protect endpoints
app.post('/api/protected-endpoint', requireAuth, async (req: AuthRequest, res) => {
  // req.user is now available
  console.log(`Request from user: ${req.user?.email}`);
  
  // Use user.id for RLS or created_by field
  const { resin_code, photo_url } = req.body;
  
  const { error } = await supabase
    .from('resin_lot_inventory')
    .insert({
      resin_code,
      photo_url,
      created_by: req.user?.email, // ✅ Correct: from authenticated user
    });
});
```

## Database RLS Policies

### Example: Allow authenticated users to insert
```sql
CREATE POLICY "Allow authenticated insert"
ON resin_lot_inventory
FOR INSERT
TO authenticated
WITH CHECK (auth.uid() IS NOT NULL);
```

## Frontend Flow

### AuthProvider Initialization
```
1. App loads
   ↓
2. AuthProvider checks localStorage for existing token
   ↓
3. If token exists, verifies it and fetches user info
   ↓
4. Sets isLoading = false
   ↓
5. App renders with auth state
```

### Login Component
```
1. User enters Employee ID + Password
   ↓
2. Click "Sign In"
   ↓
3. Calls login() from AuthContext
   ↓
4. POST /api/auth/login
   ↓
5. Returns access_token
   ↓
6. Token stored in localStorage
   ↓
7. useAuth updates state
   ↓
8. App re-renders dashboard
```

## Troubleshooting

### "Invalid Employee ID"
- Verify the employee exists in the database
- Check that employee.email is populated
- Ensure employee.isActive = true

### "Invalid Token" / "Unauthorized"
- Token may have expired (Supabase JWT default is 1 hour)
- User must log in again
- Check that VITE_SUPABASE_ANON_KEY is correct

### "Employee email not configured"
- Employee record exists but has no email field
- Update employee record with valid email
- Email must match Supabase Auth user

### Logout/Session Persists
- Clear localStorage manually: `localStorage.removeItem('auth_token')`
- Check browser privacy settings
- Verify localStorage is enabled

## Security Notes

✅ **Correct Implementation:**
- JWT tokens stored in localStorage
- Token included in Authorization header
- Backend verifies token with Supabase public key
- `created_by` populated from `req.user.email` (server-side)
- RLS policies check `auth.uid() IS NOT NULL`

❌ **Avoid:**
- Storing passwords in localStorage
- Passing `created_by` from frontend
- Using user credentials outside of login flow
- Disabling token verification

## Next Steps

1. **Create Supabase Auth users** for existing employees
   - Use Supabase Admin API or Dashboard
   - Link to employees via email

2. **Update existing API endpoints** to use `requireAuth` middleware
   - Add middleware to all data-modification endpoints
   - Replace hardcoded `created_by` with `req.user?.email`

3. **Set up RLS policies** in Supabase
   - Configure policies for each table
   - Test with different roles

4. **Implement refresh token rotation** (optional)
   - Supabase provides refresh tokens
   - Automatically refresh before expiration

## Related Files

- [Supabase Documentation](https://supabase.com/docs/guides/auth)
- [JWT Token Management](https://supabase.com/docs/guides/auth/jwts)
- [RLS Policies](https://supabase.com/docs/guides/auth/row-level-security)
- [Employee Model](../shared/schema.ts#L421)
