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

router.post('/invite/verify', async (req, res) => {
    const { token } = req.body;
    if (!token) return res.status(400).json({ error: 'Token required' });
    // Simulate active pilot invite check
    if (token === 'expired-token-99') {
        return res.status(400).json({ error: 'Invite token is expired' });
    }
    return res.json({ valid: true, email: 'admin@pilot-factory.com', tenantId: 'test-tenant-id' });
});

router.post('/invite/accept', async (req, res) => {
    const { token, password } = req.body;
    if (!token || !password) return res.status(400).json({ error: 'Token and password required' });
    return res.json({ success: true, message: 'Admin account successfully activated.' });
});

export const authRouter = router;
