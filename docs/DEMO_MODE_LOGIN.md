# 🚀 Quick Login Guide - Demo Mode

## ✅ Authentication Now Works!

The authentication system has been set up in **DEMO MODE** for testing without real Supabase credentials.

### How to Login

**Password:** `demo` (for any employee)

**Employee IDs Available:**
- `EMP001` - EMP100 (based on your database)
- Or any employee code from the employees table

**Example:**
```
Employee ID: EMP009
Password: demo
```

### Demo Mode Details

- ✅ **Works for testing UI immediately**
- ✅ **Accepts any employee ID** that exists in your database
- ✅ **Password is always: "demo"**
- ✅ **Generates fake JWT tokens** for development

### To Use Real Supabase Auth

Create a `.env` file in the root directory:

```
VITE_SUPABASE_URL=https://your-project.supabase.co
VITE_SUPABASE_ANON_KEY=your-anon-key
SUPABASE_SERVICE_ROLE_KEY=your-service-role-key
```

Get these values from:
1. Supabase Dashboard → Settings → API
2. Copy the URLs and keys
3. Paste into `.env`
4. Restart the server

### Demo Mode Limitations

⚠️ **Demo mode is for UI testing only:**
- No real authentication validation
- Tokens are fake
- No production security
- Use only for development

### Production Setup

When ready for production:
1. Set up real Supabase project
2. Add real credentials to `.env`
3. Create actual Supabase Auth users
4. Authentication will use real security

---

**Current Status:** ✅ Demo mode active  
**For Real Auth:** See `AUTH_IMPLEMENTATION.md`
