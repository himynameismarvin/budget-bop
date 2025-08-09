'use client';

import { cn } from '@/lib/utils';

export type ViewPeriod = 'month' | 'year' | 'all';

interface PeriodTabsProps {
  value: ViewPeriod;
  onChange: (value: ViewPeriod) => void;
  className?: string;
}

export function PeriodTabs({ value, onChange, className }: PeriodTabsProps) {
  const tabs: { value: ViewPeriod; label: string }[] = [
    { value: 'month', label: 'Month' },
    { value: 'year', label: 'Year' },
    { value: 'all', label: 'All' }
  ];

  return (
    <div className={cn("flex items-center", className)}>
      <div className="flex bg-gray-100 rounded-lg p-1">
        {tabs.map((tab) => (
          <button
            key={tab.value}
            onClick={() => onChange(tab.value)}
            className={cn(
              "px-4 py-2 text-sm font-medium rounded-md transition-colors",
              "hover:text-gray-900",
              value === tab.value
                ? "bg-white text-gray-900 shadow-sm"
                : "text-gray-600 hover:bg-gray-50"
            )}
          >
            {tab.label}
          </button>
        ))}
      </div>
    </div>
  );
}