import { Request, Response, NextFunction } from "express";
import { db } from "../db";
import {
  platformUserRoleAssignments,
  platformRoles,
  platformRolePermissions,
  platformPermissions,
  platformAuditEvents
} from "../../shared/schema";
import { eq, and } from "drizzle-orm";

export interface AuthenticatedRequest extends Request {
  tenantId?: string;
  userId?: string;
}

export async function requireTenant(req: AuthenticatedRequest, res: Response, next: NextFunction) {
  const tenantId = req.headers["x-tenant-id"] || req.query.tenantId || req.body?.tenantId;
  if (!tenantId) return res.status(401).json({ error: "Tenant context missing" });
  req.tenantId = String(tenantId);
  next();
}

export async function requirePermission(req: AuthenticatedRequest, res: Response, next: NextFunction, permissionCode: string) {
  const userId = req.headers["x-user-id"] || req.query.userId || req.body?.actorUserId || req.body?.userId;
  const tenantId = req.tenantId;

  if (!userId || !tenantId) {
    return res.status(403).json({ error: "Context identification missing" });
  }

  // Check if user has permission
  const hasPermission = await db.select()
    .from(platformUserRoleAssignments)
    .innerJoin(platformRoles, eq(platformUserRoleAssignments.roleId, platformRoles.id))
    .innerJoin(platformRolePermissions, eq(platformRoles.id, platformRolePermissions.roleId))
    .innerJoin(platformPermissions, eq(platformRolePermissions.permissionId, platformPermissions.id))
    .where(and(
      eq(platformUserRoleAssignments.userId, String(userId)),
      eq(platformUserRoleAssignments.tenantId, String(tenantId)),
      eq(platformPermissions.code, permissionCode)
    )).limit(1);

  if (!hasPermission.length) {
    await emitAudit(req, "PERMISSION_DENIED", { permissionCode, attemptedAction: req.path });
    return res.status(403).json({ error: "Insufficient permissions" });
  }
  next();
}

export async function emitAudit(req: AuthenticatedRequest, eventType: string, metadata: any) {
  try {
    const tenantId = req.tenantId || req.headers["x-tenant-id"] || req.query.tenantId || req.body?.tenantId || null;
    const userId = req.headers["x-user-id"] || req.query.userId || req.body?.actorUserId || req.body?.userId || null;
    
    await db.insert(platformAuditEvents).values({
      tenantId: tenantId ? String(tenantId) : null,
      actorUserId: userId ? String(userId) : null,
      actorType: "user",
      module: "platform",
      eventType,
      entityType: "platform_action",
      entityId: null,
      action: "access",
      beforeSnapshot: null,
      afterSnapshot: null,
      metadata: metadata || {},
    } as any);
  } catch (err) {
    console.error("Failed to emit audit event:", err);
  }
}
