import mysql from "mysql2/promise";
import { readFileSync } from "node:fs";

const pool = mysql.createPool({
  host: "localhost",
  user: "root",
  password: "ShadowBella@home",
  port: 3307,
  database: "CampusSwap",
  multipleStatements: true,
});
const sql = readFileSync(
  new URL("./safehome-migration.sql", import.meta.url),
  "utf8",
);

try {
  await pool.query(sql);
  console.log("MIGRATION APPLIED");
  const [t] = await pool.query('SHOW TABLES LIKE "service_types"');
  const [s] = await pool.query('SHOW TABLES LIKE "services"');
  const [c] = await pool.query(
    'SHOW COLUMNS FROM service_provider_profiles LIKE "accepts_emergency"',
  );
  const [rows] = await pool.query("SELECT COUNT(*) AS n FROM service_types");
  console.log(
    "service_types:",
    t.length,
    "services:",
    s.length,
    "accepts_emergency:",
    c.length,
    "seeded service_types:",
    rows[0].n,
  );
} catch (e) {
  console.log("MIGRATION ERR:", e.message);
} finally {
  await pool.end();
}
