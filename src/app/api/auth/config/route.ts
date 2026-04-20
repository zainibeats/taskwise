import { NextResponse } from 'next/server';
import getDbConnection from '@/lib/db';

export async function GET() {
  try {
    const db = getDbConnection();
    const config = db.prepare('SELECT password_hash FROM app_config WHERE id = 1').get() as { password_hash: string | null } | null;
    return NextResponse.json({ passwordSet: !!(config?.password_hash) });
  } catch {
    return NextResponse.json({ passwordSet: false });
  }
}
