-- Admin Management Setup Script
-- This script adds the status column and enforces the single super admin rule

-- Add status column to admins table
ALTER TABLE admins ADD COLUMN IF NOT EXISTS status VARCHAR(20) DEFAULT 'active';

-- Update existing admins to have 'active' status
UPDATE admins SET status = 'active' WHERE status IS NULL;

-- Create unique index to ensure only one active super admin at a time
CREATE UNIQUE INDEX IF NOT EXISTS only_one_super_admin
ON admins ((CASE WHEN role = 'super_admin' AND status = 'active' THEN 1 END));

-- Add check constraint to ensure status is either 'active' or 'disabled'
ALTER TABLE admins ADD CONSTRAINT check_status 
CHECK (status IN ('active', 'disabled'));

-- Create a function to handle super admin transitions
CREATE OR REPLACE FUNCTION handle_super_admin_transition()
RETURNS TRIGGER AS $$
BEGIN
    -- If we're inserting/updating a super_admin with active status
    IF NEW.role = 'super_admin' AND NEW.status = 'active' THEN
        -- Disable all other super admins
        UPDATE admins 
        SET status = 'disabled' 
        WHERE role = 'super_admin' 
        AND status = 'active' 
        AND id != NEW.id;
    END IF;
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger to automatically handle super admin transitions
DROP TRIGGER IF EXISTS super_admin_transition_trigger ON admins;
CREATE TRIGGER super_admin_transition_trigger
    BEFORE INSERT OR UPDATE ON admins
    FOR EACH ROW
    EXECUTE FUNCTION handle_super_admin_transition();

-- Insert a default super admin if none exists
INSERT INTO admins (username, password, full_name, role, status)
SELECT 'superadmin', '$2b$10$92IXUNpkjO0rOQ5byMi.Ye4oKoEa3Ro9llC/.og/at2.uheWG/igi', 'Super Administrator', 'super_admin', 'active'
WHERE NOT EXISTS (
    SELECT 1 FROM admins WHERE role = 'super_admin' AND status = 'active'
);

-- Note: The password above is 'password' hashed with bcrypt
-- In production, use a strong password and update it immediately
