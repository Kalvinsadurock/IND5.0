import "dotenv/config";
import express from "express";
import cors from "cors";
import path from "path";
import { fileURLToPath } from "url";
import { registerObjectStorageRoutes } from "./replit_integrations/object_storage";
import uploadRouter from './routes/upload';
import checkpointUploadRouter from './routes/checkpointUpload';

import { definitionRouter } from "./domains/definition/routes";
import { executionRouter } from "./domains/execution/routes";
import { inventoryRouter } from "./domains/inventory/routes";
import { resourcesRouter } from "./domains/resources/routes";
import { authRouter } from "./domains/auth/routes";
import { analyticsRouter } from "./domains/analytics/routes";
import { processInventoryRouter } from "./domains/inventory/process-inventory-routes";
import { sprint4InventoryRouter } from "./domains/inventory/sprint4-routes";
import { readinessRouter } from "./domains/execution/readiness-routes";
import { startRouter } from "./domains/execution/start-routes";
import { processDetailsRouter } from "./domains/execution/process-details-routes";
import { qualityRouter } from "./domains/execution/quality-routes";
import { inspectionPlanRouter } from "./domains/execution/inspection-plan-routes";
import { shiftRouter } from "./domains/execution/shift-routes";
import { platformRouter } from "./domains/platform/routes";
import { configurationRouter } from "./domains/configuration/routes";
import { workOrderRouter } from "./domains/mes/work-order-routes";
import { oeeRouter } from "./domains/execution/oee-routes";
import { requireAuth } from "./auth"; // Assuming auth.ts exists and exports this
import { supabaseAdmin } from './lib/supabaseAdmin';

const app = express();
app.use(cors());
app.use(express.json());

// Debug Logger
app.use((req, res, next) => {
  console.log(`[${new Date().toISOString()}] ${req.method} ${req.url}`);
  next();
});

// Auth & Storage (Legacy/Shared)
registerObjectStorageRoutes(app);
app.use('/api/uploads', uploadRouter);
app.use('/api', checkpointUploadRouter);

// Admin diagnostic (Keep as is)
app.get('/api/admin/storage/diagnose', requireAuth, async (req, res) => {
  try {
    if (!supabaseAdmin) {
      return res.status(500).json({ ok: false, error: 'Supabase admin client not configured' });
    }
    const { data, error } = await supabaseAdmin.storage.listBuckets();
    if (error) {
      return res.status(500).json({ ok: false, error });
    }
    return res.json({ ok: true, buckets: data, env: { supabaseUrl: process.env.VITE_SUPABASE_URL ? 'set' : 'unset', serviceKey: process.env.SUPABASE_SERVICE_ROLE_KEY ? 'set' : 'unset' } });
  } catch (err) {
    console.error('Storage diagnose error:', err);
    return res.status(500).json({ ok: false, error: 'Internal error' });
  }
});

// Mount Domain Routes
// Auth: /api/auth/login, /api/auth/verify, /api/auth/me
app.use('/api/auth', authRouter);

// Analytics: /api/kpis, /api/category-summary, /api/trends/* (READ-ONLY STUBS)
app.use('/api', analyticsRouter);

// Process Inventory: /api/process/:id/inventory (READ-ONLY)
app.use('/api', processInventoryRouter);

// Process Readiness: /api/processes/:id/readiness (READ-ONLY)
app.use('/api', readinessRouter);

// Process Start: /api/processes/:id/start (EXECUTION)
// Process Start: /api/processes/:id/start (EXECUTION)
app.use('/api', startRouter);
// Process Details: /api/processes/:id/summary, /api/processes/:id/parts (READ-ONLY)
app.use('/api', processDetailsRouter);

// Definition: /api/processes, /api/steps
app.use('/api', definitionRouter);

// Execution: /api/process-execution, /api/step-instances
app.use('/api', executionRouter);
app.use('/api/quality', qualityRouter);
app.use('/api/shifts', shiftRouter);

// Inventory: /api/materials, /api/resin/create, /api/kits/create
// Inventory: /api/inventory/dashboard-summary (and others if migrated)
app.use('/api', inventoryRouter); // Exposes /api/resin/create
app.use('/api/inventory', inventoryRouter);
app.use('/api/inventory', sprint4InventoryRouter);
// Keep /api/materials separately if needed for backwards compatibility or refactor router to use base path
app.use('/api/materials', inventoryRouter);

// Resources: /api/employees, /api/moulds
app.use('/api', resourcesRouter);

// Platform Core: tenant/company/plant hierarchy/users/RBAC/audit
app.use('/api', platformRouter);

// Configuration Studio: custom fields/workflow state engine
app.use('/api', configurationRouter);

// MES pilot: configurable work orders
app.use('/api', workOrderRouter);

// OEE tracking
app.use('/api', oeeRouter);

// Quality inspection plan versioning
app.use('/api', inspectionPlanRouter);

// Error handling
app.use((err: any, req: any, res: any, next: any) => {
  const status = err.status || err.statusCode || 500;
  const message = err.message || "Internal Server Error";
  res.status(status).json({ message });
  throw err;
});

// Serve frontend in production
if (app.get("env") === "production") {
  const __filename = fileURLToPath(import.meta.url);
  const __dirname = path.dirname(__filename);
  app.use(express.static(path.join(__dirname, "../dist")));
  app.get("*", (req, res) => {
    res.sendFile(path.join(__dirname, "../dist", "index.html"));
  });
}

const PORT = process.env.PORT || 5000;
app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});
