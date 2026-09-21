import mysql from "mysql2/promise";

const pool = mysql.createPool({
  host: "localhost",
  user: "root",
  password: "ShadowBella@home",
  port: 3307,
  database: "CampusSwap",
  multipleStatements: true,
});

const q = async (sql) => {
  try {
    const [r] = await pool.query(sql);
    return r;
  } catch (e) {
    return `ERR: ${e.message}`;
  }
};

try {
  console.log(
    "TABLES:",
    (await q("SHOW TABLES"))
      .map((r) => Object.values(r)[0])
      .sort()
      .join(", "),
  );
  console.log(
    "USERS COLS:",
    (await q("SHOW COLUMNS FROM users"))
      .map((c) => `${c.Field}:${c.Key}`)
      .join(", "),
  );
  console.log(
    "SPP EXISTS:",
    JSON.stringify(await q('SHOW TABLES LIKE "service_provider_profiles"')),
  );
  console.log(
    "SPP COLS:",
    (await q("SHOW COLUMNS FROM service_provider_profiles"))
      .map((c) => c.Field)
      .join(", "),
  );
} finally {
  await pool.end();
}
