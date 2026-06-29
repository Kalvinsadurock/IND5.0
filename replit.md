# Manufacturing Dashboard Design

## Overview

This is a Manufacturing Dashboard application for Indutch Composites Pvt Ltd, designed to monitor blade production. The application is a React-based frontend with an Express.js backend that provides comprehensive dashboard tracking for manufacturing operations, quality control, supply chain, and process management in a composite blade manufacturing facility.

Key features include:
- User authentication with Face ID and credentials login
- Real-time operations monitoring with mould status tracking
- KPI tracking (production targets, yield, daily run rate)
- Quality inspection checklist with photo documentation
- Supply chain and prefab item status with curing countdowns
- Process pipeline visualization across 35 manufacturing steps (PFD-R03)
- Safety alert system
- 8-state execution model for shop-floor operations
- Global part search with full traceability timeline

## Recent Changes (December 2024)

### UI Restructure - Sidebar Navigation & Dashboard Improvements
- **Sidebar Navigation**: Replaced tab-based navigation with permanent left sidebar
- **KPI Panel**: Collapsible KPI insights panel in sidebar with month selector and trend indicators
- **Dashboard View**: 4 category cards (Inventory, Prefabricated, Moulding, Finishing) with summary stats
- **Moulding Category Card**: Bar graph showing blade distribution across moulds
- **Moulding Overview Dialog**: Shows M1, M2, M3 moulds with Suction Face and Pressure Face sections
  - Each face displays: Current step name, Elapsed/Target time, Progress bar, 2 crew members
  - Suction Face: 19 steps from Shell Cleaning to Post Curing (30 hrs total)
  - Pressure Face: 15 steps from Shell Cleaning to Blade Demoulding
- **Trend Charts**: Dashboard includes 3 trend visualizations:
  - Blade throughput (last 7 days line chart)
  - Hold vs Active (stacked area chart)
  - Yield rate (last 3 months)

### Operations Tab - Blade-Level Refactor
- **Blade-Centric Design**: Each card represents one blade/part (not mould-based swimlanes)
- **Mould Swimlanes**: Visual grouping by mould assignment (or "Unassigned")
- **Blade Cards Include**: Part Number, Process Name, Category, Status, Elapsed vs Target time, Reason if blocked
- **Filters**: Category, Process, Status, Mould dropdown filters
- **Priority Indicators**: Critical (pulsing red) and High priority badges

### Process Tab - Left Sidebar with 35 Processes
- **Process Sidebar**: Left panel listing all 35 processes grouped by category
- **Category Groups**: Inventory (3), Prefabricated (17), Moulding (5), Finishing (10) with expand/collapse
- **Inventory Category**: Incoming, Glass Cutting, Degassing - prerequisite processes for all prefabricated parts
- **Availability Check**: Pie chart showing Available/Missing/QA Hold materials
- **Process Start Blocking**: "Start Process" blocked if required materials missing (except Process 1)
- **Status Summary**: In Progress/Hold/Completed counts for selected process
- **Current Blades**: List of blades currently in the selected process

### Enhanced Shop-Floor Execution Model
- **8-State Execution**: Operations now support planned, active, paused, waiting, blocked, breakdown, rework, and completed states
- **State Machine Validation**: Transitions are validated to ensure only allowed state changes occur
- **Automatic Cascading**: Mould breakdowns automatically cascade waiting status to dependent operations
- **Timeline Events**: All state changes and actions are recorded for full traceability

### Non-Linear Process Entry
- Parts can now be created or resumed at any of the 35 processes
- Mandatory entry reason required: normal, rework, trial, external_operation, resumed
- Entry notes captured for traceability

### Multi-Day Shift Execution
- Shift-wise logging with crew handover notes
- Elapsed time continuity across shifts
- Support for offline/deferred data entry with mandatory reason
- Crew member assignment tracking per shift

### Batch Operations
- Link multiple parts to a single operation (e.g., curing, shell structuring)
- Batch tracking with batch numbers and operation types
- Add/remove parts from active batches

### Enhanced Quality Gating
- QA results: pass, conditional_pass (with deviation number/approval), fail
- Gating checkpoints block downstream operations when failed
- Deviation workflow with approval tracking

### Supply State Management
- Supply lot states: ready, usable, qa_pending, rejected
- Step-level supply requirements with mandatory flag
- Automatic gating - steps blocked unless required supply is usable

### Rework Capability
- Initiate rework from any step to a previous step
- Preserve full execution history during rework
- Track reason, defect description, initiator, and approver

### Priority System
- Priority levels: normal, high, critical
- Visual emphasis for critical operations (pulsing animation)
- Priority-based operation ordering

### Global Part Search & Timeline
- Global search button in header for quick part lookup
- Full timeline view showing all events, state changes, and blockers
- Rework history display
- Current blockers highlighted

### Process Flow Monitoring (December 2024)
- **ProcessFlowView Component**: Visual flow diagram showing all process steps
  - Two-row layout with arrows connecting steps
  - Color-coded status: Completed (green), In Progress (amber), Upcoming (gray with lock)
  - Locked steps are disabled until previous steps completed
  - Step list below flow with status and Details button
  - ESC key and close button to exit
  - Data refreshes when selecting different parts
- **StepDetailDialog Component**: Detailed step information popup
  - Timer display: Elapsed, Target, Remaining, Total time
  - Control Plan Checkpoints with spec, tolerance, method, verifiedBy fields
  - QA Confirmed badges with confirmation timestamps
  - Evidence files display (photos/documents)
  - Upload Photo button for attaching evidence
  - Complete Step button for step completion
- **Status Summary Integration**: Click "In Progress" count to open ProcessFlowView for first active part
- **Access Points**: 
  - Click on any in-progress part in Current Parts list
  - Click Status Summary "In Progress" button

## User Preferences

Preferred communication style: Simple, everyday language.

## System Architecture

### Frontend Architecture
- **Framework**: React 19 with TypeScript
- **Build Tool**: Vite for fast development and bundling
- **Styling**: Tailwind CSS v4 with custom theme variables defined in CSS custom properties
- **Component Library**: shadcn/ui components built on Radix UI primitives
- **Path Aliases**: Uses `@/*` to reference `./src/*` and `@shared/*` for shared types
- **API Proxy**: Vite proxy forwards /api requests to backend on port 3001

### Backend Architecture
- **Framework**: Express.js with TypeScript
- **Database**: PostgreSQL with Drizzle ORM
- **File Storage**: Replit Object Storage (GCS-backed) for evidence photos/documents
- **API Port**: 3001

### Database Schema (18 tables)
Core Tables:
- **processes** - Manufacturing process definitions (35 processes from PFD-R03)
- **process_steps** - Individual steps within each process with target cycle times
- **control_checkpoints** - Quality checkpoints with specifications, tolerances, and gating flags
- **parts** - Part numbers with priority, entry reason, status, and current position

Execution Tables:
- **part_step_instances** - Track each part's progress through steps with 8-state model
- **state_transitions** - Full history of all state changes with timestamps and reasons
- **shift_logs** - Multi-day shift execution with crew, handover notes, elapsed time
- **batches** - Batch operations linking multiple parts
- **batch_parts** - Join table for batch-part relationships

Quality Tables:
- **checkpoint_results** - QA results (pass/conditional/fail) with deviation tracking
- **evidence_files** - Photos/documents uploaded for verification

Resource Tables:
- **moulds** - Mould tracking with breakdown status and downtime
- **mould_events** - Breakdown/restore events with downtime calculation
- **employees** - Employee profiles with roles, skills, and current shift
- **employee_assignments** - Track who's working on what
- **employee_status_history** - Idle/active status tracking

Supply Tables:
- **supply_lots** - Material lots with state (ready/usable/qa_pending/rejected)
- **supply_requirements** - Step-level material requirements with mandatory flags

Traceability Tables:
- **rework_events** - Rework initiation and completion tracking
- **timeline_events** - Aggregated events for part timeline view

### API Endpoints

Parts & Traceability:
- `GET /api/parts` - List parts with search, status, priority, processId filters
- `GET /api/parts/search?q=` - Global part search
- `GET /api/parts/:id/timeline` - Full timeline with blockers and rework history
- `GET /api/parts/:id/history` - Step-by-step execution history with checkpoints
- `POST /api/parts` - Create part with priority, entry reason, entry step
- `PATCH /api/parts/:id/priority` - Update priority with reason logging
- `POST /api/parts/:partId/rework` - Initiate rework to previous step

State Machine:
- `POST /api/parts/:partId/steps/:stepId/start` - Start step with mould, batch, deferred options
- `POST /api/instances/:id/transition` - Generic state transition
- `POST /api/instances/:id/pause` - Pause with reason
- `POST /api/instances/:id/resume` - Resume with reason
- `POST /api/instances/:id/complete` - Complete (validates gating checkpoints)
- `POST /api/instances/:id/block` - Block with reason
- `POST /api/instances/:id/shift-log` - Log shift with crew and handover notes

Moulds:
- `GET /api/moulds` - List all moulds
- `POST /api/moulds/:id/breakdown` - Record breakdown (cascades waiting to operations)
- `POST /api/moulds/:id/restore` - Restore mould, calculate downtime

Batches:
- `GET /api/batches` - List batches
- `POST /api/batches` - Create batch with part IDs
- `POST /api/batches/:id/add-parts` - Add parts to existing batch

Supply:
- `GET /api/supply-lots` - List supply lots with state/material filters
- `PATCH /api/supply-lots/:id/state` - Update state with QA status
- `GET /api/steps/:stepId/supply-check` - Check if step has usable materials

Quality:
- `POST /api/checkpoint-results/:id/qa-result` - Record pass/conditional/fail with deviation
- `POST /api/checkpoint-results/:id/upload-evidence` - Upload verification photos
- `POST /api/checkpoint-results/:id/qa-confirm` - QA confirmation

Operations:
- `GET /api/operations/active` - Active operations with mould, status, priority filters

### Component Structure
- `src/app/App.tsx` - Main application with global search integration
- `src/app/components/GlobalSearch.tsx` - Global part search with timeline view
- `src/app/components/ProcessTab.tsx` - Process flow and part management
- `src/app/components/OperationsTab.tsx` - Mould-centric operation tracking
- `src/app/components/ui/` - Reusable UI primitives from shadcn/ui
- `src/app/lib/api.ts` - API client utilities
- `server/index.ts` - Express backend with all API routes
- `server/seed.ts` - Database seeding with sample data
- `shared/schema.ts` - Drizzle ORM schema definitions

### State Management
- React useState hooks for local component state
- Backend API for persistent data storage
- Presigned URL flow for file uploads to object storage
- Real-time state machine validation on backend

### Styling Approach
- Dark theme by default (slate-900 backgrounds)
- CSS custom properties for theming in `src/styles/theme.css`
- Tailwind utility classes with `cn()` helper for conditional styling
- Component variants using class-variance-authority (CVA)
- Priority-based visual emphasis (critical = pulsing red)

### Design Patterns
- Tab-based navigation for main content areas
- Card-based layouts for data display
- Status-based color coding (emerald=active, amber=paused, blue=waiting, red=blocked/critical, slate=completed)
- Progress indicators for time-sensitive operations
- State machine pattern for operation lifecycle

## External Dependencies

### UI Framework
- **@radix-ui/***: Headless UI primitives for accessible components (dialog, tabs, popover, etc.)
- **@mui/material & @mui/icons-material**: Material UI components (available but minimally used)
- **lucide-react**: Icon library

### Styling
- **tailwindcss**: Utility-first CSS framework
- **@tailwindcss/vite**: Vite plugin for Tailwind
- **class-variance-authority**: Component variant management
- **clsx & tailwind-merge**: Class name utilities

### Additional Libraries
- **date-fns**: Date formatting and manipulation
- **react-day-picker**: Calendar component
- **embla-carousel-react**: Carousel functionality
- **cmdk**: Command palette component
- **vaul**: Drawer component
- **recharts**: Charting library (available for data visualization)
- **react-hook-form**: Form handling (available in UI components)
- **sonner**: Toast notifications

### Development
- **TypeScript**: Type safety with relaxed strict mode
- **Vite**: Development server runs on port 5000 with proxy to API on 3001
- **drizzle-orm**: Type-safe PostgreSQL ORM
- **drizzle-kit**: Database migration and push tools
