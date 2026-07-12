const { pool } = require('./index');
const bcrypt = require('bcryptjs');

async function diagnose() {
  console.log('--- Auth Diagnostics ---');
  try {
    const res = await pool.query('SELECT * FROM employees WHERE email = $1', ['admin@assetflow.com']);
    if (res.rows.length === 0) {
      console.log('❌ ERROR: User admin@assetflow.com was NOT found in the database. (Tables might have seeded in a different database or db:init did not write to this DB)');
      return;
    }

    const user = res.rows[0];
    console.log('✅ Success: User found in database.');
    console.log(`- ID: ${user.id}`);
    console.log(`- Email: ${user.email}`);
    console.log(`- Role: ${user.role}`);
    console.log(`- Status: ${user.status}`);
    console.log(`- Hash in DB: ${user.password_hash}`);

    // Verify password123 against hash
    const isMatch = await bcrypt.compare('password123', user.password_hash);
    console.log(`- password123 match test result: ${isMatch ? '✅ MATCHES' : '❌ DOES NOT MATCH'}`);

    if (!isMatch) {
      // Let's generate a fresh hash for password123 and test
      const salt = await bcrypt.genSalt(10);
      const testHash = await bcrypt.hash('password123', salt);
      console.log(`- Generated fresh hash for comparison: ${testHash}`);
      const testMatch = await bcrypt.compare('password123', testHash);
      console.log(`- Fresh hash comparison match test: ${testMatch ? '✅ MATCHES' : '❌ DOES NOT MATCH'}`);
    }
  } catch (error) {
    console.error('❌ Database query failed:', error.message);
  } finally {
    await pool.end();
  }
}

diagnose();
