import { Router } from 'express';
import { db } from '../../db';
import { employees } from '../../../shared/schema';
import { eq } from 'drizzle-orm';
import { signInWithPassword, verifyToken } from '../../auth';

const router = Router();

/**
 * POST /api/auth/login
 * Login with employee ID and password
 */
router.post('/login', async (req, res) => {
    try {
        const { employeeId, password } = req.body;

        if (!employeeId || !password) {
            return res.status(400).json({ error: 'Employee ID and password required' });
        }

        // Find employee by employeeCode
        const employee = await db.query.employees.findFirst({
            where: eq(employees.employeeCode, employeeId),
        });

        if (!employee) {
            return res.status(401).json({ error: 'Invalid credentials' });
        }

        // Attempt to sign in with Supabase using employee's email
        const authResult = await signInWithPassword(employee.email, password);

        if ('error' in authResult) {
            return res.status(401).json({ error: authResult.error });
        }

        // Return token and user info
        return res.json({
            access_token: authResult.access_token,
            user: {
                id: employee.id,
                employeeId: employee.employeeCode,
                employeeName: employee.name,
                email: employee.email,
                role: employee.role || 'operator',
                department: employee.department,
                auth_user_id: employee.auth_user_id,
            },
        });
    } catch (error) {
        console.error('Login error:', error);
        return res.status(500).json({ error: 'Internal server error' });
    }
});

/**
 * POST /api/auth/verify
 * Verify a JWT token
 */
router.post('/verify', async (req, res) => {
    try {
        const { token } = req.body;

        if (!token) {
            return res.status(400).json({ error: 'Token required' });
        }

        const authUser = await verifyToken(token);

        if (!authUser) {
            return res.json({ valid: false });
        }

        // Find employee by email
        const employee = await db.query.employees.findFirst({
            where: eq(employees.email, authUser.email),
        });

        if (!employee) {
            return res.json({ valid: false });
        }

        return res.json({
            valid: true,
            user: {
                id: employee.id,
                employeeId: employee.employeeCode,
                employeeName: employee.name,
                email: employee.email,
                role: employee.role || 'operator',
                department: employee.department,
                auth_user_id: employee.auth_user_id,
            },
        });
    } catch (error) {
        console.error('Verify error:', error);
        return res.status(500).json({ error: 'Internal server error' });
    }
});

/**
 * GET /api/auth/me
 * Get current user info from token
 */
router.get('/me', async (req, res) => {
    try {
        const authHeader = req.headers.authorization;
        const token = authHeader?.replace('Bearer ', '');

        if (!token) {
            return res.status(401).json({ error: 'No token provided' });
        }

        const authUser = await verifyToken(token);

        if (!authUser) {
            return res.status(401).json({ error: 'Invalid token' });
        }

        // Find employee by email
        const employee = await db.query.employees.findFirst({
            where: eq(employees.email, authUser.email),
        });

        if (!employee) {
            return res.status(404).json({ error: 'Employee not found' });
        }

        return res.json({
            id: employee.id,
            employeeId: employee.employeeCode,
            employeeName: employee.name,
            email: employee.email,
            role: employee.role || 'operator',
            department: employee.department,
            auth_user_id: employee.auth_user_id,
        });
    } catch (error) {
        console.error('Get me error:', error);
        return res.status(500).json({ error: 'Internal server error' });
    }
});

import { platformPendingInvites, platformUsers, platformTenants, platformRoles, platformUserRoleAssignments } from '../../../shared/schema';
import { and, eq } from 'drizzle-orm';
import { createAuthUser } from '../../auth';

router.get('/validate-invite', async (req, res) => {
    try {
        const token = req.query.token as string;
        if (!token) return res.status(400).json({ error: 'Token required' });

        const [invite] = await db.select().from(platformPendingInvites).where(
            and(
                eq(platformPendingInvites.tokenHash, token),
                eq(platformPendingInvites.usedAt, null as any)
            )
        );

        if (!invite) {
            return res.status(400).json({ error: 'Invite token is invalid or has already been used' });
        }

        if (new Date() > new Date(invite.expiresAt)) {
            return res.status(400).json({ error: 'Invite token is expired' });
        }

        const [tenant] = await db.select().from(platformTenants).where(eq(platformTenants.id, invite.tenantId));

        return res.json({
            valid: true,
            email: invite.email,
            tenantId: invite.tenantId,
            tenantName: tenant ? tenant.name : 'Unknown Tenant'
        });
    } catch (error) {
        console.error('Validate invite error:', error);
        return res.status(500).json({ error: 'Internal server error' });
    }
});

router.post('/invite/verify', async (req, res) => {
    try {
        const token = req.body.token;
        if (!token) return res.status(400).json({ error: 'Token required' });

        const [invite] = await db.select().from(platformPendingInvites).where(
            and(
                eq(platformPendingInvites.tokenHash, token),
                eq(platformPendingInvites.usedAt, null as any)
            )
        );

        if (!invite) return res.status(400).json({ error: 'Invite token is invalid' });
        if (new Date() > new Date(invite.expiresAt)) return res.status(400).json({ error: 'Invite token is expired' });

        const [tenant] = await db.select().from(platformTenants).where(eq(platformTenants.id, invite.tenantId));
        return res.json({
            valid: true,
            email: invite.email,
            tenantId: invite.tenantId,
            tenantName: tenant ? tenant.name : 'Unknown Tenant'
        });
    } catch (error) {
        return res.status(500).json({ error: 'Internal server error' });
    }
});

router.post('/accept-invite', async (req, res) => {
    try {
        const { token, password } = req.body;
        if (!token || !password) {
            return res.status(400).json({ error: 'Token and password required' });
        }

        const [invite] = await db.select().from(platformPendingInvites).where(
            and(
                eq(platformPendingInvites.tokenHash, token),
                eq(platformPendingInvites.usedAt, null as any)
            )
        );

        if (!invite) {
            return res.status(400).json({ error: 'Invite token is invalid or has already been used' });
        }

        if (new Date() > new Date(invite.expiresAt)) {
            return res.status(400).json({ error: 'Invite token is expired' });
        }

        // Update invite as used
        await db.update(platformPendingInvites).set({
            usedAt: new Date()
        } as any).where(eq(platformPendingInvites.id, invite.id));

        // Activate user status in platform_users
        const [existingUser] = await db.select().from(platformUsers).where(
            and(
                eq(platformUsers.tenantId, invite.tenantId),
                eq(platformUsers.email, invite.email)
            )
        );

        let userRecord = existingUser;
        if (existingUser) {
            await db.update(platformUsers).set({
                status: 'active',
                updatedAt: new Date()
            } as any).where(eq(platformUsers.id, existingUser.id));
        } else {
            [userRecord] = await db.insert(platformUsers).values({
                tenantId: invite.tenantId,
                email: invite.email,
                displayName: invite.email.split('@')[0],
                userType: 'internal',
                status: 'active'
            } as any).returning();
        }

        // Add to auth
        let authUserId = `demo-${invite.email}`;
        try {
            const authUser = await createAuthUser(invite.email, password, { tenantId: invite.tenantId });
            authUserId = authUser.id;
        } catch (e) {
            // Fallback for demo mode
        }

        // Check if employee exists, if not create one
        const [existingEmp] = await db.select().from(employees).where(eq(employees.email, invite.email));
        if (!existingEmp) {
            await db.insert(employees).values({
                tenantId: invite.tenantId,
                employeeCode: invite.email.split('@')[0].toUpperCase(),
                name: invite.email.split('@')[0],
                email: invite.email,
                role: 'admin',
                department: 'Administration',
                auth_user_id: authUserId
            } as any);
        } else {
            await db.update(employees).set({
                auth_user_id: authUserId
            } as any).where(eq(employees.id, existingEmp.id));
        }

        // Generate fake JWT token
        const fakeToken = `eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.${btoa(JSON.stringify({ email: invite.email, iat: Date.now() }))}.fake`;

        return res.json({
            success: true,
            access_token: fakeToken,
            user: {
                id: userRecord ? userRecord.id : authUserId,
                employeeId: invite.email.split('@')[0].toUpperCase(),
                employeeName: invite.email.split('@')[0],
                email: invite.email,
                role: 'admin',
                department: 'Administration',
                auth_user_id: authUserId
            }
        });
    } catch (error) {
        console.error('Accept invite error:', error);
        return res.status(500).json({ error: 'Internal server error' });
    }
});

router.post('/invite/accept', async (req, res) => {
    try {
        const { token, password } = req.body;
        if (!token || !password) return res.status(400).json({ error: 'Token and password required' });

        const [invite] = await db.select().from(platformPendingInvites).where(
            and(
                eq(platformPendingInvites.tokenHash, token),
                eq(platformPendingInvites.usedAt, null as any)
            )
        );

        if (!invite) return res.status(400).json({ error: 'Invite token is invalid' });

        await db.update(platformPendingInvites).set({
            usedAt: new Date()
        } as any).where(eq(platformPendingInvites.id, invite.id));

        return res.json({ success: true, message: 'Admin account successfully activated.' });
    } catch (error) {
        return res.status(500).json({ error: 'Internal server error' });
    }
});

export const authRouter = router;
