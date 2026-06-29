// =====================================================
// DASHBOARD API REWRITE - ISA-95 COMPLIANT
// Purpose: Replace status-based queries with execution views
// =====================================================

import { db } from "./db";
import { sql } from "drizzle-orm";

// =====================================================
// 1️⃣ ACTIVE PARTS DASHBOARD (REPLACES old status = 'in_progress')
// =====================================================

/**
 * Get all active parts with current step information
 * ✅ Source of truth: part_execution_summary view
 * ✅ No status field bugs
 * ✅ Aggregated QA state
 */
export const getActiveParts = async () => {
  return db.execute(sql`
    SELECT
      p.id,
      p.part_number,
      p.process_id,
      pr.name AS process_name,
      pr.code AS process_code,
      ps.overall_state,
      ps.qa_overall_state,
      ps.steps_completed,
      ps.total_steps,
      ps.priority,
      ps.last_activity_at,
      ps.created_at
    FROM part_execution_summary ps
    JOIN parts p ON p.id = ps.part_id
    JOIN processes pr ON pr.id = p.process_id
    WHERE ps.overall_state IN ('in_progress', 'blocked')
    ORDER BY
      CASE 
        WHEN p.priority = 'critical' THEN 1
        WHEN p.priority = 'high' THEN 2
        ELSE 3
      END,
      ps.last_activity_at DESC
  `);
};

// =====================================================
// 2️⃣ PART SEARCH (REPLACES hardcoded status logic)
// =====================================================

/**
 * Search parts by number with execution state
 * ✅ No status field required
 * ✅ Derived from execution summary
 */
export const searchParts = async (search: string) => {
  return db.execute(sql`
    SELECT
      p.id,
      p.part_number,
      pr.name AS process_name,
      ps.overall_state,
      ps.qa_overall_state,
      ps.steps_completed,
      ps.total_steps,
      p.priority,
      p.created_at
    FROM part_execution_summary ps
    JOIN parts p ON p.id = ps.part_id
    JOIN processes pr ON pr.id = p.process_id
    WHERE p.part_number ILIKE ${`%${search}%`}
    ORDER BY p.part_number
    LIMIT 50
  `);
};

// =====================================================
// 3️⃣ BLOCKED PARTS (REPLACES WHERE status = 'blocked')
// =====================================================

/**
 * Get all blocked parts with blocking reason
 * ✅ Source: part_execution_summary with blocked state
 * ✅ Includes current step that's blocked
 */
export const getBlockedParts = async () => {
  return db.execute(sql`
    SELECT
      p.id,
      p.part_number,
      pr.name AS process_name,
      ps.overall_state,
      cps.step_number,
      cps.name AS step_name,
      psi.blocked_reason,
      psi.last_state_change_at,
      p.priority
    FROM part_execution_summary ps
    JOIN parts p ON p.id = ps.part_id
    JOIN processes pr ON pr.id = p.process_id
    JOIN current_part_step cps ON cps.part_id = p.id
    JOIN part_step_instances psi ON psi.id = (
      SELECT id FROM part_step_instances 
      WHERE part_id = p.id AND execution_state = 'blocked' 
      ORDER BY created_at DESC LIMIT 1
    )
    WHERE ps.overall_state = 'blocked'
    ORDER BY psi.last_state_change_at DESC
  `);
};

// =====================================================
// 4️⃣ PART STEP TIMELINE (REPLACES manual sequence ordering)
// =====================================================

/**
 * Get execution timeline for a part
 * ✅ Ordered by process_steps.sequence
 * ✅ Includes both execution and QA state
 */
export const getPartTimeline = async (partId: string) => {
  return db.execute(sql`
    SELECT
      psi.id AS instance_id,
      ps.step_number,
      ps.name AS step_name,
      ps.sequence,
      psi.execution_state,
      psi.qa_state,
      psi.started_at,
      psi.completed_at,
      EXTRACT(EPOCH FROM (psi.completed_at - psi.started_at)) / 60 AS elapsed_minutes,
      ps.target_cycle_time,
      psi.notes
    FROM step_execution_timeline
    WHERE part_id = ${partId}
    ORDER BY sequence ASC
  `);
};

// =====================================================
// 5️⃣ QUALITY DASHBOARD (REPLACES qaApproved field)
// =====================================================

/**
 * Get QA status across all checkpoints for a part
 * ✅ Source: checkpoint_execution view
 * ✅ Single qa_state field
 * ✅ Gating logic included
 */
export const getPartQAStatus = async (partId: string) => {
  return db.execute(sql`
    SELECT
      ce.step_name,
      ce.characteristic,
      ce.is_gating,
      ce.qa_state,
      ce.measured_value,
      ce.deviation_approved,
      ce.created_at,
      COUNT(ef.id) AS evidence_file_count
    FROM checkpoint_execution ce
    LEFT JOIN evidence_files ef ON ef.result_id = ce.result_id
    WHERE ce.part_id = ${partId}
    GROUP BY ce.step_name, ce.characteristic, ce.is_gating, ce.qa_state, 
             ce.measured_value, ce.deviation_approved, ce.created_at
    ORDER BY ce.created_at DESC
  `);
};

// =====================================================
// 6️⃣ PROCESS EXECUTION SUMMARY (DASHBOARD WIDGET)
// =====================================================

/**
 * Get process-level statistics
 * ✅ Aggregated from execution summary
 * ✅ No hardcoded status logic
 */
export const getProcessSummary = async (processId: string) => {
  return db.execute(sql`
    SELECT
      pr.name,
      pr.code,
      COUNT(CASE WHEN ps.overall_state = 'in_progress' THEN 1 END) AS in_progress_count,
      COUNT(CASE WHEN ps.overall_state = 'blocked' THEN 1 END) AS blocked_count,
      COUNT(CASE WHEN ps.overall_state = 'completed' THEN 1 END) AS completed_count,
      COUNT(CASE WHEN ps.qa_overall_state = 'fail' THEN 1 END) AS qa_failed_count,
      AVG(ps.steps_completed::NUMERIC / NULLIF(ps.total_steps, 0)) AS avg_completion_pct
    FROM part_execution_summary ps
    JOIN processes pr ON pr.id = ps.part_id
    WHERE ps.process_id = ${processId}
    GROUP BY pr.name, pr.code
  `);
};

// =====================================================
// 7️⃣ INVENTORY CONSUMPTION TRACEABILITY
// =====================================================

/**
 * Get all inventory used for a specific part
 * ✅ Traced to step instance level
 * ✅ Includes quantity and unit
 */
export const getPartInventoryUsage = async (partId: string) => {
  return db.execute(sql`
    SELECT
      ic.id,
      ic.quantity_used,
      ic.unit,
      sl.lot_number,
      sl.material_type,
      psi.step_number,
      psi.name AS step_name,
      ic.consumed_by,
      ic.consumed_at
    FROM inventory_consumption ic
    JOIN supply_lots sl ON sl.id = ic.supply_lot_id
    JOIN part_step_instances psi ON psi.id = ic.step_instance_id
    WHERE ic.part_id = ${partId}
    ORDER BY ic.consumed_at DESC
  `);
};

// =====================================================
// 8️⃣ STEP ASSIGNMENT TRACKING
// =====================================================

/**
 * Get employee assignments for a step instance
 * ✅ Replaces JSONB crew_members
 * ✅ Proper FK relationships
 */
export const getStepAssignments = async (instanceId: string) => {
  return db.execute(sql`
    SELECT
      ea.id,
      e.employee_code,
      e.name,
      e.role,
      ea.role AS assigned_role,
      ea.assigned_at,
      ea.ended_at
    FROM employee_assignments ea
    JOIN employees e ON e.id = ea.employee_id
    WHERE ea.instance_id = ${instanceId}
    ORDER BY ea.assigned_at DESC
  `);
};

// =====================================================
// 9️⃣ STATE TRANSITION AUDIT TRAIL
// =====================================================

/**
 * Get all state changes for a part step
 * ✅ Immutable audit trail
 * ✅ Actor and reason recorded
 */
export const getStepStateHistory = async (instanceId: string) => {
  return db.execute(sql`
    SELECT
      st.id,
      st.from_state,
      st.to_state,
      st.reason,
      e.name AS triggered_by,
      st.triggered_at,
      st.is_automatic
    FROM state_transitions st
    LEFT JOIN employees e ON e.id = st.triggered_by_id
    WHERE st.instance_id = ${instanceId}
    ORDER BY st.triggered_at DESC
  `);
};

// =====================================================
// 🔟 PLM SYNCHRONIZATION STATUS
// =====================================================

/**
 * Get PLM sync status for parts
 * ✅ Tracks Teamcenter/3DEX linking
 * ✅ Revision aware
 */
export const getPLMSyncStatus = async (partId: string) => {
  return db.execute(sql`
    SELECT
      po.id,
      po.plm_system,
      po.plm_uid,
      po.plm_revision,
      po.sync_status,
      po.last_synced_at,
      po.last_error,
      COUNT(CASE WHEN pse.status = 'success' THEN 1 END) AS successful_syncs,
      COUNT(CASE WHEN pse.status = 'failed' THEN 1 END) AS failed_syncs
    FROM plm_objects po
    LEFT JOIN plm_sync_events pse ON pse.plm_object_id = po.id
    WHERE po.entity_id = ${partId}
    GROUP BY po.id, po.plm_system, po.plm_uid, po.plm_revision,
             po.sync_status, po.last_synced_at, po.last_error
  `);
};

// =====================================================
// HELPER: DERIVE OVERALL STATE (for API responses)
// =====================================================

export const derivePartStatus = (row: any) => {
  // Never query parts.status directly
  // Always use part_execution_summary view
  return {
    partId: row.part_id,
    partNumber: row.part_number,
    overallState: row.overall_state,
    qaState: row.qa_overall_state,
    progress: `${row.steps_completed}/${row.total_steps}`,
    priority: row.priority,
    lastActivity: row.last_activity_at,
  };
};

// =====================================================
// EXPRESS ROUTE EXAMPLE
// =====================================================

/*
import express from "express";

const router = express.Router();

// Dashboard endpoint
router.get("/dashboard/active-parts", async (req, res) => {
  try {
    const parts = await getActiveParts();
    res.json(parts.map(derivePartStatus));
  } catch (error) {
    console.error("Error fetching active parts:", error);
    res.status(500).json({ error: "Failed to fetch active parts" });
  }
});

// Part timeline endpoint
router.get("/parts/:partId/timeline", async (req, res) => {
  try {
    const timeline = await getPartTimeline(req.params.partId);
    res.json(timeline);
  } catch (error) {
    console.error("Error fetching timeline:", error);
    res.status(500).json({ error: "Failed to fetch timeline" });
  }
});

// QA status endpoint
router.get("/parts/:partId/qa-status", async (req, res) => {
  try {
    const qaStatus = await getPartQAStatus(req.params.partId);
    res.json(qaStatus);
  } catch (error) {
    console.error("Error fetching QA status:", error);
    res.status(500).json({ error: "Failed to fetch QA status" });
  }
});

export default router;
*/

// =====================================================
// WHAT CHANGED
// =====================================================

/*
❌ OLD PATTERN (BROKEN):
  WHERE parts.status = 'in_progress'
  WHERE parts.status = 'blocked'
  parts.current_step_id (denormalized)
  checkpointResults.qa_approved (boolean)
  checkpointResults.is_gate_passed (boolean)

✅ NEW PATTERN (ISA-95):
  FROM part_execution_summary WHERE overall_state = 'in_progress'
  FROM part_execution_summary WHERE overall_state = 'blocked'
  FROM current_part_step (computed view)
  checkpointResults.qa_state (single enum)
  checkpoint_execution.is_gating (control plan field)
*/
