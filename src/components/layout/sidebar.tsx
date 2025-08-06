'use client';

import { useState } from 'react';
import { useRouter, usePathname } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { useAuth } from '@/components/providers';
import { 
  TrendingUp, 
  TrendingDown, 
  Home, 
  Upload, 
  Settings, 
  LogOut,
  Menu,
  X
} from 'lucide-react';

const navigation = [
  { name: 'Dashboard', href: '/dashboard', icon: Home },
  { name: 'Income', href: '/income', icon: TrendingUp },
  { name: 'Expenses', href: '/expenses', icon: TrendingDown },
  { name: 'Import', href: '/import', icon: Upload },
  { name: 'Settings', href: '/settings', icon: Settings },
];

interface SidebarProps {
  children: React.ReactNode;
}

export function Sidebar({ children }: SidebarProps) {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const router = useRouter();
  const pathname = usePathname();
  const { user, signOut } = useAuth();

  const handleSignOut = async () => {
    await signOut();
    router.push('/auth/signin');
  };

  return (
    <div className="flex h-screen bg-gray-100">
      {/* Mobile sidebar */}
      <div className={`
        fixed inset-0 flex z-40 md:hidden
        ${sidebarOpen ? 'pointer-events-auto' : 'pointer-events-none'}
      `}>
        <div className={`
          fixed inset-0 bg-gray-600 bg-opacity-75 transition-opacity
          ${sidebarOpen ? 'opacity-100' : 'opacity-0'}
        `} onClick={() => setSidebarOpen(false)} />
        
        <div className={`
          relative flex-1 flex flex-col max-w-xs w-full bg-white transform transition
          ${sidebarOpen ? 'translate-x-0' : '-translate-x-full'}
        `}>
          <div className="absolute top-0 right-0 -mr-12 pt-2">
            <button
              onClick={() => setSidebarOpen(false)}
              className="ml-1 flex items-center justify-center h-10 w-10 rounded-full focus:outline-none focus:ring-2 focus:ring-inset focus:ring-white"
            >
              <X className="h-6 w-6 text-white" />
            </button>
          </div>
          
          <SidebarContent 
            navigation={navigation} 
            pathname={pathname} 
            router={router}
            user={user}
            onSignOut={handleSignOut}
            onLinkClick={() => setSidebarOpen(false)}
          />
        </div>
        
        <div className="flex-shrink-0 w-14" />
      </div>

      {/* Desktop sidebar */}
      <div className="hidden md:flex md:flex-shrink-0">
        <div className="flex flex-col w-64">
          <SidebarContent 
            navigation={navigation} 
            pathname={pathname} 
            router={router}
            user={user}
            onSignOut={handleSignOut}
          />
        </div>
      </div>

      {/* Main content */}
      <div className="flex flex-col w-0 flex-1 overflow-hidden">
        {/* Mobile header */}
        <div className="md:hidden pl-1 pt-1 sm:pl-3 sm:pt-3">
          <button
            onClick={() => setSidebarOpen(true)}
            className="-ml-0.5 -mt-0.5 h-12 w-12 inline-flex items-center justify-center rounded-md text-gray-500 hover:text-gray-900 focus:outline-none focus:ring-2 focus:ring-inset focus:ring-purple-500"
          >
            <Menu className="h-6 w-6" />
          </button>
        </div>
        
        {/* Page content */}
        <main className="flex-1 relative overflow-y-auto focus:outline-none">
          <div className="py-6">
            <div className="max-w-7xl mx-auto px-4 sm:px-6 md:px-8">
              {children}
            </div>
          </div>
        </main>
      </div>
    </div>
  );
}

interface SidebarContentProps {
  navigation: Array<{ name: string; href: string; icon: any }>;
  pathname: string;
  router: any;
  user: any;
  onSignOut: () => void;
  onLinkClick?: () => void;
}

function SidebarContent({ navigation, pathname, router, user, onSignOut, onLinkClick }: SidebarContentProps) {
  return (
    <div className="flex flex-col h-0 flex-1 border-r border-gray-200 bg-white">
      {/* Logo */}
      <div className="flex-1 flex flex-col pt-5 pb-4 overflow-y-auto">
        <div className="flex items-center flex-shrink-0 px-4">
          <div className="flex items-center">
            <div className="text-2xl font-bold text-purple-600">💸</div>
            <h1 className="ml-2 text-xl font-bold text-gray-900">Budget Bop</h1>
          </div>
        </div>
        
        {/* Navigation */}
        <nav className="mt-8 flex-1 px-2 space-y-1">
          {navigation.map((item) => {
            const Icon = item.icon;
            const isActive = pathname === item.href;
            
            return (
              <button
                key={item.name}
                onClick={() => {
                  router.push(item.href);
                  onLinkClick?.();
                }}
                className={`
                  group flex items-center px-2 py-2 text-sm font-medium rounded-md w-full text-left
                  ${isActive 
                    ? 'bg-purple-100 text-purple-900' 
                    : 'text-gray-600 hover:bg-gray-50 hover:text-gray-900'
                  }
                `}
              >
                <Icon
                  className={`
                    mr-3 h-5 w-5 flex-shrink-0
                    ${isActive ? 'text-purple-500' : 'text-gray-400 group-hover:text-gray-500'}
                  `}
                />
                {item.name}
              </button>
            );
          })}
        </nav>
      </div>
      
      {/* User section */}
      <div className="flex-shrink-0 flex border-t border-gray-200 p-4">
        <div className="flex items-center w-full">
          <div className="flex-1">
            <p className="text-sm font-medium text-gray-700">
              {user?.email}
            </p>
            <p className="text-xs text-gray-500">
              Signed in
            </p>
          </div>
          <Button
            variant="ghost"
            size="sm"
            onClick={onSignOut}
            className="ml-2"
          >
            <LogOut className="h-4 w-4" />
          </Button>
        </div>
      </div>
    </div>
  );
}