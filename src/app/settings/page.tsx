'use client';

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Settings } from 'lucide-react';

export default function SettingsPage() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
          <Settings className="h-6 w-6" />
          Settings
        </h1>
        <p className="text-gray-600">Manage your account and app preferences</p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Coming Soon</CardTitle>
          <CardDescription>
            Settings page is under development
          </CardDescription>
        </CardHeader>
        <CardContent>
          <p className="text-gray-600">
            This page will include account settings, category management, 
            notification preferences, and other customization options.
          </p>
        </CardContent>
      </Card>
    </div>
  );
}