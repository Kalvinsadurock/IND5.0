# Manufacturing Execution System (MES)

A comprehensive Manufacturing Execution System built with React, Node.js, PostgreSQL, and Supabase for real-time production tracking, quality control, and inventory management.

## 🚀 Features

### Core Functionality
- **Process Flow Management** - Visual process flow with real-time status tracking
- **Digital Traveler** - Part context, time intelligence, and material traceability
- **Control Plan Checkpoints** - QA and Production validation with evidence upload
- **Inventory Management** - Material kits, glass kits, and resin lot tracking
- **Real-time Dashboard** - KPIs, trends, and process readiness indicators
- **Quality Control** - Photo evidence, checkpoint validation, and audit trails

### Key Modules
1. **Process Execution** - Step-by-step manufacturing process tracking
2. **Quality Assurance** - Checkpoint validation and evidence management
3. **Inventory Control** - Kit creation, tracking, and consumption
4. **Analytics** - Production metrics, yield tracking, and performance monitoring

## 📋 Prerequisites

- **Node.js** >= 18.x
- **PostgreSQL** >= 14.x
- **npm** or **yarn**
- **Supabase Account** (for storage and authentication)

## 🛠️ Installation

### 1. Clone the Repository

```bash
git clone https://github.com/Kalvinsadurock/MES.git
cd MES
```

### 2. Install Dependencies

```bash
npm install
```

### 3. Environment Setup

Create a `.env` file in the root directory:

```env
# Database Configuration
DATABASE_URL=postgresql://user:password@localhost:5432/mes_db

# Supabase Configuration
VITE_SUPABASE_URL=https://your-project.supabase.co
VITE_SUPABASE_ANON_KEY=your-anon-key
SUPABASE_SERVICE_ROLE_KEY=your-service-role-key

# Server Configuration
PORT=3000
NODE_ENV=development

# JWT Secret (generate a secure random string)
JWT_SECRET=your-jwt-secret-key-here
```

### 4. Database Setup

#### Create Database

```bash
createdb mes_db
```

#### Run Migrations

```bash
npm run db:push
```

#### Seed Initial Data

```bash
# Seed processes and steps
npm run seed:processes

# Seed checkpoints for Process 40 (Sparboom-SF)
npx tsx server/scripts/seed_checkpoints_process40.ts
```

### 5. Supabase Storage Setup

1. Go to your Supabase project dashboard
2. Navigate to **Storage** → **Create Bucket**
3. Create the following buckets:
   - `kit-photos` (public)
   - `checkpoint-evidence` (public)

4. Set bucket policies to allow authenticated uploads

## 🚀 Running the Application

### Development Mode

```bash
# Start backend server
npm run server

# Start frontend dev server (in another terminal)
npm run dev
```

The application will be available at:
- **Frontend**: http://localhost:5173
- **Backend API**: http://localhost:3000

### Production Build

```bash
# Build frontend
npm run build

# Start production server
npm start
```

## 📁 Project Structure

```
MES/
├── src/                          # Frontend React application
│   ├── app/
│   │   ├── components/          # React components
│   │   │   ├── DashboardView.tsx
│   │   │   ├── ProcessFlowView.tsx
│   │   │   ├── ProcessHierarchyView.tsx
│   │   │   └── ...
│   │   └── App.tsx
│   ├── features/
│   │   └── execution/           # Process execution features
│   │       └── components/
│   │           ├── RunningStepDialog.tsx
│   │           └── CheckpointPhotoUploadDialog.tsx
│   ├── lib/                     # Utilities and helpers
│   └── styles/                  # CSS styles
├── server/                       # Backend Node.js server
│   ├── domains/
│   │   ├── execution/           # Process execution APIs
│   │   └── inventory/           # Inventory management APIs
│   ├── routes/                  # API route handlers
│   ├── scripts/                 # Database scripts and utilities
│   └── index.ts                 # Server entry point
├── shared/
│   └── schema.ts                # Database schema (Drizzle ORM)
├── .env                         # Environment variables (create this)
├── package.json
└── README.md
```

## 🔑 Key Technologies

- **Frontend**: React 18, TypeScript, Vite, TailwindCSS
- **Backend**: Node.js, Express, TypeScript
- **Database**: PostgreSQL with Drizzle ORM
- **Storage**: Supabase Storage
- **Authentication**: JWT + Supabase Auth
- **UI Components**: Radix UI, Lucide Icons

## 📊 Database Schema

### Core Tables
- `processes` - Manufacturing processes
- `process_steps` - Individual process steps
- `parts` - Parts being manufactured
- `part_step_instances` - Step execution instances
- `control_checkpoints` - Quality control checkpoints
- `checkpoint_results` - Checkpoint validation results
- `evidence_files` - Photo evidence for checkpoints
- `kit_inventory` - Material and glass kit inventory
- `resin_lot_inventory` - Resin lot tracking
- `employees` - Employee master data

## 🔐 Authentication

The system uses JWT-based authentication with Supabase:

1. Users log in via `/api/auth/login`
2. JWT token is stored in localStorage
3. Protected routes require valid JWT token
4. Employee data is linked to Supabase users

### Default Credentials

After seeding, you can create users through the Supabase dashboard or use the signup endpoint.

## 📝 API Endpoints

### Process Execution
- `GET /api/processes` - List all processes
- `GET /api/processes/:id/steps` - Get process steps
- `GET /api/parts/:id/step-instances` - Get step instances
- `POST /api/step-instances/start` - Start a step
- `POST /api/step-instances/:id/complete` - Complete a step

### Checkpoints
- `GET /api/steps/:id/checkpoints` - Get checkpoint definitions
- `GET /api/parts/:id/steps/:id/checkpoint-results` - Get checkpoint results
- `POST /api/checkpoints/:id/confirm` - Confirm QA checkpoint
- `POST /api/uploads/checkpoint-photo` - Upload checkpoint evidence

### Inventory
- `GET /api/process/:id/inventory` - Get process inventory
- `POST /api/kits/create` - Create new kit
- `POST /api/resin/create` - Create resin lot

## 🎨 Features Implemented

### ✅ Process Flow Page
- Visual process flow diagram
- Part context header (part number, process, creator, status)
- Time intelligence bar (elapsed, target, remaining, ETA)
- Progress tracking based on completed steps
- Color-coded status indicators

### ✅ Control Plan Checkpoints
- Display all checkpoints (QA and Production)
- Sequential upload button enabling
- Conditional confirm button for QA checkpoints
- Employee and timestamp tracking
- Photo evidence upload with preview
- Accurate status badges

### ✅ Inventory Management
- Kit creation with photo upload
- Unique kit code generation
- Process-specific kit tracking
- Material and glass kit differentiation

## 🐛 Known Issues

- Some old diagnostic scripts have schema mismatches (non-critical)
- Lucide-react icon imports need updating in some UI components

## 🚧 Future Enhancements

- [ ] Bulk upload for process steps and checkpoints (Excel/CSV)
- [ ] Material consumption tracking
- [ ] Predictive analytics for cycle times
- [ ] Advanced reporting and dashboards
- [ ] Mobile app for shop floor

## 📄 License

Proprietary - All rights reserved

## 👥 Contributors

- Kalvin Sadurock

## 📞 Support

For issues and questions, please contact the kalvin sadurock team.