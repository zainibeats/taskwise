import { NextResponse } from 'next/server';
import { getDbConnection } from '@/lib/db';
import { getUserFromSession } from '@/lib/auth-utils';
import bcrypt from 'bcrypt';

// GET /api/admin/users - Get all users
export async function GET(req: Request) {
  try {
    // Verify admin status
    const sessionUser = await getUserFromSession(req);
    if (!sessionUser || sessionUser.role !== 'admin') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 403 });
    }

    const db = getDbConnection();
    const users = db.prepare(`
      SELECT id, username, email, role, active, created_at, last_login 
      FROM users
      ORDER BY username
    `).all();

    return NextResponse.json({ users });
  } catch (error) {
    console.error('Error fetching users:', error);
    return NextResponse.json({ error: 'Failed to fetch users' }, { status: 500 });
  }
}

// POST /api/admin/users - Create a new user
export async function POST(req: Request) {
  try {
    // Verify admin status
    const sessionUser = await getUserFromSession(req);
    if (!sessionUser || sessionUser.role !== 'admin') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 403 });
    }

    const { username, email, role, active, password } = await req.json();

    // Validate inputs
    if (!username || !email || !role) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
    }

    // Check for existing user
    const db = getDbConnection();
    const existingUser = db.prepare('SELECT id FROM users WHERE username = ?').get(username);
    if (existingUser) {
      return NextResponse.json({ error: 'Username already exists' }, { status: 409 });
    }

    // Hash password if provided
    let passwordHash = null;
    if (password) {
      passwordHash = await bcrypt.hash(password, 10);
    }

    // Insert user
    const result = db.prepare(`
      INSERT INTO users (username, email, role, active, password_hash)
      VALUES (?, ?, ?, ?, ?)
    `).run(username, email, role, active ? 1 : 0, passwordHash);

    return NextResponse.json({ 
      success: true, 
      userId: result.lastInsertRowid,
      user: {
        id: result.lastInsertRowid,
        username,
        email,
        role,
        active: active ? 1 : 0
      }
    }, { status: 201 });
  } catch (error) {
    console.error('Error creating user:', error);
    return NextResponse.json({ error: 'Failed to create user' }, { status: 500 });
  }
} 