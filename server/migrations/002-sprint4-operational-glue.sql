CREATE TABLE IF NOT EXISTS work_order_executions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id uuid NOT NULL REFERENCES platform_tenants(id),
  work_order_id uuid NOT NULL REFERENCES mes_work_orders(id),
  part_id integer REFERENCES parts(id),
  process_id integer REFERENCES processes(id),
  current_step_id integer REFERENCES process_steps(id),
  work_center_id uuid REFERENCES platform_work_centers(id),
  execution_number varchar(80) NOT NULL,
  status varchar(40) NOT NULL DEFAULT 'planned',
  planned_quantity numeric(14, 3) NOT NULL DEFAULT 1,
  good_quantity numeric(14, 3) NOT NULL DEFAULT 0,
  rejected_quantity numeric(14, 3) NOT NULL DEFAULT 0,
  started_at timestamp,
  ended_at timestamp,
  created_by uuid REFERENCES platform_users(id),
  updated_by uuid REFERENCES platform_users(id),
  created_at timestamp NOT NULL DEFAULT now(),
  updated_at timestamp NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS work_order_executions_tenant_idx ON work_order_executions(tenant_id);
CREATE INDEX IF NOT EXISTS work_order_executions_work_order_idx ON work_order_executions(work_order_id);
CREATE INDEX IF NOT EXISTS work_order_executions_part_idx ON work_order_executions(part_id);
CREATE INDEX IF NOT EXISTS work_order_executions_status_idx ON work_order_executions(tenant_id, status);

CREATE TABLE IF NOT EXISTS inventory_materials (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id uuid NOT NULL REFERENCES platform_tenants(id),
  material_code varchar(80) NOT NULL,
  material_name varchar(180) NOT NULL,
  material_type varchar(80) NOT NULL DEFAULT 'raw_material',
  base_uom varchar(24) NOT NULL DEFAULT 'ea',
  status varchar(30) NOT NULL DEFAULT 'active',
  lot_controlled boolean NOT NULL DEFAULT false,
  serial_controlled boolean NOT NULL DEFAULT false,
  created_by uuid REFERENCES platform_users(id),
  updated_by uuid REFERENCES platform_users(id),
  created_at timestamp NOT NULL DEFAULT now(),
  updated_at timestamp NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS inventory_materials_tenant_idx ON inventory_materials(tenant_id);
CREATE INDEX IF NOT EXISTS inventory_materials_code_idx ON inventory_materials(tenant_id, material_code);
CREATE INDEX IF NOT EXISTS inventory_materials_type_idx ON inventory_materials(tenant_id, material_type);

CREATE TABLE IF NOT EXISTS inventory_stock_ledger (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id uuid NOT NULL REFERENCES platform_tenants(id),
  material_id uuid NOT NULL REFERENCES inventory_materials(id),
  work_order_id uuid REFERENCES mes_work_orders(id),
  execution_id uuid REFERENCES work_order_executions(id),
  movement_type varchar(40) NOT NULL,
  quantity numeric(14, 3) NOT NULL,
  uom varchar(24) NOT NULL,
  lot_number varchar(80),
  from_location varchar(120),
  to_location varchar(120),
  reference_type varchar(60),
  reference_id varchar(120),
  reason text,
  posted_by uuid REFERENCES platform_users(id),
  posted_at timestamp NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS inventory_stock_ledger_tenant_idx ON inventory_stock_ledger(tenant_id);
CREATE INDEX IF NOT EXISTS inventory_stock_ledger_material_idx ON inventory_stock_ledger(material_id);
CREATE INDEX IF NOT EXISTS inventory_stock_ledger_execution_idx ON inventory_stock_ledger(execution_id);
CREATE INDEX IF NOT EXISTS inventory_stock_ledger_work_order_idx ON inventory_stock_ledger(work_order_id);

CREATE TABLE IF NOT EXISTS quality_inspection_plans (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id uuid NOT NULL REFERENCES platform_tenants(id),
  plan_code varchar(80) NOT NULL,
  plan_name varchar(180) NOT NULL,
  object_type varchar(80) NOT NULL DEFAULT 'work_order_execution',
  process_id integer REFERENCES processes(id),
  step_id integer REFERENCES process_steps(id),
  version integer NOT NULL DEFAULT 1,
  status varchar(30) NOT NULL DEFAULT 'draft',
  trigger_status varchar(40) NOT NULL DEFAULT 'in_progress',
  effective_from timestamp,
  effective_to timestamp,
  checkpoint_ids jsonb,
  created_by uuid REFERENCES platform_users(id),
  updated_by uuid REFERENCES platform_users(id),
  created_at timestamp NOT NULL DEFAULT now(),
  updated_at timestamp NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS quality_inspection_plans_tenant_idx ON quality_inspection_plans(tenant_id);
CREATE INDEX IF NOT EXISTS quality_inspection_plans_code_idx ON quality_inspection_plans(tenant_id, plan_code);
CREATE INDEX IF NOT EXISTS quality_inspection_plans_process_idx ON quality_inspection_plans(process_id);
CREATE INDEX IF NOT EXISTS quality_inspection_plans_status_idx ON quality_inspection_plans(tenant_id, status);

CREATE TABLE IF NOT EXISTS oee_reason_codes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id uuid NOT NULL REFERENCES platform_tenants(id),
  reason_code varchar(80) NOT NULL,
  reason_name varchar(180) NOT NULL,
  category varchar(80) NOT NULL DEFAULT 'downtime',
  loss_type varchar(80) NOT NULL DEFAULT 'availability',
  work_center_type varchar(80),
  is_planned boolean NOT NULL DEFAULT false,
  is_active boolean NOT NULL DEFAULT true,
  display_order integer NOT NULL DEFAULT 0,
  created_at timestamp NOT NULL DEFAULT now(),
  updated_at timestamp NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS oee_reason_codes_tenant_idx ON oee_reason_codes(tenant_id);
CREATE INDEX IF NOT EXISTS oee_reason_codes_code_idx ON oee_reason_codes(tenant_id, reason_code);
CREATE INDEX IF NOT EXISTS oee_reason_codes_category_idx ON oee_reason_codes(tenant_id, category);

ALTER TABLE oee_downtime_events
  ADD COLUMN IF NOT EXISTS downtime_reason_id uuid;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'oee_downtime_events_reason_fk'
  ) THEN
    ALTER TABLE oee_downtime_events
      ADD CONSTRAINT oee_downtime_events_reason_fk
      FOREIGN KEY (downtime_reason_id) REFERENCES oee_reason_codes(id);
  END IF;
END $$;

ALTER TABLE oee_production_counts
  ADD COLUMN IF NOT EXISTS execution_id uuid;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'oee_production_counts_execution_fk'
  ) THEN
    ALTER TABLE oee_production_counts
      ADD CONSTRAINT oee_production_counts_execution_fk
      FOREIGN KEY (execution_id) REFERENCES work_order_executions(id);
  END IF;
END $$;

CREATE INDEX IF NOT EXISTS oee_production_counts_execution_idx ON oee_production_counts(execution_id);

ALTER TABLE checkpoint_results
  ADD COLUMN IF NOT EXISTS execution_id uuid;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'checkpoint_results_execution_fk'
  ) THEN
    ALTER TABLE checkpoint_results
      ADD CONSTRAINT checkpoint_results_execution_fk
      FOREIGN KEY (execution_id) REFERENCES work_order_executions(id);
  END IF;
END $$;

CREATE INDEX IF NOT EXISTS checkpoint_results_execution_idx ON checkpoint_results(execution_id);
