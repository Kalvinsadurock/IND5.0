import { db } from '../db';
import { sql } from 'drizzle-orm';

async function migrateCheckpointsTable() {
    console.log('🔧 Migrating control_checkpoints table...');

    try {
        // Add new columns to control_checkpoints table
        await db.execute(sql`
      ALTER TABLE control_checkpoints 
      ADD COLUMN IF NOT EXISTS process_step VARCHAR(50),
      ADD COLUMN IF NOT EXISTS name TEXT,
      ADD COLUMN IF NOT EXISTS method VARCHAR(200),
      ADD COLUMN IF NOT EXISTS verified_by VARCHAR(50),
      ADD COLUMN IF NOT EXISTS requires_qa_validation BOOLEAN DEFAULT FALSE,
      ADD COLUMN IF NOT EXISTS sample_size VARCHAR(100),
      ADD COLUMN IF NOT EXISTS reaction_plan TEXT;
    `);

        console.log('✅ Migration completed successfully');
    } catch (error) {
        console.error('❌ Migration failed:', error);
        throw error;
    }
}

migrateCheckpointsTable()
    .then(() => {
        console.log('✅ All migrations applied');
        process.exit(0);
    })
    .catch((error) => {
        console.error('❌ Migration script failed:', error);
        process.exit(1);
    });
