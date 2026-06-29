# 🚨 CRITICAL: Database Tables Missing

## The Problem

```
Error: relation "kit_inventory" does not exist
```

**What this means**: The PostgreSQL database doesn't have the `kit_inventory` table (or related tables) that the API is trying to query.

---

## Root Cause

The schema is defined in `shared/schema.ts`, but **the tables haven't been created in the PostgreSQL database yet**.

When you try to load Inventory page:
1. Frontend calls `/api/process/111/inventory`
2. Backend tries to query: `SELECT * FROM kit_inventory WHERE process_id = 111`
3. PostgreSQL says: "Table doesn't exist! Error 500"

---

## Solution: Run Database Migrations

### Option 1: Using Drizzle Kit (RECOMMENDED)

```bash
# In /workspaces/MES directory

# Generate migrations from schema
npx drizzle-kit generate:pg

# Run migrations to create tables
npx drizzle-kit migrate
```

**What this does**:
- Reads the schema from `shared/schema.ts`
- Creates migration files
- Runs them against your PostgreSQL database
- Creates all tables: `kit_inventory`, `resin_lot_inventory`, `resin_consumption`, etc.

### Option 2: Manual Database Creation

If migrations don't work, create tables manually in PostgreSQL:

```sql
-- Connect to your MES database, then run:

CREATE TABLE kit_inventory (
  id SERIAL PRIMARY KEY,
  kit_code VARCHAR(50) UNIQUE NOT NULL,
  process_id INTEGER NOT NULL REFERENCES processes(id),
  kit_type VARCHAR(20) NOT NULL,
  status VARCHAR(20) DEFAULT 'AVAILABLE',
  photo_url TEXT NOT NULL,
  created_by VARCHAR(100) NOT NULL,
  created_at TIMESTAMP DEFAULT NOW(),
  consumed_by VARCHAR(100),
  consumed_at TIMESTAMP,
  process_instance_id INTEGER
);

CREATE TABLE resin_lot_inventory (
  id SERIAL PRIMARY KEY,
  resin_code VARCHAR(50) UNIQUE NOT NULL,
  available_count INTEGER DEFAULT 1,
  photo_url TEXT NOT NULL,
  created_by VARCHAR(100) NOT NULL,
  created_at TIMESTAMP DEFAULT NOW()
);

CREATE TABLE resin_consumption (
  id SERIAL PRIMARY KEY,
  resin_lot_id INTEGER NOT NULL REFERENCES resin_lot_inventory(id),
  process_id INTEGER NOT NULL REFERENCES processes(id),
  process_instance_id INTEGER,
  consumed_by VARCHAR(100) NOT NULL,
  consumed_at TIMESTAMP DEFAULT NOW()
);

-- Create indexes
CREATE INDEX kit_inventory_process_idx ON kit_inventory(process_id);
CREATE INDEX kit_inventory_status_idx ON kit_inventory(status);
CREATE INDEX resin_lot_available_idx ON resin_lot_inventory(available_count);
```

---

## Step-by-Step Fix

### Step 1: Check Your Database Connection

Make sure your `.env.local` has:
```
DATABASE_URL=postgresql://user:password@host:port/mes_database
```

### Step 2: Generate & Run Migrations

```bash
cd /workspaces/MES

# Generate migration files from schema.ts
npx drizzle-kit generate:pg

# Apply migrations to database
npx drizzle-kit migrate
```

**Expected output**:
```
✓ Migration completed
Tables created:
  - kit_inventory
  - resin_lot_inventory
  - resin_consumption
  ... (other tables)
```

### Step 3: Verify Tables Exist

Connect to your database:
```bash
# Using psql (if installed)
psql -U postgres -d mes_database -c "\dt"

# Look for:
# kit_inventory
# resin_lot_inventory
# resin_consumption
```

Or in Supabase/pgAdmin: **Schemas → public → Tables** should show:
- ✅ `kit_inventory`
- ✅ `resin_lot_inventory`
- ✅ `resin_consumption`

### Step 4: Restart Server

```bash
# Kill existing server (Ctrl+C)

# Start fresh
npm run server
# or
npm run dev
```

### Step 5: Test

1. Open Inventory page
2. Should see kit/resin counts (not 500 errors)
3. Should be able to create Material Kits

---

## If Drizzle Kit Commands Don't Work

Try these alternatives:

```bash
# Alternative 1: Using Drizzle CLI directly
npx drizzle-kit migrate --config drizzle.config.ts

# Alternative 2: Check if drizzle.config.ts exists
ls -la drizzle.config.ts

# Alternative 3: Manual push (generate + migrate)
npx drizzle-kit push:pg
```

---

## Checking Migration Files

After running `generate:pg`, you should see:

```
/migrations/
├── 0001_create_tables.sql
├── 0002_add_indexes.sql
└── meta/
    └── _journal.json
```

If you don't see migrations folder, the generation failed. Check:
1. `drizzle.config.ts` exists and is correct
2. `DATABASE_URL` is set properly
3. Database is accessible

---

## Database Schema Files

The schema is defined in:
- **`shared/schema.ts`** - All table definitions (kit_inventory, resin_lot_inventory, etc.)
- **`drizzle.config.ts`** - Drizzle configuration
- **`/migrations/`** - Auto-generated SQL migration files (created after running generate)

---

## After Migration Succeeds

✅ Tables created in PostgreSQL  
✅ `/api/process/:id/inventory` endpoints work  
✅ Inventory counts load correctly  
✅ Photo uploads work (once Supabase buckets set up)  

---

## Troubleshooting

### Error: "Cannot find module 'drizzle-kit'"
```bash
npm install --save-dev drizzle-kit
```

### Error: "DATABASE_URL not set"
```bash
# Check .env.local
cat .env.local | grep DATABASE_URL

# If missing, add it:
echo "DATABASE_URL=postgresql://..." >> .env.local
```

### Error: "Permission denied"
Your database user doesn't have CREATE TABLE permission. Either:
1. Use a superuser account
2. Grant table creation privileges:
   ```sql
   GRANT CREATE ON SCHEMA public TO your_user;
   ```

### Error: "Connection refused"
Database server isn't running or isn't accessible. Verify:
```bash
# Test connection
psql "$DATABASE_URL"
```

---

## Quick Command Reference

```bash
# Generate migrations
npx drizzle-kit generate:pg

# Run migrations
npx drizzle-kit migrate

# Or combined (if supported)
npx drizzle-kit push:pg

# View migration status
npx drizzle-kit status

# Drop all tables (DANGER - dev only!)
npx drizzle-kit drop
```

---

## Expected Result

After migrations run successfully:

```
Browser Console: [Clear]
Network: /api/process/111/inventory → 200 OK ✓
Inventory Page: Shows kit/resin counts ✓
Create Material Kit: Works! ✓
```

---

**NEXT STEPS**:
1. ✅ Run: `npx drizzle-kit generate:pg`
2. ✅ Run: `npx drizzle-kit migrate`
3. ✅ Restart server: `npm run server`
4. ✅ Reload Inventory page - errors should be gone!
