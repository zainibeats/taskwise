import { NextResponse } from 'next/server';
import { getDbConnection } from '@/lib/db';
import { getUserFromSession } from '@/lib/auth-utils';
import bcrypt from 'bcrypt';

// User type
interface User {
  id: number;
  username: string;
  email: string;
  role: string;
  active: number;
  created_at?: string;
  last_login?: string;
  password_hash?: string;
}

// GET /api/admin/users/[id] - Get a specific user
export async function GET(req: Request, { params }: { params: { id: string } }) {
  try {
    // Verify admin status
    const sessionUser = await getUserFromSession(req);
    if (!sessionUser || sessionUser.role !== 'admin') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 403 });
    }

    const userId = parseInt(params.id, 10);
    if (isNaN(userId)) {
      return NextResponse.json({ error: 'Invalid user ID' }, { status: 400 });
    }

    const db = getDbConnection();
    const user = db.prepare(`
      SELECT id, username, email, role, active, created_at, last_login 
      FROM users
      WHERE id = ?
    `).get(userId) as User | undefined;

    if (!user) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }

    return NextResponse.json({ user });
  } catch (error) {
    console.error('Error fetching user:', error);
    return NextResponse.json({ error: 'Failed to fetch user' }, { status: 500 });
  }
}

// PUT /api/admin/users/[id] - Update a user
export async function PUT(req: Request, { params }: { params: { id: string } }) {
  try {
    // Verify admin status
    const sessionUser = await getUserFromSession(req);
    if (!sessionUser || sessionUser.role !== 'admin') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 403 });
    }

    const userId = parseInt(params.id, 10);
    if (isNaN(userId)) {
      return NextResponse.json({ error: 'Invalid user ID' }, { status: 400 });
    }

    const { username, email, role, active, password } = await req.json();

    // Validate minimal inputs
    if (!username || !email || !role) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
    }

    const db = getDbConnection();
    
    // Check if user exists
    const existingUser = db.prepare('SELECT id FROM users WHERE id = ?').get(userId) as { id: number } | undefined;
    if (!existingUser) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }

    // Check if username is already taken by another user
    const duplicateUser = db.prepare('SELECT id FROM users WHERE username = ? AND id != ?').get(username, userId) as { id: number } | undefined;
    if (duplicateUser) {
      return NextResponse.json({ error: 'Username already exists' }, { status: 409 });
    }

    // Prepare update fields
    const updateFields = ['username = ?', 'email = ?', 'role = ?', 'active = ?'];
    const updateParams: any[] = [username, email, role, active ? 1 : 0];

    // Add password hash if password provided
    if (password) {
      const passwordHash = await bcrypt.hash(password, 10);
      updateFields.push('password_hash = ?');
      updateParams.push(passwordHash);
    }

    // Add userId as the last parameter
    updateParams.push(userId);

    // Update user
    db.prepare(`
      UPDATE users
      SET ${updateFields.join(', ')}
      WHERE id = ?
    `).run(...updateParams);

    // Get updated user
    const updatedUser = db.prepare(`
      SELECT id, username, email, role, active, created_at, last_login 
      FROM users
      WHERE id = ?
    `).get(userId) as User;

    return NextResponse.json({ 
      success: true, 
      user: updatedUser
    });
  } catch (error) {
    console.error('Error updating user:', error);
    return NextResponse.json({ error: 'Failed to update user' }, { status: 500 });
  }
}

// DELETE /api/admin/users/[id] - Delete or deactivate a user
export async function DELETE(req: Request, { params }: { params: { id: string } }) {
  try {
    // Verify admin status
    const sessionUser = await getUserFromSession(req);
    if (!sessionUser || sessionUser.role !== 'admin') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 403 });
    }

    const userId = parseInt(params.id, 10);
    if (isNaN(userId)) {
      return NextResponse.json({ error: 'Invalid user ID' }, { status: 400 });
    }

    // Check for permanent delete query param
    const url = new URL(req.url);
    const permanent = url.searchParams.get('permanent') === 'true';

    const db = getDbConnection();
    
    // Check if user exists
    const existingUser = db.prepare('SELECT id, role FROM users WHERE id = ?').get(userId) as { id: number, role: string } | undefined;
    if (!existingUser) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }

    // Prevent deleting the last admin
    if (existingUser.role === 'admin') {
      const adminCount = db.prepare('SELECT COUNT(*) as count FROM users WHERE role = "admin"').get() as { count: number };
      if (adminCount.count <= 1) {
        return NextResponse.json({ error: 'Cannot delete the last admin user' }, { status: 400 });
      }
    }

    // Cannot delete yourself
    if (existingUser.id === sessionUser.id) {
      return NextResponse.json({ error: 'Cannot delete your own account' }, { status: 400 });
    }

    if (permanent) {
      // Permanent delete
      db.prepare('DELETE FROM users WHERE id = ?').run(userId);
    } else {
      // Soft delete (deactivate)
      db.prepare('UPDATE users SET active = 0 WHERE id = ?').run(userId);
    }

    return NextResponse.json({ 
      success: true, 
      message: permanent ? 'User permanently deleted' : 'User deactivated'
    });
  } catch (error) {
    console.error('Error deleting user:', error);
    return NextResponse.json({ error: 'Failed to delete user' }, { status: 500 });
  }
} 