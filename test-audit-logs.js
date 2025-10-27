// Test script to check audit logs and reference numbers
const { Pool } = require('pg');

const pool = new Pool({
  connectionString: process.env.DATABASE_URL || 'postgresql://postgres:password@localhost:5432/brgyexpress'
});

async function testAuditLogs() {
  try {
    console.log('🔍 Testing audit logs...');
    
    // Check if audit_logs table exists
    const tableExists = await pool.query("SELECT EXISTS (SELECT FROM information_schema.tables WHERE table_name = 'audit_logs')");
    console.log('📋 audit_logs table exists:', tableExists.rows[0].exists);
    
    if (tableExists.rows[0].exists) {
      // Get total count
      const countResult = await pool.query("SELECT COUNT(*) FROM audit_logs");
      console.log('📊 Total audit logs:', countResult.rows[0].count);
      
      // Get recent audit logs with Update actions
      const recentLogs = await pool.query(`
        SELECT action, details, timestamp 
        FROM audit_logs 
        WHERE action LIKE '%Update%' 
        ORDER BY timestamp DESC 
        LIMIT 5
      `);
      
      console.log('\n📝 Recent Update audit logs:');
      recentLogs.rows.forEach((log, i) => {
        console.log(`\n--- Log ${i + 1} ---`);
        console.log('Action:', log.action);
        console.log('Timestamp:', log.timestamp);
        try {
          const details = JSON.parse(log.details);
          console.log('Details structure:', Object.keys(details));
          console.log('Reference Number:', details.referenceNumber);
          console.log('Response data:', details.response ? Object.keys(details.response) : 'No response data');
          if (details.response && details.response.reference_number) {
            console.log('Response reference_number:', details.response.reference_number);
          }
        } catch (e) {
          console.log('Details (raw):', log.details);
        }
      });
    }
    
  } catch (error) {
    console.error('❌ Error:', error.message);
  } finally {
    await pool.end();
  }
}

testAuditLogs();


