/**
 * Cleanup Job for Old Soft Deleted Records
 *
 * This job permanently deletes records that have been soft deleted
 * for more than a specified number of days (default: 90 days).
 *
 * Can be run manually or scheduled via cron/task scheduler.
 */

import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';

// Load environment variables
dotenv.config({ path: '../.env' });

// Tables to clean up
const TABLES_TO_CLEANUP = [
  'accounts',
  'columns',
  'configurations',
  'connections',
  'datasets',
  'environments',
  'invitations',
  'macros',
  'projects',
  'templates',
  'users',
  'workspaces'
];

// Default retention period (days)
const DEFAULT_RETENTION_DAYS = 90;

interface CleanupResult {
  table: string;
  deletedCount: number;
  success: boolean;
  error?: string;
}

/**
 * Clean up soft deleted records for a single table
 */
async function cleanupTable(
  supabase: ReturnType<typeof createClient>,
  tableName: string,
  retentionDays: number
): Promise<CleanupResult> {
  try {
    console.log(`[Cleanup] Processing table: ${tableName} (retention: ${retentionDays} days)`);

    const { data, error } = await supabase.rpc('cleanup_soft_deleted_records', {
      p_table_name: tableName,
      p_days_old: retentionDays
    });

    if (error) {
      console.error(`[Cleanup] Error cleaning ${tableName}:`, error);
      return {
        table: tableName,
        deletedCount: 0,
        success: false,
        error: error.message
      };
    }

    const deletedCount = data || 0;
    console.log(`[Cleanup] ✓ Cleaned ${tableName}: ${deletedCount} record(s) permanently deleted`);

    return {
      table: tableName,
      deletedCount,
      success: true
    };
  } catch (error: any) {
    console.error(`[Cleanup] Exception cleaning ${tableName}:`, error);
    return {
      table: tableName,
      deletedCount: 0,
      success: false,
      error: error.message
    };
  }
}

/**
 * Run cleanup job for all tables
 */
export async function runCleanupJob(retentionDays: number = DEFAULT_RETENTION_DAYS): Promise<{
  summary: {
    total: number;
    successful: number;
    failed: number;
    totalDeleted: number;
  };
  results: CleanupResult[];
}> {
  console.log('='.repeat(60));
  console.log('[Cleanup] Starting Soft Delete Cleanup Job');
  console.log(`[Cleanup] Retention Period: ${retentionDays} days`);
  console.log(`[Cleanup] Tables to Process: ${TABLES_TO_CLEANUP.length}`);
  console.log('='.repeat(60));

  // Initialize Supabase client
  if (!process.env.SUPABASE_URL || !process.env.SUPABASE_SERVICE_KEY) {
    throw new Error('Supabase credentials not configured');
  }

  const supabase = createClient(
    process.env.SUPABASE_URL,
    process.env.SUPABASE_SERVICE_KEY
  );

  const startTime = Date.now();
  const results: CleanupResult[] = [];

  // Process each table
  for (const table of TABLES_TO_CLEANUP) {
    const result = await cleanupTable(supabase, table, retentionDays);
    results.push(result);
  }

  const endTime = Date.now();
  const duration = ((endTime - startTime) / 1000).toFixed(2);

  // Calculate summary
  const summary = {
    total: results.length,
    successful: results.filter(r => r.success).length,
    failed: results.filter(r => !r.success).length,
    totalDeleted: results.reduce((sum, r) => sum + r.deletedCount, 0)
  };

  // Print summary
  console.log('='.repeat(60));
  console.log('[Cleanup] Job Complete');
  console.log(`[Cleanup] Duration: ${duration}s`);
  console.log(`[Cleanup] Tables Processed: ${summary.total}`);
  console.log(`[Cleanup] Successful: ${summary.successful}`);
  console.log(`[Cleanup] Failed: ${summary.failed}`);
  console.log(`[Cleanup] Total Records Permanently Deleted: ${summary.totalDeleted}`);
  console.log('='.repeat(60));

  // Print failures if any
  const failures = results.filter(r => !r.success);
  if (failures.length > 0) {
    console.log('\n[Cleanup] FAILURES:');
    failures.forEach(f => {
      console.log(`  - ${f.table}: ${f.error}`);
    });
  }

  // Print detailed results
  if (summary.totalDeleted > 0) {
    console.log('\n[Cleanup] DETAILED RESULTS:');
    results
      .filter(r => r.deletedCount > 0)
      .forEach(r => {
        console.log(`  - ${r.table}: ${r.deletedCount} record(s)`);
      });
  }

  return { summary, results };
}

/**
 * CLI entry point
 */
async function main() {
  const args = process.argv.slice(2);
  const retentionDays = args[0] ? parseInt(args[0], 10) : DEFAULT_RETENTION_DAYS;

  if (isNaN(retentionDays) || retentionDays < 1) {
    console.error('Error: Retention days must be a positive number');
    console.error('Usage: node cleanup-soft-deleted.js [retention_days]');
    console.error('Example: node cleanup-soft-deleted.js 90');
    process.exit(1);
  }

  try {
    const { summary } = await runCleanupJob(retentionDays);
    process.exit(summary.failed === 0 ? 0 : 1);
  } catch (error: any) {
    console.error('[Cleanup] Fatal error:', error);
    process.exit(1);
  }
}

// Run if called directly
if (require.main === module) {
  main();
}
