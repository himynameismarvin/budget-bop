'use client';

import * as React from "react";
import { CalendarIcon } from "@radix-ui/react-icons";
import { format } from "date-fns";
import { MonthYearPicker } from "@/components/ui/month-year-picker";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

interface TableDatePickerProps {
  value: string; // YYYY-MM format
  onChange: (value: string) => void;
  className?: string;
}

export function TableDatePicker({ 
  value, 
  onChange, 
  className
}: TableDatePickerProps) {
  const [open, setOpen] = React.useState(false);
  
  const handleDateChange = (newValue: string) => {
    onChange(newValue);
    setOpen(false);
  };

  const formatDisplayValue = (dateString: string) => {
    if (!dateString) return "Select date";
    const [year, month] = dateString.split('-').map(Number);
    const date = new Date(year, month - 1, 1); // month - 1 because JS months are 0-indexed
    return format(date, "MMM yyyy");
  };

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          variant="ghost"
          className={cn(
            "h-8 w-full justify-start text-left font-normal p-2 hover:bg-gray-100",
            !value && "text-muted-foreground",
            className
          )}
        >
          <CalendarIcon className="mr-1 h-3 w-3" />
          <span className="text-sm">{formatDisplayValue(value)}</span>
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-auto p-0" align="start">
        <MonthYearPicker
          value={value}
          onChange={handleDateChange}
        />
      </PopoverContent>
    </Popover>
  );
}