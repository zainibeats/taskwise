import { NextRequest, NextResponse } from 'next/server';
import bcrypt from 'bcrypt';
import getDbConnection from '@/lib/db';
import { isFirstTimeSetup } from '@/lib/setup-check';
import { createSession } from '@/lib/session';
import { User } from '@/lib/user-config';

export async function POST(req: NextRequest) {
  try {
    // Check if we're in first-time setup mode
    if (!isFirstTimeSetup()) {
      return NextResponse.json(
        { error: 'Setup already completed' },
        { status: 400 }
      );
    }

    // Parse request body
    const { username, password } = await req.json();
    
    if (!username || !password) {
      return NextResponse.json(
        { error: 'Username and password are required' },
        { status: 400 }
      );
    }
    
    // Hash password
    const saltRounds = 10;
    const passwordHash = await bcrypt.hash(password, saltRounds);
    
    // Insert admin user
    const db = getDbConnection();
    const result = db.prepare(`
      INSERT INTO users (username, password_hash, role, active, email)
      VALUES (?, ?, ?, ?, ?)
    `).run(username, passwordHash, 'admin', 1, null);
    
    // Get the created user
    const user = db.prepare('SELECT * FROM users WHERE id = ?').get(result.lastInsertRowid) as User;
    
    // Create session
    const sessionId = createSession(user);
    
    // Set cookie expiration (24 hours)
    const expires = new Date(Date.now() + 24 * 60 * 60 * 1000);
    
    // Create response with session ID
    const response = NextResponse.json({ 
      success: true,
      sessionId, // Include sessionId in the response
      user: {
        id: user.id,
        username: user.username,
        role: user.role
      }
    });
    
    // Set the session cookie directly in the response
    response.cookies.set({
      name: 'taskwise_session',
      value: sessionId,
      expires,
      path: '/',
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
    });
    
    return response;
  } catch (error) {
    console.error('Setup admin error:', error);
    return NextResponse.json(
      { error: 'An error occurred during setup' },
      { status: 500 }
    );
  }
} 