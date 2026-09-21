import mysql from "mysql2/promise";

const pool = mysql.createPool({
  host: "localhost",
  user: "root",
  password: "ShadowBella@home",
  port: 3307,
  database: "CampusSwap",
});

try {
  const [tables] = await pool.query("SHOW TABLES");
  console.log(
    "TABLES:",
    tables
      .map((r) => Object.values(r)[0])
      .sort()
      .join(", "),
  );
  try {
    const [cols] = await pool.query(
      "SHOW COLUMNS FROM service_provider_profiles",
    );
    console.log("SPP COLUMNS:", cols.map((c) => c.Field).join(", "));
  } catch (e) {
    console.log("service_provider_profiles missing:", e.message);
  }
  try {
    const [st] = await pool.query("SELECT COUNT(*) AS n FROM service_types");
    console.log("service_types rows:", st[0].n);
  } catch (e) {
    console.log("service_types missing:", e.message);
  }
} catch (e) {
  console.log("ERR", e.message);
} finally {
  await pool.end();
}
