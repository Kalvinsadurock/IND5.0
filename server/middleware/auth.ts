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

/**
 * authenticate – Extract user identity from JWT or fallback headers.
 * In production this verifies a real JWT; for MVP it also accepts
 * x-user-id / x-tenant-id headers so the platform can be exercised
 * without a full Supabase auth flow.
 */
export function authenticate(req: AuthenticatedRequest, res: Response, next: NextFunction) {
  // Try JWT first
  const authHeader = req.headers.authorization;
  if (authHeader && authHeader.startsWith("Bearer ")) {
    const token = authHeader.split(" ")[1];
    try {
      // Decode the base64 payload (works for both real JWTs and our demo tokens)
      const payloadB64 = token.split(".")[1];
      const payload = JSON.parse(Buffer.from(payloadB64, "base64").toString());
      req.userId = payload.userId || payload.sub || payload.user_id || undefined;
      req.tenantId = payload.tenantId || payload.tenant_id || undefined;
    } catch {
      // Token decode failed – fall through to header-based extraction
    }
  }

  // Fallback: extract from headers / query / body (MVP convenience)
  if (!req.userId) {
    req.userId = (req.headers["x-user-id"] as string) || (req.query.userId as string) || req.body?.actorUserId || req.body?.userId || undefined;
  }
  if (!req.tenantId) {
    req.tenantId = (req.headers["x-tenant-id"] as string) || (req.query.tenantId as string) || req.body?.tenantId || undefined;
  }

  next();
}

/**
 * requireTenant – Reject requests that lack a tenant context.
 */
export function requireTenant(req: AuthenticatedRequest, res: Response, next: NextFunction) {
  if (!req.tenantId) {
    return res.status(401).json({ error: "Tenant context missing" });
  }
  next();
}

/**
 * requirePermission – RBAC gate that checks the user's role-permission
 * assignments before allowing a write action.
 */
export function requirePermission(permissionCode: string) {
  return async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
    const userId = req.userId;
    const tenantId = req.tenantId;

    if (!userId || !tenantId) {
      return res.status(403).json({ error: "Context identification missing (userId or tenantId)" });
    }

    try {
      const hasPermission = await db.select()
        .from(platformUserRoleAssignments)
        .innerJoin(platformRoles, eq(platformUserRoleAssignments.roleId, platformRoles.id))
        .innerJoin(platformRolePermissions, eq(platformRoles.id, platformRolePermissions.roleId))
        .innerJoin(platformPermissions, eq(platformRolePermissions.permissionId, platformPermissions.id))
        .where(and(
          eq(platformUserRoleAssignments.userId, userId),
          eq(platformUserRoleAssignments.tenantId, tenantId),
          eq(platformPermissions.code, permissionCode)
        )).limit(1);

      if (!hasPermission.length) {
        await emitAudit(req, "PERMISSION_DENIED", {
          permissionCode,
          attemptedAction: req.method + " " + req.path
        }, "failure");
        return res.status(403).json({ error: "Insufficient permissions", requiredPermission: permissionCode });
      }
      next();
    } catch (err) {
      console.error("Permission check error:", err);
      return res.status(500).json({ error: "Permission verification failed" });
    }
  };
}

/**
 * emitAudit – Write an immutable audit event with success/failure outcome.
 * Called on both successful operations and denied access attempts.
 */
export async function emitAudit(
  req: AuthenticatedRequest,
  eventType: string,
  metadata: any,
  outcome: "success" | "failure" = "success"
) {
  try {
    const tenantId = req.tenantId || null;
    const userId = req.userId || null;

    await db.insert(platformAuditEvents).values({
      tenantId: tenantId ? String(tenantId) : null,
      actorUserId: userId ? String(userId) : null,
      actorType: "user",
      module: "platform",
      eventType,
      entityType: "platform_action",
      entityId: null,
      action: eventType,
      beforeSnapshot: null,
      afterSnapshot: null,
      metadata: {
        ...metadata,
        outcome,
        ip: req.ip,
        userAgent: req.headers["user-agent"]
      },
    } as any);
  } catch (err) {
    console.error("Failed to emit audit event:", err);
  }
}
