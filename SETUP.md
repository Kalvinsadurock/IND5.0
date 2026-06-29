# MES Setup Guide

This guide will walk you through setting up the Manufacturing Execution System from scratch.

## Step 1: Prerequisites Installation

### Install Node.js
1. Download Node.js 18.x or higher from [nodejs.org](https://nodejs.org/)
2. Verify installation:
   ```bash
   node --version
   npm --version
   ```

### Install PostgreSQL
1. Download PostgreSQL 14.x or higher from [postgresql.org](https://www.postgresql.org/download/)
2. During installation, remember your postgres user password
3. Verify installation:
   ```bash
   psql --version
   ```

## Step 2: Supabase Setup

### Create Supabase Project
1. Go to [supabase.com](https://supabase.com)
2. Sign up or log in
3. Click "New Project"
4. Fill in:
   - Project name: `MES-Production`
   - Database password: (choose a strong password)
   - Region: (choose closest to you)

### Get Supabase Credentials
1. Go to Project Settings → API
2. Copy the following:
   - **Project URL** → `VITE_SUPABASE_URL`
   - **anon public** key → `VITE_SUPABASE_ANON_KEY`
   - **service_role** key → `SUPABASE_SERVICE_ROLE_KEY`

### Create Storage Buckets
1. Go to Storage in Supabase dashboard
2. Create bucket: `kit-photos`
   - Public bucket: Yes
   - File size limit: 5MB
   - Allowed MIME types: image/*
3. Create bucket: `checkpoint-evidence`
   - Public bucket: Yes
   - File size limit: 10MB
   - Allowed MIME types: image/*

### Set Storage Policies
For each bucket, add this policy:

**Policy name**: Allow authenticated uploads
**Policy definition**:
```sql
(bucket_id = 'kit-photos' AND auth.role() = 'authenticated')
OR
(bucket_id = 'checkpoint-evidence' AND auth.role() = 'authenticated')
```

## Step 3: Database Setup

### Create Database
```bash
# Connect to PostgreSQL
psql -U postgres

# Create database
CREATE DATABASE mes_db;

# Exit psql
\q
```

### Configure Database URL
In your `.env` file:
```env
DATABASE_URL=postgresql://postgres:your_password@localhost:5432/mes_db
```

### Run Migrations
```bash
npm run db:push
```

This will create all necessary tables:
- processes
- process_steps
- parts
- part_step_instances
- control_checkpoints
- checkpoint_results
- evidence_files
- kit_inventory
- resin_lot_inventory
- employees

## Step 4: Seed Initial Data

### Seed Processes
```bash
npx tsx server/scripts/seed_processes.ts
```

This creates:
- Process 1: Cutting
- Process 4: Sparboom - SF
- Process 5: Moulding
- etc.

### Seed Checkpoints for Process 40
```bash
npx tsx server/scripts/seed_checkpoints_process40.ts
```

This creates 57 checkpoints for the Sparboom-SF process with:
- 24 QA-validated checkpoints
- 33 Production-only checkpoints

### Create Initial Employee
```bash
npx tsx server/scripts/create_employee.ts
```

Or manually insert:
```sql
INSERT INTO employees (employee_code, name, role, email)
VALUES ('EMP001', 'Admin User', 'Administrator', 'admin@example.com');
```

## Step 5: Environment Configuration

Create `.env` file in the root directory:

```env
# Database
DATABASE_URL=postgresql://postgres:your_password@localhost:5432/mes_db

# Supabase
VITE_SUPABASE_URL=https://xxxxx.supabase.co
VITE_SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
SUPABASE_SERVICE_ROLE_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...

# Server
PORT=3000
NODE_ENV=development

# JWT Secret (generate using: node -e "console.log(require('crypto').randomBytes(32).toString('hex'))")
JWT_SECRET=your_generated_secret_here

# CORS
CORS_ORIGIN=http://localhost:5173
```

## Step 6: Start the Application

### Terminal 1: Start Backend
```bash
npm run server
```

You should see:
```
Server running on port 3000
Database connected successfully
```

### Terminal 2: Start Frontend
```bash
npm run dev
```

You should see:
```
VITE v5.x.x  ready in xxx ms

➜  Local:   http://localhost:5173/
```

## Step 7: Access the Application

1. Open browser: http://localhost:5173
2. You should see the login page
3. Create a user account or use test credentials

## Step 8: Verify Setup

### Check Database Tables
```bash
psql -U postgres -d mes_db

# List tables
\dt

# Check processes
SELECT * FROM processes;

# Check checkpoints
SELECT COUNT(*) FROM control_checkpoints WHERE process_id = 4;
```

### Check Supabase Storage
1. Go to Supabase dashboard → Storage
2. Verify buckets exist: `kit-photos`, `checkpoint-evidence`
3. Try uploading a test file

### Test API Endpoints
```bash
# Get processes
curl http://localhost:3000/api/processes

# Get process steps
curl http://localhost:3000/api/processes/4/steps
```

## Troubleshooting

### Database Connection Error
- Check PostgreSQL is running: `pg_isready`
- Verify DATABASE_URL in .env
- Check postgres user password

### Supabase Storage Error
- Verify bucket policies are set correctly
- Check SUPABASE_SERVICE_ROLE_KEY is correct
- Ensure buckets are public

### Port Already in Use
- Change PORT in .env to 3001 or another available port
- Update CORS_ORIGIN accordingly

### Module Not Found Errors
```bash
# Clear node_modules and reinstall
rm -rf node_modules package-lock.json
npm install
```

## Next Steps

1. **Create Users**: Set up employee accounts in Supabase Auth
2. **Create Parts**: Add parts to manufacture
3. **Start Process**: Begin process execution
4. **Upload Evidence**: Test checkpoint photo uploads
5. **Create Kits**: Add material and glass kits to inventory

## Production Deployment

For production deployment:

1. Set `NODE_ENV=production` in .env
2. Build frontend: `npm run build`
3. Use a process manager like PM2:
   ```bash
   npm install -g pm2
   pm2 start server/index.ts --name mes-server
   ```
4. Set up nginx as reverse proxy
5. Configure SSL certificates
6. Set up database backups

## Support

For issues during setup, check:
- Server logs in terminal
- Browser console for frontend errors
- Database logs: `tail -f /var/log/postgresql/postgresql-14-main.log`
