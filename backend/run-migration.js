const { Pool } = require('pg');
require('dotenv').config();

// Database connection
const pool = new Pool({
    connectionString: process.env.DATABASE_URL,
    ssl: process.env.NODE_ENV === 'production' ? { rejectUnauthorized: false } : false
});

async function runMigration() {
    const client = await pool.connect();
    
    try {
        console.log('🚀 Starting database migration...');
        
        // Add status column to admins table
        console.log('📝 Adding status column...');
        await client.query(`
            ALTER TABLE admins ADD COLUMN IF NOT EXISTS status VARCHAR(20) DEFAULT 'active'
        `);
        
        // Update existing admins to have 'active' status
        console.log('🔄 Updating existing admins...');
        await client.query(`
            UPDATE admins SET status = 'active' WHERE status IS NULL
        `);
        
        // Create unique index to ensure only one active super admin at a time
        console.log('🔒 Creating unique constraint for super admin...');
        await client.query(`
            CREATE UNIQUE INDEX IF NOT EXISTS only_one_super_admin
            ON admins ((CASE WHEN role = 'super_admin' AND status = 'active' THEN 1 END))
        `);
        
        // Add check constraint to ensure status is either 'active' or 'disabled'
        console.log('✅ Adding status constraint...');
        await client.query(`
            ALTER TABLE admins ADD CONSTRAINT check_status 
            CHECK (status IN ('active', 'disabled'))
        `);
        
        // Create a function to handle super admin transitions
        console.log('⚙️ Creating super admin transition function...');
        await client.query(`
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
            $$ LANGUAGE plpgsql
        `);
        
        // Create trigger to automatically handle super admin transitions
        console.log('🎯 Creating super admin transition trigger...');
        await client.query(`
            DROP TRIGGER IF EXISTS super_admin_transition_trigger ON admins
        `);
        await client.query(`
            CREATE TRIGGER super_admin_transition_trigger
                BEFORE INSERT OR UPDATE ON admins
                FOR EACH ROW
                EXECUTE FUNCTION handle_super_admin_transition()
        `);
        
        // Insert a default super admin if none exists
        console.log('👑 Creating default super admin...');
        await client.query(`
            INSERT INTO admins (username, password, full_name, role, status)
            SELECT 'superadmin', '$2b$10$92IXUNpkjO0rOQ5byMi.Ye4oKoEa3Ro9llC/.og/at2.uheWG/igi', 'Super Administrator', 'super_admin', 'active'
            WHERE NOT EXISTS (
                SELECT 1 FROM admins WHERE role = 'super_admin' AND status = 'active'
            )
        `);
        
        console.log('✅ Migration completed successfully!');
        console.log('🔑 Default super admin credentials:');
        console.log('   Username: superadmin');
        console.log('   Password: password');
        console.log('⚠️  Please change the default password immediately!');
        
    } catch (error) {
        console.error('❌ Migration failed:', error.message);
        throw error;
    } finally {
        client.release();
        await pool.end();
    }
}

// Run the migration
runMigration()
    .then(() => {
        console.log('🎉 Database migration completed successfully!');
        process.exit(0);
    })
    .catch((error) => {
        console.error('💥 Migration failed:', error);
        process.exit(1);
    });
