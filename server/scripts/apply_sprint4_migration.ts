import "dotenv/config";
import fs from "node:fs";
import path from "node:path";
import pg from "pg";

async function main() {
  if (!process.env.DATABASE_URL) {
    throw new Error("DATABASE_URL is required");
  }

  const migrationPath = path.join(process.cwd(), "server", "migrations", "002-sprint4-operational-glue.sql");
  const sql = fs.readFileSync(migrationPath, "utf8");
  const client = new pg.Client({ connectionString: process.env.DATABASE_URL });

  await client.connect();
  try {
    await client.query("BEGIN");
    await client.query(sql);
    await client.query("COMMIT");
    console.log("Sprint 4 migration applied");
  } catch (error) {
    await client.query("ROLLBACK");
    throw error;
  } finally {
    await client.end();
  }
}

main().catch((error) => {
  console.error("Sprint 4 migration failed");
  console.error(error);
  process.exit(1);
});
