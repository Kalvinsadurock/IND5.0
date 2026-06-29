-- Migration: add auth_user_id column to employees
ALTER TABLE employees ADD COLUMN IF NOT EXISTS auth_user_id uuid;
