/**
 * Database Initialization API Route
 *
 * Initializes the database on first load.
 * This should be called once when the application starts.
 */

import { NextRequest, NextResponse } from 'next/server';
import { initializeDatabase, getDatabaseStats, isDatabaseHealthy } from '@/lib/db/dal';

let initialized = false;

export async function GET(request: NextRequest) {
  try {
    if (!initialized) {
      initializeDatabase();
      initialized = true;
    }

    const stats = getDatabaseStats();
    const healthy = isDatabaseHealthy();

    return NextResponse.json({
      success: true,
      initialized: true,
      healthy,
      stats: {
        path: stats.path,
        tables: stats.tables,
        healthy: stats.healthy,
      },
    });
  } catch (error) {
    console.error('Database initialization error:', error);
    return NextResponse.json(
      { error: 'Failed to initialize database', details: String(error) },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  // Force re-initialization (for development)
  try {
    initializeDatabase();
    initialized = true;

    return NextResponse.json({
      success: true,
      message: 'Database initialized successfully',
    });
  } catch (error) {
    console.error('Database initialization error:', error);
    return NextResponse.json(
      { error: 'Failed to initialize database', details: String(error) },
      { status: 500 }
    );
  }
}
