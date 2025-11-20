import { NextResponse } from 'next/server';
import sql from '@/lib/db';

export async function GET() {
  try {
    // Test connection
    const result = await sql`SELECT NOW() as current_time, version() as pg_version`;
    
    // Check if users table exists
    const tableCheck = await sql`
      SELECT EXISTS (
        SELECT FROM information_schema.tables 
        WHERE table_schema = 'public' 
        AND table_name = 'users'
      ) as table_exists
    `;

    return NextResponse.json({
      success: true,
      database: {
        connected: true,
        currentTime: result[0].current_time,
        pgVersion: result[0].pg_version,
        usersTableExists: tableCheck[0].table_exists,
      },
    });
  } catch (error) {
    console.error('Database test error:', error);
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    const errorStack = error instanceof Error ? error.stack : undefined;
    
    return NextResponse.json(
      {
        success: false,
        error: errorMessage,
        stack: process.env.NODE_ENV === 'development' ? errorStack : undefined,
      },
      { status: 500 }
    );
  }
}

