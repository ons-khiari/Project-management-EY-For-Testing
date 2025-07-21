"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Calendar } from "@/components/ui/calendar";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { CalendarIcon, Filter } from "lucide-react";
import { format } from "date-fns";
import { cn } from "@/lib/utils";

export interface ScheduleFilterState {
  startDate: Date | null;
  endDate: Date | null;
}

interface ScheduleFilterBarProps {
  onFilterChange: (filters: ScheduleFilterState) => void;
}

export function ScheduleFilterBar({ onFilterChange }: ScheduleFilterBarProps) {
  const [filters, setFilters] = useState<ScheduleFilterState>({
    startDate: null,
    endDate: null,
  });

  const handleFilterChange = (key: keyof ScheduleFilterState, value: ScheduleFilterState[keyof ScheduleFilterState]) => {
    const newFilters = { ...filters, [key]: value };
    setFilters(newFilters);
  };

  const handleApplyFilters = () => {
    onFilterChange(filters);
  };

  const handleClearFilters = () => {
    const clearedFilters = {
      startDate: null,
      endDate: null,
    };
    setFilters(clearedFilters);
    onFilterChange(clearedFilters);
  };

  return (
    <div className="flex flex-wrap items-center gap-2 mb-4 bg-white p-2 rounded-md border border-gray-200">
      {/* Start Date Filter */}
      <div className="flex-1 min-w-[120px]">
        <Popover>
          <PopoverTrigger asChild>
            <Button
              variant="outline"
              className={cn(
                "h-9 w-full justify-start text-left font-normal border-gray-200 text-gray-500 hover:bg-gray-100",
                !filters.startDate && "text-muted-foreground"
              )}
            >
              <CalendarIcon className="mr-2 h-4 w-4 text-gray-500" />
              {filters.startDate ? (
                format(filters.startDate, "PPP")
              ) : (
                <span className="text-gray-500">Start Date</span>
              )}
            </Button>
          </PopoverTrigger>
          <PopoverContent className="w-auto p-0" align="start">
            <Calendar
              mode="single"
              selected={filters.startDate || undefined}
              onSelect={(date) => handleFilterChange("startDate", date ?? null)}
              initialFocus
            />
          </PopoverContent>
        </Popover>
      </div>

      {/* End Date Filter */}
      <div className="flex-1 min-w-[120px]">
        <Popover>
          <PopoverTrigger asChild>
            <Button
              variant="outline"
              className={cn(
                "h-9 w-full justify-start text-left font-normal border-gray-200 text-gray-500 hover:bg-gray-100",
                !filters.endDate && "text-muted-foreground"
              )}
            >
              <CalendarIcon className="mr-2 h-4 w-4 text-gray-500" />
              {filters.endDate ? (
                format(filters.endDate, "PPP")
              ) : (
                <span className="text-gray-500">End Date</span>
              )}
            </Button>
          </PopoverTrigger>
          <PopoverContent className="w-auto p-0" align="start">
            <Calendar
              mode="single"
              selected={filters.endDate || undefined}
              onSelect={(date) => handleFilterChange("endDate", date ?? null)}
              initialFocus
            />
          </PopoverContent>
        </Popover>
      </div>

      {/* Filter Actions */}
      <div className="flex gap-2 text-gray-500">
        <Button
          variant="outline"
          size="sm"
          className="h-9 border-gray-200 text-gray-500 hover:bg-gray-100 hover:text-black"
          onClick={handleApplyFilters}
        >
          <Filter className="h-4 w-4 mr-1" />
          Filter
        </Button>
        <Button
          variant="outline"
          size="sm"
          className="h-9 border-gray-200 text-gray-500 hover:bg-gray-100 hover:text-black"
          onClick={handleClearFilters}
        >
          Clear
        </Button>
      </div>
    </div>
  );
}
