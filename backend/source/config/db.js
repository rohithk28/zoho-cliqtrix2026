import pkg from 'pg';
const { Pool } = pkg;

let pool;

// Render Production
if (process.env.DATABASE_URL) {
  pool = new Pool({
    connectionString: process.env.DATABASE_URL,
    ssl: { rejectUnauthorized: false }
  });
  console.log("🟢 Using Render DATABASE_URL");
} else {
  // Local Development
  pool = new Pool({
    user: process.env.DB_USER || "postgres",
    host: process.env.DB_HOST || "localhost",
    database: process.env.DB_NAME || "cliq_extension_db",
    password: process.env.DB_PASS || "postgre",
    port: process.env.DB_PORT || 5432
  });
  console.log("🟡 Using local DB config");
}

export default pool;
