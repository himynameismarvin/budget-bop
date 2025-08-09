'use client';

import * as React from "react";
import { CalendarIcon } from "@radix-ui/react-icons";
import { format } from "date-fns";
import { MonthYearPicker } from "@/components/ui/month-year-picker";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

interface MonthPickerProps {
  value: string; // YYYY-MM format
  onChange: (value: string) => void;
  className?: string;
  buttonClassName?: string;
  placeholder?: string;
}

export function MonthPicker({ 
  value, 
  onChange, 
  className,
  buttonClassName,
  placeholder = "Pick a month"
}: MonthPickerProps) {
  const [open, setOpen] = React.useState(false);
  
  const handleMonthChange = (newValue: string) => {
    onChange(newValue);
    setOpen(false);
  };

  const formatDisplayValue = (dateString: string) => {
    if (!dateString) return placeholder;
    const [year, month] = dateString.split('-').map(Number);
    const date = new Date(year, month - 1, 1); // month - 1 because JS months are 0-indexed
    return format(date, "MMMM yyyy");
  };

  return (
    <div className={className}>
      <Popover open={open} onOpenChange={setOpen}>
        <PopoverTrigger asChild>
          <Button
            variant="outline"
            className={cn(
              "justify-start text-left font-normal",
              !value && "text-muted-foreground",
              buttonClassName
            )}
          >
            <CalendarIcon className="mr-2 h-4 w-4" />
            {formatDisplayValue(value)}
          </Button>
        </PopoverTrigger>
        <PopoverContent className="w-auto p-0" align="start">
          <MonthYearPicker
            value={value}
            onChange={handleMonthChange}
          />
        </PopoverContent>
      </Popover>
    </div>
  );
}