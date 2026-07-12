const fs = require('fs');
const path = require('path');
const { pool } = require('./index');

async function initializeDatabase() {
  console.log('🔄 Starting database initialization for AssetFlow...');
  let client;
  try {
    client = await pool.connect();
    console.log('🔌 Database connected successfully.');

    // 1. Read and execute schema.sql
    const schemaPath = path.join(__dirname, 'schema.sql');
    console.log(`📖 Reading schema file from: ${schemaPath}`);
    const schemaSql = fs.readFileSync(schemaPath, 'utf8');
    
    console.log('🛠️ Creating database tables (running schema.sql)...');
    await client.query(schemaSql);
    console.log('✅ Tables created successfully.');

    // 2. Read and execute seed.sql
    const seedPath = path.join(__dirname, 'seed.sql');
    console.log(`📖 Reading seed file from: ${seedPath}`);
    const seedSql = fs.readFileSync(seedPath, 'utf8');
    
    console.log('🌱 Seeding database with mock records (running seed.sql)...');
    await client.query(seedSql);
    console.log('✅ Mock data seeded successfully!');

    console.log('🎉 PostgreSQL Database is fully set up and ready to use!');
  } catch (error) {
    console.error('❌ Database initialization failed:');
    console.error(error.message);
    if (error.hint) console.error(`Hint: ${error.hint}`);
    if (error.position) console.error(`Position: ${error.position}`);
  } finally {
    if (client) {
      client.release();
    }
    // End the pool so the Node process can terminate
    await pool.end();
    console.log('💤 Database connection closed.');
  }
}

// Run the script
initializeDatabase();
