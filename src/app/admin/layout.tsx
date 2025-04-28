import { redirect } from 'next/navigation';
import { isAdmin } from '@/lib/auth-utils';
import { getSessionId } from '@/lib/auth-utils';

export const metadata = {
  title: 'TaskWise Admin',
  description: 'TaskWise administration dashboard',
};

export default async function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  // Check if user is admin server-side
  if (!await isAdmin()) {
    // If there's a session but not admin, redirect to home
    const sessionId = await getSessionId();
    if (sessionId) {
      redirect('/?error=admin_required');
    }
    // Otherwise redirect to login
    redirect('/login?returnUrl=/admin');
  }

  return (
    <div className="min-h-screen bg-background">
      {children}
    </div>
  );
} 