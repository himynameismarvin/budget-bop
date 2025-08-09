'use client';

import * as React from "react";
import { CalendarIcon } from "@radix-ui/react-icons";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { cn } from "@/lib/utils";

interface YearPickerProps {
  value: string; // YYYY format
  onChange: (value: string) => void;
  className?: string;
  placeholder?: string;
  startYear?: number;
  endYear?: number;
}

export function YearPicker({ 
  value, 
  onChange, 
  className,
  placeholder = "Pick a year",
  startYear = 2020,
  endYear = new Date().getFullYear() + 10
}: YearPickerProps) {

  // Generate array of years
  const years = React.useMemo(() => {
    const yearList = [];
    for (let year = endYear; year >= startYear; year--) {
      yearList.push(year.toString());
    }
    return yearList;
  }, [startYear, endYear]);

  return (
    <div className={className}>
      <Select value={value} onValueChange={onChange}>
        <SelectTrigger className={cn("justify-start text-left font-normal")}>
          <div className="flex items-center">
            <CalendarIcon className="mr-2 h-4 w-4" />
            <SelectValue placeholder={placeholder} />
          </div>
        </SelectTrigger>
        <SelectContent>
          {years.map((year) => (
            <SelectItem key={year} value={year}>
              {year}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    </div>
  );
}