# 🎯 Supabase Authentication Architecture Diagram

## System Overview

```
┌─────────────────────────────────────────────────────────────────────┐
│                         CLIENT (React)                               │
├─────────────────────────────────────────────────────────────────────┤
│                                                                      │
│  ┌──────────────────────────────────────────────────────────────┐   │
│  │                    AuthProvider                              │   │
│  │  ┌────────────────────────────────────────────────────────┐  │   │
│  │  │  AuthContext                                           │  │   │
│  │  │  - user: User | null                                  │  │   │
│  │  │  - token: string | null                               │  │   │
│  │  │  - isLoggedIn: boolean                                │  │   │
│  │  │  - isLoading: boolean                                 │  │   │
│  │  │  - login(employeeId, password)                        │  │   │
│  │  │  - logout()                                           │  │   │
│  │  │  - checkAuth()                                        │  │   │
│  │  └────────────────────────────────────────────────────────┘  │   │
│  │                        ↓                                      │   │
│  │  localStorage.setItem('auth_token', token)                   │   │
│  └──────────────────────────────────────────────────────────────┘   │
│                                                                      │
│  ┌──────────────────┐  ┌──────────────────┐  ┌────────────────┐   │
│  │  LoginScreen     │  │    App.tsx       │  │  Components    │   │
│  │  - Login Form    │  │  - Dashboard     │  │  - useAuth()   │   │
│  │  - Error Display │  │  - Header        │  │  - useAuthFetch│   │
│  │                  │  │  - User Info     │  │    ()          │   │
│  └────────┬─────────┘  └────────┬─────────┘  └────────┬───────┘   │
│           │                      │                     │            │
│           └──────────┬───────────┴─────────────────────┘            │
│                      │                                               │
│                      ▼                                               │
│          API Calls with Bearer Token                               │
│          Authorization: Bearer <JWT>                               │
│                      │                                               │
└──────────────────────┼───────────────────────────────────────────────┘
                       │
                       │ HTTP
                       │
┌──────────────────────▼───────────────────────────────────────────────┐
│                    SERVER (Express/Node)                              │
├─────────────────────────────────────────────────────────────────────┤
│                                                                      │
│  ┌──────────────────────────────────────────────────────────────┐   │
│  │         Authentication Middleware                           │   │
│  │                                                              │   │
│  │  requireAuth(req, res, next)                               │   │
│  │  ├─ Extract Bearer token from Authorization header          │   │
│  │  ├─ Call supabase.auth.getUser(token)                       │   │
│  │  ├─ Verify token validity                                   │   │
│  │  ├─ Attach user object to req: req.user = { id, email, ... }│   │
│  │  └─ Call next() to proceed                                  │   │
│  │                                                              │   │
│  └──────────────────────────────────────────────────────────────┘   │
│                                                                      │
│  ┌──────────────────────────────────────────────────────────────┐   │
│  │           API Routes (server/index.ts)                      │   │
│  │                                                              │   │
│  │  POST /api/auth/login (no auth required)                   │   │
│  │  ├─ Receive: { employeeId, password }                      │   │
│  │  ├─ Query DB: SELECT * FROM employees WHERE employee_code  │   │
│  │  ├─ Get email from employee record                          │   │
│  │  ├─ Call signInWithPassword(email, password)               │   │
│  │  ├─ Update employee.auth_user_id = user.id                 │   │
│  │  └─ Return: { access_token, user }                         │   │
│  │                                                              │   │
│  │  GET /api/auth/me (requireAuth middleware)                 │   │
│  │  ├─ req.user is available from middleware                  │   │
│  │  ├─ Query DB: SELECT * FROM employees WHERE auth_user_id   │   │
│  │  └─ Return: { id, email, employeeId, name, role, ... }    │   │
│  │                                                              │   │
│  │  POST /api/auth/verify (no auth required)                  │   │
│  │  ├─ Receive: { token }                                     │   │
│  │  ├─ Call verifyToken(token)                                │   │
│  │  └─ Return: { valid, user }                                │   │
│  │                                                              │   │
│  │  POST /api/parts (requireAuth middleware) [PROTECTED]      │   │
│  │  ├─ req.user is available                                  │   │
│  │  ├─ Use req.user.email for created_by                      │   │
│  │  └─ Insert into database                                   │   │
│  │                                                              │   │
│  └──────────────────────────────────────────────────────────────┘   │
│                                                                      │
└──────────────────────┬───────────────────────────────────────────────┘
                       │
                       │ Supabase Client
                       │ (JWT verification)
                       │
┌──────────────────────▼───────────────────────────────────────────────┐
│                 SUPABASE (Authentication)                             │
├─────────────────────────────────────────────────────────────────────┤
│                                                                      │
│  ┌──────────────────────────────────────────────────────────────┐   │
│  │        Supabase Auth Service                                │   │
│  │                                                              │   │
│  │  auth.users table                                           │   │
│  │  ┌────────────────────────────────────────────────────────┐ │   │
│  │  │ id (uuid)        | uuid                                │ │   │
│  │  │ email            | test@example.com                    │ │   │
│  │  │ encrypted_pass   | hashed_password                     │ │   │
│  │  │ created_at       | 2024-01-12T10:00:00Z                │ │   │
│  │  └────────────────────────────────────────────────────────┘ │   │
│  │                                                              │   │
│  │  signInWithPassword(email, password)                       │   │
│  │  ├─ Hash password                                           │   │
│  │  ├─ Compare with stored hash                               │   │
│  │  ├─ Generate JWT token                                     │   │
│  │  └─ Return: { user, session.access_token }                 │   │
│  │                                                              │   │
│  │  auth.getUser(token)                                       │   │
│  │  ├─ Verify JWT signature                                   │   │
│  │  ├─ Check token expiration                                 │   │
│  │  └─ Return user data or error                              │   │
│  │                                                              │   │
│  └──────────────────────────────────────────────────────────────┘   │
│                                                                      │
└──────────────────────┬───────────────────────────────────────────────┘
                       │
                       │ SQL Query
                       │
┌──────────────────────▼───────────────────────────────────────────────┐
│                    POSTGRES DATABASE                                  │
├─────────────────────────────────────────────────────────────────────┤
│                                                                      │
│  employees table                                                     │
│  ┌────────────────────────────────────────────────────────────────┐ │
│  │ id (int)       | 1                                             │ │
│  │ employee_code  | EMP001                                        │ │
│  │ name           | Test User                                    │ │
│  │ email          | test@example.com                             │ │
│  │ role           | Operator                                     │ │
│  │ auth_user_id   | 550e8400-e29b-41d4-a716-446655440000  ←─ FK  │ │
│  │ created_at     | 2024-01-12T09:00:00Z                         │ │
│  └────────────────────────────────────────────────────────────────┘ │
│                                                                      │
│  Other Tables (created_by references are validated)                │
│  ┌────────────────────────────────────────────────────────────────┐ │
│  │ kit_inventory, resin_lot_inventory, parts, etc.               │ │
│  │ created_by: varchar (populated from req.user.email)           │ │
│  └────────────────────────────────────────────────────────────────┘ │
│                                                                      │
└──────────────────────────────────────────────────────────────────────┘
```

---

## Detailed Flow Diagrams

### 1. Initial Login Flow

```
User enters credentials
       ↓
loginForm.onSubmit()
       ↓
AuthContext.login(employeeId, password)
       ↓
fetch('/api/auth/login', { 
  body: { employeeId, password }
})
       ↓
Server: /api/auth/login handler
       ├─ Query: SELECT email FROM employees WHERE employee_code = 'EMP001'
       ├─ Get: test@example.com
       ├─ Call: supabase.auth.signInWithPassword(test@example.com, password)
       ├─ Supabase verifies credentials
       ├─ Returns: JWT token + user object
       ├─ Update: UPDATE employees SET auth_user_id = user.id WHERE id = 1
       └─ Return: { access_token, user: { id, email, employeeId, name, role } }
       ↓
AuthContext receives response
       ├─ Save token: localStorage.setItem('auth_token', access_token)
       ├─ Update state: setUser(user), setToken(token)
       └─ Trigger re-render
       ↓
App detects user is logged in
       ├─ Show Dashboard instead of LoginScreen
       ├─ Render Header with user info
       └─ Display "Welcome, Test User"
```

### 2. Authenticated API Request

```
Component needs data
       ↓
const fetch = useAuthFetch()
const data = await fetch('/api/parts')
       ↓
useAuthFetch hook intercepts
       ├─ Get token from AuthContext: useAuth().token
       ├─ Build headers: { Authorization: `Bearer ${token}` }
       └─ Call fetch(/api/parts, { headers: { Authorization: ... } })
       ↓
HTTP Request sent to server
       ├─ URL: POST http://localhost:8001/api/parts
       ├─ Header: Authorization: Bearer eyJhbGc...
       └─ Body: { partNumber: 'P001', processId: 1 }
       ↓
Server middleware: requireAuth
       ├─ Extract Bearer token: eyJhbGc...
       ├─ Call: supabase.auth.getUser(token)
       ├─ Supabase verifies JWT signature
       ├─ Check expiration (default 1 hour)
       ├─ Return: { id: 'uuid', email: 'test@example.com', ... }
       ├─ Attach to request: req.user = user object
       └─ Call next() to continue
       ↓
Route handler: /api/parts
       ├─ req.user is available
       ├─ Extract data from body: { partNumber, processId }
       ├─ Set created_by: req.user.email → test@example.com
       ├─ Insert into DB: INSERT INTO parts (part_number, process_id, created_by)
       └─ Return: { success: true, partId: 123 }
       ↓
HTTP Response sent to client
       ├─ Status: 200 OK
       ├─ Body: { success: true, partId: 123 }
       └─ Data returns to component
       ↓
Component uses data
       └─ Update UI with new part info
```

### 3. Session Recovery on Page Reload

```
User refreshes page
       ↓
React app initializes
       ↓
AuthProvider useEffect runs
       ├─ Check localStorage: getItem('auth_token')
       ├─ Token exists: 'eyJhbGc...'
       ├─ Call: fetch('/api/auth/me', { Authorization: Bearer token })
       ├─ Server requireAuth middleware verifies token
       ├─ Returns: { id, email, employeeId, name, role }
       ├─ AuthContext updates: setUser(userData), setToken(token)
       └─ setIsLoading(false)
       ↓
App renders with user still logged in
       ├─ Show Dashboard
       ├─ Display user in header
       └─ No need to log in again
```

### 4. Token Verification & Error Handling

```
Component calls API with expired token
       ↓
useAuthFetch sends request
       ├─ Token: eyJhbGc... (expired)
       └─ Header: Authorization: Bearer eyJhbGc...
       ↓
Server requireAuth middleware
       ├─ Call: supabase.auth.getUser(token)
       ├─ Supabase checks token expiration
       ├─ Token is expired → return error
       └─ Error: "Invalid or expired token"
       ↓
Middleware error handling
       ├─ Respond: { status: 401, error: "Invalid or expired token" }
       └─ Client receives 401 response
       ↓
useAuthFetch error handler
       ├─ Detect 401 status
       ├─ Call: logout()
       ├─ Clear localStorage
       ├─ Clear user state
       └─ Throw error: "Unauthorized - please log in again"
       ↓
Component error handling
       ├─ Catch error
       ├─ Show error message to user
       └─ Redirect to LoginScreen
       ↓
User sees login form again
       └─ Must log in with fresh credentials
```

---

## Data Flow Summary

### Before Authentication (❌ Not Secure)
```
Frontend Form
    ↓
{ partNumber: 'P001', createdBy: 'user_typed_this' }
    ↓
Backend API (NO auth)
    ↓
INSERT INTO parts VALUES (..., 'user_typed_this')
    ↓
❌ Anyone can fake any user!
```

### After Authentication (✅ Secure)
```
Frontend Form
    ↓
{ partNumber: 'P001' } + Bearer Token
    ↓
Backend API (requireAuth)
    ↓
Verify token → Extract user from JWT
    ↓
INSERT INTO parts VALUES (..., req.user.email)
    ↓
✅ User identity guaranteed by JWT!
```

---

## Authentication State Machine

```
┌──────────────┐
│  App Starts  │
└──────┬───────┘
       │
       ├─ isLoading = true
       │
       ▼
┌──────────────────────────────────┐
│ Check localStorage for token     │
└───────┬────────────┬──────────────┘
        │            │
     ✅ Found     ❌ Not Found
        │            │
        ▼            ▼
   verify token   ┌──────────────┐
        │         │isLoggedIn=F  │
        ├──────┬──┤isLoading=F   │
        │      │  │              │
     ✅OK    ❌err│Show Login    │
        │      │  │              │
        ▼      ▼  └──────────────┘
   ┌──────────────────┐
   │ isLoggedIn = T   │
   │ isLoading = F    │
   │ Show Dashboard   │
   └─────────┬────────┘
             │
       ┌─────┴──────────┐
       │                │
    User logs in      User logs out
       │                │
       └────────┬───────┘
              reset
              state
```

---

## Token Lifecycle

```
Day 1, 10:00 AM: User logs in
    ├─ Supabase creates JWT
    ├─ Expiration: 10:00 AM + 1 hour = 11:00 AM
    ├─ Token stored in localStorage
    └─ User has full access

Day 1, 10:30 AM: User makes API call
    ├─ Token still valid (30 min remaining)
    ├─ Backend verifies ✅
    └─ Request succeeds

Day 1, 11:01 AM: User makes API call
    ├─ Token is expired (1 min past expiration)
    ├─ Backend verifies ❌ INVALID
    ├─ Return 401 Unauthorized
    ├─ Frontend catches error
    ├─ Logout user
    ├─ Clear localStorage
    └─ Redirect to login

User logs in again
    ├─ New JWT created
    ├─ New expiration time set
    └─ Access granted for another hour
```

---

Perfect! This gives a comprehensive visual understanding of the authentication flow.
