'use client';

import { useAuth } from '@/components/providers';
import { usePathname } from 'next/navigation';
import { Sidebar } from './sidebar';

interface AppLayoutProps {
  children: React.ReactNode;
}

export function AppLayout({ children }: AppLayoutProps) {
  const { user, loading } = useAuth();
  const pathname = usePathname();

  // Pages that don't need the sidebar
  const publicPages = ['/auth/signin', '/auth/error', '/onboarding', '/'];

  const shouldShowSidebar = user && !publicPages.includes(pathname);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-100">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-600"></div>
      </div>
    );
  }

  if (shouldShowSidebar) {
    return <Sidebar>{children}</Sidebar>;
  }

  return <>{children}</>;
}