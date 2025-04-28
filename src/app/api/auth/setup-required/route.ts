import { NextResponse } from 'next/server';
import { isFirstTimeSetup } from '@/lib/setup-check';

export async function GET() {
  try {
    // Check if first-time setup is required
    const setupRequired = isFirstTimeSetup();
    
    return NextResponse.json({
      setupRequired
    });
  } catch (error) {
    console.error('Setup required check error:', error);
    return NextResponse.json(
      { error: 'An error occurred', setupRequired: true },
      { status: 500 }
    );
  }
} 