'use client';

import * as React from "react";
import { ChevronLeftIcon, ChevronRightIcon } from "@radix-ui/react-icons";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

interface MonthYearPickerProps {
  value: string; // YYYY-MM format
  onChange: (value: string) => void;
  className?: string;
}

export function MonthYearPicker({ 
  value, 
  onChange, 
  className 
}: MonthYearPickerProps) {
  
  // Parse current value or use current date
  const currentDate = React.useMemo(() => {
    if (value && value.includes('-')) {
      const [year, month] = value.split('-').map(Number);
      return { year, month };
    }
    const now = new Date();
    return { year: now.getFullYear(), month: now.getMonth() + 1 };
  }, [value]);

  const [displayYear, setDisplayYear] = React.useState(currentDate.year);
  
  // Update displayYear when currentDate changes
  React.useEffect(() => {
    setDisplayYear(currentDate.year);
  }, [currentDate.year]);

  // Month names for display
  const monthNames = [
    'Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun',
    'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'
  ];

  const handleMonthClick = (month: number) => {
    const monthStr = month.toString().padStart(2, '0');
    onChange(`${displayYear}-${monthStr}`);
  };

  const handleYearChange = (direction: 'prev' | 'next') => {
    setDisplayYear(prev => direction === 'prev' ? prev - 1 : prev + 1);
  };

  const isSelectedMonth = (month: number) => {
    return currentDate.year === displayYear && currentDate.month === month;
  };

  return (
    <div className={cn("p-4 w-72", className)}>
      {/* Year Navigation */}
      <div className="flex items-center justify-between mb-4">
        <Button
          variant="outline"
          size="sm"
          onClick={() => handleYearChange('prev')}
          className="h-8 w-8 p-0"
        >
          <ChevronLeftIcon className="h-4 w-4" />
        </Button>
        <div className="text-lg font-semibold">
          {displayYear}
        </div>
        <Button
          variant="outline"
          size="sm"
          onClick={() => handleYearChange('next')}
          className="h-8 w-8 p-0"
        >
          <ChevronRightIcon className="h-4 w-4" />
        </Button>
      </div>

      {/* Month Grid */}
      <div className="grid grid-cols-3 gap-2">
        {monthNames.map((monthName, index) => {
          const month = index + 1;
          const isSelected = isSelectedMonth(month);
          
          return (
            <Button
              key={month}
              variant={isSelected ? "default" : "outline"}
              size="sm"
              onClick={() => handleMonthClick(month)}
              className={cn(
                "h-10 text-sm font-medium",
                isSelected && "bg-primary text-primary-foreground"
              )}
            >
              {monthName}
            </Button>
          );
        })}
      </div>
    </div>
  );
}