import { NextRequest, NextResponse } from 'next/server';
import { userNeedsPasswordSetup } from '@/lib/user-config';

export async function GET(req: NextRequest) {
  try {
    // Get username from query parameter
    const { searchParams } = new URL(req.url);
    const username = searchParams.get('username');
    
    if (!username) {
      return NextResponse.json(
        { error: 'Username is required' },
        { status: 400 }
      );
    }
    
    // Check if user needs password setup
    const needsSetup = userNeedsPasswordSetup(username);
    
    return NextResponse.json({
      needsSetup,
    });
  } catch (error) {
    console.error('Password needed check error:', error);
    return NextResponse.json(
      { error: 'An error occurred' },
      { status: 500 }
    );
  }
} 