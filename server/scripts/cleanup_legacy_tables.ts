
import { db } from "../db";
import { sql } from "drizzle-orm";

async function cleanupLegacyTables() {
    console.log("Starting legacy table cleanup...");

    try {
        // We use sql.raw to execute the drop commands since these tables are no longer in our schema
        await db.execute(sql.raw(`
      BEGIN;
        -- Drop dependent tables first
        DROP TABLE IF EXISTS legacy_material_usage CASCADE;
        DROP TABLE IF EXISTS legacy_material_process_intent CASCADE;
        DROP TABLE IF EXISTS legacy_kit_consumption CASCADE;
        DROP TABLE IF EXISTS legacy_kit_balances CASCADE;
        
        -- Drop main legacy tables
        DROP TABLE IF EXISTS legacy_process_execution CASCADE;
        DROP TABLE IF EXISTS legacy_material_master CASCADE;
        DROP TABLE IF EXISTS legacy_kits CASCADE;
        
        -- Also try dropping non-legacy names just in case, but IF EXISTS ensures safety
        DROP TABLE IF EXISTS material_usage CASCADE;
        DROP TABLE IF EXISTS material_process_intent CASCADE;
        DROP TABLE IF EXISTS kit_consumption CASCADE;
        DROP TABLE IF EXISTS kit_balances CASCADE;
        DROP TABLE IF EXISTS process_execution CASCADE;
        DROP TABLE IF EXISTS material_master CASCADE;
        DROP TABLE IF EXISTS kits CASCADE;
      COMMIT;
    `));

        console.log("✅ Successfully dropped legacy tables.");
    } catch (error) {
        console.error("❌ Failed to drop tables:", error);
        process.exit(1);
    }
}

cleanupLegacyTables();
